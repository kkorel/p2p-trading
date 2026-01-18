import { runSettlementBlockOnConfirm } from '../packages/bap/src/callbacks';

async function run(): Promise<void> {
  const now = new Date().toISOString();
  const order = {
    id: 'trade-smoke-1',
    transaction_id: 'tx-smoke-1',
    status: 'ACTIVE',
    items: [
      {
        item_id: 'item-smoke-1',
        offer_id: 'offer-smoke-1',
        provider_id: 'provider-smoke-1',
        quantity: 1,
        price: { value: 100, currency: 'INR' },
        timeWindow: {
          startTime: now,
          endTime: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    ],
    quote: { price: { value: 100, currency: 'INR' }, totalQuantity: 1 },
    created_at: now,
    updated_at: now,
  };

  const context = {
    transaction_id: 'tx-smoke-1',
    bap_id: 'bap.smoke.local',
    bpp_id: 'bpp.smoke.local',
  };

  await runSettlementBlockOnConfirm(order, context);
  console.log('PHASE B SMOKE OK');
}

run().catch((error) => {
  console.error('PHASE B SMOKE FAILED', error);
  process.exitCode = 1;
});
