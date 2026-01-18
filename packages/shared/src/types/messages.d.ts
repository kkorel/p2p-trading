/**
 * Beckn Message Types for P2P Energy Trading
 * Defines the structure of discover/select/init/confirm/status messages
 */
import { BecknMessage, TimeWindow, Quantity } from './beckn';
import { Catalog, SourceType, DeliveryMode } from './catalog';
import { Order, SelectOrderItem, Quote, Fulfillment } from './orders';
export interface DiscoverFilters {
    type: 'jsonpath';
    expression: string;
}
export interface DiscoverIntent {
    item?: {
        itemAttributes?: {
            sourceType?: SourceType;
            deliveryMode?: DeliveryMode;
            availableQuantity?: number;
        };
    };
    fulfillment?: {
        time?: TimeWindow;
    };
    quantity?: Quantity;
}
export interface DiscoverMessageContent {
    intent?: DiscoverIntent;
    filters?: DiscoverFilters;
}
export type DiscoverMessage = BecknMessage<DiscoverMessageContent>;
export interface OnDiscoverMessageContent {
    catalog: Catalog;
}
export type OnDiscoverMessage = BecknMessage<OnDiscoverMessageContent>;
export interface SelectMessageContent {
    orderItems: SelectOrderItem[];
}
export type SelectMessage = BecknMessage<SelectMessageContent>;
export interface OnSelectMessageContent {
    order: {
        id: string;
        items: SelectOrderItem[];
        quote: Quote;
        provider: {
            id: string;
            descriptor?: {
                name: string;
            };
        };
    };
}
export type OnSelectMessage = BecknMessage<OnSelectMessageContent>;
export interface InitMessageContent {
    order: {
        id?: string;
        items: SelectOrderItem[];
        provider: {
            id: string;
        };
        quote?: Quote;
    };
}
export type InitMessage = BecknMessage<InitMessageContent>;
export interface OnInitMessageContent {
    order: Order;
}
export type OnInitMessage = BecknMessage<OnInitMessageContent>;
export interface ConfirmMessageContent {
    order: {
        id: string;
    };
}
export type ConfirmMessage = BecknMessage<ConfirmMessageContent>;
export interface OnConfirmMessageContent {
    order: Order;
}
export type OnConfirmMessage = BecknMessage<OnConfirmMessageContent>;
export interface StatusMessageContent {
    order_id: string;
}
export type StatusMessage = BecknMessage<StatusMessageContent>;
export interface OnStatusMessageContent {
    order: Order;
    fulfillment?: Fulfillment;
}
export type OnStatusMessage = BecknMessage<OnStatusMessageContent>;
