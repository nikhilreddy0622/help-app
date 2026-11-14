import { LocateFixed } from 'lucide-react';
import { CITIES, cityBySlug } from '../../lib/cities';
import { useUserLocation } from '../../state/LocationContext';

/** City select plus "use my location". Persists to the LocationContext. */
export function LocationPicker({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { location, setLocation, locate, locating, locateError } = useUserLocation();
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="loc-city">City</label>
        <select id="loc-city" value={location.citySlug} onChange={(e) => { const c = cityBySlug(e.target.value); if (c) setLocation({ label: c.name, citySlug: c.slug, lat: c.lat, lng: c.lng }); }}
          className={`h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3 text-[15px] ${compact ? '' : ''}`}>
          {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <button type="button" onClick={() => void locate()} disabled={locating} aria-label="Use my current location" title="Use my current location"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line-strong bg-white text-teal hover:bg-surface disabled:opacity-50"><LocateFixed className="h-5 w-5" /></button>
      </div>
      {locateError && <p role="alert" className="mt-1 text-xs text-danger">{locateError}</p>}
    </div>
  );
}
