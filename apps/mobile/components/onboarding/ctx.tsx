import React, { createContext, useContext, useEffect } from 'react';
import type { MyProvider } from '@help/api-client';

export interface Draft {
  displayName: string; headline: string; avatarUrl?: string;
  primaryCategoryId?: string; experienceYears: number; bio: string; qualifications: string[]; languages: string[]; skills: string[];
}
export const EMPTY_DRAFT: Draft = { displayName: '', headline: '', experienceYears: 0, bio: '', qualifications: [], languages: [], skills: [] };

export interface StepCtx {
  provider: MyProvider | null;
  draft: Draft;
  patchDraft: (p: Partial<Draft>) => void;
  refresh: () => Promise<unknown>;
  /** Steps register an async save; return true to allow moving on. */
  register: (fn: (() => Promise<boolean>) | null) => void;
  go: (step: number) => void;
}
export const Ctx = createContext<StepCtx | null>(null);
export const useStep = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('StepCtx missing');
  return v;
};
export function useRegisterSave(fn: () => Promise<boolean>) {
  const { register } = useStep();
  const ref = React.useRef(fn);
  ref.current = fn;
  useEffect(() => { register(() => ref.current()); return () => register(null); }, [register]);
}
