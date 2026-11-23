"""Compose every video in spec.py with PIL + ffmpeg.  Usage: python render.py [video-id-substring ...]"""
import math, subprocess, sys
from functools import lru_cache
from pathlib import Path
import numpy as np, soundfile as sf
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from spec import VIDEOS
from tts import path_for

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / '_src'
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
XF = 0.4  # crossfade seconds

NAVY, MARKBG, TEAL, DEEP, DOT = '#13233F', '#172B4D', '#0B7A6E', '#06574F', '#0D9488'
YEL, YSOFT, BG, INK, SUB = '#FFC21A', '#FFF4CC', '#F4F5F7', '#121722', '#3F4652'
FONTDIR = Path('C:/help-app/node_modules/@expo-google-fonts/inter')


@lru_cache(None)
def font(w, size):
    name = {500: '500Medium/Inter_500Medium', 600: '600SemiBold/Inter_600SemiBold', 700: '700Bold/Inter_700Bold', 800: '800ExtraBold/Inter_800ExtraBold'}[w]
    return ImageFont.truetype(str(FONTDIR / f'{name}.ttf'), size)


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- brand pieces
@lru_cache(None)
def mark(size):
    S = 4 * size; k = S / 512
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(112 * k), fill=MARKBG)
    w = int(60 * k)

    def stroke(pts):
        for a, b in zip(pts, pts[1:]):
            d.line([a, b], fill='white', width=w)
        for p in pts:
            d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill='white')
    stroke([(182 * k, 132 * k), (182 * k, 376 * k)])
    arch = []
    for i in range(41):  # M182 290 c0-46 30-74 74-74 s74 28 74 74 v86
        u = i / 40
        if u <= .5:
            s = u * 2; p0, p1, p2, p3 = (182, 290), (182, 244), (212, 216), (256, 216)
        else:
            s = (u - .5) * 2; p0, p1, p2, p3 = (256, 216), (300, 216), (330, 244), (330, 290)
        x = (1 - s) ** 3 * p0[0] + 3 * (1 - s) ** 2 * s * p1[0] + 3 * (1 - s) * s * s * p2[0] + s ** 3 * p3[0]
        y = (1 - s) ** 3 * p0[1] + 3 * (1 - s) ** 2 * s * p1[1] + 3 * (1 - s) * s * s * p2[1] + s ** 3 * p3[1]
        arch.append((x * k, y * k))
    arch.append((330 * k, 376 * k))
    stroke(arch)
    d.ellipse([(404 - 32) * k, (372 - 32) * k, (404 + 32) * k, (372 + 32) * k], fill=DOT)
    return im.resize((size, size), Image.LANCZOS)


def halo(img, x, y, size):
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    g = int(size * .12)
    ImageDraw.Draw(ov).rounded_rectangle([x - g, y - g, x + size + g, y + size + g], radius=int(size * .3), fill=(255, 255, 255, 34))
    img.alpha_composite(ov)


def wordmark(img, x, y, size, light=False):
    """Mark + 'help.' wordmark; returns right edge."""
    if light: halo(img, x, y, size)
    m = mark(size); img.alpha_composite(m, (x, y))
    d = ImageDraw.Draw(img); f = font(700, int(size * .78))
    tx = x + size + int(size * .28); ty = y + size // 2
    d.text((tx, ty), 'help', font=f, fill='white' if light else NAVY, anchor='lm')
    w = d.textlength('help', font=f)
    d.text((tx + w, ty), '.', font=f, fill=DOT, anchor='lm')
    return int(tx + w + d.textlength('.', font=f))


def wrap(text, f, width, d):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def text_block(d, text, f, x, y, width, fill, gap=1.12, anchor='la'):
    lines = wrap(text, f, width, d)
    lh = int(f.size * gap)
    for i, ln in enumerate(lines):
        d.text((x, y + i * lh), ln, font=f, fill=fill, anchor=anchor)
    return y + len(lines) * lh


def fit_font(d, text, weight, size, width, max_lines):
    while size > 30:
        f = font(weight, size)
        if len(wrap(text, f, width, d)) <= max_lines:
            return f
        size -= 4
    return font(weight, size)


def rounded_mask(w, h, r):
    m = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255)
    return m.resize((w, h), Image.LANCZOS)


