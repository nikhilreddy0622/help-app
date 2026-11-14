import { useId, useRef, useState } from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';
import { errorMessage, useApi } from '../../lib/api';
import { uploadMedia, type UploadPurpose } from '../../lib/external';
import { Avatar } from '../ui/Bits';
import { Button } from '../ui/Button';
import { ImageCropper } from './ImageCropper';

// Crop shape per purpose: avatars are circular, covers are a wide banner, the rest are square.
const CROP_SHAPE: Partial<Record<UploadPurpose, 'circle' | number>> = { AVATAR: 'circle', COVER: 3, PORTFOLIO: 1 };

export function TagInput({ label, values, onChange, placeholder, max = 20, hint }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; hint?: string }) {
  const [text, setText] = useState('');
  const id = useId();
  const add = () => {
    const t = text.trim();
    if (t && !values.includes(t) && values.length < max) onChange([...values, t]);
    setText('');
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-navy">{label}</label>
      <div className="flex gap-2">
        <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3 text-[15px]" />
        <Button variant="secondary" onClick={add} icon={<Plus className="h-4 w-4" />}>Add</Button>
      </div>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">{values.map((v) => (
          <li key={v} className="inline-flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm text-ink">{v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full p-1 hover:bg-line"><X className="h-3.5 w-3.5" /></button></li>))}
        </ul>
      )}
    </div>
  );
}

/** Single-file direct upload (signed Cloudinary). Calls onUploaded(url). */
export function FileUpload({ purpose, accept = 'image/jpeg,image/png,image/webp', onUploaded, label, avatarName, current, multiple }: {
  purpose: UploadPurpose; accept?: string; onUploaded: (url: string, file: File) => void; label: string; avatarName?: string; current?: string | null; multiple?: boolean;
}) {
  const api = useApi();
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const shape = CROP_SHAPE[purpose];
  const doUpload = async (file: File) => {
    try { setPct(0); onUploaded(await uploadMedia(api, purpose, file, setPct), file); }
    catch (e) { setError(errorMessage(e)); }
    finally { setPct(null); }
  };
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const first = files[0]!;
    // Single image with a crop shape -> open the reposition/crop modal first.
    if (shape && !multiple && first.type.startsWith('image/')) { setCropping(first); if (ref.current) ref.current.value = ''; return; }
    for (const file of Array.from(files)) { await doUpload(file); if (error) break; }
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className="flex items-center gap-4">
      {avatarName !== undefined && <Avatar name={avatarName || '?'} src={current} size={64} />}
      <div className="flex flex-col gap-1">
        <input ref={ref} type="file" accept={accept} multiple={multiple} className="sr-only" id={`up-${purpose}-${label}`} onChange={(e) => void pick(e.target.files)} />
        <Button variant="secondary" loading={pct !== null} icon={<ImagePlus className="h-4 w-4" />} onClick={() => ref.current?.click()}>{pct !== null ? `Uploading ${pct}%` : label}</Button>
        {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
      </div>
      {cropping && shape && (
        <ImageCropper file={cropping} shape={shape} onCancel={() => setCropping(null)} onCropped={(f) => { setCropping(null); void doUpload(f); }} />
      )}
    </div>
  );
}
