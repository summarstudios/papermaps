import { prisma } from '../../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[RedditMonitor]';

const USER_AGENT = 'PaperMaps/1.0 (AutoResearch)';

/** Delay between Reddit API requests (ms) — Reddit enforces ~1 req/2s */
const RATE_LIMIT_DELAY_MS = 2000;

/** Wait time when hitting a 429 rate limit (ms) */
const RATE_LIMIT_BACKOFF_MS = 60_000;

/** Minimum upvotes for a post to be worth fetching comments */
const MIN_POST_UPVOTES = 10;

/** Minimum upvotes for a comment to be considered for place extraction */
const MIN_COMMENT_UPVOTES = 5;

/** Maximum posts to fetch per subreddit search */
const MAX_POSTS_PER_SUBREDDIT = 25;

/** Maximum comments to fetch per post */
const MAX_COMMENTS_PER_POST = 50;

// =============================================================================
// City Subreddit Mappings
// =============================================================================

const CITY_SUBREDDITS: Record<string, string[]> = {
  'mysore': ['mysore', 'mysuru'],
  'bangalore': ['bangalore', 'bengaluru'],
  'mumbai': ['mumbai'],
  'delhi': ['delhi'],
  'pune': ['pune'],
  'hyderabad': ['hyderabad'],
  'chennai': ['chennai'],
  'goa': ['goa'],
  'jaipur': ['jaipur'],
  'kolkata': ['kolkata'],
};

const GENERAL_SUBREDDITS = ['IndianFood', 'IndiaTravelInformation', 'india'];

// =============================================================================
// Types
// =============================================================================

export interface MonitorResult {
  citySlug: string;
  subredditsScanned: number;
  postsScanned: number;
  signalsCreated: number;
  errors: string[];
}

interface RedditPost {
  title: string;
  selftext: string;
  ups: number;
  permalink: string;
  created_utc: number;
  id: string;
  num_comments: number;
}

interface RedditComment {
  body: string;
  ups: number;
  author: string;
  id: string;
}

// =============================================================================
// Reddit API Helpers
// =============================================================================

/**
 * Fetch JSON from Reddit's public API with proper User-Agent and rate-limit
 * handling. Retries once on 429 after waiting 60 seconds.
 *
 * Returns null if the request fails irrecoverably (403, 5xx, network error).
 */
async function redditFetch<T>(url: string): Promise<T | null> {
  const attemptFetch = async (): Promise<T | null> => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (response.status === 429) {
        return null; // Signal to caller to retry
      }

      if (!response.ok) {
        console.error(
          `${LOG_PREFIX} Reddit API error: ${response.status} for ${url}`,
        );
        return null;
      }

      return (await response.json()) as T;
    } catch (err) {
      console.error(`${LOG_PREFIX} Fetch error for ${url}:`, err);
      return null;
    }
  };

  // First attempt
  const firstResult = await attemptFetch();
  if (firstResult !== null) {
    return firstResult;
  }

  // If we got a 429, wait and retry once
  console.warn(`${LOG_PREFIX} Rate limited — waiting ${RATE_LIMIT_BACKOFF_MS}ms before retry`);
  await delay(RATE_LIMIT_BACKOFF_MS);

  return attemptFetch();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Place Name Extraction
// =============================================================================

/**
 * Extract potential place names from comment text using pattern matching.
 *
 * Looks for:
 * 1. Phrases like "try X", "visit X", "go to X", "check out X"
 * 2. Capitalized multi-word names followed by verbs (e.g., "Cafe Roastery is amazing")
 */
function extractPlaceNames(text: string): string[] {
  const names: string[] = [];

  // Pattern: "try X", "visit X", "go to X", "check out X", "recommend X", "love X", "suggest X"
  const recommendationPattern =
    /(?:try|visit|go to|check out|recommend|love|suggest)\s+([A-Z][A-Za-z'\s]{2,30})/g;

  // Pattern: "Capitalized Name is/has/was/are/serves/makes ..."
  const subjectPattern =
    /([A-Z][A-Za-z']+(?:\s[A-Z][A-Za-z']+){1,4})\s+(?:is|has|was|are|serves|makes)/g;

  const patterns = [recommendationPattern, subjectPattern];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50) {
        names.push(name);
      }
    }
  }

  return [...new Set(names)];
}

// =============================================================================
// Subreddit Search
// =============================================================================

/**
 * Build the Reddit search URL for a subreddit looking for place recommendations.
 */
function buildSearchUrl(subreddit: string): string {
  const query = encodeURIComponent(
    'hidden gems OR best places OR underrated OR recommend',
  );
  return `https://www.reddit.com/r/${subreddit}/search.json?q=${query}&sort=new&t=week&limit=${MAX_POSTS_PER_SUBREDDIT}&restrict_sr=on`;
}

/**
 * Build the Reddit comments URL for a specific post.
 */
function buildCommentsUrl(permalink: string): string {
  // permalink looks like /r/subreddit/comments/abc123/title_here/
  return `https://www.reddit.com${permalink}.json?limit=${MAX_COMMENTS_PER_POST}&sort=top`;
}

