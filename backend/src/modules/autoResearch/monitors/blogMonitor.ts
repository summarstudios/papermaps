import { prisma } from '../../../lib/prisma.js';

// =============================================================================
// Types
// =============================================================================

interface BlogSource {
  name: string;
  slug: string;
  rssUrl?: string;
  sitemapUrl?: string;
  reputationScore: number;
}

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

interface MonitorSourceResult {
  source: string;
  articlesFound: number;
  signalsCreated: number;
  errors: string[];
}

export interface MonitorResult {
  totalArticlesFound: number;
  totalSignalsCreated: number;
  sourceResults: MonitorSourceResult[];
  errors: string[];
}

// =============================================================================
// Blog Sources
// =============================================================================

const BLOG_SOURCES: BlogSource[] = [
  {
    name: 'Little Black Book',
    slug: 'lbb',
    rssUrl: 'https://lbb.in/feed/',
    reputationScore: 0.85,
  },
  {
    name: 'Curly Tales',
    slug: 'curly_tales',
    rssUrl: 'https://curlytales.com/feed/',
    reputationScore: 0.80,
  },
  {
    name: 'Conde Nast Traveller India',
    slug: 'cnt_india',
    rssUrl: 'https://www.cntraveller.in/feed/',
    reputationScore: 0.90,
  },
  {
    name: 'Time Out India',
    slug: 'timeout',
    rssUrl: 'https://www.timeout.com/india/rss',
    reputationScore: 0.80,
  },
  {
    name: 'Outlook Traveller',
    slug: 'outlook_traveller',
    rssUrl: 'https://www.outlooktraveller.com/rss',
    reputationScore: 0.75,
  },
];

// =============================================================================
// Constants
// =============================================================================

/** Only process articles from the last 7 days */
const MAX_ARTICLE_AGE_DAYS = 7;

/** Delay between feed fetches in milliseconds */
const FEED_FETCH_DELAY_MS = 2000;

/** HTTP request timeout in milliseconds */
const FETCH_TIMEOUT_MS = 15000;

// =============================================================================
// RSS Parsing
// =============================================================================

/**
 * Extract the text content of an XML tag, handling both plain text and
 * CDATA-wrapped content. Returns empty string if the tag is not found.
 */
