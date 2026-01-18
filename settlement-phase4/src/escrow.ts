export type Inr = number;

export interface Trade {
  tradeId: string;
  principalInr: Inr;
  blockDurationSec: number;
  buyerId: string;
  sellerId: string;
}

export interface BlockQuote {
  tradeId: string;
  principalInr: Inr;
  feeInr: Inr;
  totalBlockedInr: Inr;
}

export function calcFeeInr(principalInr: Inr): Inr {
  const raw = principalInr * 0.0003;
  const fee = Math.min(20, raw);
  return Math.round(fee * 100) / 100;
}

export function makeBlockQuote(trade: Trade): BlockQuote {
  const feeInr = calcFeeInr(trade.principalInr);
  const totalBlockedInr = Math.round((trade.principalInr + feeInr) * 100) / 100;
  return {
    tradeId: trade.tradeId,
    principalInr: trade.principalInr,
    feeInr,
    totalBlockedInr,
  };
}
