// API base is empty since we use Next.js rewrites to proxy to the backend
const API_BASE = '';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const authHeaders = getAuthHeaders();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  // Debug: log auth status
  if (typeof window !== 'undefined') {
    const hasToken = !!localStorage.getItem('authToken');
    console.log(`[API] ${options.method || 'GET'} ${endpoint} - Token: ${hasToken ? 'present' : 'MISSING'}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Clear auth and trigger re-auth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    let errorMessage = 'Request failed';
    try {
      const error = JSON.parse(errorBody);
      errorMessage = error.error || error.message || 'Request failed';
    } catch {
      errorMessage = errorBody || 'Request failed';
    }
    console.error(`API Error [${res.status}] ${endpoint}:`, errorMessage);
    throw new ApiError(errorMessage, res.status);
  }

  return res.json();
}

// Auth APIs
export const authApi = {
  getConfig: () => request<{ googleClientId: string }>('/auth/config'),
  
  loginWithGoogle: (idToken: string) =>
    request<{
      success: boolean;
      token: string;
      user: User;
      isNewUser: boolean;
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  getMe: () =>
    request<{ user: User }>('/auth/me'),

  updateProfile: (data: { name: string }) =>
    request<{ success: boolean; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// Buyer APIs
export const buyerApi = {
  discover: (params: DiscoverParams) =>
    request<{
      status: string;
      transaction_id: string;
      message_id: string;
    }>('/api/discover', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getTransaction: (transactionId: string) =>
    request<TransactionState>(`/api/transactions/${transactionId}`),

  select: (params: SelectParams) =>
    request<{
      status: string;
      transaction_id: string;
      selected_offer: any;
    }>('/api/select', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  init: (transactionId: string) =>
    request<{ status: string }>('/api/init', {
      method: 'POST',
      body: JSON.stringify({ transaction_id: transactionId }),
    }),

  confirm: (transactionId: string, orderId?: string) =>
    request<{ status: string }>('/api/confirm', {
      method: 'POST',
      body: JSON.stringify({ transaction_id: transactionId, order_id: orderId }),
    }),
};

// Seller APIs
export const sellerApi = {
  getMyProfile: () =>
    request<{
      success: boolean;
      provider: Provider;
      items: CatalogItem[];
      offers: Offer[];
    }>('/seller/my-profile'),

  getMyOrders: () =>
    request<{ orders: Order[] }>('/seller/my-orders'),

  addItem: (data: AddItemParams) =>
    request<{ status: string; item: CatalogItem }>('/seller/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addOffer: (data: AddOfferParams) =>
    request<{ status: string; offer: Offer }>('/seller/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteOffer: (id: string) =>
    request<{ status: string }>(`/seller/offers/${id}`, { method: 'DELETE' }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  profileComplete: boolean;
  providerId: string | null;
}

export interface Provider {
  id: string;
  name: string;
  trust_score: number;
  total_orders: number;
  successful_orders: number;
}

export interface CatalogItem {
  id: string;
  provider_id: string;
  source_type: 'SOLAR' | 'WIND' | 'HYDRO' | 'MIXED';
  delivery_mode: string;
  available_qty: number;
  meter_id: string;
}

export interface Offer {
  id: string;
  item_id: string;
  provider_id: string;
  price: { value: number; currency: string };
  maxQuantity: number;
  timeWindow: { start: string; end: string };
  blockStats?: { total: number; available: number };
}

export interface Order {
  id: string;
  status: string;
  quote?: { price: { value: number }; totalQuantity: number };
  created_at: string;
}

export interface DiscoverParams {
  sourceType?: string;
  minQuantity?: number;
  timeWindow?: { startTime: string; endTime: string };
}

export interface SelectParams {
  transaction_id: string;
  offer_id?: string;
  quantity: number;
  autoMatch?: boolean;
  requestedTimeWindow?: { start: string; end: string };
}

export interface AddItemParams {
  source_type: string;
  available_qty: number;
  meter_id?: string;
}

export interface AddOfferParams {
  item_id: string;
  price_per_kwh: number;
  currency?: string;
  max_qty: number;
  time_window: { startTime: string; endTime: string };
}

export interface TransactionState {
  transaction_id: string;
  status: string;
  catalog?: {
    providers: Array<{
      id: string;
      descriptor?: { name: string };
      items: Array<{
        id: string;
        offers: Offer[];
        itemAttributes?: {
          sourceType: string;
          availableQuantity: number;
        };
      }>;
    }>;
  };
  selectedOffer?: Offer;
  order?: Order;
  matchingResults?: {
    selectedOffer?: {
      offer: Offer;
      score: number;
    };
    allOffers: Array<{
      offer: Offer;
      score: number;
    }>;
  };
}
