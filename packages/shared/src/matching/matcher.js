"use strict";
/**
 * Multi-Criteria Weighted Scoring Matcher for P2P Energy Trading
 *
 * Based on Uber/Ola style filter-then-rank approach:
 * 1. Hard filters: time window overlap, quantity available
 * 2. Soft scoring: price, trust, time window fit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchOffers = matchOffers;
exports.calculateUpdatedTrustScore = calculateUpdatedTrustScore;
const time_1 = require("../utils/time");
const config_1 = require("../config");
/**
 * Normalize price score (lower price = higher score)
 */
function calculatePriceScore(offerPrice, minPrice, maxPrice) {
    if (maxPrice === minPrice)
        return 1; // All same price, give full score
    return (maxPrice - offerPrice) / (maxPrice - minPrice);
}
/**
 * Main matching function - filters and ranks offers
 */
function matchOffers(offers, providers, criteria) {
    const weights = config_1.config.matching.weights;
    // Step 1: Hard filter - time window overlap and quantity
    const eligibleOffers = offers.filter(offer => {
        // Check time window overlap (handle missing timeWindow gracefully)
        const offerTimeWindow = offer.timeWindow || undefined;
        if (!(0, time_1.timeWindowsOverlap)(offerTimeWindow, criteria.requestedTimeWindow)) {
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
        if (provider && provider.trust_score < config_1.config.matching.minTrustThreshold) {
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
    const scoredOffers = eligibleOffers.map(offer => {
        const provider = providers.get(offer.provider_id) || {
            id: offer.provider_id,
            name: 'Unknown Provider',
            trust_score: config_1.config.matching.defaultTrustScore,
            total_orders: 0,
            successful_orders: 0,
        };
        // Calculate individual scores
        const priceScore = calculatePriceScore(offer.price.value, minPrice, maxPrice);
        const trustScore = provider.trust_score;
        const offerTimeWindow = offer.timeWindow || undefined;
        const timeWindowFitScore = (0, time_1.calculateTimeWindowFit)(offerTimeWindow, criteria.requestedTimeWindow);
        // Calculate weighted total score
        const score = weights.price * priceScore +
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
function calculateUpdatedTrustScore(provider, wasSuccessful) {
    const newTotalOrders = provider.total_orders + 1;
    const newSuccessfulOrders = provider.successful_orders + (wasSuccessful ? 1 : 0);
    // Trust formula: 70% based on success rate, 30% base rating
    const successRate = newSuccessfulOrders / newTotalOrders;
    const baseRating = 0.5; // Could be external rating in future
    return successRate * 0.7 + baseRating * 0.3;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUF5Q0gsa0NBd0ZDO0FBS0QsZ0VBWUM7QUE5SUQsd0NBQTJFO0FBQzNFLHNDQUFtQztBQXlCbkM7O0dBRUc7QUFDSCxTQUFTLG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxRQUFnQjtJQUNqRixJQUFJLFFBQVEsS0FBSyxRQUFRO1FBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7SUFDdkUsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixXQUFXLENBQ3pCLE1BQXNCLEVBQ3RCLFNBQWdDLEVBQ2hDLFFBQTBCO0lBRTFCLE1BQU0sT0FBTyxHQUFHLGVBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBRXhDLHlEQUF5RDtJQUN6RCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzNDLG1FQUFtRTtRQUNuRSxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsVUFBVSxJQUFJLFNBQVMsQ0FBQztRQUN0RCxJQUFJLENBQUMsSUFBQSx5QkFBa0IsRUFBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxLQUFLLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ25ELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELCtCQUErQjtRQUMvQixJQUFJLFFBQVEsQ0FBQyxRQUFRLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxH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QkFBbUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFakYsNERBQTREO0lBQzVELE1BQU0sV0FBVyxHQUFHLG1CQUFtQixHQUFHLGNBQWMsQ0FBQztJQUN6RCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQyxxQ0FBcUM7SUFFN0QsT0FBTyxXQUFXLEdBQUcsR0FBRyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUM7QUFDOUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTXVsdGktQ3JpdGVyaWEgV2VpZ2h0ZWQgU2NvcmluZyBNYXRjaGVyIGZvciBQMlAgRW5lcmd5IFRyYWRpbmdcbiAqIFxuICogQmFzZWQgb24gVWJlci9PbGEgc3R5bGUgZmlsdGVyLXRoZW4tcmFuayBhcHByb2FjaDpcbiAqIDEuIEhhcmQgZmlsdGVyczogdGltZSB3aW5kb3cgb3ZlcmxhcCwgcXVhbnRpdHkgYXZhaWxhYmxlXG4gKiAyLiBTb2Z0IHNjb3Jpbmc6IHByaWNlLCB0cnVzdCwgdGltZSB3aW5kb3cgZml0XG4gKi9cblxuaW1wb3J0IHsgQ2F0YWxvZ09mZmVyLCBQcm92aWRlciB9IGZyb20gJy4uL3R5cGVzL2NhdGFsb2cnO1xuaW1wb3J0IHsgVGltZVdpbmRvdyB9IGZyb20gJy4uL3R5cGVzL2JlY2tuJztcbmltcG9ydCB7IHRpbWVXaW5kb3dzT3ZlcmxhcCwgY2FsY3VsYXRlVGltZVdpbmRvd0ZpdCB9IGZyb20gJy4uL3V0aWxzL3RpbWUnO1xuaW1wb3J0IHsgY29uZmlnIH0gZnJvbSAnLi4vY29uZmlnJztcblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaGluZ0NyaXRlcmlhIHtcbiAgcmVxdWVzdGVkUXVhbnRpdHk6IG51bWJlcjtcbiAgcmVxdWVzdGVkVGltZVdpbmRvdzogVGltZVdpbmRvdztcbiAgbWF4UHJpY2U/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcmVkT2ZmZXIge1xuICBvZmZlcjogQ2F0YWxvZ09mZmVyO1xuICBwcm92aWRlcjogUHJvdmlkZXI7XG4gIHNjb3JlOiBudW1iZXI7XG4gIGJyZWFrZG93bjoge1xuICAgIHByaWNlU2NvcmU6IG51bWJlcjtcbiAgICB0cnVzdFNjb3JlOiBudW1iZXI7XG4gICAgdGltZVdpbmRvd0ZpdFNjb3JlOiBudW1iZXI7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdSZXN1bHQge1xuICBzZWxlY3RlZE9mZmVyOiBTY29yZWRPZmZlciB8IG51bGw7XG4gIGFsbE9mZmVyczogU2NvcmVkT2ZmZXJbXTtcbiAgcmVhc29uPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSBwcmljZSBzY29yZSAobG93ZXIgcHJpY2UgPSBoaWdoZXIgc2NvcmUpXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVByaWNlU2NvcmUob2ZmZXJQcmljZTogbnVtYmVyLCBtaW5QcmljZTogbnVtYmVyLCBtYXhQcmljZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKG1heFByaWNlID09PSBtaW5QcmljZSkgcmV0dXJuIDE7IC8vIEFsbCBzYW1lIHByaWNlLCBnaXZlIGZ1bGwgc2NvcmVcbiAgcmV0dXJuIChtYXhQcmljZSAtIG9mZmVyUHJpY2UpIC8gKG1heFByaWNlIC0gbWluUHJpY2UpO1xufVxuXG4vKipcbiAqIE1haW4gbWF0Y2hpbmcgZnVuY3Rpb24gLSBmaWx0ZXJzIGFuZCByYW5rcyBvZmZlcnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoT2ZmZXJzKFxuICBvZmZlcnM6IENhdGFsb2dPZmZlcltdLFxuICBwcm92aWRlcnM6IE1hcDxzdHJpbmcsIFByb3ZpZGVyPixcbiAgY3JpdGVyaWE6IE1hdGNoaW5nQ3JpdGVyaWFcbik6IE1hdGNoaW5nUmVzdWx0IHtcbiAgY29uc3Qgd2VpZ2h0cyA9IGNvbmZpZy5tYXRjaGluZy53ZWlnaHRzO1xuICBcbiAgLy8gU3RlcCAxOiBIYXJkIGZpbHRlciAtIHRpbWUgd2luZG93IG92ZXJsYXAgYW5kIHF1YW50aXR5XG4gIGNvbnN0IGVsaWdpYmxlT2ZmZXJzID0gb2ZmZXJzLmZpbHRlcihvZmZlciA9PiB7XG4gICAgLy8gQ2hlY2sgdGltZSB3aW5kb3cgb3ZlcmxhcCAoaGFuZGxlIG1pc3NpbmcgdGltZVdpbmRvdyBncmFjZWZ1bGx5KVxuICAgIGNvbnN0IG9mZmVyVGltZVdpbmRvdyA9IG9mZmVyLnRpbWVXaW5kb3cgfHwgdW5kZWZpbmVkO1xuICAgIGlmICghdGltZVdpbmRvd3NPdmVybGFwKG9mZmVyVGltZVdpbmRvdywgY3JpdGVyaWEucmVxdWVzdGVkVGltZVdpbmRvdykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgcXVhbnRpdHkgYXZhaWxhYmxlXG4gICAgaWYgKG9mZmVyLm1heFF1YW50aXR5IDwgY3JpdGVyaWEucmVxdWVzdGVkUXVhbnRpdHkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgbWF4IHByaWNlIGlmIHNwZWNpZmllZFxuICAgIGlmIChjcml0ZXJpYS5tYXhQcmljZSAhPT0gdW5kZWZpbmVkICYmIG9mZmVyLnByaWNlLnZhbHVlID4gY3JpdGVyaWEubWF4UHJpY2UpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgbWluaW11bSB0cnVzdCB0aHJlc2hvbGRcbiAgICBjb25zdCBwcm92aWRlciA9IHByb3ZpZGVycy5nZXQob2ZmZXIucHJvdmlkZXJfaWQpO1xuICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlci50cnVzdF9zY29yZSA8IGNvbmZpZy5tYXRjaGluZy5taW5UcnVzdFRocmVzaG9sZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIFxuICBpZiAoZWxpZ2libGVPZmZlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlbGVjdGVkT2ZmZXI6IG51bGwsXG4gICAgICBhbGxPZmZlcnM6IFtdLFxuICAgICAgcmVhc29uOiAnTm8gb2ZmZXJzIG1hdGNoIHRoZSBjcml0ZXJpYSAodGltZSB3aW5kb3csIHF1YW50aXR5LCBvciB0cnVzdCB0aHJlc2hvbGQpJyxcbiAgICB9O1xuICB9XG4gIFxuICAvLyBTdGVwIDI6IENhbGN1bGF0ZSBwcmljZSByYW5nZSBmb3Igbm9ybWFsaXphdGlvblxuICBjb25zdCBwcmljZXMgPSBlbGlnaWJsZU9mZmVycy5tYXAobyA9PiBvLnByaWNlLnZhbHVlKTtcbiAgY29uc3QgbWluUHJpY2UgPSBNYXRoLm1pbiguLi5wcmljZXMpO1xuICBjb25zdCBtYXhQcmljZSA9IE1hdGgubWF4KC4uLnByaWNlcyk7XG4gIFxuICAvLyBTdGVwIDM6IFNjb3JlIGVhY2ggZWxpZ2libGUgb2ZmZXJcbiAgY29uc3Qgc2NvcmVkT2ZmZXJzOiBTY29yZWRPZmZlcltdID0gZWxpZ2libGVPZmZlcnMubWFwKG9mZmVyID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IHByb3ZpZGVycy5nZXQob2ZmZXIucHJvdmlkZXJfaWQpIHx8IHtcbiAgICAgIGlkOiBvZmZlci5wcm92aWRlcl9pZCxcbiAgICAgIG5hbWU6ICdVbmtub3duIFByb3ZpZGVyJyxcbiAgICAgIHRydXN0X3Njb3JlOiBjb25maWcubWF0Y2hpbmcuZGVmYXVsdFRydXN0U2NvcmUsXG4gICAgICB0b3RhbF9vcmRlcnM6IDAsXG4gICAgICBzdWNjZXNzZnVsX29yZGVyczogMCxcbiAgICB9O1xuICAgIFxuICAgIC8vIENhbGN1bGF0ZSBpbmRpdmlkdWFsIHNjb3Jlc1xuICAgIGNvbnN0IHByaWNlU2NvcmUgPSBjYWxjdWxhdGVQcmljZVNjb3JlKG9mZmVyLnByaWNlLnZhbHVlLCBtaW5QcmljZSwgbWF4UHJpY2UpO1xuICAgIGNvbnN0IHRydXN0U2NvcmUgPSBwcm92aWRlci50cnVzdF9zY29yZTtcbiAgICBjb25zdCBvZmZlclRpbWVXaW5kb3cgPSBvZmZlci50aW1lV2luZG93IHx8IHVuZGVmaW5lZDtcbiAgICBjb25zdCB0aW1lV2luZG93Rml0U2NvcmUgPSBjYWxjdWxhdGVUaW1lV2luZG93Rml0KG9mZmVyVGltZVdpbmRvdywgY3JpdGVyaWEucmVxdWVzdGVkVGltZVdpbmRvdyk7XG4gICAgXG4gICAgLy8gQ2FsY3VsYXRlIHdlaWdodGVkIHRvdGFsIHNjb3JlXG4gICAgY29uc3Qgc2NvcmUgPSBcbiAgICAgIHdlaWdodHMucHJpY2UgKiBwcmljZVNjb3JlICtcbiAgICAgIHdlaWdodHMudHJ1c3QgKiB0cnVzdFNjb3JlICtcbiAgICAgIHdlaWdodHMudGltZVdpbmRvd0ZpdCAqIHRpbWVXaW5kb3dGaXRTY29yZTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgb2ZmZXIsXG4gICAgICBwcm92aWRlcixcbiAgICAgIHNjb3JlLFxuICAgICAgYnJlYWtkb3duOiB7XG4gICAgICAgIHByaWNlU2NvcmUsXG4gICAgICAgIHRydXN0U2NvcmUsXG4gICAgICAgIHRpbWVXaW5kb3dGaXRTY29yZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfSk7XG4gIFxuICAvLyBTdGVwIDQ6IFNvcnQgYnkgc2NvcmUgZGVzY2VuZGluZ1xuICBzY29yZWRPZmZlcnMuc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xuICBcbiAgcmV0dXJuIHtcbiAgICBzZWxlY3RlZE9mZmVyOiBzY29yZWRPZmZlcnNbMF0gfHwgbnVsbCxcbiAgICBhbGxPZmZlcnM6IHNjb3JlZE9mZmVycyxcbiAgfTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgcHJvdmlkZXIgdHJ1c3Qgc2NvcmUgYWZ0ZXIgb3JkZXIgY29tcGxldGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlVXBkYXRlZFRydXN0U2NvcmUoXG4gIHByb3ZpZGVyOiBQcm92aWRlcixcbiAgd2FzU3VjY2Vzc2Z1bDogYm9vbGVhblxuKTogbnVtYmVyIHtcbiAgY29uc3QgbmV3VG90YWxPcmRlcnMgPSBwcm92aWRlci50b3RhbF9vcmRlcnMgKyAxO1xuICBjb25zdCBuZXdTdWNjZXNzZnVsT3JkZXJzID0gcHJvdmlkZXIuc3VjY2Vzc2Z1bF9vcmRlcnMgKyAod2FzU3VjY2Vzc2Z1bCA/IDEgOiAwKTtcbiAgXG4gIC8vIFRydXN0IGZvcm11bGE6IDcwJSBiYXNlZCBvbiBzdWNjZXNzIHJhdGUsIDMwJSBiYXNlIHJhdGluZ1xuICBjb25zdCBzdWNjZXNzUmF0ZSA9IG5ld1N1Y2Nlc3NmdWxPcmRlcnMgLyBuZXdUb3RhbE9yZGVycztcbiAgY29uc3QgYmFzZVJhdGluZyA9IDAuNTsgLy8gQ291bGQgYmUgZXh0ZXJuYWwgcmF0aW5nIGluIGZ1dHVyZVxuICBcbiAgcmV0dXJuIHN1Y2Nlc3NSYXRlICogMC43ICsgYmFzZVJhdGluZyAqIDAuMztcbn1cbiJdfQ==