/**
 * CDS Sync Client
 *
 * Publishes catalog data (providers, items, offers, blocks) to external CDS
 * so other BAP participants can discover your energy offers.
 *
 * Usage:
 * - Call sync functions after creating/updating offers locally
 * - All syncs are non-blocking - failures are logged but don't throw
 * - Beckn HTTP signatures are automatically added via secureAxios
 */

import { secureAxios } from '../beckn/secure-client';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { TimeWindow, Price } from '../types/beckn';

const logger = createLogger('CDS-SYNC');

// ==================== Type Definitions ====================

export interface SyncProvider {
  id: string;
  name: string;
  trust_score?: number;
}

export interface SyncItem {
  id: string;
  provider_id: string;
  source_type: string;
  delivery_mode: string;
  available_qty: number;
  production_windows: TimeWindow[];
  meter_id: string;
}

export interface SyncOffer {
  id: string;
  item_id: string;
  provider_id: string;
  price_value: number;
  currency: string;
  max_qty: number;
  time_window: TimeWindow;
  pricing_model?: string;
  settlement_type?: string;
}

export interface SyncBlocks {
  offer_id: string;
  block_ids: string[];
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  order_id?: string;
  transaction_id?: string;
}

// ==================== Configuration ====================

/**
 * Check if external CDS syncing is enabled
 */
export function isExternalCDSEnabled(): boolean {
  return config.external.useExternalCds;
}

/**
 * Get the CDS sync base URL
 */
function getCDSBaseUrl(): string {
  return config.external.cds;
}

// ==================== Sync Functions ====================

/**
 * Sync provider information to external CDS
 * Call this when a new provider is created or updated
 */
export async function syncProviderToCDS(provider: SyncProvider): Promise<boolean> {
  if (!isExternalCDSEnabled()) {
    logger.debug('External CDS sync disabled, skipping provider sync', { providerId: provider.id });
    return false;
  }

  try {
    const url = `${getCDSBaseUrl()}/sync/provider`;
    logger.info('Syncing provider to external CDS', {
      providerId: provider.id,
      name: provider.name,
      url
    });

    const response = await secureAxios.post(url, {
      id: provider.id,
      name: provider.name,
      trust_score: provider.trust_score ?? 0.5,
    });

    logger.info('Provider synced successfully', {
      providerId: provider.id,
      status: response.data.status
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to sync provider to CDS', {
      providerId: provider.id,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

/**
 * Sync catalog item (energy resource) to external CDS
 * Call this when a new item is created
 */
export async function syncItemToCDS(item: SyncItem): Promise<boolean> {
  if (!isExternalCDSEnabled()) {
    logger.debug('External CDS sync disabled, skipping item sync', { itemId: item.id });
    return false;
  }

  try {
    const url = `${getCDSBaseUrl()}/sync/item`;
    logger.info('Syncing item to external CDS', {
      itemId: item.id,
      providerId: item.provider_id,
      sourceType: item.source_type,
      url
    });

    const response = await secureAxios.post(url, {
      id: item.id,
      provider_id: item.provider_id,
      source_type: item.source_type,
      delivery_mode: item.delivery_mode || 'SCHEDULED',
      available_qty: item.available_qty,
      production_windows: item.production_windows,
      meter_id: item.meter_id,
    });

    logger.info('Item synced successfully', {
      itemId: item.id,
      status: response.data.status
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to sync item to CDS', {
      itemId: item.id,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

/**
 * Sync offer (pricing + time window) to external CDS
 * Call this when a new offer is created
 */
export async function syncOfferToCDS(offer: SyncOffer): Promise<boolean> {
  if (!isExternalCDSEnabled()) {
    logger.debug('External CDS sync disabled, skipping offer sync', { offerId: offer.id });
    return false;
  }

  try {
    const url = `${getCDSBaseUrl()}/sync/offer`;
    logger.info('Syncing offer to external CDS', {
      offerId: offer.id,
      itemId: offer.item_id,
      providerId: offer.provider_id,
      price: offer.price_value,
      url
    });

    const response = await secureAxios.post(url, {
      id: offer.id,
      item_id: offer.item_id,
      provider_id: offer.provider_id,
      price_value: offer.price_value,
      currency: offer.currency || 'INR',
      max_qty: offer.max_qty,
      time_window: offer.time_window,
      pricing_model: offer.pricing_model || 'PER_KWH',
      settlement_type: offer.settlement_type || 'INSTANT',
    });

    logger.info('Offer synced successfully', {
      offerId: offer.id,
      status: response.data.status
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to sync offer to CDS', {
      offerId: offer.id,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

/**
 * Delete offer from external CDS
 * Call this when an offer is deactivated or deleted
 */
export async function deleteOfferFromCDS(offerId: string): Promise<boolean> {
  if (!isExternalCDSEnabled()) {
    logger.debug('External CDS sync disabled, skipping offer deletion', { offerId });
    return false;
  }

  try {
    const url = `${getCDSBaseUrl()}/sync/offer/${offerId}`;
    logger.info('Deleting offer from external CDS', { offerId, url });

    const response = await secureAxios.delete(url);

    logger.info('Offer deleted successfully', {
      offerId,
      status: response.data.status
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to delete offer from CDS', {
      offerId,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

/**
 * Sync block status updates to external CDS
 * Call this when blocks are reserved or sold to update availability
 */
export async function syncBlocksToCDS(blocks: SyncBlocks): Promise<boolean> {
  if (!isExternalCDSEnabled()) {
    logger.debug('External CDS sync disabled, skipping block sync', {
      offerId: blocks.offer_id,
      blockCount: blocks.block_ids.length
    });
    return false;
  }

  try {
    const url = `${getCDSBaseUrl()}/sync/blocks`;
    logger.info('Syncing block status to external CDS', {
      offerId: blocks.offer_id,
      blockCount: blocks.block_ids.length,
      status: blocks.status,
      url
    });

    const response = await secureAxios.post(url, {
      offer_id: blocks.offer_id,
      block_ids: blocks.block_ids,
      status: blocks.status,
      order_id: blocks.order_id,
      transaction_id: blocks.transaction_id,
    });

    logger.info('Blocks synced successfully', {
      offerId: blocks.offer_id,
      blockCount: blocks.block_ids.length,
      status: blocks.status,
      availableNow: response.data.availableNow
    });
    return true;
  } catch (error: any) {
    logger.error('Failed to sync blocks to CDS', {
      offerId: blocks.offer_id,
      blockCount: blocks.block_ids.length,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

// ==================== Batch Operations ====================

/**
 * Sync a complete offer (provider + item + offer) to CDS in sequence
 * This is a convenience method for creating new offers
 */
export async function syncCompleteOfferToCDS(
  provider: SyncProvider,
  item: SyncItem,
  offer: SyncOffer
): Promise<{ success: boolean; failedSteps: string[] }> {
  const failedSteps: string[] = [];

  // Sync provider
  const providerSuccess = await syncProviderToCDS(provider);
  if (!providerSuccess) failedSteps.push('provider');

  // Sync item
  const itemSuccess = await syncItemToCDS(item);
  if (!itemSuccess) failedSteps.push('item');

  // Sync offer
  const offerSuccess = await syncOfferToCDS(offer);
  if (!offerSuccess) failedSteps.push('offer');

  const success = failedSteps.length === 0;

  if (success) {
    logger.info('Complete offer synced to CDS', {
      providerId: provider.id,
      itemId: item.id,
      offerId: offer.id
    });
  } else {
    logger.warn('Partial sync failure', {
      offerId: offer.id,
      failedSteps
    });
  }

  return { success, failedSteps };
}
