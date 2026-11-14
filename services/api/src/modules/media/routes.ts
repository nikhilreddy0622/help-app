import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { Router, type Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadSignature } from '@help/api-client';
import { UploadSignSchema } from '@help/validation';
import { env } from '../../config/env';
import { AppError, ah, ok, parse, unavailable } from '../../lib/http';
import { requireUser } from '../../middleware/auth';

export const mediaRouter = Router();

const MB = 1024 * 1024;
const LIMITS: Record<string, number> = { 'image/jpeg': 5 * MB, 'image/png': 5 * MB, 'image/webp': 5 * MB, 'video/mp4': 50 * MB, 'application/pdf': 10 * MB };
const ALLOWED: Record<string, string[]> = {
  AVATAR: ['image/jpeg', 'image/png', 'image/webp'],
  COVER: ['image/jpeg', 'image/png', 'image/webp'],
  PORTFOLIO: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'],
  VERIFICATION: ['image/jpeg', 'image/png', 'application/pdf'],
  ENQUIRY: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORT: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

/** Signed direct-to-Cloudinary upload params. Verification documents are `authenticated` (private) assets. */
mediaRouter.post('/sign', requireUser, ah(async (req, res) => {
  const b = parse(UploadSignSchema, req.body);
  if (!ALLOWED[b.purpose]!.includes(b.contentType)) throw new AppError(422, 'UNSUPPORTED_TYPE', `${b.contentType} is not allowed for ${b.purpose}`);
  if (!cloudinaryConfigured()) {
    if (env.NODE_ENV === 'production') throw unavailable('Media uploads');
    return ok(res, localSignature(req, req.user!.id, b.purpose, b.contentType));
  }
  const resource = b.contentType.startsWith('video/') ? 'video' : 'image';
  const type = b.purpose === 'VERIFICATION' ? 'authenticated' : 'upload';
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `help/${req.user!.id}/${b.purpose.toLowerCase()}`;
  const params = { folder, timestamp, type };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!);
  const out: UploadSignature = {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resource}/upload`,
    fields: { api_key: env.CLOUDINARY_API_KEY!, timestamp: String(timestamp), signature, folder, type },
    publicUrlBase: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/${resource}/${type}/`,
    maxBytes: LIMITS[b.contentType]!,
  };
  ok(res, out);
}));

// ---------------------------------------------------------------------------
// Development fallback: when Cloudinary keys are missing (never in production),
// uploads are stored on the API's disk and served from /uploads. Same client
// flow (sign -> multipart POST -> { secure_url }), so nothing changes in the apps.
// ---------------------------------------------------------------------------
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };
const TOKEN_TTL_S = 10 * 60;

function cloudinaryConfigured() {
  return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}
const origin = (req: Request) => `${req.protocol}://${req.get('host')}`;
const sign = (payload: string) => createHmac('sha256', env.JWT_ACCESS_SECRET).update(`local-upload:${payload}`).digest('hex');

function localSignature(req: Request, userId: string, purpose: string, contentType: string): UploadSignature {
  const exp = String(Math.floor(Date.now() / 1000) + TOKEN_TTL_S);
  const payload = [userId, purpose, contentType, exp].join('|');
  return {
    uploadUrl: `${origin(req)}/api/v1/media/local-upload`,
    fields: { payload, token: sign(payload) },
    publicUrlBase: `${origin(req)}/uploads/`,
    maxBytes: LIMITS[contentType]!,
  };
}

mediaRouter.post('/local-upload', ah(async (req, res) => {
  if (cloudinaryConfigured() || env.NODE_ENV === 'production') throw new AppError(404, 'NOT_FOUND', 'Route not found');
  const type = req.headers['content-type'] ?? '';
  const len = Number(req.headers['content-length'] ?? 0);
  if (!type.startsWith('multipart/form-data')) throw new AppError(415, 'UNSUPPORTED_MEDIA', 'Expected multipart/form-data');
  if (len > 51 * MB) throw new AppError(413, 'TOO_LARGE', 'File is too large');
  // Node's built-in fetch Request parses multipart for us (no extra dependency).
  const form = await new Request('http://local/', { method: 'POST', headers: { 'content-type': type }, body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } as RequestInit).formData();
  const payload = String(form.get('payload') ?? '');
  const token = String(form.get('token') ?? '');
  const expected = sign(payload);
  if (token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) throw new AppError(401, 'BAD_SIGNATURE', 'Upload link is invalid');
  const [userId, purpose, contentType, exp] = payload.split('|');
  if (!userId || !purpose || !contentType || Number(exp) < Date.now() / 1000) throw new AppError(401, 'EXPIRED', 'Upload link expired. Try again.');
  const file = form.get('file');
  if (!(file instanceof Blob)) throw new AppError(422, 'NO_FILE', 'No file received');
  if (file.size > LIMITS[contentType]!) throw new AppError(413, 'TOO_LARGE', 'File is too large');
  if (file.type && file.type !== contentType) throw new AppError(422, 'UNSUPPORTED_TYPE', 'File type does not match');
  const rel = path.posix.join(userId, purpose.toLowerCase(), `${Date.now()}-${randomBytes(6).toString('hex')}.${EXT[contentType]}`);
  const abs = path.join(LOCAL_UPLOAD_DIR, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));
  // Cloudinary-shaped response so the existing web/mobile upload code reads it unchanged.
  res.status(201).json({ secure_url: `${origin(req)}/uploads/${rel}`, public_id: rel });
}));
