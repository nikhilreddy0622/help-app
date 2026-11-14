/**
 * Typed API client shared by mobile, web and admin. THIS FILE IS THE API
 * CONTRACT: every method maps to exactly one route in services/api.
 * Handles the {data,error,meta} envelope and transparent token refresh.
 */
import type {
  ApiResponse, AuthTokens, Category, ContactSettings, ConversationDto, ProviderInsights, CheckoutSession, Me, MessageDto, NotificationCategory, NotificationDto,
  NotificationPreferences, PageMeta, RealtimeEvent, SupportMessageDto, SupportTicketDetail, SupportTicketDto,
  PaymentDto, PortfolioItem, ProviderCard, ProviderDashboard, ProviderPublicProfile, ReviewDto, ServiceOffering,
  SubscriptionDto, SubscriptionPlanDto,
} from '@help/types';
import type {
  AvailabilityInput, CategoryInput, ContactSettingsInput, CreateReportInput, SetStatusInput, CreateReviewInput,
  DiscoverySearchInput, PlanInput, PortfolioItemInput, ProviderBasicsInput, ProviderLocationInput, ServiceOfferingInput,
  UpdateMeInput,
} from '@help/validation';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export interface TokenStore {
  get(): Promise<AuthTokens | null> | AuthTokens | null;
  set(tokens: AuthTokens | null): Promise<void> | void;
}

export interface ClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  /** Called when refresh fails — app should route to login. */
  onSignedOut?: () => void;
  /** 'user' (default) or 'admin' — admin tokens are not refreshable. */
  kind?: 'user' | 'admin';
}

type Query = Record<string, string | number | boolean | undefined | null>;
export interface Paged<T> { items: T[]; meta: PageMeta }

export interface MyProvider {
  id: string; slug: string; status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'SUSPENDED'; isDiscoverable: boolean;
  displayName: string; headline: string | null; bio: string | null; avatarUrl: string | null; coverUrl: string | null;
  primaryCategoryId: string | null; experienceYears: number; languages: string[]; qualifications: string[]; skills: string[];
  city: string | null; pinCode: string | null; locality: string | null; lat: number | null; lng: number | null;
  serviceRadiusKm: number; serviceMode: 'ONSITE' | 'REMOTE' | 'BOTH'; areasServed: string[];
  services: ServiceOffering[]; portfolio: PortfolioItem[]; completeness: number; missingForPublish: string[];
  verification: { mobile: boolean; identity: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'; qualification: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' };
}
export interface AvailabilityDto {
  timezone: string; appointmentOnly: boolean; availableNow: boolean;
  rules: { weekday: number; startMinute: number; endMinute: number }[];
  exceptions: { id: string; startsAt: string; endsAt: string; reason: string | null }[];
}
export interface HomeFeed { categories: Category[]; availableNow: ProviderCard[]; topRated: ProviderCard[]; recentlyActive: ProviderCard[] }
export interface UploadSignature { uploadUrl: string; fields: Record<string, string>; publicUrlBase: string; maxBytes: number }
export interface ReverseGeocodeResult { city: string | null; pinCode: string | null; locality: string | null; state: string | null; label: string | null }
export interface SessionDto { id: string; deviceName: string | null; platform: string; lastUsedAt: string; createdAt: string; current: boolean }

