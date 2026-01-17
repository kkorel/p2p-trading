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
        // Check time window overlap
        if (!(0, time_1.timeWindowsOverlap)(offer.timeWindow, criteria.requestedTimeWindow)) {
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
        const timeWindowFitScore = (0, time_1.calculateTimeWindowFit)(offer.timeWindow, criteria.requestedTimeWindow);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUF5Q0gsa0NBc0ZDO0FBS0QsZ0VBWUM7QUE1SUQsd0NBQTJFO0FBQzNFLHNDQUFtQztBQXlCbkM7O0dBRUc7QUFDSCxTQUFTLG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxRQUFnQjtJQUNqRixJQUFJLFFBQVEsS0FBSyxRQUFRO1FBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7SUFDdkUsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixXQUFXLENBQ3pCLE1BQXNCLEVBQ3RCLFNBQWdDLEVBQ2hDLFFBQTBCO0lBRTFCLE1BQU0sT0FBTyxHQUFHLGVBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBRXhDLHlEQUF5RDtJQUN6RCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzNDLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsSUFBQSx5QkFBa0IsRUFBQyxLQUFLLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDeEUsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksS0FBSyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNuRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsSUFBSSxRQUFRLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0UsT0FBTyxL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LENBQUMsQ0FBQztJQUVqRiw0REFBNEQ7SUFDNUQsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLEdBQUcsY0FBYyxDQUFDO0lBQ3pELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLHFDQUFxQztJQUU3RCxPQUFPLFdBQVcsR0FBRyxHQUFHLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQztBQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNdWx0aS1Dcml0ZXJpYSBXZWlnaHRlZCBTY29yaW5nIE1hdGNoZXIgZm9yIFAyUCBFbmVyZ3kgVHJhZGluZ1xuICogXG4gKiBCYXNlZCBvbiBVYmVyL09sYSBzdHlsZSBmaWx0ZXItdGhlbi1yYW5rIGFwcHJvYWNoOlxuICogMS4gSGFyZCBmaWx0ZXJzOiB0aW1lIHdpbmRvdyBvdmVybGFwLCBxdWFudGl0eSBhdmFpbGFibGVcbiAqIDIuIFNvZnQgc2NvcmluZzogcHJpY2UsIHRydXN0LCB0aW1lIHdpbmRvdyBmaXRcbiAqL1xuXG5pbXBvcnQgeyBDYXRhbG9nT2ZmZXIsIFByb3ZpZGVyIH0gZnJvbSAnLi4vdHlwZXMvY2F0YWxvZyc7XG5pbXBvcnQgeyBUaW1lV2luZG93IH0gZnJvbSAnLi4vdHlwZXMvYmVja24nO1xuaW1wb3J0IHsgdGltZVdpbmRvd3NPdmVybGFwLCBjYWxjdWxhdGVUaW1lV2luZG93Rml0IH0gZnJvbSAnLi4vdXRpbHMvdGltZSc7XG5pbXBvcnQgeyBjb25maWcgfSBmcm9tICcuLi9jb25maWcnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoaW5nQ3JpdGVyaWEge1xuICByZXF1ZXN0ZWRRdWFudGl0eTogbnVtYmVyO1xuICByZXF1ZXN0ZWRUaW1lV2luZG93OiBUaW1lV2luZG93O1xuICBtYXhQcmljZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTY29yZWRPZmZlciB7XG4gIG9mZmVyOiBDYXRhbG9nT2ZmZXI7XG4gIHByb3ZpZGVyOiBQcm92aWRlcjtcbiAgc2NvcmU6IG51bWJlcjtcbiAgYnJlYWtkb3duOiB7XG4gICAgcHJpY2VTY29yZTogbnVtYmVyO1xuICAgIHRydXN0U2NvcmU6IG51bWJlcjtcbiAgICB0aW1lV2luZG93Rml0U2NvcmU6IG51bWJlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaGluZ1Jlc3VsdCB7XG4gIHNlbGVjdGVkT2ZmZXI6IFNjb3JlZE9mZmVyIHwgbnVsbDtcbiAgYWxsT2ZmZXJzOiBTY29yZWRPZmZlcltdO1xuICByZWFzb24/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIHByaWNlIHNjb3JlIChsb3dlciBwcmljZSA9IGhpZ2hlciBzY29yZSlcbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlUHJpY2VTY29yZShvZmZlclByaWNlOiBudW1iZXIsIG1pblByaWNlOiBudW1iZXIsIG1heFByaWNlOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAobWF4UHJpY2UgPT09IG1pblByaWNlKSByZXR1cm4gMTsgLy8gQWxsIHNhbWUgcHJpY2UsIGdpdmUgZnVsbCBzY29yZVxuICByZXR1cm4gKG1heFByaWNlIC0gb2ZmZXJQcmljZSkgLyAobWF4UHJpY2UgLSBtaW5QcmljZSk7XG59XG5cbi8qKlxuICogTWFpbiBtYXRjaGluZyBmdW5jdGlvbiAtIGZpbHRlcnMgYW5kIHJhbmtzIG9mZmVyc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hPZmZlcnMoXG4gIG9mZmVyczogQ2F0YWxvZ09mZmVyW10sXG4gIHByb3ZpZGVyczogTWFwPHN0cmluZywgUHJvdmlkZXI+LFxuICBjcml0ZXJpYTogTWF0Y2hpbmdDcml0ZXJpYVxuKTogTWF0Y2hpbmdSZXN1bHQge1xuICBjb25zdCB3ZWlnaHRzID0gY29uZmlnLm1hdGNoaW5nLndlaWdodHM7XG4gIFxuICAvLyBTdGVwIDE6IEhhcmQgZmlsdGVyIC0gdGltZSB3aW5kb3cgb3ZlcmxhcCBhbmQgcXVhbnRpdHlcbiAgY29uc3QgZWxpZ2libGVPZmZlcnMgPSBvZmZlcnMuZmlsdGVyKG9mZmVyID0+IHtcbiAgICAvLyBDaGVjayB0aW1lIHdpbmRvdyBvdmVybGFwXG4gICAgaWYgKCF0aW1lV2luZG93c092ZXJsYXAob2ZmZXIudGltZVdpbmRvdywgY3JpdGVyaWEucmVxdWVzdGVkVGltZVdpbmRvdykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgcXVhbnRpdHkgYXZhaWxhYmxlXG4gICAgaWYgKG9mZmVyLm1heFF1YW50aXR5IDwgY3JpdGVyaWEucmVxdWVzdGVkUXVhbnRpdHkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgbWF4IHByaWNlIGlmIHNwZWNpZmllZFxuICAgIGlmIChjcml0ZXJpYS5tYXhQcmljZSAhPT0gdW5kZWZpbmVkICYmIG9mZmVyLnByaWNlLnZhbHVlID4gY3JpdGVyaWEubWF4UHJpY2UpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgbWluaW11bSB0cnVzdCB0aHJlc2hvbGRcbiAgICBjb25zdCBwcm92aWRlciA9IHByb3ZpZGVycy5nZXQob2ZmZXIucHJvdmlkZXJfaWQpO1xuICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlci50cnVzdF9zY29yZSA8IGNvbmZpZy5tYXRjaGluZy5taW5UcnVzdFRocmVzaG9sZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIFxuICBpZiAoZWxpZ2libGVPZmZlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlbGVjdGVkT2ZmZXI6IG51bGwsXG4gICAgICBhbGxPZmZlcnM6IFtdLFxuICAgICAgcmVhc29uOiAnTm8gb2ZmZXJzIG1hdGNoIHRoZSBjcml0ZXJpYSAodGltZSB3aW5kb3csIHF1YW50aXR5LCBvciB0cnVzdCB0aHJlc2hvbGQpJyxcbiAgICB9O1xuICB9XG4gIFxuICAvLyBTdGVwIDI6IENhbGN1bGF0ZSBwcmljZSByYW5nZSBmb3Igbm9ybWFsaXphdGlvblxuICBjb25zdCBwcmljZXMgPSBlbGlnaWJsZU9mZmVycy5tYXAobyA9PiBvLnByaWNlLnZhbHVlKTtcbiAgY29uc3QgbWluUHJpY2UgPSBNYXRoLm1pbiguLi5wcmljZXMpO1xuICBjb25zdCBtYXhQcmljZSA9IE1hdGgubWF4KC4uLnByaWNlcyk7XG4gIFxuICAvLyBTdGVwIDM6IFNjb3JlIGVhY2ggZWxpZ2libGUgb2ZmZXJcbiAgY29uc3Qgc2NvcmVkT2ZmZXJzOiBTY29yZWRPZmZlcltdID0gZWxpZ2libGVPZmZlcnMubWFwKG9mZmVyID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IHByb3ZpZGVycy5nZXQob2ZmZXIucHJvdmlkZXJfaWQpIHx8IHtcbiAgICAgIGlkOiBvZmZlci5wcm92aWRlcl9pZCxcbiAgICAgIG5hbWU6ICdVbmtub3duIFByb3ZpZGVyJyxcbiAgICAgIHRydXN0X3Njb3JlOiBjb25maWcubWF0Y2hpbmcuZGVmYXVsdFRydXN0U2NvcmUsXG4gICAgICB0b3RhbF9vcmRlcnM6IDAsXG4gICAgICBzdWNjZXNzZnVsX29yZGVyczogMCxcbiAgICB9O1xuICAgIFxuICAgIC8vIENhbGN1bGF0ZSBpbmRpdmlkdWFsIHNjb3Jlc1xuICAgIGNvbnN0IHByaWNlU2NvcmUgPSBjYWxjdWxhdGVQcmljZVNjb3JlKG9mZmVyLnByaWNlLnZhbHVlLCBtaW5QcmljZSwgbWF4UHJpY2UpO1xuICAgIGNvbnN0IHRydXN0U2NvcmUgPSBwcm92aWRlci50cnVzdF9zY29yZTtcbiAgICBjb25zdCB0aW1lV2luZG93Rml0U2NvcmUgPSBjYWxjdWxhdGVUaW1lV2luZG93Rml0KG9mZmVyLnRpbWVXaW5kb3csIGNyaXRlcmlhLnJlcXVlc3RlZFRpbWVXaW5kb3cpO1xuICAgIFxuICAgIC8vIENhbGN1bGF0ZSB3ZWlnaHRlZCB0b3RhbCBzY29yZVxuICAgIGNvbnN0IHNjb3JlID0gXG4gICAgICB3ZWlnaHRzLnByaWNlICogcHJpY2VTY29yZSArXG4gICAgICB3ZWlnaHRzLnRydXN0ICogdHJ1c3RTY29yZSArXG4gICAgICB3ZWlnaHRzLnRpbWVXaW5kb3dGaXQgKiB0aW1lV2luZG93Rml0U2NvcmU7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIG9mZmVyLFxuICAgICAgcHJvdmlkZXIsXG4gICAgICBzY29yZSxcbiAgICAgIGJyZWFrZG93bjoge1xuICAgICAgICBwcmljZVNjb3JlLFxuICAgICAgICB0cnVzdFNjb3JlLFxuICAgICAgICB0aW1lV2luZG93Rml0U2NvcmUsXG4gICAgICB9LFxuICAgIH07XG4gIH0pO1xuICBcbiAgLy8gU3RlcCA0OiBTb3J0IGJ5IHNjb3JlIGRlc2NlbmRpbmdcbiAgc2NvcmVkT2ZmZXJzLnNvcnQoKGEsIGIpID0+IGIuc2NvcmUgLSBhLnNjb3JlKTtcbiAgXG4gIHJldHVybiB7XG4gICAgc2VsZWN0ZWRPZmZlcjogc2NvcmVkT2ZmZXJzWzBdIHx8IG51bGwsXG4gICAgYWxsT2ZmZXJzOiBzY29yZWRPZmZlcnMsXG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIHByb3ZpZGVyIHRydXN0IHNjb3JlIGFmdGVyIG9yZGVyIGNvbXBsZXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZVVwZGF0ZWRUcnVzdFNjb3JlKFxuICBwcm92aWRlcjogUHJvdmlkZXIsXG4gIHdhc1N1Y2Nlc3NmdWw6IGJvb2xlYW5cbik6IG51bWJlciB7XG4gIGNvbnN0IG5ld1RvdGFsT3JkZXJzID0gcHJvdmlkZXIudG90YWxfb3JkZXJzICsgMTtcbiAgY29uc3QgbmV3U3VjY2Vzc2Z1bE9yZGVycyA9IHByb3ZpZGVyLnN1Y2Nlc3NmdWxfb3JkZXJzICsgKHdhc1N1Y2Nlc3NmdWwgPyAxIDogMCk7XG4gIFxuICAvLyBUcnVzdCBmb3JtdWxhOiA3MCUgYmFzZWQgb24gc3VjY2VzcyByYXRlLCAzMCUgYmFzZSByYXRpbmdcbiAgY29uc3Qgc3VjY2Vzc1JhdGUgPSBuZXdTdWNjZXNzZnVsT3JkZXJzIC8gbmV3VG90YWxPcmRlcnM7XG4gIGNvbnN0IGJhc2VSYXRpbmcgPSAwLjU7IC8vIENvdWxkIGJlIGV4dGVybmFsIHJhdGluZyBpbiBmdXR1cmVcbiAgXG4gIHJldHVybiBzdWNjZXNzUmF0ZSAqIDAuNyArIGJhc2VSYXRpbmcgKiAwLjM7XG59XG4iXX0=