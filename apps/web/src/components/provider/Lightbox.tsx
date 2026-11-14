import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PortfolioItem } from '@help/types';
import { useFocusTrap } from '../ui/Modal';

export function Lightbox({ items, index, onIndex, onClose }: { items: PortfolioItem[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const open = index !== null;
  useFocusTrap(ref, open, onClose);
  useEffect(() => {
    if (index === null) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [index, items.length, onIndex]);
  if (index === null || typeof document === 'undefined') return null;
  const item = items[index];
  if (!item) return null;
  const btn = 'absolute flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-navy hover:bg-white';
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Portfolio viewer" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 p-4">
      <button type="button" aria-label="Close" onClick={onClose} className={`${btn} right-4 top-4`}><X className="h-5 w-5" /></button>
      {items.length > 1 && <>
        <button type="button" aria-label="Previous image" onClick={() => onIndex((index - 1 + items.length) % items.length)} className={`${btn} left-3 top-1/2 -translate-y-1/2`}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Next image" onClick={() => onIndex((index + 1) % items.length)} className={`${btn} right-3 top-1/2 -translate-y-1/2`}><ChevronRight className="h-5 w-5" /></button>
      </>}
      <figure className="flex max-h-full max-w-4xl flex-col items-center gap-3">
        <img src={item.url} alt={item.title ?? 'Portfolio item'} className="max-h-[78vh] rounded-lg object-contain" />
        {(item.title || item.description) && <figcaption className="text-center text-sm text-white">{item.title}{item.description ? ` · ${item.description}` : ''}<span className="ml-2 text-[#CBD5E1]">{index + 1} / {items.length}</span></figcaption>}
      </figure>
    </div>,
    document.body,
  );
}
