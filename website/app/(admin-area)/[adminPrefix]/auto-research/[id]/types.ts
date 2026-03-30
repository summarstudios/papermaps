export interface ScoreBreakdown {
  hiddenGem: number;
  authenticity: number;
  character: number;
  localFavorite: number;
  uniqueness: number;
  longevity: number;
  nonTourist: number;
}

export interface Source {
  id: string;
  type: "article" | "reddit" | "instagram" | "blog" | "review";
  title: string;
  snippet: string;
  url?: string;
  reputation?: number;
  upvotes?: number;
  trendingDuration?: string;
  postCount?: number;
}

export interface SimilarPOI {
  id: string;
  name: string;
  distance: string;
  category: string;
}

export interface Proposal {
  id: string;
  placeName: string;
  area: string;
  city: string;
  proposalType: string;
  compositeScore: number;
  scores: ScoreBreakdown;
  suggestedCategory: string;
  suggestedDescription: string;
  llmReasoning: string;
  concerns: string;
  sources: Source[];
  similarPOIs: SimilarPOI[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEFERRED";
  createdAt: string;
  reviewNote?: string;
}
