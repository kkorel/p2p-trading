/**
 * Shared Seed Data for P2P Energy Trading
 */
import { SourceType, DeliveryMode, OfferAttributes } from '../types/catalog';
import { TimeWindow } from '../types/beckn';

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

export declare function generateSeedData(): SeedData;
