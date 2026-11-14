import { Router } from 'express';
import { z } from 'zod';
import { DiscoverySearchSchema, lat, lng, pinCode } from '@help/validation';
import { geocode, reverseGeocode } from '../../integrations/geocode';
import { ah, ok, parse } from '../../lib/http';
import { optionalUser } from '../../middleware/auth';
import { ttlCache } from '../../lib/ttlCache';
import { homeFeed, listCategories, searchProviders } from './service';

// Categories and the home feed change rarely; cache briefly to avoid DB round trips on every page view.
export const categoriesCache = ttlCache<Awaited<ReturnType<typeof listCategories>>>(60_000);
const homeCache = ttlCache<Awaited<ReturnType<typeof homeFeed>>>(30_000);

export const discoveryRouter = Router();
export const categoriesRouter = Router();

categoriesRouter.get('/', ah(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  ok(res, await categoriesCache.get('all', listCategories));
}));

discoveryRouter.get('/search', optionalUser, ah(async (req, res) => {
  const q = parse(DiscoverySearchSchema, req.query);
  const { items, nextCursor } = await searchProviders(q, req.user?.id);
  ok(res, items, { nextCursor });
}));

discoveryRouter.get('/home', ah(async (req, res) => {
  const q = parse(z.object({ lat, lng }), req.query);
  const key = `${q.lat.toFixed(2)},${q.lng.toFixed(2)}`; // ~1 km buckets
  ok(res, await homeCache.get(key, () => homeFeed(q.lat, q.lng)));
}));

/** PIN code -> approximate coordinates (Google if GOOGLE_MAPS_API_KEY is set, otherwise free OpenStreetMap Nominatim). */
discoveryRouter.get('/geocode', ah(async (req, res) => {
  const { pin } = parse(z.object({ pin: pinCode }), req.query);
  ok(res, await geocode(`${pin}, India`));
}));

/** Coordinates -> address parts (city/PIN/locality) via free OpenStreetMap. Used to auto-fill the location form. */
discoveryRouter.get('/reverse-geocode', ah(async (req, res) => {
  const q = parse(z.object({ lat, lng }), req.query);
  res.set('Cache-Control', 'public, max-age=86400');
  ok(res, await reverseGeocode(q.lat, q.lng));
}));
