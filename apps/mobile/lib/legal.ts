import { LEGAL_DOCS, type LegalDoc } from '@help/domain';

export type { LegalDoc };
/** Same documents as the website (/legal/:slug), shared from @help/domain. */
export const LEGAL: Record<string, LegalDoc> = LEGAL_DOCS;
