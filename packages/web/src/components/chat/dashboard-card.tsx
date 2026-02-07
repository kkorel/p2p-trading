'use client';

import { type DashboardData } from '@/hooks/use-chat-engine';
import { Wallet, Star, TrendingUp, Zap, ShoppingBag, Info } from 'lucide-react';

interface DashboardCardProps {
  data: DashboardData;
  language?: string;
  onExplain?: (field: string) => void;
}

// Localized labels
const LABELS: Record<string, { label: string; labelHi: string }> = {
  balance: { label: 'Balance', labelHi: 'बैलेंस' },
  trust: { label: 'Trust Score', labelHi: 'ट्रस्ट स्कोर' },
  tradeLimit: { label: 'Trade Limit', labelHi: 'ट्रेड लिमिट' },
  seller: { label: 'Seller Stats', labelHi: 'सेलर स्टैट्स' },
  buyer: { label: 'Buyer Stats', labelHi: 'बायर स्टैट्स' },
  activeListings: { label: 'Active Listings', labelHi: 'ऐक्टिव लिस्टिंग' },
  thisWeek: { label: 'This Week', labelHi: 'इस हफ्ते' },
  allTime: { label: 'All Time', labelHi: 'कुल' },
  orders: { label: 'Orders', labelHi: 'ऑर्डर्स' },
  energyBought: { label: 'Energy Bought', labelHi: 'खरीदी गई बिजली' },
  totalSpent: { label: 'Total Spent', labelHi: 'कुल खर्च' },
  earned: { label: 'earned', labelHi: 'कमाई' },
  kWh: { label: 'kWh', labelHi: 'किलोवाट घंटा' },
};

function getLabel(key: string, lang?: string): string {
  const entry = LABELS[key];
  if (!entry) return key;
  return lang === 'hi-IN' ? entry.labelHi : entry.label;
}

export function DashboardCard({ data, language, onExplain }: DashboardCardProps) {
  const isHindi = language === 'hi-IN';
  const trustTierName = isHindi ? data.trustTier.nameHi : data.trustTier.name;

  const handleFieldClick = (field: string) => {
    onExplain?.(field);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden my-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-sm font-bold">{data.userName[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h3 className="font-semibold text-base">{data.userName}</h3>
            <p className="text-teal-100 text-xs">{isHindi ? 'ऊर्जा डैशबोर्ड' : 'Oorja Dashboard'}</p>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {/* Balance */}
        <button
          onClick={() => handleFieldClick('balance')}
          className="bg-white rounded-xl p-3 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-1 mb-1">
            <Wallet className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">{getLabel('balance', language)}</span>
            <Info className="w-3 h-3 text-gray-300 group-hover:text-teal-500 ml-auto" />
          </div>
          <div className="text-lg font-bold text-gray-900">₹{data.balance.toLocaleString('en-IN')}</div>
        </button>

        {/* Trust Score */}
        <button
          onClick={() => handleFieldClick('trust')}
          className="bg-white rounded-xl p-3 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">{getLabel('trust', language)}</span>
            <Info className="w-3 h-3 text-gray-300 group-hover:text-teal-500 ml-auto" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-gray-900">{(data.trustScore * 100).toFixed(0)}%</span>
            <span className="text-xs text-gray-500">{data.trustTier.emoji} {trustTierName}</span>
          </div>
        </button>

        {/* Trade Limit */}
        <button
          onClick={() => handleFieldClick('tradelimit')}
          className="bg-white rounded-xl p-3 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">{getLabel('tradeLimit', language)}</span>
            <Info className="w-3 h-3 text-gray-300 group-hover:text-teal-500 ml-auto" />
          </div>
          <div className="text-lg font-bold text-gray-900">{data.tradeLimit}%</div>
        </button>
      </div>

      {/* Seller Stats */}
      {data.seller && (
        <button
          onClick={() => handleFieldClick('seller')}
          className="mx-3 mb-2 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all text-left w-[calc(100%-1.5rem)] group"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">{getLabel('seller', language)}</span>
            <Info className="w-3 h-3 text-amber-300 group-hover:text-amber-600 ml-auto" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-gray-900">{data.seller.activeListings}</div>
              <div className="text-[10px] text-gray-500">{getLabel('activeListings', language)}</div>
              <div className="text-[10px] text-gray-400">({data.seller.totalListedKwh} {isHindi ? 'किवॉह' : 'kWh'})</div>
            </div>
            <div>
              <div className="text-sm font-bold text-green-600">₹{data.seller.weeklyEarnings.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-gray-500">{getLabel('thisWeek', language)}</div>
              <div className="text-[10px] text-gray-400">{data.seller.weeklyKwh.toFixed(1)} {isHindi ? 'किवॉह' : 'kWh'}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">₹{data.seller.totalEarnings.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-gray-500">{getLabel('allTime', language)}</div>
              <div className="text-[10px] text-gray-400">{data.seller.totalKwh.toFixed(1)} {isHindi ? 'किवॉह' : 'kWh'}</div>
            </div>
          </div>
        </button>
      )}

      {/* Buyer Stats */}
      {data.buyer && (
        <button
          onClick={() => handleFieldClick('buyer')}
          className="mx-3 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left w-[calc(100%-1.5rem)] group"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">{getLabel('buyer', language)}</span>
            <Info className="w-3 h-3 text-blue-300 group-hover:text-blue-600 ml-auto" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-gray-900">{data.buyer.totalOrders}</div>
              <div className="text-[10px] text-gray-500">{getLabel('orders', language)}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">{data.buyer.totalBoughtKwh.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500">{isHindi ? 'किलोवाट घंटा' : 'kWh'}</div>
            </div>
            <div>
              <div className="text-sm font-bold text-red-600">₹{data.buyer.totalSpent.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-gray-500">{getLabel('totalSpent', language)}</div>
            </div>
          </div>
        </button>
      )}

      {/* Tap hint */}
      <div className="px-3 pb-3 text-center">
        <p className="text-[10px] text-gray-400">
          {isHindi ? '👆 किसी भी फ़ील्ड पर टैप करके जानें' : '👆 Tap any field to learn more'}
        </p>
      </div>
    </div>
  );
}
