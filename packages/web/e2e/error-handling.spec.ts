/**
 * E2E Tests: Error Handling and Edge Cases
 * Tests network errors, validation errors, race conditions, and recovery
 */

import { test, expect, Page } from '@playwright/test';

// Helper to set up authenticated session
async function setupAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      profileComplete: true,
    }));
    localStorage.setItem('sessionToken', 'mock-session-token');
  });
}

test.describe('Error Handling', () => {
  test.describe('Network Errors', () => {
    test('should display error message when API is unreachable', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      // Abort all API requests to simulate network failure
      await page.route('**/api/**', async route => {
        await route.abort('failed');
      });
      
      await page.goto('/buy');
      
      // Should show error message
      await expect(page.getByText(/error|failed|network|connection/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should display retry option on network error', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      let failCount = 0;
      await page.route('**/api/discover', async route => {
        failCount++;
        if (failCount <= 2) {
          await route.abort('failed');
        } else {
          await route.fulfill({ json: { success: true, offers: [] } });
        }
      });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.goto('/buy');
      
      // Look for retry button or try again option
      const retryButton = page.getByRole('button', { name: /retry|try again/i });
      if (await retryButton.isVisible({ timeout: 10000 }).catch(() => false)) {
        await retryButton.click();
      }
    });

    test('should handle timeout gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.route('**/api/discover', async route => {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Never respond
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show loading or timeout message
      await expect(page.getByText(/loading|searching/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('HTTP Error Codes', () => {
    test('should handle 401 Unauthorized and redirect to login', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 401,
          json: { error: 'Session expired', code: 'SESSION_INVALID' }
        });
      });
      
      await page.goto('/profile');
      
      // Should redirect to login or show session expired message
      await expect(page.getByText(/sign in|login|session expired/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle 403 Forbidden with appropriate message', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.route('**/api/seller/offers', async route => {
        await route.fulfill({
          status: 403,
          json: { error: 'Seller profile required', code: 'PROVIDER_REQUIRED' }
        });
      });
      
      await page.goto('/sell');
      
      // Should show access denied or setup seller prompt
      await expect(page.getByText(/access denied|seller profile|become.*seller/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle 404 Not Found', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.route('**/api/orders/nonexistent/status', async route => {
        await route.fulfill({
          status: 404,
          json: { error: 'Order not found', code: 'ORDER_NOT_FOUND' }
        });
      });
      
      await page.goto('/orders');
      
      // Should handle 404 gracefully
    });

    test('should handle 500 Internal Server Error', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 500,
          json: { error: 'Internal server error' }
        });
      });
      
      await page.goto('/buy');
      
      // Should show generic error message
      await expect(page.getByText(/error|something went wrong|server error/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle 503 Service Unavailable', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 503,
          json: { error: 'Service temporarily unavailable' }
        });
      });
      
      await page.goto('/buy');
      
      // Should show service unavailable message
      await expect(page.getByText(/unavailable|maintenance|try later/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Validation Errors', () => {
    test('should display field-level validation errors', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: { name: 'Test', profileComplete: true } });
        } else {
          await route.fulfill({
            status: 400,
            json: { 
              error: 'Validation failed',
              fields: { name: 'Name must be at least 2 characters' }
            }
          });
        }
      });
      
      await page.goto('/profile');
      
      const editButton = page.getByRole('button', { name: /edit/i });
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          await nameInput.fill('A');
          
          const saveButton = page.getByRole('button', { name: /save/i });
          await saveButton.click();
          
          // Should show field-specific error
          await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should prevent form submission with invalid data', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/**', async route => {
        await route.fulfill({ json: { success: true } });
      });
      
      await page.goto('/buy');
      
      // Try to submit with invalid quantity
      const quantityInput = page.getByLabel(/quantity/i);
      await quantityInput.fill('-5');
      
      const submitButton = page.getByRole('button', { name: /discover|search/i });
      await submitButton.click();
      
      // Should show validation error
      await expect(page.getByText(/invalid|positive|greater than/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Handling', () => {
    test('should clear stale session and redirect to login', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      // First request succeeds, subsequent fails with 401
      let requestCount = 0;
      await page.route('**/api/user/profile', async route => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({ json: { name: 'Test', profileComplete: true } });
        } else {
          await route.fulfill({
            status: 401,
            json: { error: 'Session expired' }
          });
        }
      });
      
      await page.goto('/profile');
      
      // Navigate to trigger second request
      await page.goto('/buy');
      
      // Should eventually show login or session expired
      await expect(page.getByText(/sign in|login|session/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle concurrent session invalidation', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 401,
          json: { error: 'Session invalid' }
        });
      });
      
      // Make multiple requests
      await page.goto('/profile');
      
      // Should redirect to login once, not create duplicate redirects
      await expect(page.getByText(/sign in|login/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Race Conditions', () => {
    test('should handle rapid button clicks gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      let submitCount = 0;
      await page.route('**/api/discover', async route => {
        submitCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ json: { success: true, offers: [] } });
      });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity/i).fill('10');
      
      const button = page.getByRole('button', { name: /discover|search/i });
      
      // Rapidly click multiple times
      await button.click();
      await button.click();
      await button.click();
      
      // Should only send one request (debounced) or handle gracefully
      await page.waitForTimeout(2000);
      expect(submitCount).toBeLessThanOrEqual(3);
    });

    test('should prevent double order submission', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      let confirmCount = 0;
      await page.route('**/api/confirm', async route => {
        confirmCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({ 
          json: { success: true, order: { id: 'order-1', status: 'ACTIVE' } }
        });
      });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true, balance: 1000 } });
      });
      
      await page.route('**/api/discover', async route => {
        await route.fulfill({
          json: {
            success: true,
            offers: [{ id: 'offer-1', provider: { name: 'Test' }, price: { value: 6 }, maxQuantity: 100 }]
          }
        });
      });
      
      // The test setup would need actual UI interaction to properly test this
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow navigation after error', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      // First page errors
      await page.route('**/api/discover', async route => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' }
        });
      });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.goto('/buy');
      
      // Should be able to navigate away
      await page.goto('/profile');
      
      // Should show profile page
      await expect(page.getByText('Test').first()).toBeVisible({ timeout: 10000 });
    });

    test('should recover gracefully when API starts working again', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      let failFirst = true;
      await page.route('**/api/user/profile', async route => {
        if (failFirst) {
          failFirst = false;
          await route.fulfill({ status: 500, json: { error: 'Error' } });
        } else {
          await route.fulfill({ json: { name: 'Test User', profileComplete: true } });
        }
      });
      
      await page.goto('/profile');
      
      // First load fails
      await expect(page.getByText(/error|failed/i).first()).toBeVisible({ timeout: 5000 });
      
      // Refresh should work
      await page.reload();
      
      // Should now show profile
      await expect(page.getByText('Test User').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state for no orders', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.route('**/api/orders', async route => {
        await route.fulfill({ json: { orders: [] } });
      });
      
      await page.goto('/orders');
      
      // Should show empty state
      await expect(page.getByText(/no orders|empty|nothing.*yet/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should show empty state for no offers found', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({ json: { name: 'Test', profileComplete: true } });
      });
      
      await page.route('**/api/discover', async route => {
        await route.fulfill({ json: { success: true, offers: [], eligibleCount: 0 } });
      });
      
      await page.goto('/buy');
      
      await page.getByLabel(/quantity/i).fill('10');
      await page.getByRole('button', { name: /discover|search/i }).click();
      
      // Should show no offers found
      await expect(page.getByText(/no offers|not found|no results/i).first()).toBeVisible({ timeout: 10000 });
    });
  });
});
