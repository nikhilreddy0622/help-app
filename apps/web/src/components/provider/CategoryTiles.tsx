import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import type { Category } from '@help/types';
import { CategoryIcon } from './CategoryIcon';

const tile = 'flex h-full min-h-[104px] flex-col items-center justify-center gap-2 rounded-[16px] border border-line bg-white p-3 text-center hover:bg-surface';

/** Equal rounded tiles: 3 columns on phone, 4 on tablet, 6 on desktop. Groups plus "All services". */
export function CategoryTiles({ groups, citySlug }: { groups: Category[]; citySlug: string }) {
  return (
    <ul className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {groups.map((c) => (
        <li key={c.id}>
          <Link to={`/c/${c.slug}/${citySlug}`} className={tile} style={{ color: '#172B4D' }}>
            <span className="text-teal"><CategoryIcon slug={c.slug} icon={c.icon} className="h-7 w-7" /></span>
            <span className="text-xs font-semibold leading-tight sm:text-sm">{c.name}</span>
          </Link>
        </li>
      ))}
      <li>
        <Link to="/services" className={tile} style={{ color: '#172B4D' }}>
          <span className="text-teal"><LayoutGrid className="h-7 w-7" aria-hidden /></span>
          <span className="text-xs font-semibold leading-tight sm:text-sm">All services</span>
        </Link>
      </li>
    </ul>
  );
}