/**
 * Parse posts from Reddit search API response.
 */
function parsePostsFromSearchResponse(
  data: { data?: { children?: Array<{ data: RedditPost }> } } | null,
): RedditPost[] {
  if (!data?.data?.children) return [];

  return data.data.children
    .map((child) => child.data)
    .filter((post): post is RedditPost => Boolean(post && post.permalink));
}

/**
 * Parse comments from Reddit comments API response.
 * The comments response is an array: [postData, commentsData].
 */
function parseCommentsFromResponse(
  data: Array<{ data?: { children?: Array<{ kind: string; data: RedditComment }> } }> | null,
): RedditComment[] {
  if (!Array.isArray(data) || data.length < 2) return [];

  const commentsListing = data[1];
  if (!commentsListing?.data?.children) return [];

  return commentsListing.data.children
    .filter((child) => child.kind === 't1') // t1 = comment
    .map((child) => child.data)
    .filter(
      (comment): comment is RedditComment =>
        Boolean(comment && comment.body && comment.author !== 'AutoModerator'),
    );
}

// =============================================================================
// Signal Deduplication
// =============================================================================

/**
 * Check if we already have a signal for a given thread URL.
 * Uses the rawData JSON field to check for the threadUrl.
 */
async function hasExistingSignalForThread(threadUrl: string): Promise<boolean> {
  // Query signals where rawData contains this threadUrl
  const existing = await prisma.autoResearchSignal.findFirst({
    where: {
      source: 'reddit',
      rawData: {
        path: ['threadUrl'],
        equals: threadUrl,
      },
    },
    select: { id: true },
  });

  return existing !== null;
}

// =============================================================================
// Core Monitor Logic
// =============================================================================

/**
 * Process a single subreddit for a given city. Searches for recommendation
 * threads, extracts place names from top comments, and creates signals.
 */
async function processSubreddit(
  subreddit: string,
  citySlug: string,
): Promise<{ postsScanned: number; signalsCreated: number; errors: string[] }> {
  const result = { postsScanned: 0, signalsCreated: 0, errors: [] as string[] };

  // Search for recommendation threads
  const searchUrl = buildSearchUrl(subreddit);
  const searchData = await redditFetch<{
    data?: { children?: Array<{ data: RedditPost }> };
  }>(searchUrl);

  if (!searchData) {
    result.errors.push(`Failed to fetch search results from r/${subreddit}`);
    return result;
  }

  const posts = parsePostsFromSearchResponse(searchData);
  result.postsScanned = posts.length;

  for (const post of posts) {
    try {
      // Skip low-engagement posts
      if (post.ups < MIN_POST_UPVOTES) continue;

      const threadUrl = `https://reddit.com${post.permalink}`;

      // Check for existing signal for this thread
      const alreadyTracked = await hasExistingSignalForThread(threadUrl);
      if (alreadyTracked) continue;

      // Rate limit between requests
      await delay(RATE_LIMIT_DELAY_MS);

      // Fetch comments
      const commentsUrl = buildCommentsUrl(post.permalink);
      const commentsData = await redditFetch<
        Array<{ data?: { children?: Array<{ kind: string; data: RedditComment }> } }>
      >(commentsUrl);

      if (!commentsData) {
        result.errors.push(
          `Failed to fetch comments for post: ${post.permalink}`,
        );
        continue;
      }

      const comments = parseCommentsFromResponse(commentsData);

      // Extract place names from qualifying comments
      const topComments = comments.filter(
        (comment) => comment.ups >= MIN_COMMENT_UPVOTES,
      );

      for (const comment of topComments) {
        const placeNames = extractPlaceNames(comment.body);

        for (const placeName of placeNames) {
          try {
            await prisma.autoResearchSignal.create({
              data: {
                source: 'reddit',
                rawData: {
                  subreddit,
                  threadUrl,
                  threadTitle: post.title,
                  threadUpvotes: post.ups,
                  commentText: comment.body,
                  commentUpvotes: comment.ups,
                  commenterKarma: null,
                } as unknown as Prisma.InputJsonValue,
                placeName,
                placeLocation: Prisma.JsonNull,
                citySlug,
                signalType: 'local_recommendation',
                scrapedAt: new Date(),
                status: 'pending',
              },
            });

            result.signalsCreated++;
          } catch (err) {
            console.error(
              `${LOG_PREFIX} Failed to create signal for "${placeName}" in r/${subreddit}:`,
              err,
            );
            result.errors.push(
              `Failed to create signal for "${placeName}" in r/${subreddit}`,
            );
          }
        }
      }

      // Also extract place names from the post body itself
      if (post.selftext) {
        const postPlaceNames = extractPlaceNames(post.selftext);
        for (const placeName of postPlaceNames) {
          try {
            await prisma.autoResearchSignal.create({
              data: {
                source: 'reddit',
                rawData: {
                  subreddit,
                  threadUrl,
                  threadTitle: post.title,
                  threadUpvotes: post.ups,
                  commentText: post.selftext,
                  commentUpvotes: post.ups,
                  commenterKarma: null,
                } as unknown as Prisma.InputJsonValue,
                placeName,
                placeLocation: Prisma.JsonNull,
                citySlug,
                signalType: 'local_recommendation',
                scrapedAt: new Date(),
                status: 'pending',
              },
            });

            result.signalsCreated++;
          } catch (err) {
            console.error(
              `${LOG_PREFIX} Failed to create signal for "${placeName}" from post body in r/${subreddit}:`,
              err,
            );
            result.errors.push(
              `Failed to create signal for "${placeName}" from post body in r/${subreddit}`,
            );
          }
        }
      }
    } catch (err) {
      console.error(
        `${LOG_PREFIX} Error processing post ${post.permalink}:`,
        err,
      );
      result.errors.push(`Error processing post: ${post.permalink}`);
    }
  }

  return result;
}

