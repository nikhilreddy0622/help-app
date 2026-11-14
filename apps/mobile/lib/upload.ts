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

/** Signed upload: api.media.sign -> multipart POST -> public URL. */
export async function uploadImage(file: { uri: string; mime: string }, purpose: Purpose): Promise<string> {
  const sig = await api.media.sign({ purpose, contentType: file.mime as 'image/jpeg' | 'image/png' | 'image/webp' });
  const form = new FormData();
  Object.entries(sig.fields).forEach(([k, v]) => form.append(k, v));
  const name = `upload.${file.mime === 'image/png' ? 'png' : file.mime === 'image/webp' ? 'webp' : 'jpg'}`;
  form.append('file', { uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''), name, type: file.mime } as unknown as Blob);
  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed. Please try again.');
  try {
    const j = (await res.json()) as { secure_url?: string; url?: string };
    const direct = j.secure_url ?? j.url;
    if (direct) return direct;
  } catch { /* S3-style empty response */ }
  const key = sig.fields.key ?? sig.fields.public_id ?? '';
  return `${sig.publicUrlBase.replace(/\/$/, '')}/${key}`;
}
