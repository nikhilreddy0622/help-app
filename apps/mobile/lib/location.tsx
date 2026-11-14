import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { kv, setKv } from './api';

export interface Place { label: string; city: string; lat: number; lng: number; pin?: string }
interface Ctx {
  place: Place | null;
  /** Coordinates used for queries; falls back to central Bengaluru until the user sets a location. */
  coords: { lat: number; lng: number };
  label: string;
  loaded: boolean;
  setPlace: (p: Place) => Promise<void>;
  useCurrentLocation: () => Promise<Place>;
  setByPin: (pin: string) => Promise<Place>;
}
const LocCtx = createContext<Ctx | null>(null);
export const useLocation = () => {
  const v = useContext(LocCtx);
  if (!v) throw new Error('LocationProvider missing');
  return v;
};

export const CITIES: Place[] = [
  { label: 'Bengaluru', city: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { label: 'Mumbai', city: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { label: 'Delhi', city: 'Delhi', lat: 28.6139, lng: 77.209 },
  { label: 'Hyderabad', city: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { label: 'Chennai', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { label: 'Pune', city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { label: 'Kolkata', city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { label: 'Ahmedabad', city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { label: 'Jaipur', city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { label: 'Kochi', city: 'Kochi', lat: 9.9312, lng: 76.2673 },
];
const DEFAULT = CITIES[0]!;

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [place, setPlaceState] = useState<Place | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    kv('help.place').then((raw) => {
      if (raw) { try { setPlaceState(JSON.parse(raw) as Place); } catch { /* ignore */ } }
      setLoaded(true);
    });
  }, []);

  const setPlace = useCallback(async (p: Place) => {
    setPlaceState(p);
    await setKv('help.place', JSON.stringify(p));
  }, []);

  const useCurrentLocation = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) throw new Error('Location permission was not granted. Choose your city or enter a PIN code instead.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let label = 'Current location';
    let city = '';
    try {
      const [g] = await Location.reverseGeocodeAsync(pos.coords);
      city = g?.city ?? g?.subregion ?? '';
      const area = g?.district ?? g?.name ?? '';
      label = [area, city].filter(Boolean).join(', ') || label;
    } catch { /* offline geocoder */ }
    const p: Place = { label, city, lat: pos.coords.latitude, lng: pos.coords.longitude };
    await setPlace(p);
    return p;
  }, [setPlace]);

  const setByPin = useCallback(async (pin: string) => {
    const res = await Location.geocodeAsync(`${pin}, India`);
    const r = res[0];
    if (!r) throw new Error('Could not find that PIN code. Try choosing a city.');
    let label = `PIN ${pin}`;
    let city = '';
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
      city = g?.city ?? g?.subregion ?? '';
      label = [g?.district ?? g?.name, city].filter(Boolean).join(', ') || label;
    } catch { /* ignore */ }
    const p: Place = { label, city, lat: r.latitude, lng: r.longitude, pin };
    await setPlace(p);
    return p;
  }, [setPlace]);

  const value = useMemo<Ctx>(() => ({
    place, loaded, coords: place ? { lat: place.lat, lng: place.lng } : { lat: DEFAULT.lat, lng: DEFAULT.lng },
    label: place?.label ?? 'Set your location', setPlace, useCurrentLocation, setByPin,
  }), [place, loaded, setPlace, useCurrentLocation, setByPin]);
  return <LocCtx.Provider value={value}>{children}</LocCtx.Provider>;
}
