import { canReviewProvider, defaultAutoReply } from '@help/domain';
import type { ConversationDto, MessageDto } from '@help/types';
import type { Message, Prisma } from '@prisma/client';
import { notifySafe } from '../../integrations/notify';
import { logger, prisma } from '../../lib/core';
import { AppError, notFound } from '../../lib/http';
import { emitToUser } from '../../realtime/bus';
import { freshCardInclude, presenceOf, shortName } from '../providers/cards';
import { providerEntitled } from '../providers/entitlement';

export const convoInclude = (userId: string, now = new Date()) =>
  ({
    customer: { select: { id: true, name: true, avatarUrl: true } },
    provider: { include: { ...freshCardInclude(now), user: { select: { id: true } } } },
    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    _count: { select: { messages: { where: { senderId: { not: userId }, readAt: null } } } },
  }) satisfies Prisma.ConversationInclude;

export type ConvoRow = Prisma.ConversationGetPayload<{ include: ReturnType<typeof convoInclude> }>;

export const messageDto = (m: Message): MessageDto => ({
  id: m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  body: m.body,
  auto: m.auto,
  createdAt: m.createdAt.toISOString(),
  readAt: m.readAt?.toISOString() ?? null,
});

export function toConversationDto(c: ConvoRow, userId: string, reviewed: boolean, now = new Date()): ConversationDto {
  const isCustomer = c.customerId === userId;
  const pr = presenceOf(c.provider, now);
  const last = c.messages[0];
  return {
    id: c.id,
    role: isCustomer ? 'customer' : 'provider',
    counterpart: isCustomer
      ? { id: c.provider.userId, name: c.provider.displayName, avatarUrl: c.provider.avatarUrl }
      : { id: c.customer.id, name: shortName(c.customer.name), avatarUrl: c.customer.avatarUrl },
    provider: { id: c.provider.id, slug: c.provider.slug, displayName: c.provider.displayName, avatarUrl: c.provider.avatarUrl, status: pr.status, statusLabel: pr.label },
    lastMessage: last ? messageDto(last) : null,
    unread: c._count.messages,
    canReview: isCustomer && canReviewProvider({ isSelf: false, providerReplied: !!c.providerFirstReplyAt, alreadyReviewed: reviewed }).ok,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Participant-only load; strangers get 404 (no existence leak). */
export async function loadConversationFor(id: string, userId: string) {
  const c = await prisma.conversation.findUnique({ where: { id }, include: convoInclude(userId) });
  if (!c || (c.customerId !== userId && c.provider.userId !== userId)) throw notFound('Conversation');
  const reviewed = c.customerId === userId ? !!(await prisma.review.findUnique({ where: { authorId_providerId: { authorId: userId, providerId: c.providerId } }, select: { id: true } })) : false;
  return { convo: c, dto: toConversationDto(c, userId, reviewed) };
}

async function assertNotBlocked(a: string, b: string) {
  const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] }, select: { blockerId: true } });
  if (blocked) throw new AppError(403, 'BLOCKED', 'You cannot message this user');
}

/**
 * Persist one message and run side effects: read markers, provider first-reply stats,
 * realtime events, notification, and the once-per-status-period Busy/Away auto-reply.
 */
export async function deliverMessage(convo: ConvoRow, senderId: string, body: string): Promise<Message> {
  const isProvider = senderId === convo.provider.userId;
  const recipientId = isProvider ? convo.customerId : convo.provider.userId;
  const now = new Date();

  const msg = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({ data: { conversationId: convo.id, senderId, body } });
    await tx.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: now, ...(isProvider ? { providerLastReadAt: now } : { customerLastReadAt: now }) },
    });
    if (isProvider && !convo.providerFirstReplyAt) {
      const { count } = await tx.conversation.updateMany({ where: { id: convo.id, providerFirstReplyAt: null }, data: { providerFirstReplyAt: now } });
      if (count) {
        const minutes = Math.max(1, Math.round((now.getTime() - convo.createdAt.getTime()) / 60_000));
        const prev = convo.provider.responseMinutes;
        await tx.providerProfile.update({ where: { id: convo.providerId }, data: { responseMinutes: prev == null ? minutes : Math.round(prev * 0.8 + minutes * 0.2) } });
      }
    }
    return m;
  });

  const dto = messageDto(msg);
  await Promise.all([
    emitToUser(senderId, { type: 'message.created', conversationId: convo.id, message: dto }),
    emitToUser(recipientId, { type: 'message.created', conversationId: convo.id, message: dto }),
  ]);
  const sender = isProvider ? { name: convo.provider.displayName, avatar: convo.provider.avatarUrl } : { name: shortName(convo.customer.name), avatar: convo.customer.avatarUrl };
  await notifySafe(recipientId, {
    type: 'MESSAGE',
    category: 'MESSAGES',
    title: sender.name,
    body: body.length > 140 ? `${body.slice(0, 137)}...` : body,
    link: `/messages/${convo.id}`,
    imageUrl: sender.avatar,
    groupKey: `msg:${convo.id}`,
    important: isProvider ? false : true,
    data: { conversationId: convo.id },
  });

  if (!isProvider) await maybeAutoReply(convo, now).catch((e) => logger.warn({ err: e }, 'auto-reply failed'));
  return msg;
}

