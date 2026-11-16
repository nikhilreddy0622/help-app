/** Response DTOs shared by API and clients. Input types come from @help/validation. */
import type { PresenceStatus, SubscriptionStatus } from '@help/domain';
export type * from '@help/validation';
export type { PresenceStatus, SubscriptionStatus };

export interface ApiError { code: string; message: string; details?: unknown }
export interface PageMeta { nextCursor: string | null }
export interface ApiResponse<T> { data: T | null; error: ApiError | null; meta?: PageMeta }

export interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number }

export interface Me {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  city: string | null;
  hasProviderProfile: boolean;
  providerId: string | null;
  emailVerified: boolean;
  linked: { google: boolean; phone: boolean; email: boolean };
}

export interface Category { id: string; name: string; slug: string; icon: string | null; /** null = top-level group (Home Services, Education…); otherwise the group it belongs to. */ parentId: string | null; providerCount?: number; supportsLiveRequest?: boolean }

export interface VerificationBadges { mobile: boolean; identity: boolean; qualification: boolean }

/** Public provider card — never includes phone/email/exact coordinates. */
export interface ProviderCard {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  avatarUrl: string | null;
  categoryName: string;
  experienceYears: number;
  ratingAvg: number | null;
  ratingCount: number;
  distanceKm: number | null;
  locality: string | null;
  startingPricePaise: number | null;
  startingPriceUnit: string | null;
  /** Effective presence (auto-return applied server-side via @help/domain effectivePresence). */
  status: PresenceStatus;
  statusLabel: string; // "Available now", "Busy · back 6:00 PM", "Away until Mon 18 Nov"
  statusMessage: string | null; // provider's note, e.g. "Available from Monday"
  statusUntil: string | null;
  statusUpdatedAt: string | null;
  statusFresh: boolean;
  availableNow: boolean;
  badges: VerificationBadges;
  sponsored: boolean;
  isNew: boolean;
}

export interface ServiceOffering {
  id: string;
  title: string;
  description: string | null;
  priceUnit: string;
  pricePaise: number;
  negotiable: boolean;
  durationMinutes: number | null;
}

export interface PortfolioItem { id: string; kind: string; url: string; title: string | null; description: string | null }

export interface ReviewDto {
  id: string;
  authorName: string;
  overall: number;
  quality: number;
  behaviour: number;
  punctuality: number;
  value: number;
  communication: number;
  comment: string | null;
  reply: string | null;
  createdAt: string;
  /** Always true: only customers who chatted with the provider (and got a reply) can review. */
  verified: true;
}

export interface ProviderPublicProfile extends ProviderCard {
  bio: string | null;
  coverUrl: string | null;
  languages: string[];
  qualifications: string[];
  skills: string[];
  serviceRadiusKm: number;
  serviceMode: string;
  areasServed: string[];
  services: ServiceOffering[];
  portfolio: PortfolioItem[];
  /** Optional working hours shown on the profile (empty rules = not specified). */
  workingHours: { timezone: string; rules: { weekday: number; startMinute: number; endMinute: number }[] };
  memberSince: string;
  responseMinutes: number | null;
  /** Whether the provider allows "Show phone number" (revealed via providers.revealPhone, login required). */
  phoneAvailable: boolean;
  recentReviews: ReviewDto[];
}

export interface SubscriptionPlanDto { id: string; code: string; name: string; interval: 'MONTHLY' | 'YEARLY'; pricePaise: number; features: string[] }

export interface SubscriptionDto {
  id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlanDto;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitled: boolean;
  graceEndsAt: string | null;
}

export interface CheckoutSession { subscriptionId: string; razorpaySubscriptionId: string; razorpayKeyId: string; plan: SubscriptionPlanDto }

export interface PaymentDto { id: string; amountPaise: number; status: string; method: string | null; paidAt: string | null; invoiceUrl: string | null }

/** One thread per customer–provider pair. */
export interface ConversationDto {
  id: string;
  /** Your role in this conversation. */
  role: 'customer' | 'provider';
  counterpart: { id: string; name: string; avatarUrl: string | null };
  provider: { id: string; slug: string; displayName: string; avatarUrl: string | null; status: PresenceStatus; statusLabel: string };
  lastMessage: MessageDto | null;
  unread: number;
  /** Customer only: eligible to review this provider now (provider has replied, not yet reviewed). */
  canReview: boolean;
  createdAt: string;
}

export interface MessageDto { id: string; conversationId: string; senderId: string; body: string; /** true for automatic Busy/Away replies */ auto: boolean; createdAt: string; readAt: string | null }

export type NotificationCategory = 'STATUS' | 'MESSAGES' | 'REVIEWS' | 'PAYMENTS' | 'ACCOUNT' | 'PROMOTIONS' | 'LIVE_REQUESTS';

