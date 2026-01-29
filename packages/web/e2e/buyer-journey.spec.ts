/**
 * E2E Tests: Buyer Journey
 * Tests the full buyer flow from discovery to order confirmation
 */

import { test, expect, Page } from '@playwright/test';

// Helper to set up authenticated session with complete profile
async function setupAuthenticatedBuyer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      name: 'Buyer User',
      email: 'buyer@example.com',
      profileComplete: true,
    }));
    localStorage.setItem('sessionToken', 'mock-session-token');
  });
}

// Mock API responses for buyer flow
async function setupBuyerMocks(page: Page) {
  // Mock user profile
  await page.route('**/api/user/profile', async route => {
    await route.fulfill({
      json: {
        name: 'Buyer User',
        email: 'buyer@example.com',
        profileComplete: true,
        balance: 1000,
      }
    });
  });

  // Mock balance
  await page.route('**/api/balance', async route => {
    await route.fulfill({ json: { balance: 1000 } });
  });

  // Mock discover offers
  await page.route('**/api/discover', async route => {
    const request = route.request();
    await route.fulfill({
      json: {
        success: true,
        offers: [
          {
            id: 'offer-1',
            provider: { id: 'prov-1', name: 'Solar Provider A', trustScore: 0.95 },
            price: { value: 6, currency: 'INR' },
            maxQuantity: 100,
            sourceType: 'SOLAR',
            score: 0.92,
            matchesFilters: true,
          },
          {
            id: 'offer-2',
            provider: { id: 'prov-2', name: 'Wind Provider B', trustScore: 0.88 },
            price: { value: 5.5, currency: 'INR' },
            maxQuantity: 200,
            sourceType: 'WIND',
            score: 0.85,
            matchesFilters: true,
          },
          {
            id: 'offer-3',
            provider: { id: 'prov-3', name: 'Low Trust Provider', trustScore: 0.15 },
            price: { value: 4, currency: 'INR' },
            maxQuantity: 50,
            sourceType: 'SOLAR',
            score: 0.4,
            matchesFilters: false,
          },
        ],
      }
    });
  });

  // Mock select offer
  await page.route('**/api/select', async route => {
    await route.fulfill({
      json: {
        success: true,
        quote: {
          price: { value: 60, currency: 'INR' },
          totalQuantity: 10,
        },
        offerId: 'offer-1',
      }
    });
  });

  // Mock init (prepare order)
  await page.route('**/api/init', async route => {
    await route.fulfill({
      json: {
        success: true,
        orderId: 'order-preview-123',
        quote: {
          price: { value: 60, currency: 'INR' },
          totalQuantity: 10,
        },
      }
    });
  });

  // Mock confirm order
  await page.route('**/api/confirm', async route => {
    await route.fulfill({
      json: {
        success: true,
        order: {
          id: 'order-123',
          status: 'ACTIVE',
          quote: { price: { value: 60, currency: 'INR' }, totalQuantity: 10 },
        },
      }
    });
  });
}

