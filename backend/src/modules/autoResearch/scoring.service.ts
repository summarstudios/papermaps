import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../../config.js';

// =============================================================================
// Constants
// =============================================================================

const PROMPT_VERSION = 'v1';

// =============================================================================
// Rubric Dimensions
// =============================================================================

interface RubricDimension {
  name: string;
  weight: number;
  description: string;
}

const RUBRIC_DIMENSIONS: RubricDimension[] = [
  { name: 'hiddenGemQuality', weight: 0.25, description: 'How undiscovered/under-the-radar is this place?' },
  { name: 'authenticity', weight: 0.20, description: 'Does this have soul? Local ownership, original concept?' },
  { name: 'character', weight: 0.15, description: 'Is this place interesting, memorable, distinctive?' },
  { name: 'localFavourite', weight: 0.15, description: 'Do actual locals (not tourists) go here?' },
  { name: 'uniqueness', weight: 0.10, description: 'Does it offer something unreplicable?' },
  { name: 'longevityConfidence', weight: 0.10, description: 'Will this still be good in 12 months?' },
  { name: 'nonTouristy', weight: 0.05, description: 'Not already on every tourist list?' },
];

// =============================================================================
// Chain / Pattern Pre-Filter Lists
// =============================================================================

const KNOWN_CHAINS = new Set([
  'starbucks',
  'ccd',
  'cafe coffee day',
  "mcdonald's",
  'mcdonalds',
  'burger king',
  'kfc',
  'pizza hut',
  "domino's",
  'dominos',
  'subway',
  'barbeque nation',
  'mainland china',
  'social',
  'hard rock cafe',
  'zara',
  'h&m',
  'shoppers stop',
  'haldirams',
  'haldiram',
  'baskin robbins',
  'dunkin donuts',
  "dunkin'",
  'costa coffee',
  'tim hortons',
  'taco bell',
  'papa johns',
  "papa john's",
  'chili\'s',
  'chilis',
  'the body shop',
  'lenskart',
  'reliance trends',
  'pantaloons',
  'lifestyle',
  'westside',
  'max fashion',
  'nandos',
  "nando's",
  'popeyes',
  'jollibee',
  'wok to walk',
  'cinnabon',
  'krispy kreme',
  "wendy's",
  'wendys',
  'five guys',
  'pret a manger',
  'the coffee bean',
  'gloria jeans',
  "gloria jean's",
  'chaayos',
  'third wave coffee',
  'blue tokai',
]);

const REJECTED_PATTERNS = [
  /\bmall\b/i,
  /\bfood\s*court\b/i,
  /\bairport\b/i,
  /\bhotel\s*lobby\b/i,
  /\bgas\s*station\b/i,
  /\bpetrol\s*pump\b/i,
  /\bpetrol\s*bunk\b/i,
  /\batm\b/i,
  /\bbanquet\s*hall\b/i,
  /\bconvention\s*cent(er|re)\b/i,
  /\bfranchise\b/i,
  /\bmultiplex\b/i,
  /\bchain\s*restaurant\b/i,
];

// =============================================================================
// Zod Schemas for LLM Response Validation
// =============================================================================

const dimensionNames = RUBRIC_DIMENSIONS.map((d) => d.name);

const scoringResponseSchema = z.object({
  dimensions: z.record(
    z.string(),
    z.number().min(0).max(10),
  ).refine(
    (dims) => dimensionNames.every((name) => name in dims),
    { message: `Response must include all rubric dimensions: ${dimensionNames.join(', ')}` },
  ),
  reasoning: z.string().min(10).max(1000),
  concerns: z.string().nullable(),
  recommendation: z.enum(['ADD', 'MAYBE', 'REJECT']),
});

type ScoringLLMResponse = z.infer<typeof scoringResponseSchema>;

const removalResponseSchema = z.object({
  closureConfidence: z.number().min(0).max(10),
  qualityDecline: z.number().min(0).max(10),
  overfamousness: z.number().min(0).max(10),
  reasoning: z.string().min(10).max(1000),
  recommendation: z.enum(['REMOVE', 'FLAG_FOR_REVIEW', 'KEEP']),
});

type RemovalLLMResponse = z.infer<typeof removalResponseSchema>;

// =============================================================================
// Result Types
// =============================================================================

export interface ScoringResult {
  dimensions: Record<string, number>;
  compositeScore: number;
  rawScore: number;
  reasoning: string;
  concerns: string | null;
  recommendation: 'ADD' | 'MAYBE' | 'REJECT';
  model: string;
  promptVersion: string;
}

