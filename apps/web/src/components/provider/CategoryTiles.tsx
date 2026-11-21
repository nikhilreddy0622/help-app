import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Category } from '@help/types';
import { tileColor } from '@help/ui-tokens';
import { CategoryIcon } from './CategoryIcon';

// 4 columns on phones, 8 on desktop. Two rows to start; each "More" adds four more rows (32 tiles on desktop).
const FIRST = 15;
const STEP = 32;

/** Colour-coded category tiles. A tile opens the category's list of services; professionals come one step later. */
export function CategoryTiles({ groups }: { groups: Category[] }) {
  const [shown, setShown] = useState(FIRST);
  const all = shown >= groups.length;
  const visible = all ? groups : groups.slice(0, shown);
  const more = 'tile-press flex flex-col items-center gap-2 text-center';
  return (
    <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
      {visible.map((c) => {
        const t = tileColor(c.slug);
        return (
          <li key={c.id}>
            <Link to={`/services/${c.slug}`} className={more} style={{ color: '#121722' }}>
              <span className="flex aspect-square w-full items-center justify-center rounded-lg" style={{ background: t.bg, color: t.fg }}>
                <CategoryIcon slug={c.slug} icon={c.icon} className="h-8 w-8" />
              </span>
              <span className="line-clamp-2 min-h-[2.5em] text-xs font-semibold leading-tight sm:text-[13px]">{c.name}</span>
            </Link>
          </li>
        );
      })}
      {groups.length > FIRST && (
        <li>
          <button type="button" onClick={() => setShown(all ? FIRST : shown + STEP)} className={`${more} w-full`} aria-expanded={all}>
            <span className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-line bg-white text-subtle">
              {all ? <ChevronUp className="h-7 w-7" aria-hidden /> : <ChevronDown className="h-7 w-7" aria-hidden />}
            </span>
            <span className="text-xs font-semibold leading-tight text-ink sm:text-[13px]">{all ? 'Show less' : shown === FIRST ? 'All services' : 'More'}</span>
          </button>
        </li>
      )}
    </ul>
  );
}