/** One automatic reply per conversation per Busy/Away status period (never counts as a real reply). */
async function maybeAutoReply(convo: ConvoRow, now: Date) {
  // reload provider state: it may have changed since the conversation was loaded
  const p = await prisma.providerProfile.findUniqueOrThrow({ where: { id: convo.providerId }, include: freshCardInclude(now) });
  const pr = presenceOf(p, now);
  if (pr.status === 'AVAILABLE' || !p.autoReplyEnabled) return;
  const period = p.statusUpdatedAt ?? p.createdAt;
  const fresh = await prisma.conversation.findUniqueOrThrow({ where: { id: convo.id }, select: { autoReplySentForStatusAt: true } });
  if (fresh.autoReplySentForStatusAt && fresh.autoReplySentForStatusAt.getTime() === period.getTime()) return;
  const text = p.autoReplyText?.trim() || defaultAutoReply(pr.status, pr.message);
  if (!text) return;
  const { count } = await prisma.conversation.updateMany({
    where: { id: convo.id, OR: [{ autoReplySentForStatusAt: null }, { autoReplySentForStatusAt: { not: period } }] },
    data: { autoReplySentForStatusAt: period },
  });
  if (!count) return; // lost a race with a concurrent message
  const auto = await prisma.message.create({ data: { conversationId: convo.id, senderId: p.userId, body: text, auto: true } });
  const dto = messageDto(auto);
  await Promise.all([
    emitToUser(convo.customerId, { type: 'message.created', conversationId: convo.id, message: dto }),
    emitToUser(p.userId, { type: 'message.created', conversationId: convo.id, message: dto }),
  ]);
}

export async function startConversation(userId: string, providerId: string, message: string) {
  const provider = await prisma.providerProfile.findFirst({ where: { id: providerId, deletedAt: null }, select: { id: true, userId: true, isDiscoverable: true, isPaused: true } });
  if (!provider || !provider.isDiscoverable || provider.isPaused || !(await providerEntitled(provider.id))) {
    throw new AppError(409, 'PROVIDER_UNAVAILABLE', 'This professional is not available for chat right now');
  }
  if (provider.userId === userId) throw new AppError(400, 'SELF_CONVERSATION', 'You cannot message yourself');
  await assertNotBlocked(userId, provider.userId);
  if ((await prisma.conversation.count({ where: { customerId: userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } })) >= 30) {
    throw new AppError(429, 'CHAT_LIMIT', 'Daily new-chat limit reached');
  }
  const existing = await prisma.conversation.findUnique({ where: { customerId_providerId: { customerId: userId, providerId } }, select: { id: true } });
  const id = existing?.id ?? (await prisma.conversation.create({ data: { customerId: userId, providerId } })).id;
  if (!existing) await prisma.contactEvent.create({ data: { providerId, userId, kind: 'CHAT_STARTED' } });
  const loaded = await loadConversationFor(id, userId);
  await deliverMessage(loaded.convo, userId, message);
  return (await loadConversationFor(id, userId)).dto;
}

export async function sendMessage(userId: string, conversationId: string, body: string) {
  const { convo } = await loadConversationFor(conversationId, userId);
  const other = convo.customerId === userId ? convo.provider.userId : convo.customerId;
  await assertNotBlocked(userId, other);
  return messageDto(await deliverMessage(convo, userId, body));
}

export async function markRead(userId: string, conversationId: string) {
  const { convo } = await loadConversationFor(conversationId, userId);
  const now = new Date();
  const isCustomer = convo.customerId === userId;
  await prisma.$transaction([
    prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { readAt: now } }),
    prisma.conversation.update({ where: { id: conversationId }, data: isCustomer ? { customerLastReadAt: now } : { providerLastReadAt: now } }),
  ]);
  const other = isCustomer ? convo.provider.userId : convo.customerId;
  await Promise.all([
    emitToUser(userId, { type: 'conversation.read', conversationId, readerId: userId }),
    emitToUser(other, { type: 'conversation.read', conversationId, readerId: userId }),
  ]);
}
