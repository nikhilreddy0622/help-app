import { OAuth2Client } from 'google-auth-library';
import type { Me } from '@help/types';
import { googleClientIds } from '../../config/env';
import { prisma } from '../../lib/core';
import { AppError, conflict, notFound, unauthorized, unavailable } from '../../lib/http';
import { queueEmail } from '../../integrations/email';

const google = new OAuth2Client();

export interface GoogleProfile { sub: string; email: string | null; emailVerified: boolean; name: string | null; picture: string | null }

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!googleClientIds.length) throw unavailable('Google sign-in');
  try {
    const ticket = await google.verifyIdToken({ idToken, audience: googleClientIds });
    const p = ticket.getPayload();
    if (!p?.sub) throw new Error('no sub');
    return { sub: p.sub, email: p.email?.toLowerCase() ?? null, emailVerified: !!p.email_verified, name: p.name ?? null, picture: p.picture ?? null };
  } catch {
    throw unauthorized('Google sign-in could not be verified');
  }
}

/**
 * Find or create the user for a Google identity. Links to an existing account
 * ONLY when Google says the email is verified and it matches an account email
 * that is itself verified — prevents account takeover via unverified emails.
 */
export async function upsertGoogleUser(g: GoogleProfile): Promise<string> {
  const identity = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'GOOGLE', providerUserId: g.sub } } });
  if (identity) return identity.userId;

  if (g.email && g.emailVerified) {
    const existing = await prisma.user.findUnique({ where: { email: g.email } });
    if (existing) {
      if (!existing.emailVerified) throw conflict('An account with this email exists. Sign in with your phone and link Google from settings.', 'LINK_REQUIRED');
      await prisma.authIdentity.create({ data: { userId: existing.id, provider: 'GOOGLE', providerUserId: g.sub, email: g.email } });
      return existing.id;
    }
  }
  const user = await prisma.user.create({
    data: {
      name: g.name,
      email: g.emailVerified ? g.email : null,
      emailVerified: g.emailVerified,
      avatarUrl: g.picture,
      identities: { create: { provider: 'GOOGLE', providerUserId: g.sub, email: g.email } },
    },
  });
  await sendWelcome(user.id, user.email, user.name);
  return user.id;
}

export async function upsertPhoneUser(phone: string): Promise<string> {
  const identity = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'PHONE', providerUserId: phone } } });
  if (identity) return identity.userId;
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await prisma.authIdentity.create({ data: { userId: existing.id, provider: 'PHONE', providerUserId: phone } });
    await prisma.user.update({ where: { id: existing.id }, data: { phoneVerified: true } });
    return existing.id;
  }
  const user = await prisma.user.create({
    data: { phone, phoneVerified: true, identities: { create: { provider: 'PHONE', providerUserId: phone } } },
  });
  return user.id;
}

/** Link a verified phone to the signed-in user. */
export async function linkPhone(userId: string, phone: string) {
  const owner = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'PHONE', providerUserId: phone } } });
  if (owner && owner.userId !== userId) throw conflict('This phone number belongs to another account', 'IDENTITY_TAKEN');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { phone, phoneVerified: true } }),
    ...(owner ? [] : [prisma.authIdentity.create({ data: { userId, provider: 'PHONE', providerUserId: phone } })]),
    prisma.providerProfile.updateMany({ where: { userId }, data: { mobileVerified: true } }),
  ]);
}

export async function linkGoogle(userId: string, g: GoogleProfile) {
  const owner = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'GOOGLE', providerUserId: g.sub } } });
  if (owner && owner.userId !== userId) throw conflict('This Google account belongs to another account', 'IDENTITY_TAKEN');
  if (owner) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const emailTaken = g.email && g.emailVerified ? await prisma.user.findFirst({ where: { email: g.email, NOT: { id: userId } } }) : null;
  await prisma.$transaction([
    prisma.authIdentity.create({ data: { userId, provider: 'GOOGLE', providerUserId: g.sub, email: g.email } }),
    ...(!user.email && g.email && g.emailVerified && !emailTaken
      ? [prisma.user.update({ where: { id: userId }, data: { email: g.email, emailVerified: true } })]
      : []),
  ]);
}

export async function getMe(userId: string): Promise<Me> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { identities: true, provider: { select: { id: true, avatarUrl: true } } } });
  if (!u || u.status === 'DELETED') throw notFound('User');
  if (u.status === 'SUSPENDED') throw new AppError(403, 'SUSPENDED', 'This account is suspended');
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    // Prefer the photo the user explicitly uploaded to their provider profile over an
    // auto-captured Google photo (which may be stale or fail to load).
    avatarUrl: u.provider?.avatarUrl ?? u.avatarUrl ?? null,
    preferredLanguage: u.preferredLanguage,
    city: u.city,
    hasProviderProfile: !!u.provider,
    providerId: u.provider?.id ?? null,
    emailVerified: u.emailVerified,
    linked: { google: u.identities.some((i) => i.provider === 'GOOGLE'), phone: u.identities.some((i) => i.provider === 'PHONE'), email: u.identities.some((i) => i.provider === 'EMAIL') },
  };
}

/** Welcome email on first sign-up (deduped per user). Never throws. */
export async function sendWelcome(userId: string, email: string | null, name: string | null) {
  if (!email) return;
  await queueEmail({ to: email, template: 'welcome', dedupeKey: `welcome:${userId}`, vars: { name: name ?? 'there' } }).catch(() => undefined);
}

/**
 * Find or create the user for a verified email (OTP proven). Existing EMAIL identity -> that user;
 * a user already owning this verified email gets the identity linked; otherwise a new user is created.
 */
export async function upsertEmailUser(email: string): Promise<string> {
  const identity = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'EMAIL', providerUserId: email } } });
  if (identity) return identity.userId;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.status === 'DELETED') throw unauthorized('Account unavailable');
    if (!existing.emailVerified) await prisma.user.update({ where: { id: existing.id }, data: { emailVerified: true } });
    await prisma.authIdentity.create({ data: { userId: existing.id, provider: 'EMAIL', providerUserId: email, email } });
    return existing.id;
  }
  const user = await prisma.user.create({
    data: { email, emailVerified: true, identities: { create: { provider: 'EMAIL', providerUserId: email, email } } },
  });
  await sendWelcome(user.id, email, null);
  return user.id;
}

/** Link a verified email to the signed-in user (recovery path for a lost phone). */
export async function linkEmail(userId: string, email: string) {
  const owner = await prisma.authIdentity.findUnique({ where: { provider_providerUserId: { provider: 'EMAIL', providerUserId: email } } });
  if (owner && owner.userId !== userId) throw conflict('This email belongs to another account', 'IDENTITY_TAKEN');
  const holder = await prisma.user.findFirst({ where: { email, NOT: { id: userId } }, select: { id: true } });
  if (holder) throw conflict('This email belongs to another account', 'IDENTITY_TAKEN');
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { email, emailVerified: true } }),
    ...(owner ? [] : [prisma.authIdentity.create({ data: { userId, provider: 'EMAIL', providerUserId: email, email } })]),
  ]);
}
