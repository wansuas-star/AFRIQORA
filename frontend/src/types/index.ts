export interface User {
  id: string;
  afriqoraId?: string;
  email: string;
  displayName: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  contact?: string;
  profilePhoto?: string;
  createdAt?: string;
  isPlatformOwner?: boolean;
  role?: string;
  _count?: {
    followers?: number;
    following?: number;
    followingUsers?: number;
    posts?: number;
  };
}

export interface BusinessProfile {
  id: string;
  ownerId: string;
  businessName: string;
  category: string;
  description?: string;
  location?: string;
  country?: string;
  phone?: string;
  website?: string;
  logo?: string;
  isMarketplace?: boolean;
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationDoc?: string;
  createdAt?: string;
  owner?: {
    id: string;
    displayName: string;
    afriqoraId?: string;
  };
  campaigns?: AdCampaign[];
  transactions?: MerchantTransaction[];
  verification?: BusinessVerification;
}

export interface Post {
  id: string;
  authorId: string;
  businessId?: string;
  campaignId?: string;
  isSponsored?: boolean;
  ctaText?: string;
  ctaUrl?: string;
  title?: string;
  text?: string;
  content?: string;
  type?: string;
  category?: string;
  location?: string;
  website?: string;
  contact?: string;
  image?: string;
  video?: string;
  status?: string;
  createdAt: string;
  author?: {
    id: string;
    displayName: string;
    profilePhoto?: string;
    afriqoraId?: string;
  };
  business?: {
    id: string;
    businessName: string;
    category?: string;
    logo?: string;
    isVerified?: boolean;
  };
  _count?: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  recommendationScore?: number;
}

export interface Wallet {
  id?: string;
  userId?: string;
  earnings: number;
  totalViews: number;
  availableBalance?: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: string;
  method?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  actorUserId: string;
  type: string;
  title?: string;
  message?: string;
  route?: string;
  metadata?: string;
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content?: string;
  mediaUrl?: string;
  status: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchItem {
  type: 'businesses' | 'satellite' | 'satellite_target' | 'concessions' | 'jobs' | 'users' | 'profiles' | string;
  metadata?: Record<string, any>;
  id: string;
  campaignId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  location?: string;
  avatar?: string;
  logo?: string;
  image?: string;
  phone?: string;
  website?: string;
  ownerId?: string;
  ownerDisplayName?: string;
  afriqoraId?: string;
  isVerified?: boolean;
  isSponsored?: boolean;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

export interface AdCampaign {
  id: string;
  businessId: string;
  title: string;
  placement: 'feed' | 'search' | 'directory' | 'all';
  targetCategory?: string;
  targetLocation?: string;
  dailyBudget: number;
  totalBudget: number;
  spentAmount: number;
  cpcRate: number;
  cpmRate: number;
  impressions: number;
  clicks: number;
  status: 'pending_approval' | 'active' | 'paused' | 'completed' | 'rejected';
  headline?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface MerchantTransaction {
  id: string;
  businessId: string;
  campaignId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference: string;
  description?: string;
  createdAt: string;
}

export interface BusinessVerification {
  id: string;
  businessId: string;
  registrationNumber?: string;
  taxId?: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface MerchantAnalytics {
  metrics: {
    activeCampaigns: number;
    totalImpressions: number;
    totalClicks: number;
    totalSpent: number;
    averageCtr: number;
  };
  campaignSummaries: Array<{
    id: string;
    title: string;
    status: string;
    impressions: number;
    clicks: number;
    spent: number;
    budget: number;
    ctr: number;
  }>;
}

export interface SatelliteTarget {
  id: string;
  name: string;
  category: string;
  country: string;
  bbox: string; // JSON: [minLon, minLat, maxLon, maxLat]
  centerLat: number;
  centerLon: number;
  description?: string;
  createdAt: string;
}

export interface EpistemicEvidence {
  observed: string[];
  detected: string[];
  inferred: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
}

export interface TimelineObservationEvent {
  date: string;
  platform: string;
  sensorType: string;
  summary: string;
  metrics: Record<string, any>;
  thumbnailUrl?: string;
}

export interface SatelliteIntelligenceResponse {
  ok: boolean;
  reportId: string;
  userQuery: string;
  parsedQuery: {
    targetLocation: string;
    timeWindowDescription: string;
    analysisIntent: string;
    bbox: [number, number, number, number];
    dateRange: { start: string; end: string };
  };
  answer: string;
  evidence: EpistemicEvidence;
  analysis: {
    changeDetected: boolean;
    changeAreaHectares: number;
    changeAreaSquareKm: number;
    changeVectorGeoJson: any;
    metrics: Record<string, any>;
    pipelineUsed: string;
  };
  supportingImagery: {
    before: { date: string; platform: string; sensor: string; url: string };
    after: { date: string; platform: string; sensor: string; url: string };
    sarRadar?: { date: string; platform: string; sensor: string; url: string };
  };
  timeline: TimelineObservationEvent[];
  confidence: {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}
