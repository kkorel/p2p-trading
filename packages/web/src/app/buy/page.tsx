'use client';

import { useState, useCallback } from 'react';
import { Zap, Package } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { DiscoverForm } from '@/components/buy/discover-form';
import { OfferCard } from '@/components/buy/offer-card';
import { OrderSheet } from '@/components/buy/order-sheet';
import { EmptyState, SkeletonList, Badge } from '@/components/ui';
import { buyerApi, type Offer, type TransactionState } from '@/lib/api';

interface DiscoveredOffer {
  offer: Offer;
  providerId: string;
  providerName: string;
  sourceType: string;
  availableQty: number;
  score?: number;
}

export default function BuyPage() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState | null>(null);
  const [offers, setOffers] = useState<DiscoveredOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DiscoveredOffer | null>(null);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState(10);

  const handleDiscover = useCallback(async (params: {
    sourceType?: string;
    minQuantity: number;
    timeWindow: { startTime: string; endTime: string };
  }) => {
    setIsDiscovering(true);
    setOffers([]);
    setSelectedOffer(null);
    setRequestedQuantity(params.minQuantity);

    try {
      // Start discovery
      const result = await buyerApi.discover(params);
      
      // Poll for results (catalog comes async via callback)
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        
        const txState = await buyerApi.getTransaction(result.transaction_id);
        setTransaction(txState);
        
        // Check if catalog has been received (even if empty)
        if (txState.catalog) {
          if (txState.catalog.providers.length > 0) {
            // Extract offers from catalog
            const discoveredOffers: DiscoveredOffer[] = [];
            
            for (const provider of txState.catalog.providers) {
              for (const item of provider.items) {
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
            
            setOffers(discoveredOffers);
          }
          // Catalog received (even if empty) - stop polling
          break;
        }
        
        attempts++;
      }
    } catch (error) {
      console.error('Discovery failed:', error);
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
      // Select the offer
      await buyerApi.select({
        transaction_id: transaction.transaction_id,
        offer_id: selectedOffer.offer.id,
        quantity,
      });

      // Wait for selection callback
      await new Promise(r => setTimeout(r, 500));

      // Initialize order
      await buyerApi.init(transaction.transaction_id);

      // Wait for init callback
      await new Promise(r => setTimeout(r, 500));

      // Get order ID from transaction
      let txState = await buyerApi.getTransaction(transaction.transaction_id);
      let attempts = 0;
      
      while (!txState.order && !txState.error && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        txState = await buyerApi.getTransaction(transaction.transaction_id);
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
      await buyerApi.confirm(transaction.transaction_id, txState.order.id);

      // Wait for confirmation
      await new Promise(r => setTimeout(r, 500));

      // Get final state
      txState = await buyerApi.getTransaction(transaction.transaction_id);
      
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
          ) : offers.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--color-text)]">
                  Available Offers
                </h2>
                <Badge variant="primary">{offers.length} found</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {offers.map((item) => (
                  <OfferCard
                    key={item.offer.id}
                    offer={item.offer}
                    providerName={item.providerName}
                    sourceType={item.sourceType}
                    availableQty={item.availableQty}
                    score={item.score}
                    isSelected={selectedOffer?.offer.id === item.offer.id}
                    onSelect={() => handleSelectOffer(item)}
                  />
                ))}
              </div>
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
        />
      </div>
    </AppShell>
  );
}
