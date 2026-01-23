/**
 * Catalog Types for P2P Energy Trading
 * Based on Beckn EnergyResource and EnergyTradeOffer attributes
 */
import { TimeWindow, Price } from './beckn';
export type SourceType = 'SOLAR' | 'WIND' | 'HYDRO' | 'BIOMASS' | 'GRID';
export type DeliveryMode = 'SCHEDULED';
export interface ItemAttributes {
    sourceType: SourceType;
    deliveryMode: DeliveryMode;
    meterId: string;
    availableQuantity: number;
    productionWindow: TimeWindow[];
}
export interface CatalogItem {
    id: string;
    descriptor?: {
        name: string;
        description?: string;
    };
    provider_id: string;
    itemAttributes: ItemAttributes;
    offers: CatalogOffer[];
}
export type PricingModel = 'PER_KWH' | 'FLAT_RATE' | 'TIME_OF_USE';
export type SettlementType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'INSTANT';
export interface OfferAttributes {
    pricingModel: PricingModel;
    settlementType: SettlementType;
}
export interface CatalogOffer {
    id: string;
    item_id: string;
    provider_id: string;
    offerAttributes: OfferAttributes;
    price: Price;
    maxQuantity: number;
    timeWindow: TimeWindow;
}
export interface Provider {
    id: string;
    name: string;
    trust_score: number;
    total_orders: number;
    successful_orders: number;
}
export interface Catalog {
    providers: ProviderCatalog[];
}
export interface ProviderCatalog {
    id: string;
    descriptor?: {
        name: string;
    };
    items: CatalogItem[];
}
