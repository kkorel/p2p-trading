/**
 * E2E Tests: Authentication Flows
 * Tests login, logout, session persistence, and auth error handling
 */

import { test, expect, Page } from '@playwright/test';

// Test utilities
async function mockAuthenticatedSession(page: Page, user: { name: string; email: string }) {
  // Set up mock authenticated state
  await page.addInitScript((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('sessionToken', 'mock-session-token');
  }, user);
}

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login screen when not authenticated', async ({ page }) => {
      await page.goto('/');
      
      // Should show login prompt
      await expect(page.getByText(/sign in/i).first()).toBeVisible();
    });

    test('should display Google login button', async ({ page }) => {
      await page.goto('/');
      
      const googleButton = page.getByRole('button', { name: /google/i });
      await expect(googleButton).toBeVisible();
    });

    test('should show loading state when login button clicked', async ({ page }) => {
      await page.goto('/');
      
      // Mock the auth endpoint
      await page.route('**/api/auth/google', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.fulfill({ json: { url: 'https://accounts.google.com/oauth' } });
      });

      const loginButton = page.getByRole('button', { name: /google/i });
      await loginButton.click();
      
      // Should show some loading indication
      await expect(page.getByText(/loading|signing in/i)).toBeVisible({ timeout: 5000 });
    });

    test('should handle authentication error gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Mock auth failure
      await page.route('**/api/auth/google', async route => {
        await route.fulfill({ 
          status: 500,
          json: { error: 'Authentication failed' }
        });
      });

      const loginButton = page.getByRole('button', { name: /google/i });
      await loginButton.click();
      
      // Should show error message
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Authenticated State', () => {
    test('should show user profile when authenticated', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Test User', email: 'test@example.com' });
      
      // Mock API responses
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          json: { name: 'Test User', email: 'test@example.com', profileComplete: true }
        });
      });
      
      await page.goto('/');
      
      // Should show user name somewhere on the page
      await expect(page.getByText('Test User').first()).toBeVisible();
    });

    test('should allow navigation to protected routes', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Test User', email: 'test@example.com' });
      
      await page.route('**/api/**', async route => {
        await route.fulfill({ json: { success: true } });
      });
      
      await page.goto('/profile');
      
      // Should not redirect to login
      await expect(page).toHaveURL(/\/profile/);
    });

    test('should display logout option when authenticated', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Test User', email: 'test@example.com' });
      
      await page.route('**/api/**', async route => {
        await route.fulfill({ json: { success: true } });
      });
      
      await page.goto('/');
      
      // Should have logout option
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      await expect(logoutButton).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page refreshes', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Persistent User', email: 'persist@example.com' });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          json: { name: 'Persistent User', email: 'persist@example.com' }
        });
      });
      
      await page.goto('/');
      await page.reload();
      
      // Should still be authenticated
      await expect(page.getByText('Persistent User').first()).toBeVisible();
    });

    test('should clear session on logout', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Test User', email: 'test@example.com' });
      
      await page.route('**/api/**', async route => {
        await route.fulfill({ json: { success: true } });
      });
      
      await page.goto('/');
      
      // Click logout
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      await logoutButton.click();
      
      // Should redirect to login
      await expect(page.getByText(/sign in/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle expired session', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: 'Test User', email: 'test@example.com' });
      
      // Mock expired session response
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 401,
          json: { error: 'Session expired', code: 'SESSION_INVALID' }
        });
      });
      
      await page.goto('/');
      
      // Should show login screen
      await expect(page.getByText(/sign in|session expired/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Profile Completion', () => {
    test('should prompt incomplete profile to complete', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: '', email: 'new@example.com' });
      
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          json: { email: 'new@example.com', profileComplete: false }
        });
      });
      
      await page.goto('/');
      
      // Should prompt to complete profile
      await expect(page.getByText(/complete.*profile|profile.*incomplete/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate profile form fields', async ({ page }) => {
      await mockAuthenticatedSession(page, { name: '', email: 'new@example.com' });
      
      await page.route('**/api/**', async route => {
        await route.fulfill({ json: { success: true, profileComplete: false } });
      });
      
      await page.goto('/profile');
      
      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /save|submit|complete/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show validation error
        await expect(page.getByText(/required|please enter/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
