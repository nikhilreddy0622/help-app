/**
 * API contract: every request body/query is validated with these schemas on
 * the server and reused by clients for form validation.
 */
import { z } from 'zod';
import { PRESENCE_STATUSES, STATUS_MESSAGE_MAX, SUBSCRIPTION_STATUSES } from '@help/domain';

// ---------- primitives ----------
export const id = z.string().min(1).max(64);
export const indianPhone = z.string().regex(/^\+91[6-9]\d{9}$/, 'Use +91 followed by a 10-digit mobile number');
export const pinCode = z.string().regex(/^[1-9]\d{5}$/, 'Invalid PIN code');
export const lat = z.coerce.number().min(-90).max(90);
export const lng = z.coerce.number().min(-180).max(180);
export const cursorQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const PresenceStatusSchema = z.enum(PRESENCE_STATUSES);
export const SubscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const PriceUnit = z.enum(['HOURLY', 'PER_VISIT', 'FIXED', 'STARTING_AT', 'PER_DAY', 'PER_SESSION']);
export const ServiceMode = z.enum(['ONSITE', 'REMOTE', 'BOTH']);
export const VerificationType = z.enum(['MOBILE', 'IDENTITY', 'QUALIFICATION']);
export const ReportTargetType = z.enum(['PROVIDER', 'USER', 'REVIEW', 'MESSAGE', 'CONVERSATION']);
export const Platform = z.enum(['web', 'android', 'ios', 'admin']);

// ---------- auth ----------
export const OtpRequestSchema = z.object({ phone: indianPhone });
export const OtpVerifySchema = z.object({
  phone: indianPhone,
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().max(80).optional(),
  platform: Platform.default('web'),
});
export const GoogleLoginSchema = z.object({
  idToken: z.string().min(20),
  deviceName: z.string().max(80).optional(),
  platform: Platform.default('web'),
});
export const EmailOtpRequestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const EmailOtpVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().max(80).optional(),
  platform: Platform.default('web'),
});
export const LinkEmailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), code: z.string().regex(/^\d{6}$/) });
export const AdminForgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
const strongPassword = z.string().min(10).max(128).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');
export const AdminResetSchema = z.object({ token: z.string().min(20), password: strongPassword });
export const AdminChangePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: strongPassword });
export const RefreshSchema = z.object({ refreshToken: z.string().min(20) });
export const LinkPhoneSchema = z.object({ phone: indianPhone, code: z.string().regex(/^\d{6}$/) });
export const LinkGoogleSchema = z.object({ idToken: z.string().min(20) });

// ---------- users ----------
export const UpdateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  city: z.string().max(80).optional(),
  lat: lat.optional(),
  lng: lng.optional(),
  timezone: z.string().max(64).optional(),
});
export const PushTokenSchema = z.object({ token: z.string().min(10), platform: Platform });

// ---------- provider profile / onboarding ----------
export const ProviderBasicsSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(3).max(100),
  primaryCategoryId: id,
  experienceYears: z.number().int().min(0).max(70),
  bio: z.string().trim().max(2000).optional(),
  languages: z.array(z.string().min(2).max(20)).max(10).default([]),
  qualifications: z.array(z.string().max(120)).max(20).default([]),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
});
export const ProviderSkillsSchema = z.object({ skills: z.array(z.string().trim().min(2).max(40)).max(30) });
export const ProviderLocationSchema = z.object({
  city: z.string().trim().min(2).max(80),
  pinCode,
  locality: z.string().trim().max(120).optional(),
  lat,
  lng,
  serviceRadiusKm: z.number().min(1).max(100),
  serviceMode: ServiceMode,
  areasServed: z.array(z.string().max(80)).max(30).default([]),
});
export const ServiceOfferingSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().max(1000).optional(),
  categoryId: id.optional(),
  priceUnit: PriceUnit,
  pricePaise: z.number().int().min(0).max(100_000_000),
  negotiable: z.boolean().default(false),
  durationMinutes: z.number().int().min(5).max(24 * 60).optional(),
});
export const AvailabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
}).refine((r) => r.endMinute > r.startMinute, 'endMinute must be after startMinute');
export const AvailabilitySchema = z.object({
  timezone: z.string().default('Asia/Kolkata'),
  appointmentOnly: z.boolean().default(false),
  rules: z.array(AvailabilityRuleSchema).max(50),
});
export const AvailabilityExceptionSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().max(120).optional(),
}).refine((e) => e.endsAt > e.startsAt, 'endsAt must be after startsAt');
export const AvailableTodaySchema = z.object({ available: z.boolean() });
export const PortfolioItemSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO', 'LINK', 'CERTIFICATE']),
  url: z.string().url(),
  title: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
});

// ---------- discovery ----------
export const DiscoverySearchSchema = cursorQuery.extend({
  q: z.string().trim().max(100).optional(),
  categoryId: id.optional(),
  lat,
  lng,
  radiusKm: z.coerce.number().min(0.5).max(100).default(10),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minExperience: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  availableNow: z.coerce.boolean().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  language: z.string().max(20).optional(),
  serviceMode: ServiceMode.optional(),
  sort: z.enum(['relevance', 'distance', 'rating', 'price']).default('relevance'),
});