# ---------------------------------------------------------------- devices
@lru_cache(None)
def phone_shell(sh):
    """Returns (shell RGBA, screen box (x,y,w,h), screen mask). sh = screen height."""
    sw = round(sh * 9 / 16); bz = round(sh * .028); r = round(sh * .055)
    W, H = sw + 2 * bz, sh + 2 * bz; pad = round(sh * .06)
    im = Image.new('RGBA', (W + 2 * pad, H + 2 * pad), (0, 0, 0, 0))
    sh_l = Image.new('L', im.size, 0)
    ImageDraw.Draw(sh_l).rounded_rectangle([pad, pad + round(sh * .02), pad + W, pad + H + round(sh * .02)], radius=r + bz, fill=110)
    sh_l = sh_l.filter(ImageFilter.GaussianBlur(round(sh * .025)))
    im.paste(Image.new('RGBA', im.size, (10, 20, 40, 255)), (0, 0), sh_l)
    body = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle([0, 0, W - 1, H - 1], radius=r + bz, fill='#0E1726')
    ImageDraw.Draw(body).rounded_rectangle([2, 2, W - 3, H - 3], radius=r + bz - 2, outline='#2A3650', width=2)
    im.alpha_composite(body, (pad, pad))
    return im, (pad + bz, pad + bz, sw, sh), rounded_mask(sw, sh, r)


