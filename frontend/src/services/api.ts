import {
  User,
  BusinessProfile,
  Withdrawal,
  Notification,
  SearchItem,
  AdCampaign,
  MerchantTransaction
} from '../types';

const API_BASE = '/api';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('afriqora_token');
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('afriqora_token', token);
  } else {
    localStorage.removeItem('afriqora_token');
  }
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(API_BASE + endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    const errorMsg = data.error?.message || data.error || ('Request failed with status ' + res.status);
    throw new Error(errorMsg);
  }

  return res.json();
}

// 1. Auth API
export const authApi = {
  login: (email: string, pass: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    }),

  register: (email: string, pass: string, name: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass, displayName: name }),
    }),

  getProfile: () => request<{ user: User }>('/users/profile'),
};

// 2. Enterprise & Business Profile API
export const creatorApi = {
  upsertBusinessProfile: (profile: Partial<BusinessProfile>) =>
    request<{ businessProfile: BusinessProfile }>('/creator/business-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  saveBusinessProfile: (profile: Partial<BusinessProfile>) =>
    request<{ businessProfile: BusinessProfile }>('/creator/business-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  getBusinessProfile: (id: string) =>
    request<{ user: User; businessProfile: BusinessProfile | null }>('/creator/' + encodeURIComponent(id)),

  requestPayout: (amount: number, method: string, details: string) =>
    request<{ withdrawal: Withdrawal; message: string }>('/creator/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, method, details }),
    }),
};

export const businessApi = creatorApi;

// 3. Operational Notifications API
export const notificationsApi = {
  getNotifications: (limit: number = 20) =>
    request<{ items: Notification[]; unreadCount: number }>('/notifications?limit=' + limit),

  markAsRead: (id: string) =>
    request<{ success: boolean }>('/notifications/' + encodeURIComponent(id) + '/read', {
      method: 'POST',
    }),

  markAllRead: () =>
    request<{ success: boolean }>('/notifications/read-all', {
      method: 'POST',
    }),
};

// 4. Professional User Profiles API
export const usersApi = {
  getProfile: () => request<{ user: User }>('/users/profile'),

  updateProfile: (profileData: Partial<User>) =>
    request<{ user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
};

// 5. Unified Search API
export const searchApi = {
  search: (q: string, type: string = 'all', limit: number = 20) =>
    request<{ count: number; items: SearchItem[] }>('/search?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(type) + '&limit=' + limit),
};

// 6. Commercial Self-Service Infrastructure API
export const commercialApi = {
  createCampaign: (campaign: { title: string; objective: string; placement: string; budgetTotal: number; dailyBudget: number; startDate: string; endDate?: string }) =>
    request<{ success: boolean; campaign: AdCampaign; message: string }>('/commercial/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    }),

  getCampaigns: () =>
    request<{ success: boolean; campaigns: AdCampaign[] }>('/commercial/campaigns'),

  createDeposit: (amount: number, currency: string, paymentMethod: string) =>
    request<{ success: boolean; transaction: MerchantTransaction; message: string }>('/commercial/billing/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, paymentMethod }),
    }),

  getBillingSummary: () =>
    request<{ success: boolean; summary: any }>('/commercial/billing/summary'),

  submitVerification: (data: { businessName: string; registrationNumber?: string; taxId?: string; documentsUrl?: string }) =>
    request<{ success: boolean; message: string }>('/commercial/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 7. Administrative Moderation API
export const adminApi = {
  getPendingModeration: () =>
    request<{ success: boolean; campaigns: AdCampaign[]; verifications: BusinessProfile[] }>('/admin/moderation/pending'),

  moderateCampaign: (id: string, action: 'approve' | 'reject', notes?: string) =>
    request<{ success: boolean; message: string }>('/admin/moderation/campaign/' + encodeURIComponent(id), {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    }),

  moderateVerification: (id: string, action: 'approve' | 'reject', notes?: string) =>
    request<{ success: boolean; message: string }>('/admin/moderation/verification/' + encodeURIComponent(id), {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    }),
};
