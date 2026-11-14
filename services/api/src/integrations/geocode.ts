import { env } from '../config/env';
import { AppError } from '../lib/http';

const cache = new Map<string, { lat: number; lng: number; at: number }>();
const TTL_MS = 24 * 3_600_000;

// Nominatim usage policy: max 1 request/second, identify the app. Serialise calls.
let queue: Promise<unknown> = Promise.resolve();
const NOMINATIM_GAP_MS = 1100;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(() => new Promise((r) => setTimeout(r, NOMINATIM_GAP_MS)), () => new Promise((r) => setTimeout(r, NOMINATIM_GAP_MS)));
  return run;
}

async function google(query: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IN&key=${env.GOOGLE_MAPS_API_KEY}`;
  const json = (await (await fetch(url)).json()) as { results?: { geometry: { location: { lat: number; lng: number } } }[] };
  return json.results?.[0]?.geometry.location ?? null;
}

/** Free OpenStreetMap geocoder (no key). Fine for development and low volume. */
async function nominatim(query: string) {
  return throttled(async () => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'help-app/0.1', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new AppError(503, 'GEOCODER_UNAVAILABLE', 'Location lookup is busy. Try again in a moment.');
    const rows = (await res.json()) as { lat: string; lon: string }[];
    return rows[0] ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon) } : null;
  });
}

/** PIN code or free-text address -> coordinates (Google if keyed, else OpenStreetMap). Cached 24h. */
export async function geocode(query: string): Promise<{ lat: number; lng: number }> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { lat: hit.lat, lng: hit.lng };
  const loc = env.GOOGLE_MAPS_API_KEY ? await google(query) : await nominatim(query);
  if (!loc) throw new AppError(404, 'NOT_FOUND', 'Location not found');
  if (cache.size > 5000) cache.clear();
  cache.set(key, { ...loc, at: Date.now() });
  return loc;
}

export interface ReverseGeocode {
  city: string | null;
  pinCode: string | null;
  locality: string | null;
  state: string | null;
  label: string | null;
}
const revCache = new Map<string, { value: ReverseGeocode; at: number }>();

/** Coordinates -> address parts (free OpenStreetMap reverse geocoder). Cached 24h. */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = revCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await throttled(async () => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lng=${lng}`.replace('&lng=', '&lon=');
    const res = await fetch(url, { headers: { 'User-Agent': 'help-app/0.1', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new AppError(503, 'GEOCODER_UNAVAILABLE', 'Location lookup is busy. Try again in a moment.');
    const j = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const a = j.address ?? {};
    return {
      city: a.city ?? a.town ?? a.state_district ?? a.county ?? null,
      pinCode: a.postcode ?? null,
      locality: a.suburb ?? a.neighbourhood ?? a.village ?? a.residential ?? a.road ?? null,
      state: a.state ?? null,
      label: j.display_name ?? null,
    };
  });
  if (revCache.size > 5000) revCache.clear();
  revCache.set(key, { value, at: Date.now() });
  return value;
}
