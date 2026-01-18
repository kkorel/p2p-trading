'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, Tag, ShoppingBag, Sun, Wind, Droplets, Trash2, Clock } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { AddListingSheet } from '@/components/sell/add-listing-sheet';
import { AddOfferSheet } from '@/components/sell/add-offer-sheet';
import { Card, CardHeader, CardTitle, Button, Badge, EmptyState, SkeletonList } from '@/components/ui';
import { sellerApi, type CatalogItem, type Offer, type Order, type Provider } from '@/lib/api';
import { formatCurrency, formatTime, formatDateTime, truncateId, cn } from '@/lib/utils';

const sourceIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDRO: Droplets,
};

type Tab = 'listings' | 'offers' | 'orders';

export default function SellPage() {
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [showAddListing, setShowAddListing] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [profileData, ordersData] = await Promise.all([
        sellerApi.getMyProfile(),
        sellerApi.getMyOrders(),
      ]);
      
      setProvider(profileData.provider);
      setItems(profileData.items);
      setOffers(profileData.offers);
      setOrders(ordersData.orders);
    } catch (error) {
      console.error('Failed to load seller data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddListing = async (data: { source_type: string; available_qty: number; meter_id?: string }) => {
    await sellerApi.addItem(data);
    await loadData();
  };

  const handleAddOffer = async (data: {
    item_id: string;
    price_per_kwh: number;
    max_qty: number;
    time_window: { startTime: string; endTime: string };
  }) => {
    await sellerApi.addOffer(data);
    await loadData();
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Delete this offer?')) return;
    await sellerApi.deleteOffer(offerId);
    await loadData();
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'listings', label: 'Listings', count: items.length },
    { id: 'offers', label: 'My Offers', count: offers.length },
    { id: 'orders', label: 'Incoming Orders', count: orders.length },
  ];

  if (isLoading) {
    return (
      <AppShell title="Sell Energy">
        <SkeletonList count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Sell Energy">
      <div className="flex flex-col gap-4">
        {/* Stats */}
        {provider && (
          <div className="grid grid-cols-3 gap-3">
            <Card padding="sm" className="text-center">
              <p className="text-xl font-semibold text-[var(--color-text)]">{items.length}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Listings</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-semibold text-[var(--color-primary)]">{offers.length}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Offers</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-semibold text-[var(--color-success)]">
                {Math.round(provider.trust_score * 100)}%
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Trust</p>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-[120ms]',
                activeTab === tab.id
                  ? 'bg-[var(--color-text)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                activeTab === tab.id
                  ? 'bg-white/20'
                  : 'bg-[var(--color-border)]'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'listings' && (
          <div className="flex flex-col gap-3">
            {items.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title="No listings yet"
                description="Create your first energy listing to start selling"
                action={{
                  label: 'Add Listing',
                  onClick: () => setShowAddListing(true),
                }}
              />
            ) : (
              <>
                {items.map((item) => {
                  const Icon = sourceIcons[item.source_type] || Package;
                  return (
                    <Card key={item.id}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-light)] flex items-center justify-center">
                          <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--color-text)]">
                            {item.source_type} Energy
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.available_qty} kWh available
                          </p>
                        </div>
                        <Badge variant="default">{truncateId(item.id)}</Badge>
                      </div>
                    </Card>
                  );
                })}
                <Button variant="secondary" fullWidth onClick={() => setShowAddListing(true)}>
                  <Plus className="h-4 w-4" />
                  Add Listing
                </Button>
              </>
            )}
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="flex flex-col gap-3">
            {offers.length === 0 ? (
              <EmptyState
                icon={<Tag className="h-12 w-12" />}
                title="No offers yet"
                description={items.length === 0 ? 'Create a listing first, then add offers' : 'Create an offer to sell your energy'}
                action={items.length > 0 ? {
                  label: 'Add Offer',
                  onClick: () => setShowAddOffer(true),
                } : undefined}
              />
            ) : (
              <>
                {offers.map((offer) => {
                  // Find the listing (item) this offer is for
                  const item = items.find(i => i.id === offer.item_id);
                  const SourceIcon = item ? sourceIcons[item.source_type] || Package : Package;
                  
                  return (
                    <Card key={offer.id}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-light)] flex items-center justify-center">
                            <SourceIcon className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {item?.source_type || 'Energy'} Offer
                            </p>
                            <p className="text-base font-semibold text-[var(--color-primary)]">
                              {formatCurrency(offer.price.value)}/kWh
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="p-2 -mr-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatTime(offer.timeWindow.startTime)} - {formatTime(offer.timeWindow.endTime)}
                        </span>
                      </div>
                      {offer.blockStats && (
                        <div className="flex gap-2">
                          <Badge variant="success">{offer.blockStats.available} available</Badge>
                          <Badge variant="default">{offer.blockStats.total - offer.blockStats.available} sold</Badge>
                        </div>
                      )}
                    </Card>
                  );
                })}
                <Button variant="secondary" fullWidth onClick={() => setShowAddOffer(true)}>
                  <Plus className="h-4 w-4" />
                  Add Offer
                </Button>
              </>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3">
            {orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-12 w-12" />}
                title="No incoming orders yet"
                description="Orders will appear here when buyers purchase your energy"
              />
            ) : (
              orders.map((order) => {
                const SourceIcon = order.itemInfo?.source_type ? sourceIcons[order.itemInfo.source_type] || Package : Package;
                return (
                  <Card key={order.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-light)] flex items-center justify-center">
                          <SourceIcon className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">
                            {order.itemInfo?.source_type || 'Energy'} Purchase
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          order.status === 'ACTIVE' ? 'success' :
                          order.status === 'PENDING' ? 'warning' : 'default'
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Quantity</p>
                        <p className="font-medium text-[var(--color-text)]">
                          {order.itemInfo?.sold_quantity || order.quote?.totalQuantity || 0} kWh
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-muted)]">Rate</p>
                        <p className="font-medium text-[var(--color-text)]">
                          {formatCurrency(order.itemInfo?.price_per_kwh || 0)}/kWh
                        </p>
                      </div>
                    </div>
                    {order.quote && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--color-border)]">
                        <span className="text-sm text-[var(--color-text-muted)]">Total</span>
                        <span className="text-base font-semibold text-[var(--color-success)]">
                          {formatCurrency(order.quote.price.value)}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      Order ID: {truncateId(order.id)}
                    </p>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Sheets */}
        <AddListingSheet
          open={showAddListing}
          onClose={() => setShowAddListing(false)}
          onSubmit={handleAddListing}
        />
        <AddOfferSheet
          open={showAddOffer}
          onClose={() => setShowAddOffer(false)}
          items={items}
          onSubmit={handleAddOffer}
        />
      </div>
    </AppShell>
  );
}
