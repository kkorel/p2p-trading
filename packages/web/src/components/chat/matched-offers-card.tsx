'use client';

import { useState } from 'react';
import { CheckCircle, Target, ChevronDown, ChevronUp, Star, Clock, X } from 'lucide-react';
import type { MatchedOffersCardData } from '@/hooks/use-chat-engine';

interface MatchedOffersCardProps {
  data: MatchedOffersCardData;
  language?: string;
  onAccept?: () => void;
  onCancel?: () => void;
}

// Localized labels
const LABELS = {
  matchFound: { en: 'Found a Match!', hi: 'मैच मिल गया!' },
  bestDeals: { en: 'Best Deals Found!', hi: 'बेस्ट डील मिली!' },
  bestDeal: { en: 'Best deal for your request', hi: 'आपकी मांग के लिए सबसे अच्छी डील' },
  combinedFrom: { en: 'Combined from', hi: '' },
  sellers: { en: 'sellers', hi: 'विक्रेता' },
  sellersFrom: { en: 'sellers', hi: 'विक्रेताओं से' },
  seller: { en: 'Seller', hi: 'विक्रेता' },
  quantity: { en: 'Quantity', hi: 'मात्रा' },
  price: { en: 'Price', hi: 'दाम' },
  total: { en: 'Total', hi: 'कुल' },
  time: { en: 'Time', hi: 'समय' },
  avgPrice: { en: 'Avg Price', hi: 'औसत दाम' },
  unit: { en: 'kWh', hi: 'यूनिट' },
  perUnit: { en: '/unit', hi: '/यूनिट' },
  viewSellers: { en: 'View', hi: 'देखो' },
  hideSellers: { en: 'Hide', hi: 'छुपाओ' },
  buyNow: { en: 'Buy Now', hi: 'अभी खरीदो' },
  acceptAll: { en: 'Accept All', hi: 'सब मंज़ूर' },
  cancel: { en: 'Cancel', hi: 'रद्द करो' },
  from: { en: 'from', hi: 'से' },
};

function getLabel(key: keyof typeof LABELS, isHindi: boolean): string {
  return isHindi ? LABELS[key].hi : LABELS[key].en;
}

// Energy type emoji mapping
const ENERGY_EMOJI: Record<string, string> = {
  SOLAR: '☀️',
  WIND: '💨',
  HYDRO: '💧',
  MIXED: '⚡',
  GRID: '🔌',
};

export function MatchedOffersCard({ data, language, onAccept, onCancel }: MatchedOffersCardProps) {
  const isHindi = language === 'hi-IN';
  const [expanded, setExpanded] = useState(false);
  const isSingle = data.selectionType === 'single';
  const singleOffer = isSingle ? data.offers[0] : null;

  return (
    <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden my-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {isSingle ? <CheckCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {isSingle ? getLabel('matchFound', isHindi) : getLabel('bestDeals', isHindi)}
            </h3>
            <p className="text-teal-100 text-xs">
              {isSingle
                ? getLabel('bestDeal', isHindi)
                : isHindi
                  ? `${data.summary.offersUsed} ${getLabel('sellersFrom', isHindi)}`
                  : `${getLabel('combinedFrom', isHindi)} ${data.summary.offersUsed} ${getLabel('sellers', isHindi)}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {isSingle && singleOffer ? (
          /* Single Offer View */
          <div className="p-3 rounded-xl border bg-white border-teal-100">
            {/* Seller info */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{ENERGY_EMOJI[singleOffer.energyType] || ENERGY_EMOJI.SOLAR}</span>
              <span className="font-semibold text-gray-900">{singleOffer.providerName}</span>
              <div className="flex items-center gap-0.5 ml-auto">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm text-amber-600">{(singleOffer.trustScore * 5).toFixed(1)}</span>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{getLabel('quantity', isHindi)}:</span>
                <span className="font-medium">{singleOffer.quantity} {getLabel('unit', isHindi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{getLabel('price', isHindi)}:</span>
                <span className="font-medium text-green-600">₹{singleOffer.pricePerKwh}{getLabel('perUnit', isHindi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{getLabel('total', isHindi)}:</span>
                <span className="font-bold text-gray-900">₹{Math.round(singleOffer.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{getLabel('time', isHindi)}:</span>
                <span className="font-medium">{data.timeWindow}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Multiple Offers View */
          <>
            {/* Summary */}
            <div className="p-3 rounded-xl border bg-white border-teal-100 mb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{getLabel('total', isHindi)}:</span>
                  <span className="font-medium">
                    {data.summary.totalQuantity} {getLabel('unit', isHindi)} {getLabel('from', isHindi)} {data.summary.offersUsed} {getLabel('sellers', isHindi)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{getLabel('avgPrice', isHindi)}:</span>
                  <span className="font-medium text-green-600">₹{data.summary.averagePrice.toFixed(2)}{getLabel('perUnit', isHindi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{getLabel('total', isHindi)} {getLabel('price', isHindi)}:</span>
                  <span className="font-bold text-gray-900">₹{Math.round(data.summary.totalPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{getLabel('time', isHindi)}:</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{data.timeWindow}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expand/Collapse Toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 py-2 text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {getLabel('hideSellers', isHindi)}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {getLabel('viewSellers', isHindi)} {data.offers.length} {getLabel('sellers', isHindi)}
                </>
              )}
            </button>

            {/* Expanded Seller List */}
            {expanded && (
              <div className="space-y-2 mt-2">
                {data.offers.map((offer, index) => (
                  <div
                    key={offer.offerId}
                    className="p-2 rounded-lg border bg-gray-50 border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{index + 1}.</span>
                        <span className="text-lg">{ENERGY_EMOJI[offer.energyType] || ENERGY_EMOJI.SOLAR}</span>
                        <span className="font-medium text-gray-900">{offer.providerName}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs text-amber-600">{(offer.trustScore * 5).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 pl-6">
                      {offer.quantity} {getLabel('unit', isHindi)} × ₹{offer.pricePerKwh} = <span className="font-semibold text-gray-900">₹{Math.round(offer.subtotal)}</span>
                    </div>
                  </div>
                ))}

                {/* Total line */}
                <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-200 text-sm">
                  <span className="text-gray-500">{getLabel('total', isHindi)}:</span>
                  <span className="font-bold text-gray-900">
                    {data.summary.totalQuantity} {getLabel('unit', isHindi)} | ₹{Math.round(data.summary.totalPrice)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-3 pb-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-600 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          {getLabel('cancel', isHindi)}
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {isSingle ? getLabel('buyNow', isHindi) : getLabel('acceptAll', isHindi)}
        </button>
      </div>
    </div>
  );
}
