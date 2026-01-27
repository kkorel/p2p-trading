// API base is empty since we use Next.js rewrites to proxy to the backend
const API_BASE = '';

export class ApiError extends Error {
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

  updateProfile: (data: { name?: string; productionCapacity?: number }) =>
    request<{ success: boolean; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  analyzeMeter: (pdfBase64: string) =>
    request<{
      success: boolean;
      message: string;
      analysis: {
        extractedCapacity: number | null;
        declaredCapacity: number;
        quality: 'HIGH' | 'MEDIUM' | 'LOW';
        matchesDeclaration: boolean;
        insights: string;
      };
      trustBonus: string | null;
      user: User;
    }>('/auth/analyze-meter', {
      method: 'POST',
      body: JSON.stringify({ pdfBase64 }),
    }),

  resetMeter: () =>
    request<{ success: boolean; message: string }>('/auth/reset-meter', {
      method: 'POST',
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getBalance: () =>
    request<{ success: boolean; balance: number }>('/auth/balance'),

  updateBalance: (balance: number) =>
    request<{ success: boolean; balance: number }>('/auth/balance', {
      method: 'PUT',
      body: JSON.stringify({ balance }),
    }),

  processPayment: (params: { orderId: string; amount: number; sellerId?: string }) =>
    request<{
      success: boolean;
      message: string;
      payment: {
        orderId: string;
        amount: number;
        platformFee: number;
        totalDeducted: number;
        sellerReceived: number;
      };
      newBalance: number;
    }>('/auth/payment', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
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

  createTransaction: () =>
    request<{ transaction_id: string }>('/api/transactions', {
      method: 'POST',
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

  getMyOrders: () =>
    request<{ orders: BuyerOrder[] }>('/api/my-orders'),

  cancelOrder: (params: { transaction_id: string; order_id: string; reason?: string }) =>
    request<{ status: string; message?: string }>('/api/cancel', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// Settlement/Payment APIs
export const settlementApi = {
  getSettlement: (tradeId: string) =>
    request<SettlementResponse>(`/api/settlement/${tradeId}`),

  initiate: (params: { tradeId?: string; order_id?: string; transaction_id?: string }) =>
    request<SettlementResponse>('/api/settlement/initiate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  confirmFunded: (tradeId: string, receipt: string) =>
    request<SettlementResponse>('/api/settlement/confirm-funded', {
      method: 'POST',
      body: JSON.stringify({ tradeId, receipt }),
    }),

  verifyOutcome: (tradeId: string, outcome: 'RELEASE' | 'REFUND') =>
    request<SettlementResponse>('/api/settlement/verify-outcome', {
      method: 'POST',
      body: JSON.stringify({ tradeId, outcome }),
    }),

  confirmPayout: (tradeId: string, receipt: string) =>
    request<SettlementResponse>('/api/settlement/confirm-payout', {
      method: 'POST',
      body: JSON.stringify({ tradeId, receipt }),
    }),

  autoRun: (tradeId: string) =>
    request<SettlementResponse>('/api/settlement/auto-run', {
      method: 'POST',
      body: JSON.stringify({ tradeId }),
    }),

  reset: () =>
    request<{ status: string }>('/api/settlement/reset', { method: 'POST' }),
};

// Demo Account APIs
export const demoApi = {
  getAccounts: () =>
    request<{ accounts: DemoAccount[]; transactions: DemoTransaction[] }>('/api/demo/accounts'),

  getAccount: (id: string) =>
    request<{ account: DemoAccount }>(`/api/demo/accounts/${id}`),

  getTransactions: () =>
    request<{ transactions: DemoTransaction[] }>('/api/demo/transactions'),

  resetAccounts: () =>
    request<{ status: string; accounts: DemoAccount[] }>('/api/demo/accounts/reset', { method: 'POST' }),

  resetAll: () =>
    request<{ status: string; accounts: DemoAccount[] }>('/api/demo/reset-all', { method: 'POST' }),
};

// Seller APIs
export const sellerApi = {
  getMyProfile: () =>
    request<{
      success: boolean;
      provider: Provider;
      items: CatalogItem[];
      offers: Offer[];
      quotaStats?: {
        totalSold: number;
        totalUnsoldInOffers: number;
        totalCommitted: number;
      };
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

  addOfferDirect: (data: AddOfferDirectParams) =>
    request<{ status: string; offer: Offer }>('/seller/offers/direct', {
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
  balance: number;
  providerId: string | null;
  // Trust score fields
  trustScore?: number;
  allowedTradeLimit?: number;
  meterDataAnalyzed?: boolean;
  // Production capacity fields
  productionCapacity?: number | null;      // kWh per month (user-declared)
  meterVerifiedCapacity?: number | null;   // kWh per month (from PDF analysis)
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
  source_type?: string;
  price: { value: number; currency: string };
  maxQuantity: number;
  timeWindow: { startTime: string; endTime: string } | null;
  blockStats?: { 
    total: number; 
    available: number; 
    sold?: number;
    delivered?: number;
    activeCommitment?: number; // What counts against trade limit
  };
}

export interface Order {
  id: string;
  status: string;
  quote?: { price: { value: number }; totalQuantity: number };
  created_at: string;
  itemInfo?: {
    item_id: string;
    offer_id: string;
    sold_quantity: number;
    source_type?: string;
    price_per_kwh?: number;
  };
  // DISCOM fulfillment verification
  fulfillment?: {
    verified: boolean;
    deliveredQty: number;
    expectedQty: number;
    deliveryRatio: number;
    status: 'FULL' | 'PARTIAL' | 'FAILED';
    trustImpact: number;
    verifiedAt: string;
  } | null;
}

export interface BuyerOrder {
  id: string;
  status: string;
  created_at: string;
  quote?: { price: { value: number }; totalQuantity: number };
  provider?: { id: string; name: string };
  itemInfo: {
    item_id: string;
    offer_id: string;
    source_type: string;
    price_per_kwh: number;
    quantity: number;
  };
  // Cancellation fields
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
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

export interface AddOfferDirectParams {
  source_type: string;
  price_per_kwh: number;
  currency?: string;
  max_qty: number;
  time_window: { startTime: string; endTime: string };
}

export interface SettlementRecord {
  tradeId: string;
  orderId: string | null;
  transactionId: string | null;
  buyerId: string | null;
  sellerId: string | null;
  principal: number;
  fee: number;
  total: number;
  expiresAt: string | null;
  status: string;
  verificationOutcome: string | null;
  fundedReceipt: string | null;
  payoutReceipt: string | null;
  fundedAt: string | null;
  verifiedAt: string | null;
  payoutAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaymentStep {
  id: number;
  label: string;
  status: 'pending' | 'complete' | 'error';
  time: string | null;
}

export interface EscrowInstruction {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  amount: number;
  currency: string;
  reference: string;
  expiresAt: string;
}

export interface PayoutInstruction {
  instruction: string;
  amount: number;
  currency: string;
}

export interface SettlementResponse {
  status: string;
  record: SettlementRecord;
  steps: PaymentStep[];
  escrow?: EscrowInstruction;
  payout?: PayoutInstruction;
}

export interface DemoAccount {
  id: string;
  name: string;
  type: 'buyer' | 'seller' | 'escrow' | 'platform';
  balance: number;
  currency: string;
}

export interface DemoTransaction {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  description: string;
  timestamp: string;
}

export interface TransactionState {
  transaction_id: string;
  status: string;
  error?: string;
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
  trustWarning?: {
    score: number;
    percentage: string;
    message: string;
  };
}