export interface RemovalScoringResult {
  closureConfidence: number;
  qualityDecline: number;
  overfamousness: number;
  reasoning: string;
  recommendation: 'REMOVE' | 'FLAG_FOR_REVIEW' | 'KEEP';
  model: string;
  promptVersion: string;
}

export interface PreFilterResult {
  pass: boolean;
  reason?: string;
}

// =============================================================================
// Prompt Builders
// =============================================================================

function buildScoringSystemPrompt(): string {
  return `You are an editorial judge for Paper Maps, a curated travel platform that creates opinionated, hand-picked city maps for travelers who want authentic local experiences — NOT generic tourist attractions.

Paper Maps editorial voice:
- We champion places with soul: independent, owner-operated, culturally rooted.
- We reject anything generic, corporate, or mass-produced.
- We value places that locals actually go to, not tourist traps.
- A great Paper Maps pick feels like a recommendation from your most interesting local friend.
- We prefer hidden gems over famous landmarks — unless the landmark truly earns its reputation.

Your job is to evaluate a candidate place against our curation rubric and give honest scores. Be rigorous. Most places should score 5-7. Only truly special places deserve 8+. Chain restaurants and generic spots should score below 4.

You MUST respond with ONLY a valid JSON object, no markdown code blocks, no other text.`;
}

function buildScoringUserPrompt(candidate: {
  placeName: string;
  citySlug: string;
  area?: string;
  sources: string[];
  evidence: Record<string, unknown>;
  corroborationCount: number;
}): string {
  const dimensionsBlock = RUBRIC_DIMENSIONS
    .map((d) => `  - "${d.name}" (weight ${d.weight}): ${d.description}`)
    .join('\n');

  const evidenceBlock = Object.entries(candidate.evidence)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');

  return `Evaluate this candidate place for inclusion on a Paper Maps curated city map.

CANDIDATE:
  Name: ${candidate.placeName}
  City: ${candidate.citySlug}
  ${candidate.area ? `Area/Neighborhood: ${candidate.area}` : ''}
  Sources: ${candidate.sources.join(', ')}
  Number of independent sources corroborating: ${candidate.corroborationCount}
  ${evidenceBlock ? `Evidence:\n${evidenceBlock}` : ''}

RUBRIC DIMENSIONS (score each 0-10):
${dimensionsBlock}

Respond with this exact JSON structure:
{
  "dimensions": {
    "hiddenGemQuality": <number 0-10>,
    "authenticity": <number 0-10>,
    "character": <number 0-10>,
    "localFavourite": <number 0-10>,
    "uniqueness": <number 0-10>,
    "longevityConfidence": <number 0-10>,
    "nonTouristy": <number 0-10>
  },
  "reasoning": "<2 sentences explaining why this place does or does not belong on Paper Maps>",
  "concerns": "<any concerns or null if none>",
  "recommendation": "<ADD | MAYBE | REJECT>"
}`;
}

function buildRemovalSystemPrompt(): string {
  return `You are an editorial quality reviewer for Paper Maps, a curated travel platform. Your job is to evaluate whether an existing place on our map should be removed.

Reasons for removal include:
- The place has permanently closed or is closing soon
- Quality has significantly declined (service, food, ambiance, etc.)
- The place has become overly famous/touristy and lost its hidden-gem character
- The place has changed ownership/concept and no longer fits our curation criteria

Be conservative — only recommend REMOVE if you are confident. When in doubt, FLAG_FOR_REVIEW so a human curator can investigate.

You MUST respond with ONLY a valid JSON object, no markdown code blocks, no other text.`;
}

function buildRemovalUserPrompt(poi: {
  name: string;
  description?: string;
  citySlug: string;
  signalType: string;
  evidence: Record<string, unknown>;
}): string {
  const evidenceBlock = Object.entries(poi.evidence)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');

  return `Evaluate whether this place should be removed from a Paper Maps curated city map.

PLACE:
  Name: ${poi.name}
  City: ${poi.citySlug}
  ${poi.description ? `Current description: ${poi.description}` : ''}
  Signal type: ${poi.signalType}
  ${evidenceBlock ? `Evidence:\n${evidenceBlock}` : ''}

Score each dimension 0-10 (10 = strongest signal for removal):

Respond with this exact JSON structure:
{
  "closureConfidence": <number 0-10, how confident are you the place has closed or is closing?>,
  "qualityDecline": <number 0-10, how much has quality declined based on evidence?>,
  "overfamousness": <number 0-10, has this place become too touristy/mainstream?>,
  "reasoning": "<2 sentences explaining your assessment>",
  "recommendation": "<REMOVE | FLAG_FOR_REVIEW | KEEP>"
}`;
}

// =============================================================================
// Helpers
// =============================================================================

