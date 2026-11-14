import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CITIES, DEFAULT_CITY } from '../lib/cities';

export interface UserLocation { label: string; citySlug: string; lat: number; lng: number }
const DEFAULT: UserLocation = { label: DEFAULT_CITY.name, citySlug: DEFAULT_CITY.slug, lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng };
const KEY = 'help.location';

interface Value { location: UserLocation; setLocation: (l: UserLocation) => void; locate: () => Promise<void>; locating: boolean; locateError: string | null }
const Ctx = createContext<Value | null>(null);

function nearestCity(lat: number, lng: number) {
  return CITIES.reduce((best, c) => (Math.hypot(c.lat - lat, c.lng - lng) < Math.hypot(best.lat - lat, best.lng - lng) ? c : best), DEFAULT_CITY);
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLoc] = useState<UserLocation>(DEFAULT);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setLoc(JSON.parse(v) as UserLocation);
    } catch { /* ignore */ }
  }, []);

  const setLocation = useCallback((l: UserLocation) => {
    setLoc(l);
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ }
  }, []);

  const locate = useCallback(async () => {
    setLocateError(null);
    if (!('geolocation' in navigator)) { setLocateError('Location is not available in this browser'); return; }
    setLocating(true);
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = nearestCity(pos.coords.latitude, pos.coords.longitude);
          setLocation({ label: `Near ${c.name}`, citySlug: c.slug, lat: pos.coords.latitude, lng: pos.coords.longitude });
          resolve();
        },
        () => { setLocateError('Could not get your location. Choose a city instead.'); resolve(); },
        { timeout: 8000 },
      );
    });
    setLocating(false);
  }, [setLocation]);

  const value = useMemo(() => ({ location, setLocation, locate, locating, locateError }), [location, setLocation, locate, locating, locateError]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useUserLocation(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('LocationProvider missing');
  return v;
}
