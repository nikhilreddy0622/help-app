import { Prisma } from '@prisma/client';
import type { IncomingLiveRequest, LiveRequestDto, LiveRequestSettings, LiveResponder } from '@help/types';
import type { CreateLiveRequestInput, LiveRespondInput, LiveRequestSettingsInput } from '@help/validation';
import { prisma } from '../../lib/core';
import { AppError, forbidden, notFound } from '../../lib/http';
import { emitToUser } from '../../realtime/bus';
import { notifySafe } from '../../integrations/notify';
import { providerEntitled } from '../providers/entitlement';
import { startConversation } from '../conversations/service';

const REQUEST_TTL_MIN = 20;
const DEFAULT_RADIUS_KM = 12;
const REBROADCAST_RADIUS_KM = 25;
const MAX_TARGETS = 40;

const haversineKm = (lat: number, lng: number) =>
  Prisma.sql`(6371.0 * 2 * asin(sqrt(least(1.0, power(sin(radians(p.lat - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(p.lat)) * power(sin(radians(p.lng - ${lng}) / 2), 2)))))`;

// ---- eligibility --------------------------------------------------------
/** Providers who can serve a live request: right category, available, discoverable, opted-in, nearby. */
async function eligibleProviderIds(categoryId: string, lat: number, lng: number, radiusKm: number): Promise<{ id: string; userId: string; dist: number }[]> {
  // presenceStatus AVAILABLE + not paused + discoverable + acceptsLiveRequests + category match (primary or offers it)
  const rows = await prisma.$queryRaw<{ id: string; userId: string; dist: number }[]>`
    SELECT p.id, p."userId", ${haversineKm(lat, lng)} AS dist
    FROM "ProviderProfile" p
    WHERE p."deletedAt" IS NULL
      AND p."isDiscoverable" = true
      AND p."isPaused" = false
      AND p."acceptsLiveRequests" = true
      AND p."presenceStatus" = 'AVAILABLE'
      AND p.lat IS NOT NULL AND p.lng IS NOT NULL
      AND p."primaryCategoryId" = ${categoryId}
      AND ${haversineKm(lat, lng)} <= ${radiusKm}
    ORDER BY dist ASC
    LIMIT ${MAX_TARGETS}`;
  // Entitlement check (subscription) in JS to reuse the domain rule.
  const out: { id: string; userId: string; dist: number }[] = [];
  for (const r of rows) if (await providerEntitled(r.id)) out.push(r);
  return out;
}

function withinQuietHours(start: number | null, end: number | null, now = new Date()): boolean {
  if (start == null || end == null) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes() + 330; // IST
  const m = mins % 1440;
  return start <= end ? m >= start && m < end : m >= start || m < end;
}

async function buzzProviders(req: { id: string; categoryName: string; urgent: boolean }, targets: { id: string; userId: string }[]) {
  // Respect each provider's quiet hours (urgent bypasses).
  const profs = await prisma.providerProfile.findMany({ where: { id: { in: targets.map((t) => t.id) } }, select: { userId: true, quietHoursStart: true, quietHoursEnd: true } });
  const quiet = new Map(profs.map((p) => [p.userId, withinQuietHours(p.quietHoursStart, p.quietHoursEnd)]));
  await Promise.all(targets.map((t) => {
    void emitToUser(t.userId, { type: 'live_request.created', requestId: req.id, categoryName: req.categoryName, urgent: req.urgent });
    if (req.urgent || !quiet.get(t.userId)) {
      return notifySafe(t.userId, {
        type: 'live_request.created',
        category: 'LIVE_REQUESTS',
        title: req.urgent ? `Urgent: ${req.categoryName} needed nearby` : `New ${req.categoryName} request nearby`,
        body: 'A customer near you needs help now. Tap to see the request.',
        link: `/live/incoming`,
        groupKey: `live:${req.id}`,
        important: req.urgent,
      });
    }
    return Promise.resolve();
  }));
}

