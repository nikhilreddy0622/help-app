import { prisma } from '../../lib/core';

/** DPDP: soft-delete + anonymise PII, revoke sessions, hide provider profile. */
export async function deleteAccount(userId: string) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.authIdentity.deleteMany({ where: { userId } });
    await tx.pushToken.deleteMany({ where: { userId } });
    await tx.savedProfessional.deleteMany({ where: { userId } });
    await tx.recentSearch.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });
    await tx.providerView.deleteMany({ where: { userId } });
    await tx.contactEvent.updateMany({ where: { userId }, data: { userId: null } });
    const provider = await tx.providerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (provider) {
      await tx.providerProfile.update({
        where: { id: provider.id },
        data: {
          status: 'HIDDEN', isDiscoverable: false, deletedAt: now, displayName: 'Deleted professional', headline: null, bio: null,
          avatarUrl: null, coverUrl: null, lat: null, lng: null, locality: null, pinCode: null, slug: `deleted-${provider.id}`,
        },
      });
      await tx.slugHistory.deleteMany({ where: { providerId: provider.id } });
      await tx.portfolioItem.updateMany({ where: { providerId: provider.id }, data: { deletedAt: now } });
      await tx.verification.updateMany({ where: { providerId: provider.id }, data: { documentUrl: null } });
    }
    await tx.user.update({
      where: { id: userId },
      data: { status: 'DELETED', deletedAt: now, name: 'Deleted user', email: null, emailVerified: false, phone: null, phoneVerified: false, avatarUrl: null, city: null, lat: null, lng: null },
    });
  });
}

/** DPDP right of access: everything we hold about the user as JSON. */
export async function exportAccount(userId: string): Promise<Record<string, unknown>> {
  const [user, provider, conversations, messages, reviews, saved, searches, notifications, consents] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { identities: { select: { provider: true, email: true, createdAt: true } } } }),
    prisma.providerProfile.findUnique({ where: { userId }, include: { services: true, availability: true, portfolio: true, verifications: { select: { type: true, status: true, createdAt: true } } } }),
    prisma.conversation.findMany({ where: { OR: [{ customerId: userId }, { provider: { userId } }] } }),
    prisma.message.findMany({ where: { senderId: userId } }),
    prisma.review.findMany({ where: { authorId: userId } }),
    prisma.savedProfessional.findMany({ where: { userId } }),
    prisma.recentSearch.findMany({ where: { userId } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.consent.findMany({ where: { userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), user, providerProfile: provider, conversations, messages, reviews, saved, recentSearches: searches, notifications, consents };
}
