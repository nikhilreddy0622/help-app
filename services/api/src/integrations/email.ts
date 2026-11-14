import nodemailer, { type Transporter } from 'nodemailer';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logger, prisma } from '../lib/core';
import { renderTemplate } from './templates';

export interface QueueEmailInput { to: string; template: string; dedupeKey: string; vars?: Record<string, unknown> }
export const MAX_EMAIL_ATTEMPTS = 5;

export const smtpConfigured = () => !!env.SMTP_HOST;

let transport: Transporter | null = null;
function getTransport(): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transport;
}

/** Idempotent enqueue (unique dedupeKey), then a best-effort immediate send. */
export async function queueEmail(input: QueueEmailInput): Promise<void> {
  let id: string;
  try {
    const row = await prisma.emailLog.create({
      data: { dedupeKey: input.dedupeKey, to: input.to, template: input.template, vars: (input.vars ?? {}) as Prisma.InputJsonValue },
    });
    id = row.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return; // duplicate -> skip
    throw e;
  }
  await sendQueued(id);
}

/** Attempts delivery of one EmailLog row; never throws. */
export async function sendQueued(id: string): Promise<void> {
  try {
    const row = await prisma.emailLog.findUnique({ where: { id } });
    if (!row || row.status === 'SENT' || row.attempts >= MAX_EMAIL_ATTEMPTS) return;
    if (!smtpConfigured()) {
      logger.info({ to: row.to, template: row.template }, 'SMTP not configured; email left QUEUED');
      return;
    }
    const msg = renderTemplate(row.template, (row.vars ?? {}) as Record<string, unknown>);
    try {
      await getTransport().sendMail({ from: env.MAIL_FROM, to: row.to, subject: msg.subject, html: msg.html, text: msg.text });
      await prisma.emailLog.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null, ...(row.template === 'otp-code' ? { vars: Prisma.DbNull } : {}) } });
    } catch (e) {
      await prisma.emailLog.update({ where: { id }, data: { status: 'FAILED', attempts: { increment: 1 }, lastError: String((e as Error).message).slice(0, 500) } });
      logger.warn({ err: e, template: row.template }, 'email send failed');
    }
  } catch (e) {
    logger.error({ err: e }, 'email pipeline error');
  }
}

/** Retry job: QUEUED/FAILED rows with attempts < MAX. */
export async function retryEmails(limit = 50): Promise<number> {
  if (!smtpConfigured()) return 0;
  const rows = await prisma.emailLog.findMany({
    where: { status: { in: ['QUEUED', 'FAILED'] }, attempts: { lt: MAX_EMAIL_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  for (const r of rows) await sendQueued(r.id);
  return rows.length;
}
