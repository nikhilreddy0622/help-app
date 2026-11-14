import type { SupportMessageDto, SupportTicketDetail, SupportTicketDto } from '@help/types';
import type { Prisma, SupportMessage, SupportTicket } from '@prisma/client';
import { queueEmail } from '../../integrations/email';
import { notifySafe } from '../../integrations/notify';
import { logger, prisma } from '../../lib/core';
import { emitToUser } from '../../realtime/bus';

export const STAFF_NAME = 'help Support';

type Ticket = SupportTicket & { messages?: SupportMessage[] };

export function toTicketDto(t: SupportTicket, lastStaffAt: Date | null): SupportTicketDto {
  return {
    id: t.id,
    number: t.number,
    category: t.category,
    subject: t.subject,
    status: t.status,
    providerId: t.providerId,
    lastMessageAt: t.lastMessageAt.toISOString(),
    unreadForUser: !!lastStaffAt && (!t.userLastReadAt || lastStaffAt > t.userLastReadAt),
    createdAt: t.createdAt.toISOString(),
  };
}

export const toMessageDto = (m: SupportMessage, userName: string | null): SupportMessageDto => ({
  id: m.id,
  fromStaff: !!m.authorAdminId,
  authorName: m.authorAdminId ? STAFF_NAME : (userName ?? 'You'),
  body: m.body,
  attachments: m.attachments,
  createdAt: m.createdAt.toISOString(),
});

export async function lastStaffMessageAt(ticketId: string): Promise<Date | null> {
  const m = await prisma.supportMessage.findFirst({ where: { ticketId, authorAdminId: { not: null } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  return m?.createdAt ?? null;
}

export async function ticketDetail(t: Ticket, userName: string | null): Promise<SupportTicketDetail> {
  const messages = t.messages ?? (await prisma.supportMessage.findMany({ where: { ticketId: t.id }, orderBy: { createdAt: 'asc' } }));
  const lastStaff = [...messages].reverse().find((m) => m.authorAdminId)?.createdAt ?? null;
  return { ...toTicketDto(t, lastStaff), messages: messages.map((m) => toMessageDto(m, userName)) };
}

export const ticketInclude = { messages: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.SupportTicketInclude;

/** Notify the ticket owner of a staff reply: in-app (ACCOUNT), email 'ticket-reply', realtime. */
export async function notifyTicketReply(t: SupportTicket, preview: string, messageId: string) {
  await notifySafe(t.userId, {
    type: 'SUPPORT_REPLY',
    category: 'ACCOUNT',
    title: `Reply on request #${t.number}`,
    body: preview.length > 140 ? `${preview.slice(0, 137)}...` : preview,
    link: `/support/${t.id}`,
    groupKey: `support:${t.id}`,
    important: true,
    data: { ticketId: t.id },
    email: { template: 'ticket-reply', dedupeKey: `ticket-reply:${messageId}`, vars: { number: t.number, ticketId: t.id, preview: preview.slice(0, 300) } },
  });
  await emitToUser(t.userId, { type: 'support.updated', ticketId: t.id });
}

export async function emailTicketReceived(t: SupportTicket) {
  const u = await prisma.user.findUnique({ where: { id: t.userId }, select: { email: true, name: true } });
  if (!u?.email) return;
  await queueEmail({ to: u.email, template: 'ticket-received', dedupeKey: `ticket-received:${t.id}`, vars: { name: u.name ?? 'there', number: t.number, subject: t.subject, ticketId: t.id } }).catch((e) =>
    logger.warn({ err: e }, 'ticket-received email failed'),
  );
}
