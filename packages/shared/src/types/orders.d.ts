/**
 * Order Types for P2P Energy Trading
 */
import { Price, TimeWindow } from './beckn';
export type OrderStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export interface OrderItem {
    item_id: string;
    offer_id: string;
    provider_id: string;
    quantity: number;
    price: Price;
    timeWindow: TimeWindow;
    source_type?: string;
}
export interface Quote {
    price: Price;
    totalQuantity: number;
    breakdown?: QuoteBreakdown[];
}
export interface QuoteBreakdown {
    title: string;
    price: Price;
}
export interface Order {
    id: string;
    transaction_id: string;
    status: OrderStatus;
    items: OrderItem[];
    quote: Quote;
    created_at: string;
    updated_at: string;
}
export interface SelectOrderItem {
    item_id: string;
    offer_id: string;
    quantity: number;
}
export interface Fulfillment {
    id: string;
    type: 'ENERGY_DELIVERY';
    state: {
        descriptor: {
            code: string;
            name: string;
        };
    };
    start?: {
        time: TimeWindow;
    };
    end?: {
        time: TimeWindow;
    };
}
