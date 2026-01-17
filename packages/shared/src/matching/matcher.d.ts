/**
 * Multi-Criteria Weighted Scoring Matcher for P2P Energy Trading
 *
 * Based on Uber/Ola style filter-then-rank approach:
 * 1. Hard filters: time window overlap, quantity available
 * 2. Soft scoring: price, trust, time window fit
 */
import { CatalogOffer, Provider } from '../types/catalog';
import { TimeWindow } from '../types/beckn';
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
 * Main matching function - filters and ranks offers
 */
export declare function matchOffers(offers: CatalogOffer[], providers: Map<string, Provider>, criteria: MatchingCriteria): MatchingResult;
/**
 * Update provider trust score after order completion
 */
export declare function calculateUpdatedTrustScore(provider: Provider, wasSuccessful: boolean): number;