export interface NotificationDto {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** In-app route, e.g. "/messages/abc" or "/provider/status" — clients map it to their navigator. */
  link: string | null;
  /** Avatar/thumbnail of the actor (provider/customer), if any. */
  imageUrl: string | null;
  /** Notifications sharing a groupKey collapse into one row ("3 new messages from Rahul"). */
  groupKey: string | null;
  groupCount: number;
  /** Important = bypasses quiet hours and shows as a banner (new message from a customer, payment failed). */
  important: boolean;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  /** Per category, per channel. In-app records are always kept; these control push & email.
   *  LIVE_REQUESTS is optional for backward compatibility; the server fills its default. */
  channels: Partial<Record<NotificationCategory, { push: boolean; email: boolean }>> & Record<Exclude<NotificationCategory, 'LIVE_REQUESTS'>, { push: boolean; email: boolean }>;
  quietHours: { enabled: boolean; startMinute: number; endMinute: number; timezone: string };
}

/** Server-sent events on GET /notifications/stream (Authorization header, text/event-stream). */
export type RealtimeEvent =
  | { type: 'notification.created'; notification: NotificationDto; unreadCount: number }
  | { type: 'notification.read'; ids: string[] | 'all'; unreadCount: number }
  | { type: 'message.created'; conversationId: string; message: MessageDto }
  | { type: 'conversation.read'; conversationId: string; readerId: string }
  | { type: 'support.updated'; ticketId: string }
  // Live "Request now": a new request reaches eligible providers; a new responder reaches the customer.
  | { type: 'live_request.created'; requestId: string; categoryName: string; urgent: boolean }
  | { type: 'live_request.responder_added'; requestId: string; responderCount: number }
  | { type: 'live_request.closed'; requestId: string; status: LiveRequestStatus }
  | { type: 'ping' };

export type TicketStatus = 'OPEN' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED';
export interface SupportTicketDto {
  id: string;
  number: number; // human-friendly #1042
  category: string;
  subject: string;
  status: TicketStatus;
  providerId: string | null;
  lastMessageAt: string;
  unreadForUser: boolean;
  createdAt: string;
}
export interface SupportMessageDto { id: string; fromStaff: boolean; authorName: string; body: string; attachments: string[]; createdAt: string }
export interface SupportTicketDetail extends SupportTicketDto { messages: SupportMessageDto[] }

export interface ProviderDashboard {
  profileViews30d: number;
  searchImpressions30d: number;
  chatsStarted30d: number;
  phoneReveals30d: number;
  saves30d: number;
  presence: { status: PresenceStatus; statusLabel: string; statusMessage: string | null; statusUntil: string | null; statusUpdatedAt: string | null; isPaused: boolean };
  ratingAvg: number | null;
  ratingCount: number;
  responseRate: number | null;
  completeness: number;
  missingForPublish: string[];
  isPublished: boolean;
  subscription: SubscriptionDto | null;
}

export interface ProviderInsights {
  days: number;
  totals: { views: number; impressions: number; chats: number; phoneReveals: number; saves: number };
  series: { day: string; views: number; impressions: number; chats: number; phoneReveals: number; saves: number }[];
  /** Share of new chats answered within 24h, and median minutes to first reply. */
  responseRate: number | null;
  responseMinutes: number | null;
  topSearchTerms: { term: string; count: number }[];
}

export interface ContactSettings { showPhone: boolean; autoReplyEnabled: boolean; autoReplyText: string | null }

// ---------- jobs ----------
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'GIG';
export type JobStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

/** A hiring post shown in job search. Phone reveal is the app's full involvement — no applications tracked. */
export interface JobCard {
  id: string;
  title: string;
  jobType: JobType;
  categoryName: string | null;
  payMinPaise: number | null;
  payMaxPaise: number | null;
  payUnit: string | null;
  city: string | null;
  locality: string | null;
  distanceKm: number | null;
  openings: number;
  createdAt: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl: string | null;
}

export interface JobDetail extends JobCard {
  description: string;
  status: JobStatus;
  closesAt: string | null;
}

/** Provider's own posting (management view). */
export interface MyJobPosting extends JobDetail {
  updatedAt: string;
}

// ---------- live requests ("Request now") ----------
export type LiveRequestStatus = 'OPEN' | 'CONNECTED' | 'EXPIRED' | 'CANCELLED';

/** A responder the customer can pick from (provider who raised their hand). */
export interface LiveResponder {
  providerId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string;
  ratingAvg: number | null;
  ratingCount: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  message: string | null;
  respondedAt: string;
  phoneAvailable: boolean;
}

/** Customer's view of their own request + who has responded. */
export interface LiveRequestDto {
  id: string;
  categoryId: string;
  categoryName: string;
  note: string | null;
  urgent: boolean;
  status: LiveRequestStatus;
  scheduledFor: string | null;
  expiresAt: string;
  createdAt: string;
  connectedProviderId: string | null;
  responders: LiveResponder[];
}

/** What an eligible provider sees in their incoming feed (customer identity stays private until connect). */
export interface IncomingLiveRequest {
  id: string;
  categoryName: string;
  note: string | null;
  urgent: boolean;
  /** Approximate area only — never the exact point. */
  areaLabel: string | null;
  distanceKm: number | null;
  scheduledFor: string | null;
  expiresAt: string;
  createdAt: string;
  myResponse: { etaMinutes: number | null; status: 'INTERESTED' | 'WITHDRAWN' } | null;
}

export interface LiveRequestSettings { acceptsLiveRequests: boolean; quietHoursStart: number | null; quietHoursEnd: number | null }
