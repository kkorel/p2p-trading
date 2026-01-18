'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Sun, Wind, Droplets, Package, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, Badge, EmptyState, SkeletonList } from '@/components/ui';
import { buyerApi, sellerApi, ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, truncateId } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const sourceIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDRO: Droplets,
};

type OrderType = 'bought' | 'sold';

interface UnifiedOrder {
  id: string;
  type: OrderType;
  status: string;
  sourceType: string;
  providerName?: string;
  quantity: number;
  pricePerKwh: number;
  totalPrice: number;
  createdAt: string;
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'bought' | 'sold'>('all');

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const allOrders: UnifiedOrder[] = [];

      // Fetch bought orders
      try {
        const buyerData = await buyerApi.getMyOrders();
        for (const order of buyerData.orders) {
          allOrders.push({
            id: order.id,
            type: 'bought',
            status: order.status,
            sourceType: order.itemInfo?.source_type || 'MIXED',
            providerName: order.provider?.name || 'Provider',
            quantity: order.itemInfo?.quantity || order.quote?.totalQuantity || 0,
            pricePerKwh: order.itemInfo?.price_per_kwh || 0,
            totalPrice: order.quote?.price?.value || 0,
            createdAt: order.created_at,
          });
        }
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error('Failed to load buyer orders:', err);
        }
      }

      // Fetch sold orders (only if user has a provider profile)
      if (user?.providerId) {
        try {
          const sellerData = await sellerApi.getMyOrders();
          for (const order of sellerData.orders) {
            // Avoid duplicates (in case user bought from themselves)
            if (!allOrders.find(o => o.id === order.id)) {
              const itemInfo = (order as { itemInfo?: { source_type?: string; sold_quantity?: number; price_per_kwh?: number } }).itemInfo;
              allOrders.push({
                id: order.id,
                type: 'sold',
                status: order.status,
                sourceType: itemInfo?.source_type || 'MIXED',
                providerName: undefined, // It's the user's own listing
                quantity: itemInfo?.sold_quantity || order.quote?.totalQuantity || 0,
                pricePerKwh: itemInfo?.price_per_kwh || 0,
                totalPrice: order.quote?.price?.value || 0,
                createdAt: order.created_at,
              });
            }
          }
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 401)) {
            console.error('Failed to load seller orders:', err);
          }
        }
      }

      // Sort by date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(allOrders);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.providerId]);

  useEffect(() => {
    if (!authLoading) {
      loadOrders();
    }
  }, [loadOrders, authLoading]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.type === filter;
  });

  const boughtCount = orders.filter(o => o.type === 'bought').length;
  const soldCount = orders.filter(o => o.type === 'sold').length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'COMPLETED': return 'primary';
      default: return 'default';
    }
  };

  if (isLoading || authLoading) {
    return (
      <AppShell title="My Orders">
        <SkeletonList count={3} />
      </AppShell>
    );
  }

  return (
    <AppShell title="My Orders">
      <div className="flex flex-col gap-4">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter('bought')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === 'bought'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3" />
            Bought ({boughtCount})
          </button>
          <button
            onClick={() => setFilter('sold')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === 'sold'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            Sold ({soldCount})
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-12 w-12" />}
            title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            description={
              filter === 'bought' 
                ? 'Energy you purchase will appear here' 
                : filter === 'sold'
                ? 'Orders for your listings will appear here'
                : 'Your energy transactions will appear here'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredOrders.map((order) => {
              const SourceIcon = sourceIcons[order.sourceType] || Package;
              const isBought = order.type === 'bought';
              const fee = Math.round(order.totalPrice * 0.025 * 100) / 100;
              
              return (
                <Card key={order.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
                        isBought 
                          ? 'bg-[var(--color-primary-light)]' 
                          : 'bg-[var(--color-success-light)]'
                      }`}>
                        <SourceIcon className={`h-5 w-5 ${
                          isBought 
                            ? 'text-[var(--color-primary)]' 
                            : 'text-[var(--color-success)]'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--color-text)]">
                            {order.sourceType} Energy
                          </p>
                          <Badge 
                            variant={isBought ? 'primary' : 'success'} 
                            size="sm"
                          >
                            {isBought ? (
                              <span className="flex items-center gap-0.5">
                                <ArrowDownLeft className="w-2.5 h-2.5" />
                                Bought
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <ArrowUpRight className="w-2.5 h-2.5" />
                                Sold
                              </span>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {isBought ? `from ${order.providerName}` : 'Your listing'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Quantity</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {order.quantity} kWh
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Rate</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatCurrency(order.pricePerKwh)}/kWh
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    {isBought ? (
                      // Buyer view: show what they paid (including fee)
                      <>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="text-[var(--color-text-muted)]">Energy Cost</span>
                          <span className="text-[var(--color-text)]">
                            {formatCurrency(order.totalPrice)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-[var(--color-text-muted)]">Platform Fee (2.5%)</span>
                          <span className="text-[var(--color-text)]">
                            {formatCurrency(fee)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[var(--color-text)]">Total Paid</span>
                          <span className="text-base font-semibold text-[var(--color-danger)]">
                            -{formatCurrency(order.totalPrice + fee)}
                          </span>
                        </div>
                      </>
                    ) : (
                      // Seller view: show what they received
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-[var(--color-text)]">You Received</span>
                        <span className="text-base font-semibold text-[var(--color-success)]">
                          +{formatCurrency(order.totalPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 text-xs text-[var(--color-text-muted)]">
                    <span>{formatDateTime(order.createdAt)}</span>
                    <span>ID: {truncateId(order.id)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
