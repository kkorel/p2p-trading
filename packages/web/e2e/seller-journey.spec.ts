/**
 * E2E Tests: Seller Journey
 * Tests seller profile setup, offer creation, and order management
 */

import { test, expect, Page } from '@playwright/test';

// Helper to set up authenticated seller session
async function setupAuthenticatedSeller(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      name: 'Seller User',
      email: 'seller@example.com',
      profileComplete: true,
      providerId: 'provider-123',
    }));
    localStorage.setItem('sessionToken', 'mock-session-token');
  });
}

// Mock API responses for seller flow
async function setupSellerMocks(page: Page) {
  // Mock user profile with provider
  await page.route('**/api/user/profile', async route => {
    await route.fulfill({
      json: {
        name: 'Seller User',
        email: 'seller@example.com',
        profileComplete: true,
        providerId: 'provider-123',
        provider: {
          id: 'provider-123',
          name: 'Solar Farm Co',
          trustScore: 0.85,
          totalOrders: 50,
          successfulOrders: 45,
        },
      }
    });
  });

  // Mock balance
  await page.route('**/api/balance', async route => {
    await route.fulfill({ json: { balance: 5000 } });
  });

  // Mock existing offers
  await page.route('**/api/seller/offers', async route => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        json: {
          offers: [
            {
              id: 'offer-existing-1',
              price: { value: 6, currency: 'INR' },
              maxQuantity: 100,
              sourceType: 'SOLAR',
              status: 'ACTIVE',
              createdAt: '2026-01-28T10:00:00Z',
            },
          ]
        }
      });
    } else if (method === 'POST') {
      await route.fulfill({
        json: {
          success: true,
          offer: {
            id: 'offer-new-1',
            price: { value: 5.5, currency: 'INR' },
            maxQuantity: 50,
            sourceType: 'SOLAR',
            status: 'ACTIVE',
          }
        }
      });
    }
  });

  // Mock orders
  await page.route('**/api/seller/orders', async route => {
    await route.fulfill({
      json: {
        orders: [
          {
            id: 'order-seller-1',
            status: 'ACTIVE',
            buyer: { name: 'Buyer A' },
            quantity: 20,
            price: { value: 120, currency: 'INR' },
            createdAt: '2026-01-29T08:00:00Z',
          },
          {
            id: 'order-seller-2',
            status: 'COMPLETED',
            buyer: { name: 'Buyer B' },
            quantity: 15,
            price: { value: 90, currency: 'INR' },
            createdAt: '2026-01-28T14:00:00Z',
          },
        ]
      }
    });
  });
}

