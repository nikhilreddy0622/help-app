import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCompare } from '../../state/CompareContext';
import { LinkButton } from '../ui/Button';

/** Selection tray: appears once at least one professional is selected for comparison. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  if (items.length === 0 || pathname === '/compare' || pathname.startsWith('/professionals/')) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white p-3 shadow-md" role="region" aria-label="Compare professionals">
      <div className="container-page flex flex-wrap items-center gap-3 px-0">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {items.map((i) => (
            <li key={i.slug} className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm text-ink"><span className="truncate">{i.name}</span>
              <button type="button" aria-label={`Remove ${i.name} from comparison`} onClick={() => remove(i.slug)} className="rounded-full p-1 hover:bg-line"><X className="h-3.5 w-3.5" /></button></li>))}
        </ul>
        <button type="button" onClick={clear} className="text-sm text-subtle underline">Clear</button>
        {items.length >= 2 ? <LinkButton to="/compare">Compare {items.length}</LinkButton> : <span className="text-sm text-subtle">Select one more to compare</span>}
      </div>
      <Link to="/compare" className="sr-only">Open comparison</Link>
    </div>
  );
}