export function createApiClient(opts: ClientOptions) {
  let refreshing: Promise<boolean> | null = null;

  async function refresh(): Promise<boolean> {
    if (opts.kind === 'admin') return false;
    const current = await opts.tokens.get();
    if (!current) return false;
    refreshing ??= (async () => {
      try {
        const res = await fetch(`${opts.baseUrl}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: current.refreshToken }) });
        if (!res.ok) throw new Error('refresh failed');
        const body = (await res.json()) as ApiResponse<AuthTokens>;
        await opts.tokens.set(body.data);
        return true;
      } catch {
        await opts.tokens.set(null);
        opts.onSignedOut?.();
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function raw<T>(method: string, path: string, body?: unknown, query?: Query, retry = true): Promise<{ data: T; meta?: PageMeta }> {
    const qs = query ? Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
    const tokens = await opts.tokens.get();
    const res = await fetch(`${opts.baseUrl}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(tokens ? { authorization: `Bearer ${tokens.accessToken}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && retry && tokens && (await refresh())) return raw<T>(method, path, body, query, false);
    let json: ApiResponse<T>;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(res.status, 'NETWORK', 'Unexpected server response');
    }
    if (!res.ok || json.error) throw new ApiError(res.status, json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Request failed', json.error?.details);
    return { data: json.data as T, meta: json.meta };
  }

  const get = <T>(p: string, q?: Query) => raw<T>('GET', p, undefined, q).then((r) => r.data);
  const paged = <T>(p: string, q?: Query) => raw<T[]>('GET', p, undefined, q).then((r) => ({ items: r.data, meta: r.meta ?? { nextCursor: null } }));
  const post = <T>(p: string, b: unknown = {}) => raw<T>('POST', p, b).then((r) => r.data);
  const put = <T>(p: string, b: unknown) => raw<T>('PUT', p, b).then((r) => r.data);
  const patch = <T>(p: string, b: unknown) => raw<T>('PATCH', p, b).then((r) => r.data);
  const del = <T>(p: string) => raw<T>('DELETE', p).then((r) => r.data);

  return {
    raw,
    auth: {
      requestOtp: (phone: string) => post<{ resendAfterSec: number }>('/auth/otp/request', { phone }),
      verifyOtp: (b: { phone: string; code: string; platform: 'web' | 'android' | 'ios'; deviceName?: string }) => post<{ tokens: AuthTokens; me: Me }>('/auth/otp/verify', b),
      google: (b: { idToken: string; platform: 'web' | 'android' | 'ios'; deviceName?: string }) => post<{ tokens: AuthTokens; me: Me }>('/auth/google', b),
      /** Email OTP: sign-in/sign-up and the "can't access my phone" recovery path. */
      requestEmailOtp: (email: string) => post<{ resendAfterSec: number }>('/auth/email/request', { email }),
      verifyEmailOtp: (b: { email: string; code: string; platform: 'web' | 'android' | 'ios'; deviceName?: string }) => post<{ tokens: AuthTokens; me: Me }>('/auth/email/verify', b),
      /** Verify + attach an email to the signed-in account (send code with requestEmailOtp first). */
      linkEmail: (email: string, code: string) => post<Me>('/auth/link/email', { email, code }),
      me: () => get<Me>('/auth/me'),
      linkPhone: (phone: string, code: string) => post<Me>('/auth/link/phone', { phone, code }),
      linkGoogle: (idToken: string) => post<Me>('/auth/link/google', { idToken }),
      sessions: () => get<SessionDto[]>('/auth/sessions'),
      revokeSession: (id: string) => del<{ revoked: true }>(`/auth/sessions/${id}`),
      logout: () => post<{ loggedOut: true }>('/auth/logout'),
    },
    users: {
      updateMe: (b: UpdateMeInput) => patch<Me>('/users/me', b),
      registerPushToken: (token: string, platform: 'web' | 'android' | 'ios') => post<{ ok: true }>('/users/me/push-tokens', { token, platform }),
      deleteMe: () => del<{ deleted: true }>('/users/me'),
      exportMe: () => get<Record<string, unknown>>('/users/me/export'),
      saved: (q?: { cursor?: string }) => paged<ProviderCard>('/users/me/saved', q),
      save: (providerId: string) => put<{ saved: true }>(`/users/me/saved/${providerId}`, {}),
      unsave: (providerId: string) => del<{ saved: false }>(`/users/me/saved/${providerId}`),
      recentlyViewed: () => get<ProviderCard[]>('/users/me/recently-viewed'),
      recentSearches: () => get<{ id: string; query: string; createdAt: string }[]>('/users/me/recent-searches'),
      block: (userId: string) => post<{ blocked: true }>(`/users/${userId}/block`),
    },
    categories: { list: () => get<Category[]>('/categories') },
    discovery: {
      search: (q: Partial<DiscoverySearchInput> & { lat: number; lng: number }) => paged<ProviderCard>('/discovery/search', q as Query),
      home: (q: { lat: number; lng: number }) => get<HomeFeed>('/discovery/home', q),
      reverseGeocode: (q: { lat: number; lng: number }) => get<ReverseGeocodeResult>('/discovery/reverse-geocode', q),
    },
    providers: {
      bySlug: (slug: string) => get<ProviderPublicProfile | { redirectTo: string }>(`/providers/${encodeURIComponent(slug)}`),
      reviews: (providerId: string, q?: { cursor?: string }) => paged<ReviewDto>(`/providers/${providerId}/reviews`, q),
      mine: () => get<MyProvider | null>('/providers/me'),
      create: (b: ProviderBasicsInput) => post<MyProvider>('/providers/me', b),
      updateBasics: (b: Partial<ProviderBasicsInput>) => patch<MyProvider>('/providers/me', b),
      setSkills: (skills: string[]) => put<MyProvider>('/providers/me/skills', { skills }),
      setLocation: (b: ProviderLocationInput) => put<MyProvider>('/providers/me/location', b),
      addService: (b: ServiceOfferingInput) => post<ServiceOffering>('/providers/me/services', b),
      updateService: (id: string, b: Partial<ServiceOfferingInput>) => patch<ServiceOffering>(`/providers/me/services/${id}`, b),
      deleteService: (id: string) => del<{ deleted: true }>(`/providers/me/services/${id}`),
      addPortfolio: (b: PortfolioItemInput) => post<PortfolioItem>('/providers/me/portfolio', b),
      deletePortfolio: (id: string) => del<{ deleted: true }>(`/providers/me/portfolio/${id}`),
      preview: () => get<ProviderPublicProfile>('/providers/me/preview'),
      publish: () => post<MyProvider>('/providers/me/publish'),
      unpublish: () => post<MyProvider>('/providers/me/unpublish'),
      dashboard: () => get<ProviderDashboard>('/providers/me/dashboard'),
      /** Available / Busy / Away + optional message ("Available from Monday") and auto-return time. */
      setStatus: (b: SetStatusInput) => put<ProviderDashboard['presence']>('/providers/me/status', b),
      /** One tap to confirm "still available" — refreshes statusUpdatedAt (answers the daily nudge). */
      confirmStatus: () => post<ProviderDashboard['presence']>('/providers/me/status/confirm'),
      /** Show / hide the profile from customers (paused profiles keep subscription, data and reviews). */
      setVisibility: (visible: boolean) => put<ProviderDashboard['presence']>('/providers/me/visibility', { visible }),
      insights: (days: 7 | 30 | 90 = 30) => get<ProviderInsights>('/providers/me/insights', { days }),
      contactSettings: () => get<ContactSettings>('/providers/me/contact-settings'),
      setContactSettings: (b: ContactSettingsInput) => put<ContactSettings>('/providers/me/contact-settings', b),
      quickReplies: () => get<{ replies: string[] }>('/providers/me/quick-replies'),
      setQuickReplies: (replies: string[]) => put<{ replies: string[] }>('/providers/me/quick-replies', { replies }),
      /** Customer action (login required): returns the provider's phone if they allow it; logged as a contact. */
      revealPhone: (providerId: string) => post<{ phone: string }>(`/providers/${providerId}/phone`),
      submitVerification: (b: { type: 'IDENTITY' | 'QUALIFICATION'; documentUrl: string; label?: string }) => post<{ id: string; status: string }>('/providers/me/verifications', b),
    },
    availability: {
      mine: () => get<AvailabilityDto>('/availability/me'),
      set: (b: AvailabilityInput) => put<AvailabilityDto>('/availability/me', b),
      addException: (b: { startsAt: string; endsAt: string; reason?: string }) => post<AvailabilityDto>('/availability/me/exceptions', b),
      deleteException: (id: string) => del<AvailabilityDto>(`/availability/me/exceptions/${id}`),
    },
    subscriptions: {
      plans: () => get<SubscriptionPlanDto[]>('/subscriptions/plans'),
      mine: () => get<SubscriptionDto | null>('/subscriptions/me'),
      checkout: (planId: string) => post<CheckoutSession>('/subscriptions/checkout', { planId }),
      verify: (b: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => post<SubscriptionDto>('/subscriptions/verify', b),
      cancel: () => post<SubscriptionDto>('/subscriptions/cancel'),
    },
    payments: { mine: () => get<PaymentDto[]>('/payments/me') },
    /** In-app chat: one conversation per customer–provider pair. Starting again returns the existing one. */
    conversations: {
      start: (providerId: string, message: string) => post<ConversationDto>('/conversations', { providerId, message }),
      list: (q?: { role?: 'customer' | 'provider'; cursor?: string }) => paged<ConversationDto>('/conversations', q),
      get: (id: string) => get<ConversationDto>(`/conversations/${id}`),
      /** Newest first; nextCursor pages to OLDER messages. */
      messages: (id: string, q?: { cursor?: string }) => paged<MessageDto>(`/conversations/${id}/messages`, q),
      send: (id: string, body: string) => post<MessageDto>(`/conversations/${id}/messages`, { body }),
      markRead: (id: string) => post<{ ok: true }>(`/conversations/${id}/read`),
    },
    reviews: {
      create: (b: CreateReviewInput) => post<ReviewDto>('/reviews', b),
      eligibility: (providerId: string) => get<{ canReview: boolean; reason?: 'SELF' | 'NO_INTERACTION' | 'ALREADY_REVIEWED' | 'SIGNED_OUT' }>(`/reviews/eligibility/${providerId}`),
      reply: (id: string, reply: string) => post<ReviewDto>(`/reviews/${id}/reply`, { reply }),
    },
    notifications: {
      list: (q?: { cursor?: string; category?: NotificationCategory; unreadOnly?: boolean }) => paged<NotificationDto>('/notifications', q),
      unreadCount: () => get<{ count: number; byCategory: Partial<Record<NotificationCategory, number>> }>('/notifications/unread-count'),
      markRead: (id: string) => post<{ ok: true }>(`/notifications/${id}/read`),
      /** Marks every notification in a collapsed group (e.g. all messages from one thread) read. */
      markGroupRead: (groupKey: string) => post<{ ok: true }>('/notifications/read-group', { groupKey }),
      markAllRead: (category?: NotificationCategory) => post<{ ok: true }>('/notifications/read-all', category ? { category } : {}),
      delete: (id: string) => del<{ deleted: true }>(`/notifications/${id}`),
      preferences: () => get<NotificationPreferences>('/notifications/preferences'),
      setPreferences: (b: NotificationPreferences) => put<NotificationPreferences>('/notifications/preferences', b),
      /**
       * Live events (SSE). Uses fetch streaming with the Authorization header —
       * never puts tokens in the URL. Reconnects with backoff; returns a stop fn.
       * React Native: pass a fetch that supports streaming (e.g. expo/fetch).
       */
      subscribe: (onEvent: (e: RealtimeEvent) => void, o?: { fetchImpl?: typeof fetch; onStatus?: (s: 'connecting' | 'open' | 'closed') => void }) =>
        subscribeSse(`${opts.baseUrl}/notifications/stream`, () => Promise.resolve(opts.tokens.get()), refresh, onEvent, o),
    },
    media: { sign: (b: { purpose: 'AVATAR' | 'COVER' | 'PORTFOLIO' | 'VERIFICATION' | 'ENQUIRY' | 'SUPPORT'; contentType: string }) => post<UploadSignature>('/media/sign', b) },
    reports: { create: (b: CreateReportInput) => post<{ id: string }>('/reports', b) },
    /** Block a provider from the profile screen (blocks the provider's user account). */
    blockProvider: (providerId: string) => post<{ blocked: true }>(`/providers/${providerId}/block`),
    support: {
      create: (b: { category: string; subject: string; message: string; providerId?: string; attachments?: string[] }) => post<SupportTicketDetail>('/support/tickets', b),
      list: (q?: { cursor?: string }) => paged<SupportTicketDto>('/support/tickets', q),
      get: (id: string) => get<SupportTicketDetail>(`/support/tickets/${id}`),
      reply: (id: string, body: string, attachments: string[] = []) => post<SupportMessageDto>(`/support/tickets/${id}/messages`, { body, attachments }),
      close: (id: string) => post<SupportTicketDto>(`/support/tickets/${id}/close`),
    },
    admin: {
      login: (email: string, password: string) => post<{ accessToken: string; admin: AdminMe }>('/admin/auth/login', { email, password }),
      /** Always returns ok (no account enumeration); emails a reset link valid 30 min if the admin exists. */
      forgotPassword: (email: string) => post<{ ok: true }>('/admin/auth/forgot', { email }),
      resetPassword: (token: string, password: string) => post<{ ok: true }>('/admin/auth/reset', { token, password }),
      changePassword: (currentPassword: string, newPassword: string) => post<{ ok: true }>('/admin/auth/change-password', { currentPassword, newPassword }),
      me: () => get<AdminMe>('/admin/auth/me'),
      supportTickets: (q?: Query) => paged<SupportTicketDto & { userName: string; userId: string }>('/admin/support/tickets', q),
      supportTicket: (id: string) => get<SupportTicketDetail & { userName: string; userId: string }>(`/admin/support/tickets/${id}`),
      replySupport: (id: string, body: string) => post<SupportMessageDto>(`/admin/support/tickets/${id}/messages`, { body }),
      setSupportStatus: (id: string, status: 'OPEN' | 'WAITING_ON_USER' | 'RESOLVED' | 'CLOSED') => post<SupportTicketDto>(`/admin/support/tickets/${id}/status`, { status }),
      overview: () => get<AdminOverview>('/admin/overview'),
      users: (q?: Query) => paged<AdminRow>('/admin/users', q),
      setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) => post<AdminRow>(`/admin/users/${id}/status`, { status, reason }),
      providers: (q?: Query) => paged<AdminRow>('/admin/providers', q),
      provider: (id: string) => get<AdminRow>(`/admin/providers/${id}`),
      setProviderVisibility: (id: string, hidden: boolean, reason?: string) => post<AdminRow>(`/admin/providers/${id}/visibility`, { hidden, reason }),
      setSponsored: (id: string, until: string | null) => post<AdminRow>(`/admin/providers/${id}/sponsor`, { until }),
      categories: () => get<(Category & { isActive: boolean; sortOrder: number })[]>('/admin/categories'),
      createCategory: (b: CategoryInput) => post<Category>('/admin/categories', b),
      updateCategory: (id: string, b: Partial<CategoryInput>) => patch<Category>(`/admin/categories/${id}`, b),
      verifications: (q?: Query) => paged<AdminRow>('/admin/verifications', q),
      decideVerification: (id: string, decision: 'APPROVE' | 'REJECT', note?: string) => post<AdminRow>(`/admin/verifications/${id}/decision`, { decision, note }),
      plans: () => get<(SubscriptionPlanDto & { isActive: boolean })[]>('/admin/plans'),
      createPlan: (b: PlanInput) => post<SubscriptionPlanDto>('/admin/plans', b),
      updatePlan: (id: string, b: Partial<PlanInput>) => patch<SubscriptionPlanDto>(`/admin/plans/${id}`, b),
      subscriptions: (q?: Query) => paged<AdminRow>('/admin/subscriptions', q),
      reconcileSubscription: (id: string) => post<AdminRow>(`/admin/subscriptions/${id}/reconcile`),
      payments: (q?: Query) => paged<AdminRow>('/admin/payments', q),
      reviews: (q?: Query) => paged<AdminRow>('/admin/reviews', q),
      moderateReview: (id: string, status: 'VISIBLE' | 'HIDDEN' | 'REMOVED', note?: string) => post<AdminRow>(`/admin/reviews/${id}/moderate`, { status, note }),
      reports: (q?: Query) => paged<AdminRow>('/admin/reports', q),
      resolveReport: (id: string, status: 'RESOLVED' | 'DISMISSED', resolution?: string) => post<AdminRow>(`/admin/reports/${id}/resolve`, { status, resolution }),
      analytics: (q?: { days?: number }) => get<AdminAnalytics>('/admin/analytics', q),
      auditLogs: (q?: Query) => paged<AdminRow>('/admin/audit-logs', q),
      admins: () => get<AdminMe[]>('/admin/admins'),
      createAdmin: (b: { email: string; name: string; password: string; role: string }) => post<AdminMe>('/admin/admins', b),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Minimal SSE reader over fetch streams with auth header, 401→refresh, and exponential backoff. */
function subscribeSse(
  url: string,
  getTokens: () => Promise<AuthTokens | null>,
  refresh: () => Promise<boolean>,
  onEvent: (e: RealtimeEvent) => void,
  o?: { fetchImpl?: typeof fetch; onStatus?: (s: 'connecting' | 'open' | 'closed') => void },
): () => void {
  const f = o?.fetchImpl ?? fetch;
  let stopped = false;
  let controller: AbortController | null = null;
  let attempt = 0;

  const loop = async () => {
    while (!stopped) {
      o?.onStatus?.('connecting');
      controller = new AbortController();
      try {
        const tokens = await getTokens();
        if (!tokens) break;
        const res = await f(url, { headers: { authorization: `Bearer ${tokens.accessToken}`, accept: 'text/event-stream' }, signal: controller.signal });
        if (res.status === 401) {
          if (!(await refresh())) break;
          continue;
        }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        o?.onStatus?.('open');
        attempt = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
            if (data) {
              try { onEvent(JSON.parse(data) as RealtimeEvent); } catch { /* ignore malformed event */ }
            }
          }
        }
      } catch {
        if (stopped) break;
      }
      o?.onStatus?.('closed');
      if (stopped) break;
      attempt = Math.min(attempt + 1, 6);
      await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** attempt) * (0.7 + Math.random() * 0.6)));
    }
  };
  void loop();
  return () => {
    stopped = true;
    controller?.abort();
    o?.onStatus?.('closed');
  };
}

export interface AdminMe { id: string; email: string; name: string; role: 'SUPER_ADMIN' | 'OPERATIONS' | 'SUPPORT' | 'FINANCE' | 'MODERATOR' }
/** Admin list rows are flat records; each admin endpoint documents its columns in docs/API.md. */
export type AdminRow = Record<string, unknown> & { id: string };
export interface AdminOverview {
  users: number; providers: number; publishedProviders: number; activeSubscriptions: number; mrrPaise: number;
  chats30d: number; pausedProviders: number; openReports: number; pendingVerifications: number; failedPayments7d: number;
}
export interface AdminAnalytics {
  series: { day: string; signups: number; chats: number; phoneReveals: number; revenuePaise: number }[];
  funnel: { searches: number; profileViews: number; contacts: number; chatsReplied: number; reviews: number };
  topCategories: { name: string; providers: number; contacts: number }[];
}

export const formatINR = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