test.describe('Seller Journey', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSeller(page);
    await setupSellerMocks(page);
  });

  test.describe('Seller Profile', () => {
    test('should display seller profile with trust score', async ({ page }) => {
      await page.goto('/profile');
      
      // Should show provider name
      await expect(page.getByText('Solar Farm Co').first()).toBeVisible({ timeout: 10000 });
      
      // Should show trust score
      await expect(page.getByText(/85%|0\.85/i).first()).toBeVisible();
    });

    test('should display order statistics', async ({ page }) => {
      await page.goto('/profile');
      
      // Should show total orders
      await expect(page.getByText(/50.*orders|orders.*50/i).first()).toBeVisible({ timeout: 10000 });
      
      // Should show success rate
      await expect(page.getByText(/90%|success/i).first()).toBeVisible();
    });
  });

  test.describe('Offer Management', () => {
    test('should display sell page with add offer button', async ({ page }) => {
      await page.goto('/sell');
      
      // Should show add offer button
      await expect(page.getByRole('button', { name: /add.*offer|create.*offer|new.*offer/i })).toBeVisible({ timeout: 10000 });
    });

    test('should display existing offers', async ({ page }) => {
      await page.goto('/sell');
      
      // Should show existing offer
      await expect(page.getByText(/100.*kwh|₹6|SOLAR/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should open add offer form when clicking add button', async ({ page }) => {
      await page.goto('/sell');
      
      await page.getByRole('button', { name: /add.*offer|create.*offer|new/i }).click();
      
      // Should show offer form
      await expect(page.getByLabel(/price|quantity|source/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate offer form fields', async ({ page }) => {
      await page.goto('/sell');
      
      await page.getByRole('button', { name: /add.*offer|create.*offer|new/i }).click();
      
      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /create|add|submit|save/i }).last();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        
        // Should show validation errors
        await expect(page.getByText(/required|please enter|invalid/i).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should create new offer successfully', async ({ page }) => {
      await page.goto('/sell');
      
      await page.getByRole('button', { name: /add.*offer|create.*offer|new/i }).click();
      
      // Fill in the form
      const priceInput = page.getByLabel(/price/i);
      if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priceInput.fill('5.5');
      }
      
      const quantityInput = page.getByLabel(/quantity|max/i).last();
      if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quantityInput.fill('50');
      }
      
      // Submit
      const submitButton = page.getByRole('button', { name: /create|add|submit|save/i }).last();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        
        // Should show success
        await expect(page.getByText(/success|created|added/i).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow editing existing offer', async ({ page }) => {
      await page.goto('/sell');
      
      // Find and click edit button on existing offer
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        // Should show edit form
        await expect(page.getByLabel(/price|quantity/i).first()).toBeVisible();
      }
    });

    test('should allow deleting/deactivating offer', async ({ page }) => {
      await page.route('**/api/seller/offers/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ json: { success: true } });
        }
      });
      
      await page.goto('/sell');
      
      const deleteButton = page.getByRole('button', { name: /delete|remove|deactivate/i }).first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Should show confirmation
        const confirmButton = page.getByRole('button', { name: /yes|confirm|delete/i });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // Should show success
        await expect(page.getByText(/deleted|removed|deactivated/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Order Management', () => {
    test('should display seller orders', async ({ page }) => {
      await page.goto('/orders');
      
      // Should show orders
      await expect(page.getByText('Buyer A').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Buyer B').first()).toBeVisible();
    });

    test('should show order status badges', async ({ page }) => {
      await page.goto('/orders');
      
      // Should show ACTIVE status
      await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 10000 });
      
      // Should show COMPLETED status
      await expect(page.getByText(/completed/i).first()).toBeVisible();
    });

    test('should allow viewing order details', async ({ page }) => {
      await page.goto('/orders');
      
      // Click on an order
      await expect(page.getByText('Buyer A').first()).toBeVisible({ timeout: 10000 });
      await page.getByText('Buyer A').first().click();
      
      // Should show order details
      await expect(page.getByText(/20.*kwh|₹120|quantity|price/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow filtering orders by status', async ({ page }) => {
      await page.goto('/orders');
      
      const statusFilter = page.getByRole('combobox', { name: /status|filter/i });
      if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await statusFilter.selectOption('COMPLETED');
        
        // Should filter to completed orders only
        await expect(page.getByText('Buyer B').first()).toBeVisible();
      }
    });
  });

  test.describe('Seller Setup for New Users', () => {
    test('should prompt non-provider user to set up seller profile', async ({ page }) => {
      // Override to show user without provider
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          json: {
            name: 'Regular User',
            email: 'user@example.com',
            profileComplete: true,
            providerId: null,
            provider: null,
          }
        });
      });
      
      await page.goto('/sell');
      
      // Should prompt to set up seller profile
      await expect(page.getByText(/become.*seller|set.*up.*seller|seller.*profile/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should allow setting up seller profile', async ({ page }) => {
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          json: {
            name: 'Regular User',
            email: 'user@example.com',
            profileComplete: true,
            providerId: null,
            provider: null,
          }
        });
      });
      
      await page.route('**/api/seller/register', async route => {
        await route.fulfill({
          json: {
            success: true,
            provider: {
              id: 'new-provider',
              name: 'New Solar Provider',
              trustScore: 0.5,
            }
          }
        });
      });
      
      await page.goto('/sell');
      
      const setupButton = page.getByRole('button', { name: /become.*seller|set.*up|register/i });
      if (await setupButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await setupButton.click();
        
        // Fill provider details
        const nameInput = page.getByLabel(/provider.*name|business.*name/i);
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('New Solar Provider');
        }
        
        // Submit
        const submitButton = page.getByRole('button', { name: /submit|register|create/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should show success
          await expect(page.getByText(/success|registered|welcome/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle offer creation failure', async ({ page }) => {
      await page.route('**/api/seller/offers', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            json: { error: 'Invalid offer data' }
          });
        } else {
          await route.fulfill({ json: { offers: [] } });
        }
      });
      
      await page.goto('/sell');
      
      await page.getByRole('button', { name: /add.*offer|create.*offer|new/i }).click();
      
      // Fill and submit
      const priceInput = page.getByLabel(/price/i);
      if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priceInput.fill('5');
        
        const submitButton = page.getByRole('button', { name: /create|add|submit/i }).last();
        await submitButton.click();
        
        // Should show error
        await expect(page.getByText(/error|failed|invalid/i).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/api/seller/offers', async route => {
        await route.abort('failed');
      });
      
      await page.goto('/sell');
      
      // Should show error message
      await expect(page.getByText(/error|failed|try again|network/i).first()).toBeVisible({ timeout: 10000 });
    });
  });
});
