"use strict";
/**
 * Shared Seed Data for P2P Energy Trading
 * Used by both BPP and CDS services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSeedData = generateSeedData;

// Get tomorrow's date for realistic time windows
function getTomorrowDateStr() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Generate seed data with proper date-based time windows
 */
function generateSeedData() {
    const dateStr = getTomorrowDateStr();
    return {
        providers: [
            {
                id: 'provider-solar-alpha',
                name: 'Alpha Solar Energy',
                trust_score: 0.85,
                total_orders: 20,
                successful_orders: 17,
            },
            {
                id: 'provider-solar-beta',
                name: 'Beta Green Power',
                trust_score: 0.60,
                total_orders: 5,
                successful_orders: 3,
            },
        ],
        items: [
            {
                id: 'item-solar-001',
                provider_id: 'provider-solar-alpha',
                source_type: 'SOLAR',
                delivery_mode: 'SCHEDULED',
                available_qty: 100,
                meter_id: 'MTR-ALPHA-001',
                production_windows: [
                    { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
                ],
            },
            {
                id: 'item-solar-002',
                provider_id: 'provider-solar-beta',
                source_type: 'SOLAR',
                delivery_mode: 'SCHEDULED',
                available_qty: 150,
                meter_id: 'MTR-BETA-001',
                production_windows: [
                    { startTime: `${dateStr}T06:00:00Z`, endTime: `${dateStr}T20:00:00Z` },
                ],
            },
        ],
        offers: [
            {
                id: 'offer-alpha-morning',
                item_id: 'item-solar-001',
                provider_id: 'provider-solar-alpha',
                price_value: 0.10,
                currency: 'USD',
                max_qty: 50,
                time_window: { startTime: `${dateStr}T10:00:00Z`, endTime: `${dateStr}T14:00:00Z` },
                offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
            },
            {
                id: 'offer-beta-afternoon',
                item_id: 'item-solar-002',
                provider_id: 'provider-solar-beta',
                price_value: 0.08,
                currency: 'USD',
                max_qty: 100,
                time_window: { startTime: `${dateStr}T12:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
                offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
            },
        ],
    };
}
