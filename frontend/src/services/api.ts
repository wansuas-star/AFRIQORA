import {
  User,
  BusinessProfile,
  Post,
  Wallet,
  Withdrawal,
  Notification,
  Message,
  SearchItem,
  AuthResponse,
  AdCampaign,
  MerchantTransaction,
  BusinessVerification,
  MerchantAnalytics,
} from '../types';

// Dynamic API Base: Defaults to relative '/api' for web, supports VITE_API_URL / window.AFRIQORA_API_BASE for mobile apps
const API_BASE = (import.meta.env.VITE_API_URL as string) || (typeof window !== 'undefined' && (window as any).AFRIQORA_API_BASE) || '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('afr_token') || null;
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('afr_token', token);
  } else {
    localStorage.removeItem('afr_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error?.message || data.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// 1. Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  getProfile: () => request<{ user: User }>('/users/me'),
};

// 2. Feed & Posts API
export const feedApi = {
  getHomeFeed: () => request<{ posts: Post[] }>('/feed/home'),

  createPost: (postData: {
    title?: string;
    text: string;
    category?: string;
    location?: string;
    image?: string;
    video?: string;
  }) =>
    request<{ post: Post }>('/feed', {
      method: 'POST',
      body: JSON.stringify(postData),
    }),
};

// 3. Creator & Business API
export const creatorApi = {
  getDashboard: () =>
    request<{
      wallet: Wallet;
      businessProfile: BusinessProfile | null;
      posts: Post[];
      viewsThreshold: number;
    }>('/creator/dashboard'),

  upsertBusinessProfile: (data: Partial<BusinessProfile>) =>
    request<{ businessProfile: BusinessProfile }>('/creator/business-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPublicProfile: (id: string) =>
    request<{ user: User; businessProfile: BusinessProfile | null }>(`/creator/${encodeURIComponent(id)}`),

  requestWithdrawal: (amount: number, method = 'bank_transfer') =>
    request<{ withdrawal: Withdrawal; message: string }>('/creator/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, method }),
    }),
};

// 4. Unified Search API
export const searchApi = {
  search: (q: string, types = 'all', limit = 20) =>
    request<{ ok: boolean; items: SearchItem[]; totalCount: number; hasMore: boolean }>(
      `/search?q=${encodeURIComponent(q)}&types=${encodeURIComponent(types)}&limit=${limit}`
    ),
};

// 5. Notifications & Connections API
export const notificationsApi = {
  getNotifications: (limit = 30) =>
    request<{ ok: boolean; items: Notification[]; unreadCount: number }>(`/notifications?limit=${limit}`),

  markAsRead: (id: string) =>
    request<{ ok: boolean; id: string }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    }),

  markAllRead: () =>
    request<{ ok: boolean }>('/notifications/read-all', {
      method: 'POST',
    }),

  sendConnectionRequest: (targetUserId: string, message?: string) =>
    request<{ ok: boolean; connectionRequest: any }>('/notifications/connections/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, message }),
    }),

  respondConnectionRequest: (requesterId: string, accept: boolean) =>
    request<{ ok: boolean; connectionRequest: any }>('/notifications/connections/respond', {
      method: 'POST',
      body: JSON.stringify({ requesterId, accept }),
    }),
};

// 6. Direct Messaging API
export const messagingApi = {
  sendMessage: (recipientId: string, content: string) =>
    request<{ message: Message }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content }),
    }),

  getThread: (peerId: string) =>
    request<{ messages: Message[] }>(`/messages/${encodeURIComponent(peerId)}`),
};

// 7. Users API
export const usersApi = {
  followUser: (userId: string) =>
    request<{ status: 'followed' | 'unfollowed' }>(`/users/${encodeURIComponent(userId)}/follow`, {
      method: 'POST',
    }),
};

// 8. Commercial & Merchant API
export const commercialApi = {
  getMerchantBusiness: () =>
    request<{ business: BusinessProfile }>('/commercial/business'),

  submitVerification: (data: { registrationNumber?: string; taxId?: string; documentUrl?: string }) =>
    request<{ success: boolean; verification: BusinessVerification }>('/commercial/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCampaigns: () =>
    request<{ campaigns: AdCampaign[] }>('/commercial/campaigns'),

  createCampaign: (data: {
    title: string;
    placement?: string;
    targetCategory?: string;
    targetLocation?: string;
    dailyBudget: number;
    totalBudget: number;
    headline: string;
    description?: string;
    ctaText?: string;
    ctaUrl?: string;
    mediaUrl?: string;
  }) =>
    request<{ success: boolean; campaign: AdCampaign; message: string }>('/commercial/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCampaignStatus: (id: string, status: 'active' | 'paused') =>
    request<{ success: boolean; campaign: AdCampaign }>(`/commercial/campaigns/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  recordAdClick: (campaignId: string, nonce: string) =>
    request<{ success: boolean; targetUrl: string; exhausted: boolean }>('/commercial/ads/click', {
      method: 'POST',
      body: JSON.stringify({ campaignId, nonce }),
    }),

  getMerchantAnalytics: () =>
    request<MerchantAnalytics>('/commercial/analytics'),

  depositBudget: (data: { campaignId?: string; amount: number; paymentMethod?: string; reference: string }) =>
    request<{ success: boolean; transaction: MerchantTransaction; message: string }>('/commercial/billing/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBillingHistory: () =>
    request<{ transactions: MerchantTransaction[] }>('/commercial/billing/history'),
};

// 9. Admin Moderation API
export const adminApi = {
  getPendingModeration: () =>
    request<{ pendingCampaigns: any[]; pendingVerifications: any[] }>('/admin/moderation/pending'),

  moderateCampaign: (id: string, action: 'approve' | 'reject', reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/moderation/campaign/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),

  moderateVerification: (id: string, action: 'approve' | 'reject', adminNotes?: string) =>
    request<{ success: boolean; message: string }>(`/admin/moderation/verification/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ action, adminNotes }),
    }),

  getPlatformOverview: () =>
    request<{ totalCampaigns: number; activeCampaigns: number; verifiedBusinesses: number; totalCommercialRevenue: number }>(
      '/admin/commercial/overview'
    ),
};

export const satelliteApi = {
  getStatus: () => request<any>('/satellite/status'),
  getTargets: () => request<{ ok: boolean; targets: any[] }>('/satellite/targets'),
  searchScenes: (params: { bbox?: string; startDate?: string; endDate?: string; provider?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<{ ok: boolean; count: number; scenes: any[] }>(`/satellite/scenes?${qs}`);
  },
  queryIntelligence: (query: string, customBbox?: [number, number, number, number], targetId?: string) =>
    request<any>('/satellite/query', {
      method: 'POST',
      body: JSON.stringify({ query, customBbox, targetId }),
    }),
};
