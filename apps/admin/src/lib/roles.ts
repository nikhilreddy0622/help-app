import type { AdminMe } from '@help/api-client';

export type Role = AdminMe['role'];
export type ModuleKey =
  | 'overview' | 'users' | 'providers' | 'categories' | 'verifications' | 'plans' | 'subscriptions' | 'payments'
   | 'reviews' | 'reports' | 'promotions' | 'analytics' | 'audit' | 'admins' | 'support';

const ALL: ModuleKey[] = ['overview', 'users', 'providers', 'categories', 'verifications', 'plans', 'subscriptions', 'payments', 'reviews', 'reports', 'promotions', 'analytics', 'audit', 'admins', 'support'];

export const roleModules: Record<Role, ModuleKey[]> = {
  SUPER_ADMIN: ALL,
  OPERATIONS: ALL.filter((m) => m !== 'admins'),
  SUPPORT: ['overview', 'users', 'reports', 'support'],
  FINANCE: ['overview', 'subscriptions', 'payments', 'analytics'],
  MODERATOR: ['overview', 'reviews', 'reports', 'verifications', 'providers'],
};

export const canView = (role: Role, m: ModuleKey) => roleModules[role].includes(m);
/** MODERATOR can only read providers; mutations hidden. */
export const canMutateProviders = (role: Role) => role === 'SUPER_ADMIN' || role === 'OPERATIONS';
