/**
 * Shared Seed Data for P2P Energy Trading
 * Used by both BPP and CDS services
 */

import { SourceType, DeliveryMode, OfferAttributes } from '../types/catalog';
import { TimeWindow } from '../types/beckn';

// Get tomorrow's date for realistic time windows
function getTomorrowDateStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export interface SeedProvider {
  id: string;
  name: string;
  trust_score: number;
  total_orders: number;
  successful_orders: number;
}

export interface SeedItem {
  id: string;
  provider_id: string;
  source_type: SourceType;
  delivery_mode: DeliveryMode;
  available_qty: number;
  meter_id: string;
  production_windows: TimeWindow[];
}

export interface SeedOffer {
  id: string;
  item_id: string;
  provider_id: string;
  price_value: number;
  currency: string;
  max_qty: number;
  time_window: TimeWindow;
  offer_attributes: OfferAttributes;
}

export interface SeedData {
  providers: SeedProvider[];
  items: SeedItem[];
  offers: SeedOffer[];
}

/**
 * Generate seed data with proper date-based time windows
 * Includes 5 providers with varying trust scores and 10 diverse offers
 * for demonstrating AI agent decision-making intelligence
 */
export function generateSeedData(): SeedData {
  const dateStr = getTomorrowDateStr();

  return {
    // ==================== 5 PROVIDERS (Varying Trust Levels) ====================
    providers: [
      {
        id: 'provider-sunpeak',
        name: 'SunPeak Energy',
        trust_score: 0.95,  // Premium, established provider
        total_orders: 150,
        successful_orders: 143,
      },
      {
        id: 'provider-windflow',
        name: 'WindFlow Systems',
        trust_score: 0.80,  // Reliable wind company
        total_orders: 80,
        successful_orders: 64,
      },
      {
        id: 'provider-greengrid',
        name: 'GreenGrid Co',
        trust_score: 0.65,  // Mid-tier mixed energy
        total_orders: 40,
        successful_orders: 26,
      },
      {
        id: 'provider-budgetpower',
        name: 'BudgetPower Inc',
        trust_score: 0.40,  // Cheap but unreliable
        total_orders: 25,
        successful_orders: 10,
      },
      {
        id: 'provider-newwave',
        name: 'NewWave Energy',
        trust_score: 0.25,  // New player, unproven
        total_orders: 8,
        successful_orders: 2,
      },
    ],

    // ==================== ITEMS (Energy Sources per Provider) ====================
    items: [
      // SunPeak - Solar only (premium)
      {
        id: 'item-sunpeak-solar',
        provider_id: 'provider-sunpeak',
        source_type: 'SOLAR',
        delivery_mode: 'SCHEDULED',
        available_qty: 200,
        meter_id: 'MTR-SUNPEAK-001',
        production_windows: [
          { startTime: `${dateStr}T06:00:00Z`, endTime: `${dateStr}T20:00:00Z` },
        ],
      },
      // WindFlow - Wind energy
      {
        id: 'item-windflow-wind',
        provider_id: 'provider-windflow',
        source_type: 'WIND',
        delivery_mode: 'SCHEDULED',
        available_qty: 300,
        meter_id: 'MTR-WINDFLOW-001',
        production_windows: [
          { startTime: `${dateStr}T00:00:00Z`, endTime: `${dateStr}T23:59:59Z` },
        ],
      },
      // GreenGrid - Solar
      {
        id: 'item-greengrid-solar',
        provider_id: 'provider-greengrid',
        source_type: 'SOLAR',
        delivery_mode: 'SCHEDULED',
        available_qty: 150,
        meter_id: 'MTR-GREENGRID-001',
        production_windows: [
          { startTime: `${dateStr}T07:00:00Z`, endTime: `${dateStr}T19:00:00Z` },
        ],
      },
      // GreenGrid - Hydro
      {
        id: 'item-greengrid-hydro',
        provider_id: 'provider-greengrid',
        source_type: 'HYDRO',
        delivery_mode: 'SCHEDULED',
        available_qty: 100,
        meter_id: 'MTR-GREENGRID-002',
        production_windows: [
          { startTime: `${dateStr}T00:00:00Z`, endTime: `${dateStr}T23:59:59Z` },
        ],
      },
      // BudgetPower - Solar (cheap)
      {
        id: 'item-budgetpower-solar',
        provider_id: 'provider-budgetpower',
        source_type: 'SOLAR',
        delivery_mode: 'SCHEDULED',
        available_qty: 250,
        meter_id: 'MTR-BUDGET-001',
        production_windows: [
          { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
        ],
      },
      // BudgetPower - Wind (cheapest)
      {
        id: 'item-budgetpower-wind',
        provider_id: 'provider-budgetpower',
        source_type: 'WIND',
        delivery_mode: 'SCHEDULED',
        available_qty: 400,
        meter_id: 'MTR-BUDGET-002',
        production_windows: [
          { startTime: `${dateStr}T00:00:00Z`, endTime: `${dateStr}T23:59:59Z` },
        ],
      },
      // NewWave - Solar
      {
        id: 'item-newwave-solar',
        provider_id: 'provider-newwave',
        source_type: 'SOLAR',
        delivery_mode: 'SCHEDULED',
        available_qty: 100,
        meter_id: 'MTR-NEWWAVE-001',
        production_windows: [
          { startTime: `${dateStr}T09:00:00Z`, endTime: `${dateStr}T17:00:00Z` },
        ],
      },
      // NewWave - Hydro
      {
        id: 'item-newwave-hydro',
        provider_id: 'provider-newwave',
        source_type: 'HYDRO',
        delivery_mode: 'SCHEDULED',
        available_qty: 60,
        meter_id: 'MTR-NEWWAVE-002',
        production_windows: [
          { startTime: `${dateStr}T00:00:00Z`, endTime: `${dateStr}T23:59:59Z` },
        ],
      },
    ],

    // ==================== 10 OFFERS (Strategic Trade-offs) ====================
    offers: [
      // Offer 1: SunPeak Solar Morning - Premium but expensive
      {
        id: 'offer-01-sunpeak-morning',
        item_id: 'item-sunpeak-solar',
        provider_id: 'provider-sunpeak',
        price_value: 0.14,
        currency: 'USD',
        max_qty: 30,
        time_window: { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T12:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 2: SunPeak Solar Afternoon - Best overall for quality
      {
        id: 'offer-02-sunpeak-afternoon',
        item_id: 'item-sunpeak-solar',
        provider_id: 'provider-sunpeak',
        price_value: 0.12,
        currency: 'USD',
        max_qty: 50,
        time_window: { startTime: `${dateStr}T12:00:00Z`, endTime: `${dateStr}T16:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 3: WindFlow All-Day - Good value, reliable wind
      {
        id: 'offer-03-windflow-allday',
        item_id: 'item-windflow-wind',
        provider_id: 'provider-windflow',
        price_value: 0.09,
        currency: 'USD',
        max_qty: 80,
        time_window: { startTime: `${dateStr}T06:00:00Z`, endTime: `${dateStr}T20:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 4: WindFlow Midday - Cheap but small quantity
      {
        id: 'offer-04-windflow-midday',
        item_id: 'item-windflow-wind',
        provider_id: 'provider-windflow',
        price_value: 0.07,
        currency: 'USD',
        max_qty: 20,
        time_window: { startTime: `${dateStr}T10:00:00Z`, endTime: `${dateStr}T14:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 5: GreenGrid Solar - Large quantity, medium trust
      {
        id: 'offer-05-greengrid-solar',
        item_id: 'item-greengrid-solar',
        provider_id: 'provider-greengrid',
        price_value: 0.10,
        currency: 'USD',
        max_qty: 100,
        time_window: { startTime: `${dateStr}T09:00:00Z`, endTime: `${dateStr}T17:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 6: GreenGrid Hydro - Alternative energy source
      {
        id: 'offer-06-greengrid-hydro',
        item_id: 'item-greengrid-hydro',
        provider_id: 'provider-greengrid',
        price_value: 0.11,
        currency: 'USD',
        max_qty: 60,
        time_window: { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T18:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 7: BudgetPower Solar - Very cheap but risky (40% trust)
      {
        id: 'offer-07-budget-solar',
        item_id: 'item-budgetpower-solar',
        provider_id: 'provider-budgetpower',
        price_value: 0.05,
        currency: 'USD',
        max_qty: 150,
        time_window: { startTime: `${dateStr}T10:00:00Z`, endTime: `${dateStr}T16:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 8: BudgetPower Wind - Cheapest offer, lowest trust
      {
        id: 'offer-08-budget-wind',
        item_id: 'item-budgetpower-wind',
        provider_id: 'provider-budgetpower',
        price_value: 0.04,
        currency: 'USD',
        max_qty: 200,
        time_window: { startTime: `${dateStr}T08:00:00Z`, endTime: `${dateStr}T20:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 9: NewWave Solar - New provider, very low trust
      {
        id: 'offer-09-newwave-solar',
        item_id: 'item-newwave-solar',
        provider_id: 'provider-newwave',
        price_value: 0.06,
        currency: 'USD',
        max_qty: 75,
        time_window: { startTime: `${dateStr}T11:00:00Z`, endTime: `${dateStr}T15:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
      // Offer 10: NewWave Hydro - Unproven hydro option
      {
        id: 'offer-10-newwave-hydro',
        item_id: 'item-newwave-hydro',
        provider_id: 'provider-newwave',
        price_value: 0.08,
        currency: 'USD',
        max_qty: 40,
        time_window: { startTime: `${dateStr}T09:00:00Z`, endTime: `${dateStr}T13:00:00Z` },
        offer_attributes: { pricingModel: 'PER_KWH', settlementType: 'DAILY' },
      },
    ],
  };
}
