import type { ApiClient } from '@help/api-client';
import { RAZORPAY_KEY_ID } from './env';

const loaded = new Map<string, Promise<void>>();
export function loadScript(src: string): Promise<void> {
  const existing = loaded.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loaded.delete(src); reject(new Error(`Could not load ${src}`)); };
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}

export const loadGoogle = () => loadScript('https://accounts.google.com/gsi/client');

export interface RazorpaySuccess { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }
export async function openRazorpay(o: {
  keyId?: string; subscriptionId: string; description: string; prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (r: RazorpaySuccess) => void; onDismiss: () => void;
}): Promise<void> {
  await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  const key = o.keyId || RAZORPAY_KEY_ID;
  if (!window.Razorpay || !key) throw new Error('Payments are not configured');
  const rzp = new window.Razorpay({
    key, subscription_id: o.subscriptionId, name: 'help', description: o.description, prefill: o.prefill,
    theme: { color: '#0F766E' },
    handler: (r: RazorpaySuccess) => o.onSuccess(r),
    modal: { ondismiss: o.onDismiss },
  });
  rzp.open();
}

// Cloudinary explains rejections in { error: { message } }; a bad signature means server credentials, not the user.
function uploadError(body: string): string {
  let m = '';
  try { m = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? ''; } catch { /* not JSON */ }
  if (/signature|api key|api_key|cloud name/i.test(m)) return 'Photo uploads are temporarily unavailable. Please try again later.';
  if (/file size|too large/i.test(m)) return 'That photo is too large. Choose one under 5 MB.';
  return m ? `Upload failed: ${m}` : 'Upload failed. Please try again.';
}

export type UploadPurpose = 'AVATAR' | 'COVER' | 'PORTFOLIO' | 'VERIFICATION' | 'ENQUIRY' | 'SUPPORT';
/** Signed direct upload to Cloudinary: media.sign -> multipart POST. Returns the public URL. */
export async function uploadMedia(api: ApiClient, purpose: UploadPurpose, file: File, onProgress?: (pct: number) => void): Promise<string> {
  const sig = await api.media.sign({ purpose, contentType: file.type });
  if (file.size > sig.maxBytes) throw new Error(`File is too large (max ${Math.round(sig.maxBytes / 1_048_576)} MB)`);
  const fd = new FormData();
  Object.entries(sig.fields).forEach(([k, v]) => fd.append(k, v));
  fd.append('file', file);
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(uploadError(xhr.responseText)));
      try {
        const j = JSON.parse(xhr.responseText) as { secure_url?: string; url?: string; public_id?: string };
        const url = j.secure_url ?? j.url ?? (j.public_id ? `${sig.publicUrlBase}${j.public_id}` : '');
        if (!url) throw new Error('no url');
        resolve(url);
      } catch { reject(new Error('Unexpected upload response')); }
    };
    xhr.send(fd);
  });
}
