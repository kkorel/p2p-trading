export interface BlockReceipt {
  blockId: string;
  tradeId: string;
  blockedAmountInr: number;
  status: "BLOCKED";
}

export interface ReleaseReceipt {
  transferId: string;
  tradeId: string;
  paidToSellerInr: number;
  status: "PAID";
}

export class MockBankRail {
  blockFunds(quote: { tradeId: string; totalBlockedInr: number; durationSec: number }): BlockReceipt {
    const { tradeId, totalBlockedInr } = quote;
    const blockId = `blk_${tradeId}`;
    return {
      blockId,
      tradeId,
      blockedAmountInr: totalBlockedInr,
      status: "BLOCKED",
    };
  }

  releaseFunds(args: { tradeId: string; payToSellerInr: number }): ReleaseReceipt {
    const { tradeId, payToSellerInr } = args;
    const transferId = `tx_${tradeId}`;
    return {
      transferId,
      tradeId,
      paidToSellerInr: payToSellerInr,
      status: "PAID",
    };
  }
}