// ---------- subscriptions ----------
export const CreateSubscriptionSchema = z.object({ planId: id });
export const VerifySubscriptionSchema = z.object({
  razorpay_payment_id: z.string().min(5),
  razorpay_subscription_id: z.string().min(5),
  razorpay_signature: z.string().min(10),
});
export const PlanSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{2,40}$/),
  name: z.string().min(2).max(80),
  interval: z.enum(['MONTHLY', 'YEARLY']),
  pricePaise: z.number().int().min(100),
  features: z.array(z.string().max(120)).max(20),
  isActive: z.boolean().default(true),
});

// ---------- provider presence & contact (directory model) ----------
export const SetStatusSchema = z.object({
  status: PresenceStatusSchema,
  message: z.string().trim().max(STATUS_MESSAGE_MAX).nullable().optional(),
  /** When BUSY/AWAY ends (auto-returns to AVAILABLE). Must be in the future; max 90 days. */
  until: z.coerce.date().nullable().optional(),
}).refine((v) => !v.until || (v.until.getTime() > Date.now() && v.until.getTime() < Date.now() + 90 * 86_400_000), 'until must be within the next 90 days');
export const VisibilitySchema = z.object({ visible: z.boolean() });
export const ContactSettingsSchema = z.object({
  showPhone: z.boolean(),
  autoReplyEnabled: z.boolean(),
  /** Custom auto-reply; null = use status message / default text. */
  autoReplyText: z.string().trim().max(300).nullable(),
});
export const QuickRepliesSchema = z.object({ replies: z.array(z.string().trim().min(1).max(300)).max(10) });

// ---------- conversations ----------
export const StartConversationSchema = z.object({ providerId: id, message: z.string().trim().min(1).max(2000) });
export const SendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

// ---------- reviews / reports ----------
const star = z.number().int().min(1).max(5);
export const CreateReviewSchema = z.object({
  providerId: id,
  overall: star,
  quality: star,
  behaviour: star,
  punctuality: star,
  value: star,
  communication: star,
  comment: z.string().trim().max(2000).optional(),
});
export const ReviewReplySchema = z.object({ reply: z.string().trim().min(1).max(1000) });
export const CreateReportSchema = z.object({
  targetType: ReportTargetType,
  targetId: id,
  reason: z.enum(['FAKE_PROFILE', 'FRAUD', 'ABUSE', 'SAFETY', 'SPAM', 'OTHER']),
  details: z.string().max(2000).optional(),
});

// ---------- notifications ----------
export const NotificationCategorySchema = z.enum(['STATUS', 'MESSAGES', 'REVIEWS', 'PAYMENTS', 'ACCOUNT', 'PROMOTIONS']);
const channelPref = z.object({ push: z.boolean(), email: z.boolean() });
export const NotificationPreferencesSchema = z.object({
  channels: z.object({
    STATUS: channelPref, MESSAGES: channelPref, REVIEWS: channelPref,
    PAYMENTS: channelPref, ACCOUNT: channelPref, PROMOTIONS: channelPref,
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1439),
    timezone: z.string().max(64),
  }),
});
export const NotificationListQuery = cursorQuery.extend({
  category: NotificationCategorySchema.optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

// ---------- media ----------
export const UploadSignSchema = z.object({
  purpose: z.enum(['AVATAR', 'COVER', 'PORTFOLIO', 'VERIFICATION', 'ENQUIRY', 'SUPPORT']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']),
});

// ---------- verification ----------
export const SubmitVerificationSchema = z.object({
  type: z.enum(['IDENTITY', 'QUALIFICATION']),
  documentUrl: z.string().url(),
  label: z.string().max(120).optional(),
});

// ---------- support (in-app help desk) ----------
export const SupportCategory = z.enum(['CONTACT', 'PAYMENT', 'ACCOUNT', 'PROFILE', 'SAFETY', 'OTHER']);
export const CreateTicketSchema = z.object({
  category: SupportCategory,
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(10).max(4000),
  providerId: id.optional(),
  attachments: z.array(z.string().url()).max(4).default([]),
});
export const TicketMessageSchema = z.object({ body: z.string().trim().min(1).max(4000), attachments: z.array(z.string().url()).max(4).default([]) });
export const TicketStatusSchema = z.object({ status: z.enum(['OPEN', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED']) });

// ---------- admin ----------
export const AdminRole = z.enum(['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE', 'MODERATOR']);
export const CategorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  icon: z.string().max(40).optional(),
  parentId: id.optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export const AdminDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().max(500).optional(),
});
export const AdminUserStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']), reason: z.string().max(500).optional() });

// Inferred input types
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;
export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
export type ProviderBasicsInput = z.infer<typeof ProviderBasicsSchema>;
export type ProviderLocationInput = z.infer<typeof ProviderLocationSchema>;
export type ServiceOfferingInput = z.infer<typeof ServiceOfferingSchema>;
export type AvailabilityInput = z.infer<typeof AvailabilitySchema>;
export type PortfolioItemInput = z.infer<typeof PortfolioItemSchema>;
export type DiscoverySearchInput = z.infer<typeof DiscoverySearchSchema>;
export type SetStatusInput = z.infer<typeof SetStatusSchema>;
export type ContactSettingsInput = z.infer<typeof ContactSettingsSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type PlanInput = z.infer<typeof PlanSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export { z };