function extractJsonText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function parseJsonResponse<T>(responseText: string, schema: z.ZodType<T>): T {
  // Strip markdown code blocks if the model wraps the response
  const cleaned = responseText
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  } catch (err) {
    throw new Error(
      `Failed to parse AI response: ${err instanceof Error ? err.message : String(err)}. Raw response: ${responseText.slice(0, 500)}`,
    );
  }
}

function calculateCompositeScore(dimensions: Record<string, number>): number {
  let score = 0;
  for (const dim of RUBRIC_DIMENSIONS) {
    const dimScore = dimensions[dim.name];
    if (dimScore !== undefined) {
      score += dimScore * dim.weight;
    }
  }
  return Math.round(score * 100) / 100;
}

function applyCorroborationBonus(rawScore: number, corroborationCount: number): number {
  let multiplier = 1.0;
  if (corroborationCount >= 4) {
    multiplier = 1.3;
  } else if (corroborationCount === 3) {
    multiplier = 1.2;
  } else if (corroborationCount === 2) {
    multiplier = 1.1;
  }
  // Cap at 10 to keep scores within rubric range
  return Math.min(10, Math.round(rawScore * multiplier * 100) / 100);
}

function createAnthropicClient(): Anthropic {
  if (!config.anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in your environment to use the scoring engine.',
    );
  }
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

// =============================================================================
// Scoring Service
// =============================================================================

export const scoringService = {
  /**
   * Pre-filter that rejects obvious non-starters BEFORE calling the LLM.
   * Checks against known chains and pattern matches on the place name.
   */
  async preFilter(placeName: string, _citySlug: string): Promise<PreFilterResult> {
    const normalized = placeName.toLowerCase().trim();

    // Check against known chain list
    for (const chain of KNOWN_CHAINS) {
      if (normalized === chain || normalized.includes(chain)) {
        return {
          pass: false,
          reason: `Rejected: "${placeName}" matches known chain "${chain}". Paper Maps only features independent, locally-owned places.`,
        };
      }
    }

    // Check against rejected patterns
    for (const pattern of REJECTED_PATTERNS) {
      if (pattern.test(placeName)) {
        return {
          pass: false,
          reason: `Rejected: "${placeName}" matches excluded pattern ${pattern}. These venue types are not suitable for Paper Maps.`,
        };
      }
    }

    return { pass: true };
  },

  /**
   * Score a candidate place against the Paper Maps curation rubric.
   *
   * Calls Claude to evaluate the candidate on 7 dimensions, calculates a
   * weighted composite score, and applies a corroboration bonus based on
   * how many independent sources mentioned the place.
   */
  async scoreCandidate(candidate: {
    placeName: string;
    citySlug: string;
    area?: string;
    sources: string[];
    evidence: Record<string, unknown>;
    corroborationCount: number;
  }): Promise<ScoringResult> {
    const client = createAnthropicClient();

    const message = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: buildScoringUserPrompt(candidate),
        },
      ],
      system: buildScoringSystemPrompt(),
    });

    const responseText = extractJsonText(message);
    const parsed: ScoringLLMResponse = parseJsonResponse(responseText, scoringResponseSchema);

    const rawScore = calculateCompositeScore(parsed.dimensions);
    const compositeScore = applyCorroborationBonus(rawScore, candidate.corroborationCount);

    return {
      dimensions: { ...parsed.dimensions },
      compositeScore,
      rawScore,
      reasoning: parsed.reasoning,
      concerns: parsed.concerns,
      recommendation: parsed.recommendation,
      model: config.anthropicModel,
      promptVersion: PROMPT_VERSION,
    };
  },

  /**
   * Score an existing POI for potential removal from the map.
   *
   * Evaluates closure confidence, quality decline, and overfamousness
   * based on the provided signal and evidence.
   */
  async scoreForRemoval(poi: {
    name: string;
    description?: string;
    citySlug: string;
    signalType: string;
    evidence: Record<string, unknown>;
  }): Promise<RemovalScoringResult> {
    const client = createAnthropicClient();

    const message = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: buildRemovalUserPrompt(poi),
        },
      ],
      system: buildRemovalSystemPrompt(),
    });

    const responseText = extractJsonText(message);
    const parsed: RemovalLLMResponse = parseJsonResponse(responseText, removalResponseSchema);

    return {
      closureConfidence: parsed.closureConfidence,
      qualityDecline: parsed.qualityDecline,
      overfamousness: parsed.overfamousness,
      reasoning: parsed.reasoning,
      recommendation: parsed.recommendation,
      model: config.anthropicModel,
      promptVersion: PROMPT_VERSION,
    };
  },
};
