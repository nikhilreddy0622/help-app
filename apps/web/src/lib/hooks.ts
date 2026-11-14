import { useQuery } from '@tanstack/react-query';
import { useApi } from './api';

export const useMyProvider = () => {
  const api = useApi();
  return useQuery({ queryKey: ['my-provider'], queryFn: () => api.providers.mine() });
};

const DRAFT_KEY = 'help.onboarding.basics';
export interface BasicsDraft { displayName: string; headline: string; experienceYears: number; bio: string; languages: string[]; avatarUrl?: string }
export function readDraft(): BasicsDraft | null {
  try { const v = localStorage.getItem(DRAFT_KEY); return v ? (JSON.parse(v) as BasicsDraft) : null; } catch { return null; }
}
export function writeDraft(d: BasicsDraft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
