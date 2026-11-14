import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface Props {
  file: File;
  /** 'circle' for avatars, or a width/height ratio (e.g. 3 for a cover banner). */
  shape: 'circle' | number;
  /** Longest output edge in px. */
  outputSize?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

/** Drag-to-reposition + zoom image cropper. Outputs a cropped JPEG/PNG, no dependencies. */
export function ImageCropper({ file, shape, outputSize = 800, onCancel, onCropped }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image top-left offset within the frame, px
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const ratio = shape === 'circle' ? 1 : shape;
  const FRAME_W = 320;
  const FRAME_H = Math.round(FRAME_W / ratio);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale so the image covers the frame, then multiply by zoom.
  const base = img ? Math.max(FRAME_W / img.width, FRAME_H / img.height) : 1;
  const scale = base * zoom;

  // Keep the image covering the frame (clamp the offset).
  const clamp = useCallback((o: { x: number; y: number }) => {
    if (!img) return o;
    const w = img.width * scale, h = img.height * scale;
    return { x: Math.min(0, Math.max(FRAME_W - w, o.x)), y: Math.min(0, Math.max(FRAME_H - h, o.y)) };
  }, [img, scale, FRAME_W, FRAME_H]);

  useEffect(() => { setOff((o) => clamp(o)); }, [zoom, clamp]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOff(clamp({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }));
  };
  const onUp = () => { drag.current = null; };

  const apply = () => {
    if (!img) return;
    const outW = ratio >= 1 ? outputSize : Math.round(outputSize * ratio);
    const outH = ratio >= 1 ? Math.round(outputSize / ratio) : outputSize;
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    const k = outW / FRAME_W; // frame px -> output px
    ctx.drawImage(img, off.x * k, off.y * k, img.width * scale * k, img.height * scale * k);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    canvas.toBlob((blob) => {
      if (!blob) return;
      const ext = type === 'image/png' ? 'png' : 'jpg';
      onCropped(new File([blob], `crop.${ext}`, { type }));
    }, type, 0.9);
  };

  return (
    <Modal open onClose={onCancel} title="Position your photo"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button onClick={apply} disabled={!img}>Use photo</Button></div>}>
      <div className="flex flex-col items-center gap-4">
        <div
          ref={frameRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          className="relative touch-none select-none overflow-hidden border border-line bg-surface"
          style={{ width: FRAME_W, height: FRAME_H, borderRadius: shape === 'circle' ? '9999px' : 12, cursor: 'grab' }}
        >
          {img && (
            <img
              src={img.src} alt="" draggable={false}
              style={{ position: 'absolute', left: off.x, top: off.y, width: img.width * scale, height: img.height * scale, maxWidth: 'none' }}
            />
          )}
        </div>
        <label className="flex w-full max-w-xs items-center gap-3 text-sm text-subtle">
          <span>Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-teal-700" />
        </label>
        <p className="text-xs text-muted">Drag the photo to reposition it.</p>
      </div>
    </Modal>
  );
}
