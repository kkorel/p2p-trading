'use client';

import { Zap, Clock, TrendingUp } from 'lucide-react';

interface ListingData {
  id: string;
  quantity: number;
  pricePerKwh: number;
  startTime: string;
  endTime: string;
  energyType: string;
}

interface ListingsCardData {
  listings: ListingData[];
  totalListed: number;
  totalSold: number;
  userName: string;
}

interface ListingCardProps {
  data: ListingsCardData;
  language?: string;
}

// Energy type icons and colors
const ENERGY_STYLES: Record<string, { emoji: string; bg: string; border: string }> = {
  SOLAR: { emoji: '☀️', bg: 'bg-amber-50', border: 'border-amber-200' },
  WIND: { emoji: '💨', bg: 'bg-blue-50', border: 'border-blue-200' },
  HYDRO: { emoji: '💧', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  MIXED: { emoji: '⚡', bg: 'bg-purple-50', border: 'border-purple-200' },
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function ListingCard({ data, language }: ListingCardProps) {
  const isHindi = language === 'hi-IN';

  return (
    <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden my-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{isHindi ? 'आपकी लिस्टिंग' : 'Your Listings'}</h3>
              <p className="text-amber-100 text-xs">
                {data.listings.length} {isHindi ? 'ऐक्टिव' : 'active'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{data.totalListed}</div>
            <div className="text-amber-100 text-xs">{isHindi ? 'यूनिट लिस्टेड' : 'kWh listed'}</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-2 bg-amber-100/50 flex justify-between text-sm">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          <span className="text-gray-700">
            {isHindi ? 'बिका:' : 'Sold:'} <span className="font-semibold text-green-600">{data.totalSold} {isHindi ? 'यूनिट' : 'kWh'}</span>
          </span>
        </div>
      </div>

      {/* Listings */}
      <div className="p-3 space-y-2">
        {data.listings.map((listing) => {
          const style = ENERGY_STYLES[listing.energyType] || ENERGY_STYLES.SOLAR;
          return (
            <div
              key={listing.id}
              className={`p-3 rounded-xl border ${style.bg} ${style.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{style.emoji}</span>
                  <span className="font-semibold text-gray-900">
                    {listing.quantity} {isHindi ? 'यूनिट' : 'kWh'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-green-600">₹{listing.pricePerKwh}</span>
                  <span className="text-gray-500 text-xs">/{isHindi ? 'यूनिट' : 'unit'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDate(listing.startTime)} {formatTime(listing.startTime)} - {formatTime(listing.endTime)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 pb-3 text-center">
        <p className="text-[10px] text-gray-400">
          {isHindi ? 'खरीदार आपकी बिजली देख सकते हैं' : 'Buyers can see your energy'}
        </p>
      </div>
    </div>
  );
}
