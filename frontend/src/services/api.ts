import {
  User,
  BusinessProfile,
  Notification,
  SearchItem,
  AdCampaign,
  MerchantTransaction,
  MerchantAnalytics,
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
export const businessApi = {
  upsertBusinessProfile: (profile: Partial<BusinessProfile>) =>
    request<{ businessProfile: BusinessProfile }>('/commercial/business-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  saveBusinessProfile: (profile: Partial<BusinessProfile>) =>
    request<{ businessProfile: BusinessProfile }>('/commercial/business-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  getBusinessProfile: (id: string) =>
    request<{ user: User; businessProfile: BusinessProfile | null }>('/commercial/business/' + encodeURIComponent(id)),
};

export const creatorApi = businessApi;

// 3. Operational Notifications API
export const notificationsApi = {
  getNotifications: (limit: number = 20, type?: string) =>
    request<{ ok: boolean; items: Notification[]; unreadCount: number }>('/notifications?limit=' + limit + (type ? '&type=' + encodeURIComponent(type) : '')),

  getUnreadCount: () =>
    request<{ ok: boolean; unreadCount: number }>('/notifications/unread-count'),

  getSatelliteNotifications: () =>
    request<{ ok: boolean; items: Notification[]; unreadCount: number }>('/notifications/satellite'),

  markAsRead: (id: string) =>
    request<{ ok: boolean; id: string; read: boolean }>('/notifications/' + encodeURIComponent(id) + '/read', {
      method: 'POST',
    }),

  markAllRead: () =>
    request<{ ok: boolean }>('/notifications/read-all', {
      method: 'POST',
    }),
};

// 4. Professional User Profiles API
export const usersApi = {
  getProfile: () => request<{ user: User }>('/users/profile'),

  updateProfile: (profileData: Partial<User>) =>
    request<{ ok: boolean; user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
};

// 5. Unified Search API
export const searchApi = {
  search: (q: string, type: string = 'all', limit: number = 20) =>
    request<{ ok: boolean; count: number; items: SearchItem[] }>('/search?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(type) + '&limit=' + limit),
};

// 6. Commercial Self-Service Infrastructure API
export const commercialApi = {
  getMerchantBusiness: () =>
    request<{ business: BusinessProfile }>('/commercial/business'),

  getCampaigns: () =>
    request<{ success: boolean; campaigns: AdCampaign[] }>('/commercial/campaigns'),

  createCampaign: (campaign: any) =>
    request<{ success: boolean; campaign: AdCampaign; message: string }>('/commercial/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    }),

  updateCampaignStatus: (id: string, status: string) =>
    request<{ success: boolean; campaign: AdCampaign }>('/commercial/campaigns/' + encodeURIComponent(id) + '/status', {
      method: 'PUT',
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
    request<{ success: boolean; transaction: MerchantTransaction; message: string }>('/commercial/billing/fund', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createDeposit: (amount: number, currency: string, paymentMethod: string) =>
    request<{ success: boolean; transaction: MerchantTransaction; message: string }>('/commercial/billing/fund', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, paymentMethod }),
    }),

  getBillingHistory: () =>
    request<{ success?: boolean; transactions?: MerchantTransaction[]; history?: any[] }>('/commercial/billing/history'),

  getBillingSummary: () =>
    request<{ success?: boolean; transactions?: MerchantTransaction[]; history?: any[] }>('/commercial/billing/history'),

  submitVerification: (data: { registrationNumber?: string; taxId?: string; documentUrl?: string; documentsUrl?: string; businessName?: string; category?: string; location?: string; country?: string }) =>
    request<{ success: boolean; message: string; verification: any }>('/commercial/verification', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 7. Administrative Moderation API
export const adminApi = {
  getPendingModeration: () =>
    request<{ pendingCampaigns: AdCampaign[]; pendingVerifications: any[] }>('/admin/moderation/pending'),

  moderateCampaign: (id: string, action: 'approve' | 'reject', notes?: string) =>
    request<{ success: boolean; message: string }>('/admin/moderation/campaign/' + encodeURIComponent(id), {
      method: 'POST',
      body: JSON.stringify({ action, reason: notes }),
    }),

  moderateVerification: (id: string, action: 'approve' | 'reject', notes?: string) =>
    request<{ success: boolean; message: string }>('/admin/moderation/verification/' + encodeURIComponent(id), {
      method: 'POST',
      body: JSON.stringify({ action, adminNotes: notes }),
    }),
};

// 8. Flagship Satellite Earth Observation Intelligence API
export const satelliteApi = {
  getStatus: () =>
    request<{ ok: boolean; status: string; platform: string; pipelines: any; cdse: any; metrics: any }>('/satellite/status'),

  getAuthStatus: () =>
    request<{ ok: boolean; cdse: any }>('/satellite/auth/status'),

  getAlerts: (limit: number = 10) =>
    request<{ ok: boolean; count: number; alerts: any[] }>('/satellite/alerts?limit=' + limit),

  geocodeLocation: (q: string) =>
    request<{ ok: boolean; results: any[] }>('/satellite/geocode?q=' + encodeURIComponent(q)),

  queryIntelligence: (queryPayload: any) =>
    request<any>('/satellite/query', {
      method: 'POST',
      body: JSON.stringify(queryPayload),
    }),

  getDetectedObjects: (bbox?: string) =>
    request<any>('/satellite/objects' + (bbox ? '?bbox=' + encodeURIComponent(bbox) : '')),

  getTimeSeries: (params?: { bbox?: string; startDate?: string; endDate?: string; window?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>('/satellite/timeseries' + (q ? '?' + q : ''));
  },

  getReports: (targetId?: string, limit: number = 20) =>
    request<{ ok: boolean; reports: any[] }>('/satellite/reports?limit=' + limit + (targetId ? '&targetId=' + encodeURIComponent(targetId) : '')),

  getTargets: () =>
    request<{ ok: boolean; targets: any[] }>('/satellite/targets'),

  getChangePresets: () =>
    request<{ ok: boolean; presets: any[] }>('/satellite/change/presets'),

  analyzeChange: (payload: {
    locationName?: string;
    bbox?: number[];
    date1?: string;
    date2?: string;
    sensorType?: string;
    bandCombination?: string;
    enableAiExplanation?: boolean;
  }) =>
    request<any>('/satellite/change/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMaritimeRegions: () =>
    request<{
      ok: boolean;
      totalPorts: number;
      totalRegions: number;
      regions: Array<{ region: string; displayName: string; portCount: number; countries: string[] }>;
    }>('/satellite/maritime/regions'),

  getMaritimePorts: (params?: { q?: string; region?: string; country?: string; category?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.q) p.append('q', params.q);
    if (params?.region) p.append('region', params.region);
    if (params?.country) p.append('country', params.country);
    if (params?.category) p.append('category', params.category);
    if (params?.limit) p.append('limit', params.limit.toString());
    const query = p.toString();
    return request<{ ok: boolean; count: number; ports: any[] }>('/satellite/maritime/ports' + (query ? '?' + query : ''));
  },

  getMaritimePortById: (id: string) =>
    request<{ ok: boolean; port: any; recentScenesCount?: number; recentScenes?: any[] }>('/satellite/maritime/ports/' + encodeURIComponent(id)),

  registerCustomPortAOI: (payload: {
    name: string;
    country?: string;
    region?: string;
    lat: number;
    lon: number;
    bbox?: [number, number, number, number];
    strategicSignificance?: string;
    category?: string;
  }) =>
    request<{ ok: boolean; message: string; port: any }>('/satellite/maritime/ports/custom', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMaritimeVessels: (bbox?: string, thresholdDb?: number, portId?: string) => {
    const params = new URLSearchParams();
    if (bbox) params.append('bbox', bbox);
    if (thresholdDb !== undefined) params.append('thresholdDb', thresholdDb.toString());
    if (portId) params.append('portId', portId);
    const query = params.toString();
    return request<any>('/satellite/vessels' + (query ? '?' + query : ''));
  },

  validateVesselAnnotation: (payload: any) =>
    request<any>('/satellite/vessels/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitGroundTruthReview: (payload: any) =>
    request<any>('/satellite/ground-truth/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// 9. Conflict Intelligence API (Eastern DRC Mining Corridors & Armed Conflict Surveillance)
export const conflictApi = {
  getStatus: () =>
    request<{
      ok: boolean;
      module: string;
      state: {
        isActive: boolean;
        activationDate?: string;
        authorizedByOwnerEmail?: string;
        authorizationNonce?: string;
        surveillanceNotice: string;
        strictOwnerGateEnabled: boolean;
      };
      totalIncidentsAvailable: number;
      provincesMonitored: string[];
      monitoredMiningCorridors: string[];
      legalNotice: string;
    }>('/conflict/status'),

  activate: (authorizationReason?: string) =>
    request<{
      ok: boolean;
      message: string;
      state: any;
    }>('/conflict/activate', {
      method: 'POST',
      body: JSON.stringify({ authorizationReason }),
    }),

  deactivate: () =>
    request<{
      ok: boolean;
      message: string;
      state: any;
    }>('/conflict/deactivate', {
      method: 'POST',
    }),

  getIncidents: (params?: { province?: string; territory?: string; incidentType?: string; severity?: string; query?: string }) => {
    const p = new URLSearchParams();
    if (params?.province) p.append('province', params.province);
    if (params?.territory) p.append('territory', params.territory);
    if (params?.incidentType) p.append('incidentType', params.incidentType);
    if (params?.severity) p.append('severity', params.severity);
    if (params?.query) p.append('query', params.query);
    const query = p.toString();
    return request<{
      ok: boolean;
      count: number;
      incidents: any[];
      moduleState: any;
      admiraltyScaleLegend: any;
    }>('/conflict/incidents' + (query ? '?' + query : ''));
  },

  getIncidentById: (id: string) =>
    request<{
      ok: boolean;
      incident: any;
      satelliteEvidenceSummary: any;
    }>('/conflict/incidents/' + encodeURIComponent(id)),

  getSatellitePasses: (id: string, days?: number, platform?: string) => {
    const p = new URLSearchParams();
    if (days) p.append('days', days.toString());
    if (platform) p.append('platform', platform);
    const query = p.toString();
    return request<{
      ok: boolean;
      incidentId: string;
      incidentTitle: string;
      locationName: string;
      bbox: [number, number, number, number];
      searchWindow: { start: string; end: string; days: number };
      provenance: {
        isRealData: boolean;
        dataSource: string;
        provider: string;
        totalScenesDiscovered: number;
        sarPassCount: number;
        opticalPassCount: number;
      };
      scenes: any[];
    }>('/conflict/incidents/' + encodeURIComponent(id) + '/satellite-passes' + (query ? '?' + query : ''));
  },

  corroborateSatellite: (
    id: string,
    payload: {
      sensorType?: 'SAR' | 'OPTICAL' | 'BOTH';
      comparisonWindowDays?: number;
      thresholdDb?: number;
    }
  ) =>
    request<{
      ok: boolean;
      incidentId: string;
      incidentTitle: string;
      admiraltyUpgradeNotice: string;
      generatedObservations: any[];
      incident: any;
    }>('/conflict/incidents/' + encodeURIComponent(id) + '/corroborate-satellite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAuditLogs: () =>
    request<{
      ok: boolean;
      totalEntries: number;
      logs: Array<{
        id: string;
        timestamp: string;
        actorEmail: string;
        action: string;
        targetIncidentId?: string;
        details: string;
        sha256Signature: string;
      }>;
    }>('/conflict/audit-logs'),
};