// =============================================================================
// Audit Trail Helper
// =============================================================================

async function logAuditTrail(params: {
  eventType: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.autoResearchAuditTrail.create({
      data: {
        poiId: null,
        eventType: params.eventType,
        proposalId: null,
        actorType: 'system',
        actorId: null,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error(`${LOG_PREFIX} Failed to write audit trail:`, err);
  }
}

// =============================================================================
// Public Service
// =============================================================================

export const redditMonitor = {
  /**
   * Run the Reddit monitor for a single city. Scans the city's subreddits
   * plus general travel subreddits for place recommendation threads, extracts
   * mentioned place names, and creates AutoResearchSignal records.
   */
  async runForCity(citySlug: string): Promise<MonitorResult> {
    console.log(`${LOG_PREFIX} Running for city: ${citySlug}`);

    const citySubreddits = CITY_SUBREDDITS[citySlug] ?? [];
    const allSubreddits = [...citySubreddits, ...GENERAL_SUBREDDITS];

    const result: MonitorResult = {
      citySlug,
      subredditsScanned: 0,
      postsScanned: 0,
      signalsCreated: 0,
      errors: [],
    };

    for (const subreddit of allSubreddits) {
      try {
        console.log(`${LOG_PREFIX} Scanning r/${subreddit} for ${citySlug}...`);

        const subResult = await processSubreddit(subreddit, citySlug);

        result.subredditsScanned++;
        result.postsScanned += subResult.postsScanned;
        result.signalsCreated += subResult.signalsCreated;
        result.errors.push(...subResult.errors);

        // Rate limit between subreddits
        await delay(RATE_LIMIT_DELAY_MS);
      } catch (err) {
        const errorMsg = `Failed to process r/${subreddit}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`${LOG_PREFIX} ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Log summary to audit trail
    await logAuditTrail({
      eventType: 'reddit_monitor_run',
      metadata: {
        citySlug,
        subredditsScanned: result.subredditsScanned,
        postsScanned: result.postsScanned,
        signalsCreated: result.signalsCreated,
        errorCount: result.errors.length,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `${LOG_PREFIX} Done for ${citySlug}: ` +
        `subreddits=${result.subredditsScanned}, ` +
        `posts=${result.postsScanned}, ` +
        `signals=${result.signalsCreated}, ` +
        `errors=${result.errors.length}`,
    );

    return result;
  },

  /**
   * Run the Reddit monitor for all configured cities. Processes each city
   * sequentially to respect Reddit rate limits.
   */
  async runForAll(): Promise<MonitorResult[]> {
    console.log(`${LOG_PREFIX} Starting run for all cities...`);

    const citySlugs = Object.keys(CITY_SUBREDDITS);
    const results: MonitorResult[] = [];

    for (const citySlug of citySlugs) {
      try {
        const result = await redditMonitor.runForCity(citySlug);
        results.push(result);
      } catch (err) {
        console.error(
          `${LOG_PREFIX} Error running monitor for ${citySlug}:`,
          err,
        );
        results.push({
          citySlug,
          subredditsScanned: 0,
          postsScanned: 0,
          signalsCreated: 0,
          errors: [
            `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
          ],
        });
      }
    }

    // Log aggregate summary
    const totals = results.reduce(
      (acc, r) => ({
        subredditsScanned: acc.subredditsScanned + r.subredditsScanned,
        postsScanned: acc.postsScanned + r.postsScanned,
        signalsCreated: acc.signalsCreated + r.signalsCreated,
        errors: acc.errors + r.errors.length,
      }),
      { subredditsScanned: 0, postsScanned: 0, signalsCreated: 0, errors: 0 },
    );

    await logAuditTrail({
      eventType: 'reddit_monitor_full_run',
      metadata: {
        citiesProcessed: citySlugs.length,
        ...totals,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `${LOG_PREFIX} Full run complete: ` +
        `${citySlugs.length} cities, ` +
        `${totals.subredditsScanned} subreddits, ` +
        `${totals.postsScanned} posts, ` +
        `${totals.signalsCreated} signals, ` +
        `${totals.errors} errors`,
    );

    return results;
  },
};
