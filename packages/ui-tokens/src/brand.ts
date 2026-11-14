/**
 * "help" brand assets — one source for app icon, in-app logo, loader and email.
 *
 * Mark: navy rounded square, white lowercase "h", teal dot (the "." of "help.").
 * Wordmark: "help" in Inter Bold, navy, followed by a teal dot.
 * Loader: the mark with ONLY the teal dot fading 1 → 0.35 → 1 (1.2s). No other motion anywhere.
 */
export const BRAND = {
  name: 'help',
  tagline: 'Trusted professionals, right around you',
  supportPath: '/support', // support lives in-app, never an external email/WhatsApp link
} as const;

/** 512×512 app mark. Use for app icon (pad to 1024 with navy bg), favicon, splash centre, loader. */
export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="help">
<rect width="512" height="512" rx="112" fill="#172B4D"/>
<path d="M182 132V376M182 290c0-46 30-74 74-74s74 28 74 74v86" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
<circle id="dot" cx="404" cy="372" r="32" fill="#0D9488"/>
</svg>`;

/** Mark parts for react-native-svg / React DOM (viewBox 0 0 512 512). */
export const MARK_PARTS = {
  viewBox: '0 0 512 512',
  bg: { rx: 112, fill: '#172B4D' },
  h: { d: 'M182 132V376M182 290c0-46 30-74 74-74s74 28 74 74v86', stroke: '#FFFFFF', strokeWidth: 60 },
  dot: { cx: 404, cy: 372, r: 32, fill: '#0D9488' },
} as const;

/** Monochrome mark for Android notification small icon (white on transparent). */
export const MARK_MONO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<path d="M182 132V376M182 290c0-46 30-74 74-74s74 28 74 74v86" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-linecap="round"/>
<circle cx="404" cy="372" r="32" fill="#FFFFFF"/>
</svg>`;

/**
 * Email header wordmark: HTML text (renders in every client, no image blocking).
 * Use inside a 600px table layout; see services/api email templates.
 */
export const EMAIL_WORDMARK_HTML =
  '<span style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#172B4D;">help<span style="color:#0D9488;">.</span></span>';

export const LOADER = { dotMinOpacity: 0.35, durationMs: 1200 } as const;
