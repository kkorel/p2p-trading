/**
 * Visual test for WhatsApp card renderer.
 * Generates sample cards and saves them to disk for inspection.
 * Run: npx ts-node packages/bap/src/chat/__tests__/wa-card-renderer.test.ts
 */

import {
    renderDashboardCard,
    renderOfferCreatedCard,
    renderListingsCard,
    renderTopDealsCard,
    renderMatchedOffersCard,
    renderOrderConfirmationCard,
    renderEarningsCard,
    renderAutoTradeStatusCard,
} from '../wa-card-renderer';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'card-outputs');

async function main() {
    // Ensure output dir exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('🎨 Generating WhatsApp card images...\n');

    // 1. Dashboard
    console.log('1. Dashboard card...');
    const dashboard = await renderDashboardCard({
        userName: 'Priya',
        balance: 1250,
        trustScore: 85,
        trustTier: { name: 'Gold', nameHi: 'गोल्ड', emoji: '⭐' },
        tradeLimit: 10,
        productionCapacity: 100,
        seller: {
            activeListings: 3,
            totalListedKwh: 25,
            weeklyEarnings: 270,
            weeklyKwh: 45,
            totalEarnings: 8500,
            totalKwh: 1200,
        },
        buyer: {
            totalOrders: 5,
            totalBoughtKwh: 30,
            totalSpent: 210,
        },
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.png'), dashboard);
    console.log(`   ✅ Saved (${(dashboard.length / 1024).toFixed(1)} KB)`);

    // 2. Offer Created
    console.log('2. Offer created card...');
    const offerCreated = await renderOfferCreatedCard({
        quantity: 15,
        pricePerKwh: 6.5,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 43200000).toISOString(),
        energyType: 'SOLAR',
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'offer-created.png'), offerCreated);
    console.log(`   ✅ Saved (${(offerCreated.length / 1024).toFixed(1)} KB)`);

    // 3. Listings
    console.log('3. Listings card...');
    const listings = await renderListingsCard({
        listings: [
            { id: '1', quantity: 10, pricePerKwh: 6.0, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 43200000).toISOString(), energyType: 'SOLAR' },
            { id: '2', quantity: 8, pricePerKwh: 5.5, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 43200000).toISOString(), energyType: 'WIND' },
            { id: '3', quantity: 5, pricePerKwh: 7.0, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 43200000).toISOString(), energyType: 'SOLAR' },
        ],
        totalListed: 23,
        totalSold: 15,
        userName: 'Priya',
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'listings.png'), listings);
    console.log(`   ✅ Saved (${(listings.length / 1024).toFixed(1)} KB)`);

    // 4. Top Deals
    console.log('4. Top deals card...');
    const topDeals = await renderTopDealsCard({
        deals: [
            { offerId: '1', providerName: 'Rohan Energy', trustScore: 92, energyType: 'SOLAR', quantity: 20, pricePerKwh: 5.5, savingsPercent: 35 },
            { offerId: '2', providerName: 'Anita Power', trustScore: 78, energyType: 'WIND', quantity: 15, pricePerKwh: 6.0, savingsPercent: 30 },
            { offerId: '3', providerName: 'GreenCo', trustScore: 65, energyType: 'SOLAR', quantity: 10, pricePerKwh: 6.5, savingsPercent: 25 },
        ],
        discomRate: 8.5,
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'top-deals.png'), topDeals);
    console.log(`   ✅ Saved (${(topDeals.length / 1024).toFixed(1)} KB)`);

    // 5. Matched Offers
    console.log('5. Matched offers card...');
    const matched = await renderMatchedOffersCard({
        selectionType: 'multiple',
        offers: [
            { offerId: '1', providerId: 'p1', providerName: 'Rohan Energy', trustScore: 92, energyType: 'SOLAR', quantity: 10, pricePerKwh: 5.5, subtotal: 55, timeWindow: '6AM-6PM' },
            { offerId: '2', providerId: 'p2', providerName: 'Anita Power', trustScore: 78, energyType: 'WIND', quantity: 5, pricePerKwh: 6.0, subtotal: 30, timeWindow: '6AM-6PM' },
        ],
        summary: { totalQuantity: 15, totalPrice: 85, averagePrice: 5.67, fullyFulfilled: true, shortfall: 0, offersUsed: 2 },
        timeWindow: '8 Feb, 6:00 AM - 6:00 PM',
        transactionId: 'txn-123',
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'matched-offers.png'), matched);
    console.log(`   ✅ Saved (${(matched.length / 1024).toFixed(1)} KB)`);

    // 6. Order Confirmation
    console.log('6. Order confirmation card...');
    const orderConf = await renderOrderConfirmationCard({
        success: true,
        orderId: 'ORD-2026-ABC',
        offers: [
            { providerName: 'Rohan Energy', quantity: 10, pricePerKwh: 5.5, subtotal: 55 },
            { providerName: 'Anita Power', quantity: 5, pricePerKwh: 6.0, subtotal: 30 },
        ],
        summary: { totalQuantity: 15, totalPrice: 85, averagePrice: 5.67, ordersConfirmed: 2 },
        timeWindow: '8 Feb, 6:00 AM - 6:00 PM',
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'order-confirmation.png'), orderConf);
    console.log(`   ✅ Saved (${(orderConf.length / 1024).toFixed(1)} KB)`);

    // 7. Earnings
    console.log('7. Earnings card...');
    const earnings = await renderEarningsCard({
        userName: 'Priya',
        hasStartedSelling: true,
        totalOrders: 12,
        totalEnergySold: 95,
        totalEarnings: 570,
        walletBalance: 1250,
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'earnings.png'), earnings);
    console.log(`   ✅ Saved (${(earnings.length / 1024).toFixed(1)} KB)`);

    // 8. Auto-Trade Status
    console.log('8. Auto-trade status card...');
    const autoTrade = await renderAutoTradeStatusCard({
        seller: {
            enabled: true,
            capacityKwh: 50,
            pricePerKwh: 6.0,
            energyType: 'SOLAR',
            lastRun: {
                executedAt: new Date().toISOString(),
                status: 'SUCCESS',
                listedQuantity: 35,
                weatherMultiplier: 0.85,
            },
        },
        buyer: {
            enabled: true,
            targetQuantity: 20,
            maxPrice: 7.0,
            preferredTime: 'morning',
            lastRun: {
                executedAt: new Date().toISOString(),
                status: 'SUCCESS',
                quantityBought: 18,
                pricePerUnit: 5.8,
                totalSpent: 104.4,
            },
        },
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'auto-trade-status.png'), autoTrade);
    console.log(`   ✅ Saved (${(autoTrade.length / 1024).toFixed(1)} KB)`);

    console.log(`\n✨ All 8 cards generated in: ${OUTPUT_DIR}`);
    console.log('Open the PNG files to inspect the card designs!');
}

main().catch(console.error);
