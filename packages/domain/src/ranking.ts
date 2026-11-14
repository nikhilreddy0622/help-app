/**
 * Discovery ranking (PRD §8 initial hypothesis). Weights are configurable so
 * they can be tuned against real search/enquiry data.
 */
export interface RankingWeights {
  relevance: number;
  distance: number;
  rating: number;
  availability: number;
  completeness: number;
  responsiveness: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 0.3,
  distance: 0.2,
  rating: 0.2,
  availability: 0.15,
  completeness: 0.1,
  responsiveness: 0.05,
};

export interface RankingInput {
  /** 0..1 text-match score from the search engine. */
  relevance: number;
  distanceKm: number;
  radiusKm: number;
  ratingAvg: number | null;
  ratingCount: number;
  availableNow: boolean;
  /** Provider confirmed status within 24h (fights stale listings). */
  statusFresh: boolean;
  /** 0..1 profile completeness. */
  completeness: number;
  verificationLevel: number; // 0..3
  /** Median first-response minutes; null when unknown. */
  responseMinutes: number | null;
}

/** Prior used for Bayesian rating so new providers aren't buried (PRD: fair discovery). */
const PRIOR_MEAN = 4.2;
const PRIOR_WEIGHT = 5;

export function bayesianRating(avg: number | null, count: number): number {
  const sum = (avg ?? 0) * count;
  return (sum + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT);
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function rankScore(i: RankingInput, w: RankingWeights = DEFAULT_RANKING_WEIGHTS): number {
  const distance = clamp01(1 - i.distanceKm / Math.max(i.radiusKm, 0.5));
  const rating = clamp01((bayesianRating(i.ratingAvg, i.ratingCount) - 1) / 4);
  const availability = (i.availableNow ? 0.8 : 0) + (i.statusFresh ? 0.2 : 0);
  const completeness = clamp01(i.completeness * 0.7 + (i.verificationLevel / 3) * 0.3);
  const responsiveness = i.responseMinutes == null ? 0.5 : clamp01(1 - i.responseMinutes / 240);
  return (
    w.relevance * clamp01(i.relevance) +
    w.distance * distance +
    w.rating * rating +
    w.availability * availability +
    w.completeness * completeness +
    w.responsiveness * responsiveness
  );
}
