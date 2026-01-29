/**
 * Unit tests for Balance Context
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BalanceProvider, useBalance } from '@/contexts/balance-context';
import { AuthProvider } from '@/contexts/auth-context';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

// Test component that uses the balance context
function TestConsumer() {
  const { balance, isLoading, refreshBalance, deductBalance, addBalance } = useBalance();
  
  return (
    <div>
      <span data-testid="balance">{balance ?? 'No Balance'}</span>
      <span data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</span>
      <button onClick={refreshBalance}>Refresh</button>
      <button onClick={() => deductBalance(100)}>Deduct 100</button>
      <button onClick={() => addBalance(50)}>Add 50</button>
    </div>
  );
}

// Wrapper that includes auth provider
function renderWithProviders(ui: React.ReactNode) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/user/profile')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        }),
      });
    }
    if (url.includes('/api/balance')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ balance: 1000 }),
      });
    }
    return Promise.resolve({ ok: false });
  });
  
  return render(
    <AuthProvider>
      <BalanceProvider>
        {ui}
      </BalanceProvider>
    </AuthProvider>
  );
}

describe('Balance Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch.mockReset();
  });

  describe('Initial State', () => {
    it('should start with loading state', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          return new Promise(() => {}); // Never resolve to test loading state
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    it('should fetch balance when authenticated', async () => {
      renderWithProviders(<TestConsumer />);
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1000');
      });
    });

    it('should show no balance when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('No Balance');
      });
    });
  });

  describe('Refresh Balance', () => {
    it('should refetch balance from API', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          callCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ balance: callCount === 1 ? 1000 : 1500 }),
          });
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1000');
      });
      
      await user.click(screen.getByRole('button', { name: 'Refresh' }));
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1500');
      });
    });
  });

  describe('Deduct Balance', () => {
    it('should update balance optimistically when deducting', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestConsumer />);
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1000');
      });
      
      await user.click(screen.getByRole('button', { name: 'Deduct 100' }));
      
      // Should update immediately (optimistic)
      expect(screen.getByTestId('balance')).toHaveTextContent('900');
    });

    it('should not allow negative balance', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ balance: 50 }),
          });
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('50');
      });
      
      await user.click(screen.getByRole('button', { name: 'Deduct 100' }));
      
      // Should not go below 0
      await waitFor(() => {
        const balanceText = screen.getByTestId('balance').textContent;
        expect(parseInt(balanceText || '0')).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Add Balance', () => {
    it('should update balance optimistically when adding', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TestConsumer />);
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1000');
      });
      
      await user.click(screen.getByRole('button', { name: 'Add 50' }));
      
      // Should update immediately (optimistic)
      expect(screen.getByTestId('balance')).toHaveTextContent('1050');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Service unavailable' }),
          });
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
      
      // Should not crash, balance may be null or show error
    });

    it('should handle network errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
    });
  });

  describe('Format Balance', () => {
    it('should display balance as number', async () => {
      renderWithProviders(<TestConsumer />);
      
      await waitFor(() => {
        const balanceText = screen.getByTestId('balance').textContent;
        expect(balanceText).toMatch(/^\d+$/);
      });
    });

    it('should handle decimal balances', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'user-1', name: 'Test', email: 'test@example.com' }),
          });
        }
        if (url.includes('/api/balance')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ balance: 1000.50 }),
          });
        }
        return Promise.resolve({ ok: false });
      });
      
      render(
        <AuthProvider>
          <BalanceProvider>
            <TestConsumer />
          </BalanceProvider>
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('balance')).toHaveTextContent('1000.5');
      });
    });
  });
});