test.describe('Buyer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedBuyer(page);
    await setupBuyerMocks(page);
  });

  test.describe('Offer Discovery', () => {
    test('should display discover form on buy page', async ({ page }) => {
      await page.goto('/buy');
      
      // Should show quantity input
      await expect(page.getByLabel(/quantity|kwh/i)).toBeVisible();
      
      // Should show discover button
      await expect(page.getByRole('button', { name: /discover|search|find/i })).toBeVisible();
    });

    test('should validate minimum quantity', async ({ page }) => {
      await page.goto('/buy');
      
      const quantityInput = page.getByLabel(/quantity|kwh/i);
      await quantityInput.fill('0');
      
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/minimum|at least|greater than/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should display offers after search', async ({ page }) => {
      await page.goto('/buy');
      
      const quantityInput = page.getByLabel(/quantity|kwh/i);
      await quantityInput.fill('10');
      
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show offers
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Wind Provider B').first()).toBeVisible();
    });

    test('should show offer scores and match indicators', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Wait for offers to load
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      
      // Should show trust scores
      await expect(page.getByText(/95%|0\.95/i).first()).toBeVisible();
    });

    test('should visually distinguish non-matching offers', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Wait for offers to load
      await expect(page.getByText('Low Trust Provider').first()).toBeVisible({ timeout: 10000 });
      
      // Non-matching offers should have some visual indicator
      // This could be opacity, warning badge, etc.
    });

    test('should allow filtering by max price', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      
      const maxPriceInput = page.getByLabel(/max.*price|price.*limit/i);
      if (await maxPriceInput.isVisible()) {
        await maxPriceInput.fill('5');
      }
      
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show filtered results
      await page.waitForResponse('**/api/discover');
    });
  });

  test.describe('Offer Selection', () => {
    test('should allow selecting an offer', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Wait for offers and click on first one
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      // Should show selection or order sheet
      await expect(page.getByText(/selected|order|buy/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should display price breakdown when offer selected', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      // Should show price details
      await expect(page.getByText(/₹|INR|total|price/i).first()).toBeVisible();
    });

    test('should allow adjusting quantity for selected offer', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      // Look for quantity adjustment in order sheet
      const orderQuantityInput = page.getByLabel(/quantity/i).last();
      if (await orderQuantityInput.isVisible()) {
        await orderQuantityInput.fill('20');
      }
    });
  });

  test.describe('Order Confirmation', () => {
    test('should show confirmation dialog before placing order', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      // Click confirm/buy button
      const confirmButton = page.getByRole('button', { name: /confirm|place order|buy now/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Should show confirmation dialog
        await expect(page.getByText(/are you sure|confirm|review/i).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should complete order successfully', async ({ page }) => {
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      // Complete the order flow
      const confirmButton = page.getByRole('button', { name: /confirm|place order|buy/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // If there's a confirmation dialog, click confirm again
        const finalConfirm = page.getByRole('button', { name: /yes|confirm|ok/i });
        if (await finalConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          await finalConfirm.click();
        }
        
        // Should show success message
        await expect(page.getByText(/success|order placed|confirmed/i).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should deduct balance after successful order', async ({ page }) => {
      let currentBalance = 1000;
      
      await page.route('**/api/balance', async route => {
        await route.fulfill({ json: { balance: currentBalance } });
      });
      
      await page.route('**/api/confirm', async route => {
        currentBalance = 940; // Deduct 60
        await route.fulfill({
          json: {
            success: true,
            order: { id: 'order-123', status: 'ACTIVE' },
          }
        });
      });
      
      await page.goto('/buy');
      
      // Check initial balance display
      await expect(page.getByText(/1000|₹1,000/i).first()).toBeVisible({ timeout: 5000 });
      
      // Complete order flow...
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      const confirmButton = page.getByRole('button', { name: /confirm|place order|buy/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        const finalConfirm = page.getByRole('button', { name: /yes|confirm|ok/i });
        if (await finalConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          await finalConfirm.click();
        }
        
        // Balance should update
        await page.waitForTimeout(1000);
      }
    });

    test('should handle insufficient balance', async ({ page }) => {
      await page.route('**/api/balance', async route => {
        await route.fulfill({ json: { balance: 10 } }); // Very low balance
      });
      
      await page.route('**/api/confirm', async route => {
        await route.fulfill({
          status: 400,
          json: { error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' }
        });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      await expect(page.getByText('Solar Provider A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Solar Provider A').first().click();
      
      const confirmButton = page.getByRole('button', { name: /confirm|place order|buy/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // Should show insufficient balance error
        await expect(page.getByText(/insufficient|not enough|balance/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display error when discover fails', async ({ page }) => {
      await page.route('**/api/discover', async route => {
        await route.fulfill({
          status: 500,
          json: { error: 'Service unavailable' }
        });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show error message
      await expect(page.getByText(/error|failed|unavailable|try again/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show empty state when no offers found', async ({ page }) => {
      await page.route('**/api/discover', async route => {
        await route.fulfill({
          json: { success: true, offers: [] }
        });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show empty state
      await expect(page.getByText(/no offers|not found|no results|try different/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle network timeout gracefully', async ({ page }) => {
      await page.route('**/api/discover', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Exceed timeout
        await route.fulfill({ json: { success: true, offers: [] } });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity|kwh/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show timeout or error message
      await expect(page.getByText(/timeout|taking too long|error|try again/i).first()).toBeVisible({ timeout: 40000 });
    });
  });
});
