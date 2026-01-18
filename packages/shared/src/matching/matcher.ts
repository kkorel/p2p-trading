/**
 * Multi-Criteria Weighted Scoring Matcher for P2P Energy Trading
 * 
 * Based on Uber/Ola style filter-then-rank approach:
 * 1. Hard filters: time window overlap, quantity available
 * 2. Soft scoring: price, trust, time window fit
 */

import { CatalogOffer, Provider } from '../types/catalog';
import { TimeWindow } from '../types/beckn';
import { timeWindowsOverlap, calculateTimeWindowFit } from '../utils/time';
import { config } from '../config';

export interface MatchingCriteria {
  requestedQuantity: number;
  requestedTimeWindow: TimeWindow;
  maxPrice?: number;
}

export interface ScoredOffer {
  offer: CatalogOffer;
  provider: Provider;
  score: number;
  breakdown: {
    priceScore: number;
    trustScore: number;
    timeWindowFitScore: number;
  };
}

export interface MatchingResult {
  selectedOffer: ScoredOffer | null;
  allOffers: ScoredOffer[];
  reason?: string;
}

/**
 * Normalize price score (lower price = higher score)
 */
function calculatePriceScore(offerPrice: number, minPrice: number, maxPrice: number): number {
  if (maxPrice === minPrice) return 1; // All same price, give full score
  return (maxPrice - offerPrice) / (maxPrice - minPrice);
}

/**
 * Main matching function - filters and ranks offers
 */
export function matchOffers(
  offers: CatalogOffer[],
  providers: Map<string, Provider>,
  criteria: MatchingCriteria
): MatchingResult {
  const weights = config.matching.weights;
  
  // Step 1: Hard filter - time window overlap and quantity
  const eligibleOffers = offers.filter(offer => {
    // Check time window overlap (handle missing timeWindow gracefully)
    const offerTimeWindow = offer.timeWindow || undefined;
    if (!timeWindowsOverlap(offerTimeWindow, criteria.requestedTimeWindow)) {
      return false;
    }
    
    // Check quantity available
    if (offer.maxQuantity < criteria.requestedQuantity) {
      return false;
    }
    
    // Check max price if specified
    if (criteria.maxPrice !== undefined && offer.price.value > criteria.maxPrice) {
      return false;
    }
    
    // Check minimum trust threshold
    const provider = providers.get(offer.provider_id);
    if (provider && provider.trust_score < config.matching.minTrustThreshold) {
      return false;
    }
    
    return true;
  });
  
  if (eligibleOffers.length === 0) {
    return {
      selectedOffer: null,
      allOffers: [],
      reason: 'No offers match the criteria (time window, quantity, or trust threshold)',
    };
  }
  
  // Step 2: Calculate price range for normalization
  const prices = eligibleOffers.map(o => o.price.value);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Step 3: Score each eligible offer
  const scoredOffers: ScoredOffer[] = eligibleOffers.map(offer => {
    const provider = providers.get(offer.provider_id) || {
      id: offer.provider_id,
      name: 'Unknown Provider',
      trust_score: config.matching.defaultTrustScore,
      total_orders: 0,
      successful_orders: 0,
    };
    
    // Calculate individual scores
    const priceScore = calculatePriceScore(offer.price.value, minPrice, maxPrice);
    const trustScore = provider.trust_score;
    const offerTimeWindow = offer.timeWindow || undefined;
    const timeWindowFitScore = calculateTimeWindowFit(offerTimeWindow, criteria.requestedTimeWindow);
    
    // Calculate weighted total score
    const score = 
      weights.price * priceScore +
      weights.trust * trustScore +
      weights.timeWindowFit * timeWindowFitScore;
    
    return {
      offer,
      provider,
      score,
      breakdown: {
        priceScore,
        trustScore,
        timeWindowFitScore,
      },
    };
  });
  
  // Step 4: Sort by score descending
  scoredOffers.sort((a, b) => b.score - a.score);
  
  return {
    selectedOffer: scoredOffers[0] || null,
    allOffers: scoredOffers,
  };
}

/**
 * Update provider trust score after order completion
 */
export function calculateUpdatedTrustScore(
  provider: Provider,
  wasSuccessful: boolean
): number {
  const newTotalOrders = provider.total_orders + 1;
  const newSuccessfulOrders = provider.successful_orders + (wasSuccessful ? 1 : 0);
  
  // Trust formula: 70% based on success rate, 30% base rating
  const successRate = newSuccessfulOrders / newTotalOrders;
  const baseRating = 0.5; // Could be external rating in future
  
  return successRate * 0.7 + baseRating * 0.3;
}
