'use client';

import { useState, useCallback } from 'react';
import { Zap, Package, ChevronDown } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { DiscoverForm } from '@/components/buy/discover-form';
import { OfferCard } from '@/components/buy/offer-card';
import { OrderSheet } from '@/components/buy/order-sheet';
import { EmptyState, SkeletonList, Badge, Button } from '@/components/ui';
import { buyerApi, type Offer, type TransactionState } from '@/lib/api';
import { useP2PStats } from '@/contexts/p2p-stats-context';

interface DiscoveredOffer {
  offer: Offer;
  providerId: string;
  providerName: string;
  sourceType: string;
  availableQty: number;
  score?: number;
  matchesFilters?: boolean;
  filterReasons?: string[];
  scoreBreakdown?: {
    priceScore: number;
    trustScore: number;
    timeWindowFitScore: number;
  };
}

// Pagination settings
const ITEMS_PER_PAGE = 10;

export default function BuyPage() {
  const { refresh: refreshStats } = useP2PStats();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState | null>(null);
  const [offers, setOffers] = useState<DiscoveredOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DiscoveredOffer | null>(null);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState(10);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const handleDiscover = useCallback(async (params: {
    sourceType?: string;
    minQuantity: number;
    timeWindow: { startTime: string; endTime: string };
  }) => {
    setIsDiscovering(true);
    setOffers([]);
    setSelectedOffer(null);
    setRequestedQuantity(params.minQuantity);
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination on new search
    setDiscoveryError(null);

    try {
      // Start discovery
      const result = await buyerApi.discover(params);

      // Poll for results (catalog comes async via callback)
      let attempts = 0;
      const maxAttempts = 30;
      let catalogReceived = false;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));

        const txState = await buyerApi.getTransaction(result.transaction_id);
        setTransaction(txState);

        // Check for errors in transaction state
        if (txState.error) {
          console.error('Discovery error from backend:', txState.error);
          setDiscoveryError(txState.error);
          break;
        }

        // Check if catalog has been received (even if empty)
        if (txState.catalog) {
          catalogReceived = true;

          if (txState.catalog.providers && txState.catalog.providers.length > 0) {
            // Extract offers from catalog
            const discoveredOffers: DiscoveredOffer[] = [];

            for (const provider of txState.catalog.providers) {
              if (!provider.items) continue;

              for (const item of provider.items) {
                if (!item.offers) continue;

                for (const offer of item.offers) {
                  // Find score from matching results
                  const matchedOffer = txState.matchingResults?.allOffers?.find(
                    m => m.offer.id === offer.id
                  );

                  discoveredOffers.push({
                    offer,
                    providerId: provider.id,
                    providerName: provider.descriptor?.name || 'Provider',
                    sourceType: item.itemAttributes?.sourceType || 'MIXED',
                    availableQty: item.itemAttributes?.availableQuantity || offer.maxQuantity,
                    score: matchedOffer?.score,
                    matchesFilters: matchedOffer?.matchesFilters ?? true,
                    filterReasons: matchedOffer?.filterReasons,
                    scoreBreakdown: matchedOffer?.breakdown,
                  });
                }
              }
            }

            // Sort by score (if available) or price
            discoveredOffers.sort((a, b) => {
              if (a.score !== undefined && b.score !== undefined) {
                return b.score - a.score;
              }
              return a.offer.price.value - b.offer.price.value;
            });

            console.log(`Discovery complete: ${discoveredOffers.length} offers found`);
            setOffers(discoveredOffers);
          } else {
            console.log('Discovery complete: No offers found matching criteria');
            setOffers([]);
          }
          // Catalog received - stop polling
          break;
        }

        attempts++;
      }

      // If we exhausted attempts without receiving catalog
      if (!catalogReceived && attempts >= maxAttempts) {
        console.error('Discovery timeout: No catalog received after max attempts');
        setDiscoveryError('Discovery timed out. Please try again.');
      }
    } catch (error) {
      console.error('Discovery failed:', error);
      setDiscoveryError(error instanceof Error ? error.message : 'Discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const handleSelectOffer = (offer: DiscoveredOffer) => {
    setSelectedOffer(offer);
    setOrderSheetOpen(true);
  };

  const handleConfirmOrder = async (quantity: number) => {
    if (!selectedOffer || !transaction) return null;

    try {
      // Use the existing transaction that has the catalog from discovery
      // This ensures the select/init/confirm flow has access to the catalog data
      const txId = transaction.transaction_id;

      // Select the offer with the existing transaction
      await buyerApi.select({
        transaction_id: txId,
        offer_id: selectedOffer.offer.id,
        quantity,
      });

      // Wait for selection callback
      await new Promise(r => setTimeout(r, 500));

      // Initialize order
      await buyerApi.init(txId);

      // Wait for init callback
      await new Promise(r => setTimeout(r, 500));

      // Get order ID from transaction
      // Store the previous order ID (if any) to detect when a new order is created
      let txState = await buyerApi.getTransaction(txId);
      const previousOrderId = txState.order?.id;
      let attempts = 0;

      // Wait for a NEW order (different from previous) or error
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        txState = await buyerApi.getTransaction(txId);

        // Check for error
        if (txState.error) {
          break;
        }

        // Check for new order (different from any previous order)
        if (txState.order && txState.order.id !== previousOrderId) {
          break;
        }

        attempts++;
      }

      // Check for error first
      if (txState.error) {
        throw new Error(txState.error);
      }

      if (!txState.order) {
        throw new Error('Order creation failed. Please try again.');
      }

      // Confirm order
      await buyerApi.confirm(txId, txState.order.id);

      // Wait for confirmation
      await new Promise(r => setTimeout(r, 500));

      // Get final state
      txState = await buyerApi.getTransaction(txId);

      // After successful purchase, update both availableQty and offer.maxQuantity in local state
      // This fixes Bug 2 (double-buy) and Bug 3 (order sheet shows wrong max)
      if (txState.order) {
        setOffers(prevOffers => prevOffers.map(o => {
          if (o.offer.id === selectedOffer.offer.id) {
            const newAvailableQty = Math.max(0, o.availableQty - quantity);
            const newMaxQuantity = Math.max(0, o.offer.maxQuantity - quantity);
            return {
              ...o,
              availableQty: newAvailableQty,
              offer: {
                ...o.offer,
                maxQuantity: newMaxQuantity,
              },
            };
          }
          return o;
        }).filter(o => o.availableQty > 0)); // Remove sold-out offers

        // Clear transaction state to force fresh discovery for next purchase
        // This fixes Bug 7 (discovery bugged after orders/cancellations)
        setTransaction(null);

        // Refresh P2P stats to update savings display (Bug 8)
        refreshStats();
      }

      return txState.order || null;
    } catch (error) {
      console.error('Order failed:', error);
      throw error;
    }
  };

  return (
    <AppShell title="Buy Energy">
      <div className="flex flex-col gap-4">
        {/* Discover Form */}
        <DiscoverForm onDiscover={handleDiscover} isLoading={isDiscovering} />

        {/* Results section */}
        <div>
          {isDiscovering ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                  Finding Offers...
                </h2>
              </div>
              <SkeletonList count={3} />
            </div>
          ) : discoveryError ? (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Discovery Error"
              description={discoveryError}
            />
          ) : offers.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                  Available Offers
                </h2>
                <Badge variant="primary">{offers.length} found</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {/* Show only visible offers (pagination) */}
                {offers.slice(0, visibleCount).map((item) => (
                  <OfferCard
                    key={item.offer.id}
                    offer={item.offer}
                    providerName={item.providerName}
                    sourceType={item.sourceType}
                    availableQty={item.availableQty}
                    score={item.score}
                    matchesFilters={item.matchesFilters}
                    filterReasons={item.filterReasons}
                    scoreBreakdown={item.scoreBreakdown}
                    isSelected={selectedOffer?.offer.id === item.offer.id}
                    onSelect={() => handleSelectOffer(item)}
                  />
                ))}
              </div>

              {/* Load More button */}
              {offers.length > visibleCount && (
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More ({offers.length - visibleCount} remaining)
                </Button>
              )}
            </div>
          ) : transaction ? (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="No offers found"
              description="Try adjusting your search criteria or time window"
            />
          ) : (
            <EmptyState
              icon={<Zap className="h-12 w-12" />}
              title="Discover Energy"
              description="Search for available energy offers in your area"
            />
          )}
        </div>

        {/* Order Sheet */}
        <OrderSheet
          open={orderSheetOpen}
          onClose={() => setOrderSheetOpen(false)}
          offer={selectedOffer?.offer || null}
          providerId={selectedOffer?.providerId}
          providerName={selectedOffer?.providerName || ''}
          initialQuantity={requestedQuantity}
          onConfirm={handleConfirmOrder}
          trustWarning={transaction?.trustWarning}
        />
      </div>
    </AppShell>
  );
}