@lru_cache(None)
def laptop_shell(sw):
    """16:10 screen of width sw. Returns (shell, screen box, mask)."""
    sh = round(sw * 10 / 16); bz = round(sw * .022); r = round(sw * .02)
    W, H = sw + 2 * bz, sh + 2 * bz; base_h = round(sw * .045); pad = round(sw * .05)
    im = Image.new('RGBA', (W + 2 * pad + round(sw * .12), H + base_h + 2 * pad), (0, 0, 0, 0))
    ox = pad + round(sw * .06)
    sh_l = Image.new('L', im.size, 0)
    ImageDraw.Draw(sh_l).rounded_rectangle([ox, pad + 20, ox + W, pad + H + base_h], radius=r, fill=100)
    sh_l = sh_l.filter(ImageFilter.GaussianBlur(round(sw * .02)))
    im.paste(Image.new('RGBA', im.size, (10, 20, 40, 255)), (0, 0), sh_l)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([ox, pad, ox + W, pad + H], radius=r + bz // 2, fill='#0E1726')
    d.rounded_rectangle([pad, pad + H - 2, pad + W + round(sw * .12), pad + H + base_h], radius=base_h // 2, fill='#C9CED8')
    d.rounded_rectangle([pad + (W + round(sw * .12)) // 2 - round(sw * .08), pad + H - 2, pad + (W + round(sw * .12)) // 2 + round(sw * .08), pad + H + base_h // 3], radius=base_h // 4, fill='#AEB4C0')
    return im, (ox + bz, pad + bz, sw, sh), rounded_mask(sw, sh, max(4, r // 2))


@lru_cache(64)
def load_img(name):
    p = SRC / (name + '.png')
    return Image.open(p).convert('RGB')


@lru_cache(4)
def clip_frames(name):
    return sorted((SRC / 'clips' / name).glob('*.jpg'))


def screen_content(s, t, dur, w, h):
    """Content for the device screen at time t: clip frame or push-in still. Always fills the screen."""
    if s['img'].startswith('clip:'):
        fr = clip_frames(s['img'][5:])
        idx = min(int(t * 24), len(fr) - 1)
        im = Image.open(fr[idx]).convert('RGB')
        return im.resize((w, h), Image.BILINEAR)
    im = load_img(s['img'])
    z = 1.0  # full screen, never cropped (motion comes from the device float)
    iw, ih = im.size
    target = w / h
    # base crop that matches screen aspect (cover)
    if iw / ih > target:
        cw, ch = ih * target, ih
    else:
        cw, ch = iw, iw / target
    cw, ch = cw / z, ch / z
    x0 = (iw - cw) / 2; y0 = (ih - ch) * (0.35 if ih > iw else .5)
    return im.resize((w, h), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))


# ---------------------------------------------------------------- scenes
def ease(x):
    x = max(0., min(1., x)); return 1 - (1 - x) ** 3


class Scene:
    def __init__(self, s, fmt, dur):
        self.s, self.fmt, self.dur = s, fmt, dur
        self.W, self.H = (1080, 1920) if fmt == 'v' else (1920, 1080)
        self.build()

    def build(self):
        k = self.s['kind']; W, H = self.W, self.H
        bg = Image.new('RGBA', (W, H), BG)
        txt = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(txt)
        self.dev = None
        if k in ('intro', 'outro'):
            top, bot = hexrgb(DEEP if k == 'intro' else NAVY), hexrgb(TEAL if k == 'intro' else '#1E3358')
            g = np.linspace(0, 1, H)[:, None, None]
            arr = (np.array(top) * (1 - g) + np.array(bot) * g).astype(np.uint8)
            bg = Image.fromarray(np.repeat(arr, W, axis=1), 'RGB').convert('RGBA')
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            r = int(min(W, H) * .55)  # soft decorative ring
            od.ellipse([W - r * .9, -r * .45, W + r * .5, r * .95], outline=(255, 255, 255, 22), width=int(r * .12))
            od.ellipse([-r * .5, H - r * .7, r * .6, H + r * .4], fill=(255, 194, 26, 16))
            bg.alpha_composite(ov)
            ms = int(min(W, H) * (.16 if self.fmt == 'h' else .2))
            self.mark_size = ms
            cx = W // 2
            if k == 'intro':
                f = fit_font(d, self.s['head'], 800, 96 if self.fmt == 'h' else 104, int(W * .78), 3)
                lines = wrap(self.s['head'], f, int(W * .78), d); lh = int(f.size * 1.12)
                block = ms + 60 + len(lines) * lh + 40
                y0 = (H - block) // 2
                self.mark_pos = (cx - ms // 2, y0)
                y = y0 + ms + 60
                for i, ln in enumerate(lines):
                    d.text((cx, y + i * lh), ln, font=f, fill='white', anchor='ma')
                yb = y + len(lines) * lh + 24
                d.rounded_rectangle([cx - 60, yb, cx + 60, yb + 10], radius=5, fill=YEL)
            else:
                f = fit_font(d, self.s['head'], 800, 76 if self.fmt == 'h' else 84, int(W * .8), 3)
                lines = wrap(self.s['head'], f, int(W * .8), d); lh = int(f.size * 1.14)
                fw = font(700, int(ms * .78))
                block = ms + 70 + len(lines) * lh + 60 + 120
                y0 = (H - block) // 2
                wm_w = ms + int(ms * .28) + int(d.textlength('help.', font=fw))
                self.mark_pos = None
                wordmark(txt, cx - wm_w // 2, y0, ms, light=True)
                y = y0 + ms + 70
                for i, ln in enumerate(lines):
                    d.text((cx, y + i * lh), ln, font=f, fill='white', anchor='ma')
                y += len(lines) * lh + 60
                fc = font(800, 52 if self.fmt == 'h' else 56)
                tw = d.textlength(self.s['cta'], font=fc)
                d.rounded_rectangle([cx - tw / 2 - 56, y, cx + tw / 2 + 56, y + 116], radius=58, fill=YEL)
                d.text((cx, y + 58), self.s['cta'], font=fc, fill=NAVY, anchor='mm')
        else:
            dev = 'laptop' if self.s['img'].startswith('web/') else self.s.get('device', 'phone')
            bd = ImageDraw.Draw(bg)
            if self.fmt == 'v':
                wordmark(txt, 80, 96, 64)
                fh = fit_font(d, self.s['head'], 800, 88, W - 160, 2)
                y = text_block(d, self.s['head'], fh, 80, 210, W - 160, NAVY, 1.1)
                fs = font(600, 44)
                y = text_block(d, self.s['sub'], fs, 80, y + 18, W - 160, TEAL, 1.2)
                top = y + 40
                if dev == 'phone':
                    sh = int((H - top - 80) / 1.056)
                    shell, box, mask = phone_shell(sh)
                    px = (W - shell.width) // 2; py = top - round(sh * .06)
                    r = int(W * .62)
                    bd.ellipse([W / 2 - r / 2, top + sh * .18, W / 2 + r / 2, top + sh * .18 + r], fill=YSOFT)
                else:
                    sw = W - 120
                    shell, box, mask = laptop_shell(sw)
                    px = (W - shell.width) // 2; py = top + 120
            else:
                wordmark(txt, 140, 110, 60)
                colw = 720 if dev == 'phone' else 620
                fh = fit_font(d, self.s['head'], 800, 88, colw, 3)
                lines = wrap(self.s['head'], fh, colw, d)
                fs = font(600, 42)
                sub_lines = wrap(self.s['sub'], fs, colw, d)
                block = len(lines) * int(fh.size * 1.1) + 26 + len(sub_lines) * int(42 * 1.25)
                y = (H - block) // 2 + 30
                y = text_block(d, self.s['head'], fh, 140, y, colw, NAVY, 1.1)
                d.rounded_rectangle([140, y + 4, 230, y + 12], radius=4, fill=YEL)
                text_block(d, self.s['sub'], fs, 140, y + 30, colw, TEAL, 1.25)
                if dev == 'phone':
                    sh = 940
                    shell, box, mask = phone_shell(sh)
                    px = 1420 - shell.width // 2; py = (H - shell.height) // 2
                    r = 760
                    bd.ellipse([1420 - r / 2, H / 2 - r / 2 + 40, 1420 + r / 2, H / 2 + r / 2 + 40], fill=YSOFT)
                else:
                    sw = 1000
                    shell, box, mask = laptop_shell(sw)
                    px = 1920 - shell.width - 30; py = (H - shell.height) // 2
            self.shell, self.shell_pos = shell, (px, py)
            self.dev = ((px + box[0], py + box[1], box[2], box[3]), mask)
        self.bg, self.txt = bg, txt

    def frame(self, t):
        img = self.bg.copy()
        if self.dev:
            (x, y, w, h), mask = self.dev
            off = int(18 * (1 - ease(t / max(self.dur, .1))) )  # gentle float up
            img.alpha_composite(self.shell, (self.shell_pos[0], self.shell_pos[1] + off))
            img.paste(screen_content(self.s, t, self.dur, w, h), (x, y + off), mask)
        a = ease(t / .55)
        if self.s['kind'] == 'intro' and self.mark_pos:
            sc = .7 + .3 * ease(t / .5)
            ms = int(self.mark_size * sc)
            m = mark(self.mark_size).resize((ms, ms), Image.LANCZOS)
            if a < 1:
                m.putalpha(m.getchannel('A').point(lambda v: int(v * a)))
            mx, my = self.mark_pos
            if a >= 1: halo(img, mx, my, self.mark_size)
            img.alpha_composite(m, (mx + (self.mark_size - ms) // 2, my + (self.mark_size - ms) // 2))
        if a >= 1:
            img.alpha_composite(self.txt)
        else:
            t2 = self.txt.copy(); t2.putalpha(t2.getchannel('A').point(lambda v: int(v * a)))
            img.alpha_composite(t2, (0, int((1 - a) * 28)))
        return img.convert('RGB')


# ---------------------------------------------------------------- audio
def build_audio(v, starts, total):
    SR = 48000
    voice = np.zeros(int(total * SR) + SR, np.float32)
    for s, st in zip(v['scenes'], starts):
        if not s.get('say'):
            continue
        a, sr = sf.read(path_for(s['say']), dtype='float32')
        if a.ndim > 1: a = a.mean(1)
        a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a).astype(np.float32)
        i = int((st + (0.55 if st == 0 else 0.35)) * SR)
        voice[i:i + len(a)] += a[: len(voice) - i]
    mus, msr = sf.read(SRC / 'music.wav', dtype='float32')
    mus = mus.mean(1) if mus.ndim > 1 else mus
    reps = math.ceil(len(voice) / len(mus))
    mus = np.tile(mus, reps)[: len(voice)]
    # duck ~12 dB under the voice (smoothed envelope)
    def smooth(x, win):  # fast centred moving average (cumsum), O(n)
        c = np.cumsum(np.concatenate([[0.], x.astype(np.float64)]))
        h = win // 2
        idx = np.arange(len(x))
        lo, hi = np.clip(idx - h, 0, len(x)), np.clip(idx + h, 0, len(x))
        return ((c[hi] - c[lo]) / np.maximum(hi - lo, 1)).astype(np.float32)
    env = smooth(np.abs(voice), int(.25 * SR))
    duck = np.where(env > 0.004, 10 ** (-12 / 20), 1.0).astype(np.float32)
    duck = smooth(duck, int(.3 * SR))
    music = mus * duck * 0.32
    n = len(music); fi, fo = int(1 * SR), int(1.6 * SR)
    music[:fi] *= np.linspace(0, 1, fi); music[-fo:] *= np.linspace(1, 0, fo)
    mix = voice * 0.9 + music
    mix = mix[: int(total * SR)]
    mix /= max(1e-6, np.abs(mix).max() / 0.95)
    return mix, SR


# ---------------------------------------------------------------- render
def scene_dur(s):
    base = 0
    if s.get('say'):
        info = sf.info(path_for(s['say'])); base = info.frames / info.samplerate
    lead = 0.35
    d = base + lead + 0.6
    if s['kind'] == 'intro': d = max(d, 2.6)
    if s['kind'] == 'outro': d = max(d + 0.8, 4.0)
    if s['kind'] == 'screen': d = max(d, 3.0)
    return d


def render(v):
    fmt = v['fmt']
    durs = [scene_dur(s) for s in v['scenes']]
    starts, t = [], 0.0
    for i, d in enumerate(durs):
        starts.append(t); t += d - (XF if i < len(durs) - 1 else 0)
    total = t
    scenes = [Scene(s, fmt, d) for s, d in zip(v['scenes'], durs)]
    outdir = ROOT / v['dir']; outdir.mkdir(parents=True, exist_ok=True)
    tmp_v = outdir / f".{v['id']}.video.mp4"; tmp_a = outdir / f".{v['id']}.wav"
    W, H = scenes[0].W, scenes[0].H
    if '--audio-only' in sys.argv and tmp_v.exists():
        nframes = 0; proc = None
    else:
        proc = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', str(tmp_v)], stdin=subprocess.PIPE)
        nframes = int(total * FPS)
    for fi in range(nframes):
        T = fi / FPS
        act = [i for i, (st, d) in enumerate(zip(starts, durs)) if st <= T < st + d]
        if not act: act = [len(scenes) - 1]
        i = act[-1]
        fr = scenes[i].frame(T - starts[i])
        if len(act) > 1:
            j = act[0]
            prev = scenes[j].frame(T - starts[j])
            alpha = (T - starts[i]) / XF
            fr = Image.blend(prev, fr, max(0., min(1., alpha)))
        proc.stdin.write(fr.tobytes())
    if proc:
        proc.stdin.close(); proc.wait()
    mix, sr = build_audio(v, starts, total)
    sf.write(tmp_a, mix, sr)
    out = outdir / f"{v['id']}.mp4"
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', str(tmp_v), '-i', str(tmp_a), '-c:v', 'copy',
                    '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
    tmp_v.unlink(); tmp_a.unlink()
    thumbnail(v, scenes, outdir)
    print(f"done {v['id']} {total:.1f}s", flush=True)


def thumbnail(v, scenes, outdir):
    fmt = v['fmt']
    shots = [s for s in v['scenes'] if s['kind'] == 'screen' and not s['img'].startswith('clip:')]
    first_screen = next((s for s in shots if s['img'].startswith('app/')), shots[0])
    use_laptop = first_screen['img'].startswith('web/')
    hook = v['scenes'][0]['head']
    W, H = (1080, 1920) if fmt == 'v' else (1280, 720)
    top, bot = hexrgb(DEEP), hexrgb(TEAL)
    g = np.linspace(0, 1, H)[:, None, None]
    img = Image.fromarray(np.repeat((np.array(top) * (1 - g) + np.array(bot) * g).astype(np.uint8), W, axis=1), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(img)
    if fmt == 'v':
        wordmark(img, 80, 100, 80, light=True)
        f = fit_font(d, hook, 800, 120, W - 160, 4)
        y = text_block(d, hook, f, 80, 240, W - 160, 'white', 1.08)
        sh = H - y - 80
        shell, box, mask = laptop_shell(W - 120) if use_laptop else phone_shell(sh)
        px = (W - shell.width) // 2; py = y + 40 - (0 if use_laptop else round(sh * .06))
    else:
        wordmark(img, 60, 50, 54, light=True)
        f = fit_font(d, hook, 800, 84, 640, 4)
        lines = wrap(hook, f, 640, d)
        y = (H - len(lines) * int(f.size * 1.08)) // 2 + 20
        text_block(d, hook, f, 60, y, 640, 'white', 1.08)
        sh = 600
        shell, box, mask = laptop_shell(560) if use_laptop else phone_shell(sh)
        px = W - shell.width - 10; py = (H - shell.height) // 2
    img.alpha_composite(shell, (px, py))
    x, y2, w, h = box
    img.paste(screen_content(first_screen, 0, 1, w, h), (px + x, py + y2), mask)
    img.convert('RGB').save(outdir / f"{v['id']}-thumbnail.jpg", quality=90)


if __name__ == '__main__':
    pick = [a for a in sys.argv[1:] if not a.startswith('--')]
    for v in VIDEOS:
        if not pick or any(p in v['id'] for p in pick):
            render(v)
