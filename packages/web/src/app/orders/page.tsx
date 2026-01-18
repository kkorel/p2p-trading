'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Sun, Wind, Droplets, Package } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, Badge, EmptyState, SkeletonList } from '@/components/ui';
import { buyerApi, type BuyerOrder, ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, truncateId } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const sourceIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDRO: Droplets,
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);

  const loadOrders = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await buyerApi.getMyOrders();
      setOrders(data.orders);
    } catch (err) {
      // Silently handle auth errors - user will be redirected by AppShell
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadOrders();
    }
  }, [loadOrders, authLoading]);

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
        {orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-12 w-12" />}
            title="No orders yet"
            description="Your energy purchases will appear here"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const SourceIcon = sourceIcons[order.itemInfo.source_type] || Package;
              return (
                <Card key={order.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-light)] flex items-center justify-center">
                        <SourceIcon className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {order.itemInfo.source_type} Energy
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          from {order.provider?.name || 'Provider'}
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
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Quantity</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {order.itemInfo.quantity || order.quote?.totalQuantity || 0} kWh
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Rate</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatCurrency(order.itemInfo.price_per_kwh)}/kWh
                      </p>
                    </div>
                  </div>
                  
                  {order.quote && (
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-muted)]">Total Paid</span>
                      <span className="text-base font-semibold text-[var(--color-primary)]">
                        {formatCurrency(order.quote.price.value)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-2 text-xs text-[var(--color-text-muted)]">
                    <span>{formatDateTime(order.created_at)}</span>
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
