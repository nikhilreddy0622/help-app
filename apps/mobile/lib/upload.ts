import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

export type Purpose = 'AVATAR' | 'COVER' | 'PORTFOLIO' | 'VERIFICATION' | 'ENQUIRY' | 'SUPPORT';

/** Pick an image from the library. Returns local uri + mime or null if cancelled. */
export async function pickImage(opts?: { multiple?: boolean; aspect?: [number, number] }): Promise<{ uri: string; mime: string }[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Allow photo access in Settings to attach photos.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: !!opts?.multiple, selectionLimit: opts?.multiple ? 6 : 1,
    quality: 0.8, allowsEditing: !opts?.multiple && !!opts?.aspect, aspect: opts?.aspect,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, mime: a.mimeType === 'image/png' ? 'image/png' : a.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg' }));
}

// expo/fetch (the global fetch on this SDK) rejects React Native's {uri,name,type} form parts,
// but XMLHttpRequest streams them from disk natively.
function postForm(url: string, form: FormData): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 60_000;
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));
    xhr.send(form);
  });
}

// Cloudinary explains rejections in { error: { message } }; a bad signature means server credentials, not the user.
function uploadError(body: string): string {
  let m = '';
  try { m = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? ''; } catch { /* not JSON */ }
  if (/signature|api key|api_key|cloud name/i.test(m)) return 'Photo uploads are temporarily unavailable. Please try again later.';
  if (/file size|too large/i.test(m)) return 'That photo is too large. Choose one under 5 MB.';
  return m ? `Upload failed: ${m}` : 'Upload failed. Please try again.';
}

/** Signed upload: api.media.sign -> multipart POST -> public URL. */
export async function uploadImage(file: { uri: string; mime: string }, purpose: Purpose): Promise<string> {
  const sig = await api.media.sign({ purpose, contentType: file.mime as 'image/jpeg' | 'image/png' | 'image/webp' });
  const form = new FormData();
  Object.entries(sig.fields).forEach(([k, v]) => form.append(k, v));
  const name = `upload.${file.mime === 'image/png' ? 'png' : file.mime === 'image/webp' ? 'webp' : 'jpg'}`;
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(file.uri)).blob(), name);
  } else {
    form.append('file', { uri: file.uri, name, type: file.mime } as unknown as Blob);
  }
  const res = await postForm(sig.uploadUrl, form);
  if (res.status < 200 || res.status >= 300) throw new Error(uploadError(res.body));
  try {
    const j = JSON.parse(res.body) as { secure_url?: string; url?: string };
    const direct = j.secure_url ?? j.url;
    if (direct) return direct;
  } catch { /* S3-style empty response */ }
  const key = sig.fields.key ?? sig.fields.public_id ?? '';
  return `${sig.publicUrlBase.replace(/\/$/, '')}/${key}`;
}
