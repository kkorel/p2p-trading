/**
 * Catalog Filtering using JSONPath-like expressions
 */

import { Catalog, CatalogItem, CatalogOffer, TimeWindow, SourceType, DeliveryMode } from '@p2p/shared';
import { timeWindowsOverlap } from '@p2p/shared';

export interface FilterCriteria {
  sourceType?: SourceType;
  deliveryMode?: DeliveryMode;
  minQuantity?: number;
  timeWindow?: TimeWindow;
}

/**
 * Parse a JSONPath-like filter expression into criteria
 * Simplified parser for MVP - handles basic equality and comparison
 */
export function parseFilterExpression(expression: string): FilterCriteria {
  const criteria: FilterCriteria = {};
  
  // Match sourceType
  const sourceTypeMatch = expression.match(/sourceType\s*[='"]+\s*(\w+)/i);
  if (sourceTypeMatch) {
    criteria.sourceType = sourceTypeMatch[1].toUpperCase() as SourceType;
  }
  
  // Note: deliveryMode is always 'SCHEDULED' for P2P energy trading, so we skip filtering by it
  
  // Match availableQuantity >= value
  const quantityMatch = expression.match(/availableQuantity\s*>=?\s*(\d+(?:\.\d+)?)/i);
  if (quantityMatch) {
    criteria.minQuantity = parseFloat(quantityMatch[1]);
  }
  
  return criteria;
}

/**
 * Filter catalog based on criteria
 */
export function filterCatalog(
  catalog: Catalog, 
  criteria: FilterCriteria,
  requestedTimeWindow?: TimeWindow
): Catalog {
  const filteredProviders = catalog.providers.map(provider => {
    const filteredItems = provider.items
      .filter(item => matchesItemCriteria(item, criteria))
      .map(item => ({
        ...item,
        offers: item.offers.filter(offer => 
          matchesOfferCriteria(offer, criteria, requestedTimeWindow)
        ),
      }))
      .filter(item => item.offers.length > 0);
    
    return {
      ...provider,
      items: filteredItems,
    };
  }).filter(provider => provider.items.length > 0);
  
  return { providers: filteredProviders };
}

function matchesItemCriteria(item: CatalogItem, criteria: FilterCriteria): boolean {
  const attrs = item.itemAttributes;
  
  if (criteria.sourceType && attrs.sourceType !== criteria.sourceType) {
    return false;
  }
  
  // deliveryMode is always 'SCHEDULED' for P2P energy trading, so no need to filter
  
  if (criteria.minQuantity !== undefined && attrs.availableQuantity < criteria.minQuantity) {
    return false;
  }
  
  return true;
}

function matchesOfferCriteria(
  offer: CatalogOffer, 
  criteria: FilterCriteria,
  requestedTimeWindow?: TimeWindow
): boolean {
  // Check time window overlap if requested
  if (requestedTimeWindow && !timeWindowsOverlap(offer.timeWindow, requestedTimeWindow)) {
    return false;
  }
  
  // Check quantity available
  if (criteria.minQuantity !== undefined && offer.maxQuantity < criteria.minQuantity) {
    return false;
  }
  
  return true;
}
