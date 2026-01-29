/**
 * Unit tests for Auth Context
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

// Test component that uses the auth context
function TestConsumer() {
  const { user, isLoading, isAuthenticated, login, logout, refreshUser } = useAuth();
  
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'No User'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={refreshUser}>Refresh</button>
    </div>
  );
}

describe('Auth Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should start with loading state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      // Initial state should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    it('should show not authenticated when no session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should show user when authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        }),
      });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user')).toContainText('Test User');
      });
    });
  });

  describe('Login', () => {
    it('should open Google OAuth when login called', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.fn();
      global.open = mockOpen;
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Not authenticated' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: 'https://accounts.google.com/oauth' }),
        });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      await user.click(screen.getByRole('button', { name: 'Login' }));
      
      // Should redirect to Google OAuth
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/google'),
        expect.any(Object)
      );
    });
  });

  describe('Logout', () => {
    it('should clear user and call logout API', async () => {
      const user = userEvent.setup();
      
      // Initial authenticated state
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
      
      await user.click(screen.getByRole('button', { name: 'Logout' }));
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
      });
    });

    it('should clear local storage on logout', async () => {
      const user = userEvent.setup();
      
      localStorage.setItem('sessionToken', 'test-token');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
      
      await user.click(screen.getByRole('button', { name: 'Logout' }));
      
      await waitFor(() => {
        expect(localStorage.getItem('sessionToken')).toBeNull();
      });
    });
  });

  describe('Refresh User', () => {
    it('should refetch user profile', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user-1', name: 'Old Name', email: 'test@example.com' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user-1', name: 'New Name', email: 'test@example.com' }),
        });
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toContainText('Old Name');
      });
      
      await user.click(screen.getByRole('button', { name: 'Refresh' }));
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toContainText('New Name');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should handle session expiry', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Session expired', code: 'SESSION_INVALID' }),
        });
      
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
      
      await user.click(screen.getByRole('button', { name: 'Refresh' }));
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });
  });

  describe('Context Usage Outside Provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestConsumer />);
      }).toThrow(/must be used within/i);
      
      consoleSpy.mockRestore();
    });
  });
});