// ---- DTO mapping --------------------------------------------------------
async function toCustomerDto(requestId: string): Promise<LiveRequestDto> {
  const r = await prisma.liveRequest.findUnique({
    where: { id: requestId },
    include: {
      category: { select: { name: true } },
      responses: {
        where: { status: 'INTERESTED' },
        orderBy: { createdAt: 'asc' },
        include: { provider: { select: { id: true, slug: true, displayName: true, avatarUrl: true, headline: true, ratingAvg: true, ratingCount: true, lat: true, lng: true, showPhone: true, user: { select: { phone: true } } } } },
      },
    },
  });
  if (!r) throw notFound('Request');
  const responders: LiveResponder[] = r.responses.map((resp) => {
    const p = resp.provider;
    const dist = p.lat != null && p.lng != null ? haversine(r.lat, r.lng, p.lat, p.lng) : null;
    return {
      providerId: p.id, slug: p.slug, displayName: p.displayName, avatarUrl: p.avatarUrl, headline: p.headline ?? '',
      ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, distanceKm: dist == null ? null : Math.round(dist * 10) / 10,
      etaMinutes: resp.etaMinutes, message: resp.message, respondedAt: resp.createdAt.toISOString(),
      phoneAvailable: p.showPhone && !!p.user.phone,
    };
  });
  return {
    id: r.id, categoryId: r.categoryId, categoryName: r.category.name, note: r.note, urgent: r.urgent,
    status: r.status, scheduledFor: r.scheduledFor?.toISOString() ?? null, expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(), connectedProviderId: r.connectedProviderId, responders,
  };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ---- customer actions ---------------------------------------------------
export async function createLiveRequest(customerId: string, input: CreateLiveRequestInput): Promise<LiveRequestDto> {
  const cat = await prisma.category.findFirst({ where: { id: input.categoryId, isActive: true }, select: { id: true, name: true, supportsLiveRequest: true } });
  if (!cat) throw notFound('Category');
  if (!cat.supportsLiveRequest) throw new AppError(422, 'LIVE_NOT_SUPPORTED', 'This service does not support live requests yet');
  // One active request per customer at a time.
  const open = await prisma.liveRequest.findFirst({ where: { customerId, status: 'OPEN' }, select: { id: true } });
  if (open) throw new AppError(409, 'ALREADY_ACTIVE', 'You already have an active request. Cancel it before posting another.');
  // Rate limit: max 10 requests / day.
  const recent = await prisma.liveRequest.count({ where: { customerId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (recent >= 10) throw new AppError(429, 'RATE_LIMITED', 'Daily request limit reached. Try again later.');

  const expiresAt = new Date(Date.now() + REQUEST_TTL_MIN * 60_000);
  const req = await prisma.liveRequest.create({
    data: { customerId, categoryId: cat.id, lat: input.lat, lng: input.lng, note: input.note, urgent: input.urgent, scheduledFor: input.scheduledFor ?? null, expiresAt },
  });
  // Scheduled-for-later requests broadcast when due (Phase 3), handled by the job; immediate ones buzz now.
  if (!input.scheduledFor) {
    const targets = await eligibleProviderIds(cat.id, input.lat, input.lng, DEFAULT_RADIUS_KM);
    await buzzProviders({ id: req.id, categoryName: cat.name, urgent: req.urgent }, targets);
  }
  return toCustomerDto(req.id);
}

export async function myActiveRequest(customerId: string): Promise<LiveRequestDto | null> {
  const r = await prisma.liveRequest.findFirst({ where: { customerId, status: { in: ['OPEN', 'CONNECTED'] } }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  return r ? toCustomerDto(r.id) : null;
}

export async function getLiveRequest(customerId: string, id: string): Promise<LiveRequestDto> {
  const r = await prisma.liveRequest.findFirst({ where: { id, customerId }, select: { id: true } });
  if (!r) throw notFound('Request');
  return toCustomerDto(id);
}

export async function cancelLiveRequest(customerId: string, id: string): Promise<LiveRequestDto> {
  const r = await prisma.liveRequest.findFirst({ where: { id, customerId }, select: { id: true, status: true } });
  if (!r) throw notFound('Request');
  if (r.status === 'OPEN') await prisma.liveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  await closeAndNotify(id, 'CANCELLED');
  return toCustomerDto(id);
}

/** Customer picks a responder → connect by chat (and expose phone availability). Marks the request CONNECTED. */
export async function connectToResponder(customerId: string, requestId: string, providerId: string): Promise<{ phone: string | null; conversationId: string | null }> {
  const r = await prisma.liveRequest.findFirst({ where: { id: requestId, customerId }, include: { category: { select: { name: true } } } });
  if (!r) throw notFound('Request');
  if (r.status === 'EXPIRED' || r.status === 'CANCELLED') throw new AppError(409, 'REQUEST_CLOSED', 'This request is no longer active');
  const resp = await prisma.liveRequestResponse.findUnique({ where: { requestId_providerId: { requestId, providerId } }, include: { provider: { select: { id: true, userId: true, showPhone: true, user: { select: { phone: true } } } } } });
  if (!resp) throw notFound('Responder');

  await prisma.liveRequest.update({ where: { id: requestId }, data: { status: 'CONNECTED', connectedProviderId: providerId, connectedAt: new Date() } });
  await prisma.contactEvent.create({ data: { providerId, userId: customerId, kind: 'LIVE_REQUEST_CONNECTED' } });

  // Open a chat so there is an in-app thread, and let the provider know they were picked.
  let conversationId: string | null = null;
  try {
    const dto = await startConversation(customerId, providerId, `Hi! I sent a live request for ${r.category.name}${r.note ? `: ${r.note}` : ''}.`);
    conversationId = dto.id;
  } catch { /* chat may be rate-limited or unavailable; phone still returned */ }
  void notifySafe(resp.provider.userId, {
    type: 'live_request.connected', category: 'LIVE_REQUESTS',
    title: 'You were picked for a live request', body: `A customer chose you for their ${r.category.name} request.`,
    link: conversationId ? `/messages/${conversationId}` : '/live/incoming', important: true,
  });
  await closeAndNotify(requestId, 'CONNECTED');
  const phone = resp.provider.showPhone ? resp.provider.user.phone : null;
  return { phone, conversationId };
}

// ---- provider actions ---------------------------------------------------
export async function incomingForProvider(userId: string, _loc?: { lat?: number; lng?: number }): Promise<IncomingLiveRequest[]> {
  const provider = await prisma.providerProfile.findFirst({ where: { userId, deletedAt: null }, select: { id: true, primaryCategoryId: true, lat: true, lng: true, acceptsLiveRequests: true } });
  if (!provider || !provider.primaryCategoryId || provider.lat == null || provider.lng == null) return [];
  if (!provider.acceptsLiveRequests) return [];
  const rows = await prisma.liveRequest.findMany({
    where: { status: 'OPEN', categoryId: provider.primaryCategoryId, expiresAt: { gt: new Date() }, scheduledFor: null },
    orderBy: [{ urgent: 'desc' }, { createdAt: 'desc' }],
    include: { category: { select: { name: true } }, responses: { where: { providerId: provider.id }, select: { etaMinutes: true, status: true } } },
    take: 50,
  });
  return rows
    .map((r) => {
      const dist = haversine(r.lat, r.lng, provider.lat!, provider.lng!);
      const resp = r.responses[0];
      return {
        id: r.id, categoryName: r.category.name, note: r.note, urgent: r.urgent,
        areaLabel: null, distanceKm: Math.round(dist * 10) / 10,
        scheduledFor: r.scheduledFor?.toISOString() ?? null, expiresAt: r.expiresAt.toISOString(), createdAt: r.createdAt.toISOString(),
        myResponse: resp ? { etaMinutes: resp.etaMinutes, status: resp.status } : null,
      };
    })
    .filter((r) => r.distanceKm! <= REBROADCAST_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

async function requireProvider(userId: string) {
  const p = await prisma.providerProfile.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
  if (!p) throw forbidden('Create your provider profile first');
  return p;
}

export async function respondToRequest(userId: string, requestId: string, body: LiveRespondInput): Promise<IncomingLiveRequest> {
  const provider = await requireProvider(userId);
  const req = await prisma.liveRequest.findFirst({ where: { id: requestId, status: 'OPEN', expiresAt: { gt: new Date() } }, select: { id: true, customerId: true } });
  if (!req) throw new AppError(409, 'REQUEST_CLOSED', 'This request is no longer open');
  await prisma.liveRequestResponse.upsert({
    where: { requestId_providerId: { requestId, providerId: provider.id } },
    create: { requestId, providerId: provider.id, etaMinutes: body.etaMinutes, message: body.message, status: 'INTERESTED' },
    update: { status: 'INTERESTED', etaMinutes: body.etaMinutes, message: body.message },
  });
  const count = await prisma.liveRequestResponse.count({ where: { requestId, status: 'INTERESTED' } });
  void emitToUser(req.customerId, { type: 'live_request.responder_added', requestId, responderCount: count });
  void notifySafe(req.customerId, { type: 'live_request.responder', category: 'LIVE_REQUESTS', title: 'Someone can help', body: 'A professional responded to your request. Tap to view.', link: `/live/status`, groupKey: `live-resp:${requestId}` });
  return single(await incomingForProvider(userId), requestId);
}

export async function withdrawResponse(userId: string, requestId: string): Promise<IncomingLiveRequest> {
  const provider = await requireProvider(userId);
  await prisma.liveRequestResponse.updateMany({ where: { requestId, providerId: provider.id }, data: { status: 'WITHDRAWN' } });
  return single(await incomingForProvider(userId), requestId);
}

function single(list: IncomingLiveRequest[], id: string): IncomingLiveRequest {
  const r = list.find((x) => x.id === id);
  if (r) return r;
  // Request fell out of the active feed (connected/expired); return a minimal closed shape.
  return { id, categoryName: '', note: null, urgent: false, areaLabel: null, distanceKm: null, scheduledFor: null, expiresAt: new Date().toISOString(), createdAt: new Date().toISOString(), myResponse: null };
}

// ---- provider settings --------------------------------------------------
export async function getLiveSettings(userId: string): Promise<LiveRequestSettings> {
  const p = await prisma.providerProfile.findFirst({ where: { userId, deletedAt: null }, select: { acceptsLiveRequests: true, quietHoursStart: true, quietHoursEnd: true } });
  if (!p) throw forbidden('Create your provider profile first');
  return { acceptsLiveRequests: p.acceptsLiveRequests, quietHoursStart: p.quietHoursStart, quietHoursEnd: p.quietHoursEnd };
}

export async function setLiveSettings(userId: string, body: LiveRequestSettingsInput): Promise<LiveRequestSettings> {
  const provider = await requireProvider(userId);
  const p = await prisma.providerProfile.update({ where: { id: provider.id }, data: body, select: { acceptsLiveRequests: true, quietHoursStart: true, quietHoursEnd: true } });
  return { acceptsLiveRequests: p.acceptsLiveRequests, quietHoursStart: p.quietHoursStart, quietHoursEnd: p.quietHoursEnd };
}

// ---- lifecycle jobs (expiry + re-broadcast) -----------------------------
async function closeAndNotify(requestId: string, status: 'CONNECTED' | 'EXPIRED' | 'CANCELLED') {
  const r = await prisma.liveRequest.findUnique({ where: { id: requestId }, select: { customerId: true, status: true } });
  if (r) void emitToUser(r.customerId, { type: 'live_request.closed', requestId, status });
}

/** Called by a scheduled job: expire overdue OPEN requests; fire scheduled ones that are now due; widen those with no responders once. */
export async function runLiveRequestMaintenance(): Promise<{ expired: number; launched: number; rebroadcast: number }> {
  const now = new Date();
  // 1) Expire overdue
  const overdue = await prisma.liveRequest.findMany({ where: { status: 'OPEN', expiresAt: { lte: now } }, select: { id: true, customerId: true } });
  for (const r of overdue) {
    await prisma.liveRequest.update({ where: { id: r.id }, data: { status: 'EXPIRED' } });
    void emitToUser(r.customerId, { type: 'live_request.closed', requestId: r.id, status: 'EXPIRED' });
    void notifySafe(r.customerId, { type: 'live_request.expired', category: 'LIVE_REQUESTS', title: 'Request expired', body: 'No one connected in time. You can post again.', link: '/live/new' });
  }
  // 2) Launch scheduled requests that are now due
  const due = await prisma.liveRequest.findMany({ where: { status: 'OPEN', scheduledFor: { lte: now, not: null }, rebroadcastedAt: null }, include: { category: { select: { name: true } } } });
  for (const r of due) {
    const targets = await eligibleProviderIds(r.categoryId, r.lat, r.lng, DEFAULT_RADIUS_KM);
    await buzzProviders({ id: r.id, categoryName: r.category.name, urgent: r.urgent }, targets);
    await prisma.liveRequest.update({ where: { id: r.id }, data: { expiresAt: new Date(now.getTime() + REQUEST_TTL_MIN * 60_000) } });
  }
  // 3) Re-broadcast (widen radius once) requests ~5 min old with no responders
  const stale = await prisma.liveRequest.findMany({
    where: { status: 'OPEN', rebroadcastedAt: null, scheduledFor: null, createdAt: { lte: new Date(now.getTime() - 5 * 60_000) }, responses: { none: { status: 'INTERESTED' } } },
    include: { category: { select: { name: true } } },
  });
  for (const r of stale) {
    const targets = await eligibleProviderIds(r.categoryId, r.lat, r.lng, REBROADCAST_RADIUS_KM);
    await buzzProviders({ id: r.id, categoryName: r.category.name, urgent: r.urgent }, targets);
    await prisma.liveRequest.update({ where: { id: r.id }, data: { rebroadcastedAt: now } });
  }
  return { expired: overdue.length, launched: due.length, rebroadcast: stale.length };
}