function extractTag(xml: string, tag: string): string {
  const cdataPattern = new RegExp(
    `<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
  );
  const plainPattern = new RegExp(
    `<${tag}>(.*?)<\\/${tag}>`,
    's',
  );

  const cdataMatch = cdataPattern.exec(xml);
  if (cdataMatch) {
    return (cdataMatch[1] ?? '').trim();
  }

  const plainMatch = plainPattern.exec(xml);
  if (plainMatch) {
    return (plainMatch[1] ?? '').trim();
  }

  return '';
}

/**
 * Parse RSS XML into an array of RSSItem objects. Uses regex-based extraction
 * to avoid adding any XML parsing dependencies.
 */
function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    items.push({
      title: stripHtmlTags(extractTag(content, 'title')),
      link: extractTag(content, 'link'),
      pubDate: extractTag(content, 'pubDate'),
      description: stripHtmlTags(extractTag(content, 'description')),
    });
  }

  return items;
}

/**
 * Strip HTML tags from a string, leaving only the text content.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// =============================================================================
// Article Date Filtering
// =============================================================================

/**
 * Check whether an article's pubDate falls within the last MAX_ARTICLE_AGE_DAYS.
 * Returns false if the date cannot be parsed.
 */
function isWithinDateWindow(pubDate: string): boolean {
  if (!pubDate) return false;

  try {
    const articleDate = new Date(pubDate);
    if (isNaN(articleDate.getTime())) return false;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_ARTICLE_AGE_DAYS);

    return articleDate >= cutoff;
  } catch {
    return false;
  }
}

// =============================================================================
// Place Name Extraction
// =============================================================================

/**
 * Heuristic patterns to extract place names from article titles and descriptions.
 *
 * Strategy:
 * 1. Match "Best X in [City]", "Hidden gems in [City]", "[N] places in [City]"
 * 2. Extract quoted names (likely specific place references)
 * 3. Detect capitalized multi-word sequences that could be place names
 */

/** Patterns that capture a city name after common travel article phrases */
const CITY_MENTION_PATTERNS: RegExp[] = [
  /\bbest\s+[\w\s]+?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bhidden\s+gems?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bplaces?\s+(?:to\s+(?:visit|eat|explore|see|go)\s+)?in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bthings?\s+to\s+do\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\brestaurants?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bcafes?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bbars?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bexplore\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\bguide\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /\btop\s+\d+\s+[\w\s]+?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  /(\d+)\s+[\w\s]+?\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
];

/** Pattern to extract quoted place names — e.g., "Cafe Juliet" */
const QUOTED_NAME_PATTERN = /["'\u2018\u2019\u201C\u201D]([A-Z][A-Za-z\s&'.,-]{2,40})["'\u2018\u2019\u201C\u201D]/g;

/** Pattern to detect capitalized multi-word sequences that could be place names */
const CAPITALIZED_SEQUENCE_PATTERN = /\b([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|&|the|of|de|la))+)\b/g;

/** Common words that should NOT be treated as place names */
const NOISE_WORDS = new Set([
  'the', 'and', 'for', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'are', 'has', 'his', 'how', 'its', 'let',
  'may', 'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'got',
  'him', 'hit', 'put', 'say', 'she', 'too', 'use', 'best', 'top', 'most',
  'good', 'great', 'amazing', 'beautiful', 'hidden', 'secret', 'perfect',
  'ultimate', 'complete', 'guide', 'list', 'things', 'places', 'travel',
  'visit', 'explore', 'discover', 'india', 'indian', 'south', 'north',
  'east', 'west', 'this', 'that', 'these', 'those', 'here', 'there',
  'where', 'when', 'what', 'which', 'every', 'must', 'read', 'more',
  'from', 'with', 'food', 'drink', 'have', 'been', 'your', 'best',
  'photo', 'story', 'post', 'blog', 'article', 'editorial', 'weekend',
  'holiday', 'summer', 'winter', 'monsoon', 'spring',
]);

/**
 * Extract potential place names from text using heuristic patterns.
 * Returns a deduplicated array of place name strings.
 */
function extractPlaceNames(text: string): string[] {
  const names = new Set<string>();

  // 1. Extract quoted names
  let match: RegExpExecArray | null;
  const quotedPattern = new RegExp(QUOTED_NAME_PATTERN.source, QUOTED_NAME_PATTERN.flags);
  while ((match = quotedPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length >= 3 && !isNoisePhrase(candidate)) {
      names.add(candidate);
    }
  }

  // 2. Extract capitalized multi-word sequences
  const capPattern = new RegExp(CAPITALIZED_SEQUENCE_PATTERN.source, CAPITALIZED_SEQUENCE_PATTERN.flags);
  while ((match = capPattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length >= 3 && !isNoisePhrase(candidate)) {
      names.add(candidate);
    }
  }

  return Array.from(names);
}

/**
 * Check if a candidate phrase is composed entirely of noise words.
 */
function isNoisePhrase(phrase: string): boolean {
  const words = phrase.toLowerCase().split(/\s+/);
  return words.every((word) => NOISE_WORDS.has(word));
}

/**
 * Match article text against known city slugs from the database.
 * Returns the slug of the first matching city, or null.
 */
function matchCitySlug(
  text: string,
  citySlugs: string[],
): string | null {
  const lowerText = text.toLowerCase();

  for (const slug of citySlugs) {
    // Convert slug to a readable city name (e.g., "new-delhi" -> "new delhi")
    const cityName = slug.replace(/-/g, ' ');

    // Check if the city name appears in the text
    if (lowerText.includes(cityName)) {
      return slug;
    }
  }

  return null;
}

/**
 * Extract city mentions from text using the travel-article patterns.
 * Returns deduplicated city names found by pattern matching.
 */
function extractCityMentions(text: string): string[] {
  const cityNames = new Set<string>();

  for (const pattern of CITY_MENTION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // The city name is in the last captured group
      const cityName = (match[match.length - 1] ?? '').trim();
      if (cityName.length >= 3 && !isNoisePhrase(cityName)) {
        cityNames.add(cityName);
      }
    }
  }

  return Array.from(cityNames);
}

// =============================================================================
// Signal Deduplication
// =============================================================================

/**
 * Check if a signal with the given article URL already exists in the database.
 * Uses a raw JSON query on the rawData field to find matching articleUrl values.
 */
async function signalExistsForUrl(articleUrl: string): Promise<boolean> {
  try {
    const existing = await prisma.autoResearchSignal.findFirst({
      where: {
        source: 'travel_blog',
        rawData: {
          path: ['articleUrl'],
          equals: articleUrl,
        },
      },
      select: { id: true },
    });
    return existing !== null;
  } catch (err) {
    // If the JSON query fails (e.g., rawData is not structured as expected),
    // fall back to treating it as not a duplicate
    console.warn('[BlogMonitor] Failed to check signal dedup:', err);
    return false;
  }
}

// =============================================================================
// Feed Fetching
// =============================================================================

/**
 * Fetch and parse an RSS feed from a URL. Returns an empty array if the
 * fetch fails or the response is not valid RSS XML.
 */
async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PaperMaps-BlogMonitor/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      console.warn(
        `[BlogMonitor] Feed fetch failed for ${url}: HTTP ${response.status}`,
      );
      return [];
    }

    const xml = await response.text();
    return parseRSSItems(xml);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[BlogMonitor] Feed fetch timed out for ${url}`);
    } else {
      console.warn(`[BlogMonitor] Feed fetch error for ${url}:`, err);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Rate Limiting Helper
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Known City Slugs Loader
// =============================================================================

/**
 * Fetch all city slugs from the database. These are used to match article
 * content against known Paper Maps cities.
 */
async function loadCitySlugs(): Promise<string[]> {
  try {
    const cities = await prisma.city.findMany({
      select: { slug: true },
    });
    return cities.map((c) => c.slug);
  } catch (err) {
    console.error('[BlogMonitor] Failed to load city slugs:', err);
    return [];
  }
}

// =============================================================================
// Core Processing
// =============================================================================

/**
 * Process a single RSS article item: check for duplicates, extract places,
 * match against known cities, and create AutoResearchSignal records.
 *
 * Returns the number of signals created for this article.
 */
async function processArticle(
  article: RSSItem,
  source: BlogSource,
  citySlugs: string[],
): Promise<{ signalsCreated: number; errors: string[] }> {
  const errors: string[] = [];
  let signalsCreated = 0;

  try {
    // Skip if no link (can't deduplicate without it)
    if (!article.link) {
      return { signalsCreated: 0, errors: [] };
    }

    // Check for existing signal with this article URL
    const exists = await signalExistsForUrl(article.link);
    if (exists) {
      return { signalsCreated: 0, errors: [] };
    }

    // Combine title and description for analysis
    const fullText = `${article.title} ${article.description}`;

    // Match against known Paper Maps city slugs
    const matchedCitySlug = matchCitySlug(fullText, citySlugs);

    // Extract city mentions from patterns (even if no DB city matched)
    const cityMentions = extractCityMentions(fullText);

    // Extract specific place names from the text
    const placeNames = extractPlaceNames(fullText);

    // If we found neither a matched city nor any place names, skip
    if (!matchedCitySlug && placeNames.length === 0 && cityMentions.length === 0) {
      return { signalsCreated: 0, errors: [] };
    }

    // Build the common rawData payload
    const rawData = {
      blog: source.slug,
      articleUrl: article.link,
      articleTitle: article.title,
      articleDate: article.pubDate,
      excerpt: article.description?.slice(0, 500) ?? '',
      reputationScore: source.reputationScore,
    };

    // If we have specific place names, create a signal for each
    if (placeNames.length > 0) {
      for (const placeName of placeNames) {
        try {
          await prisma.autoResearchSignal.create({
            data: {
              source: 'travel_blog',
              rawData,
              placeName,
              placeLocation: null,
              citySlug: matchedCitySlug ?? cityMentions[0]?.toLowerCase().replace(/\s+/g, '-') ?? 'unknown',
              signalType: 'editorial_mention',
              scrapedAt: new Date(),
              status: 'pending',
            },
          });
          signalsCreated++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to create signal for "${placeName}" from ${article.link}: ${message}`);
        }
      }
    } else if (matchedCitySlug || cityMentions.length > 0) {
      // No specific place names extracted, but we have a city mention —
      // create a single signal using the article title as the place name
      const citySlug = matchedCitySlug ?? cityMentions[0]?.toLowerCase().replace(/\s+/g, '-') ?? 'unknown';
      try {
        await prisma.autoResearchSignal.create({
          data: {
            source: 'travel_blog',
            rawData,
            placeName: article.title.slice(0, 200),
            placeLocation: null,
            citySlug,
            signalType: 'editorial_mention',
            scrapedAt: new Date(),
            status: 'pending',
          },
        });
        signalsCreated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to create signal for article "${article.title}": ${message}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Unexpected error processing article "${article.title}": ${message}`);
  }

  return { signalsCreated, errors };
}

// =============================================================================
// Blog Monitor Service
// =============================================================================

export const blogMonitor = {
  /**
   * Run the blog monitor for a single source. Fetches the RSS feed, filters
   * to recent articles, and creates AutoResearchSignal records for place
   * mentions found in article titles and descriptions.
   */
  async runForSource(source: BlogSource): Promise<MonitorResult> {
    const result: MonitorResult = {
      totalArticlesFound: 0,
      totalSignalsCreated: 0,
      sourceResults: [],
      errors: [],
    };

    const sourceResult: MonitorSourceResult = {
      source: source.slug,
      articlesFound: 0,
      signalsCreated: 0,
      errors: [],
    };

    console.log(`[BlogMonitor] Fetching feed for ${source.name} (${source.slug})`);

    if (!source.rssUrl) {
      const msg = `${source.name} has no RSS URL configured — skipping`;
      console.warn(`[BlogMonitor] ${msg}`);
      sourceResult.errors.push(msg);
      result.sourceResults.push(sourceResult);
      result.errors.push(msg);
      return result;
    }

    // Load known city slugs from the database
    const citySlugs = await loadCitySlugs();

    // Fetch and parse the RSS feed
    const articles = await fetchRSSFeed(source.rssUrl);
    console.log(`[BlogMonitor] ${source.name}: found ${articles.length} total articles in feed`);

    // Filter to articles within the date window
    const recentArticles = articles.filter((article) => isWithinDateWindow(article.pubDate));
    sourceResult.articlesFound = recentArticles.length;
    console.log(`[BlogMonitor] ${source.name}: ${recentArticles.length} articles within last ${MAX_ARTICLE_AGE_DAYS} days`);

    // Process each article
    for (const article of recentArticles) {
      try {
        const articleResult = await processArticle(article, source, citySlugs);
        sourceResult.signalsCreated += articleResult.signalsCreated;
        sourceResult.errors.push(...articleResult.errors);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sourceResult.errors.push(`Article processing crashed for "${article.title}": ${message}`);
      }
    }

    result.totalArticlesFound = sourceResult.articlesFound;
    result.totalSignalsCreated = sourceResult.signalsCreated;
    result.sourceResults.push(sourceResult);
    result.errors.push(...sourceResult.errors);

    console.log(
      `[BlogMonitor] ${source.name}: created ${sourceResult.signalsCreated} signals from ${sourceResult.articlesFound} articles`,
    );

    return result;
  },

  /**
   * Run the blog monitor for all configured sources. Iterates through each
   * source sequentially with a rate-limiting delay between feed fetches.
   */
  async runForAll(): Promise<MonitorResult> {
    console.log('[BlogMonitor] Starting run for all sources...');

    const result: MonitorResult = {
      totalArticlesFound: 0,
      totalSignalsCreated: 0,
      sourceResults: [],
      errors: [],
    };

    for (let i = 0; i < BLOG_SOURCES.length; i++) {
      const source = BLOG_SOURCES[i];

      try {
        const sourceResult = await blogMonitor.runForSource(source);

        result.totalArticlesFound += sourceResult.totalArticlesFound;
        result.totalSignalsCreated += sourceResult.totalSignalsCreated;
        result.sourceResults.push(...sourceResult.sourceResults);
        result.errors.push(...sourceResult.errors);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const errorMsg = `Source ${source.name} (${source.slug}) failed entirely: ${message}`;
        console.error(`[BlogMonitor] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.sourceResults.push({
          source: source.slug,
          articlesFound: 0,
          signalsCreated: 0,
          errors: [errorMsg],
        });
      }

      // Rate limit: wait between feed fetches (skip delay after the last one)
      if (i < BLOG_SOURCES.length - 1) {
        await delay(FEED_FETCH_DELAY_MS);
      }
    }

    console.log(
      `[BlogMonitor] Run complete: ${result.totalArticlesFound} articles found, ${result.totalSignalsCreated} signals created, ${result.errors.length} errors`,
    );

    return result;
  },
};

// =============================================================================
// Export types and constants for testing
// =============================================================================

export { BLOG_SOURCES };
export type { BlogSource, RSSItem, MonitorSourceResult };

// Export internal functions for unit testing
export const _internal = {
  parseRSSItems,
  extractTag,
  stripHtmlTags,
  isWithinDateWindow,
  extractPlaceNames,
  extractCityMentions,
  matchCitySlug,
  isNoisePhrase,
  signalExistsForUrl,
  fetchRSSFeed,
};
