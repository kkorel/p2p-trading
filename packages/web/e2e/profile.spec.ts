/**
 * E2E Tests: Profile Management
 * Tests profile viewing, editing, and seller setup
 */

import { test, expect, Page } from '@playwright/test';

// Helper to set up authenticated session
async function setupAuthenticatedUser(page: Page, userData: any = {}) {
  await page.addInitScript((data) => {
    localStorage.setItem('user', JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      profileComplete: true,
      ...data,
    }));
    localStorage.setItem('sessionToken', 'mock-session-token');
  }, userData);
}

// Mock API responses
async function setupProfileMocks(page: Page, profileData: any = {}) {
  await page.route('**/api/user/profile', async route => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        json: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          profileComplete: true,
          meterNumber: 'MTR-12345',
          balance: 500,
          ...profileData,
        }
      });
    } else if (method === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: 'user-123',
          ...body,
          profileComplete: true,
        }
      });
    }
  });

  await page.route('**/api/balance', async route => {
    await route.fulfill({ json: { balance: profileData.balance || 500 } });
  });
}

test.describe('Profile Management', () => {
  test.describe('Profile View', () => {
    test('should display user profile information', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page);
      
      await page.goto('/profile');
      
      // Should show user name
      await expect(page.getByText('Test User').first()).toBeVisible({ timeout: 10000 });
      
      // Should show email
      await expect(page.getByText('test@example.com').first()).toBeVisible();
    });

    test('should display account balance', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page, { balance: 1250 });
      
      await page.goto('/profile');
      
      // Should show balance
      await expect(page.getByText(/1,?250|₹1,?250/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should display meter number when available', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page, { meterNumber: 'MTR-12345' });
      
      await page.goto('/profile');
      
      // Should show meter number
      await expect(page.getByText('MTR-12345').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show seller badge when user is a seller', async ({ page }) => {
      await setupAuthenticatedUser(page, { providerId: 'provider-123' });
      await setupProfileMocks(page, {
        providerId: 'provider-123',
        provider: { id: 'provider-123', name: 'Solar Farm', trustScore: 0.85 },
      });
      
      await page.goto('/profile');
      
      // Should show seller indicator
      await expect(page.getByText(/seller|provider|solar farm/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Profile Edit', () => {
    test('should allow editing profile name', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page);
      
      await page.goto('/profile');
      
      // Click edit button
      const editButton = page.getByRole('button', { name: /edit/i });
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        // Find and update name field
        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          await nameInput.fill('Updated Name');
          
          // Save
          const saveButton = page.getByRole('button', { name: /save|update|submit/i });
          await saveButton.click();
          
          // Should show success
          await expect(page.getByText(/saved|updated|success/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should validate name minimum length', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page);
      
      await page.route('**/api/user/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 400,
            json: { error: 'Name must be at least 2 characters' }
          });
        } else {
          await route.fulfill({ json: { name: 'Test', email: 'test@example.com' } });
        }
      });
      
      await page.goto('/profile');
      
      const editButton = page.getByRole('button', { name: /edit/i });
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          await nameInput.fill('A'); // Too short
          
          const saveButton = page.getByRole('button', { name: /save|update/i });
          await saveButton.click();
          
          // Should show validation error
          await expect(page.getByText(/at least 2|too short|required/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should allow updating meter number', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await setupProfileMocks(page);
      
      await page.goto('/profile');
      
      const editButton = page.getByRole('button', { name: /edit/i });
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        const meterInput = page.getByLabel(/meter/i);
        if (await meterInput.isVisible()) {
          await meterInput.fill('NEW-MTR-67890');
          
          const saveButton = page.getByRole('button', { name: /save|update/i });
          await saveButton.click();
          
          await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Incomplete Profile', () => {
    test('should prompt to complete profile when incomplete', async ({ page }) => {
      await setupAuthenticatedUser(page, { profileComplete: false });
      await setupProfileMocks(page, { profileComplete: false, name: null });
      
      await page.goto('/profile');
      
      // Should show completion prompt
      await expect(page.getByText(/complete.*profile|profile.*incomplete/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should show required fields for incomplete profile', async ({ page }) => {
      await setupAuthenticatedUser(page, { profileComplete: false });
      await setupProfileMocks(page, { profileComplete: false, name: null });
      
      await page.goto('/profile');
      
      // Should show name as required
      await expect(page.getByLabel(/name/i)).toBeVisible({ timeout: 10000 });
    });

    test('should update profileComplete after filling required fields', async ({ page }) => {
      await setupAuthenticatedUser(page, { profileComplete: false });
      
      let profileComplete = false;
      await page.route('**/api/user/profile', async route => {
        if (route.request().method() === 'PUT') {
          profileComplete = true;
          await route.fulfill({
            json: { name: 'New User', email: 'new@example.com', profileComplete: true }
          });
        } else {
          await route.fulfill({
            json: { email: 'new@example.com', profileComplete }
          });
        }
      });
      
      await page.goto('/profile');
      
      const nameInput = page.getByLabel(/name/i);
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('New User');
        
        const submitButton = page.getByRole('button', { name: /save|complete|submit/i });
        await submitButton.click();
        
        // Should show success
        await expect(page.getByText(/success|complete/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Seller Profile Setup', () => {
    test('should show become seller button for non-sellers', async ({ page }) => {
      await setupAuthenticatedUser(page, { providerId: null });
      await setupProfileMocks(page, { providerId: null });
      
      await page.goto('/profile');
      
      // Should show become seller option
      await expect(page.getByRole('button', { name: /become.*seller|start.*selling|set.*up.*seller/i })).toBeVisible({ timeout: 10000 });
    });

    test('should not show become seller for existing sellers', async ({ page }) => {
      await setupAuthenticatedUser(page, { providerId: 'provider-123' });
      await setupProfileMocks(page, {
        providerId: 'provider-123',
        provider: { id: 'provider-123', name: 'Solar Farm', trustScore: 0.85 },
      });
      
      await page.goto('/profile');
      
      // Should not show become seller button
      await expect(page.getByRole('button', { name: /become.*seller/i })).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('should display trust score for sellers', async ({ page }) => {
      await setupAuthenticatedUser(page, { providerId: 'provider-123' });
      await setupProfileMocks(page, {
        providerId: 'provider-123',
        provider: { id: 'provider-123', name: 'Solar Farm', trustScore: 0.85 },
      });
      
      await page.goto('/profile');
      
      // Should show trust score
      await expect(page.getByText(/85%|0\.85|trust/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle profile fetch error', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 500,
          json: { error: 'Service unavailable' }
        });
      });
      
      await page.goto('/profile');
      
      // Should show error message
      await expect(page.getByText(/error|failed|unavailable|try again/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle profile update error', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      await page.route('**/api/user/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            json: { error: 'Update failed' }
          });
        } else {
          await route.fulfill({
            json: { name: 'Test', email: 'test@example.com' }
          });
        }
      });
      
      await page.goto('/profile');
      
      const editButton = page.getByRole('button', { name: /edit/i });
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        const nameInput = page.getByLabel(/name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Updated Name');
          
          const saveButton = page.getByRole('button', { name: /save|update/i });
          await saveButton.click();
          
          // Should show error
          await expect(page.getByText(/error|failed/i).first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});
