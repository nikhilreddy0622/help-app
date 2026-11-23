"""Original background bed, generated from scratch (no samples): soft pad + plucked arpeggio + light pulse.
Writes marketing/_src/music.wav (48 kHz stereo, ~64 s, loops cleanly)."""
from pathlib import Path
import numpy as np, soundfile as sf

SR, BPM, BARS = 48000, 96, 24
beat = 60 / BPM
bar = 4 * beat
N = int(BARS * bar * SR)
t = np.arange(N) / SR
out = np.zeros((N, 2), np.float32)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# I - V - vi - IV in D major (warm, optimistic)
CHORDS = [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]]

def env_adsr(n, a, r):
    e = np.ones(n, np.float32)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

for b in range(BARS):
    ch = CHORDS[b % 4]
    s, n = int(b * bar * SR), int(bar * SR)
    tt = np.arange(n) / SR
    # pad: detuned soft saw-ish (few harmonics) with slow attack
    pad = np.zeros(n, np.float32)
    for m in ch:
        f = hz(m - 12)
        for k, amp in ((1, 1), (2, .35), (3, .15)):
            pad += amp * (np.sin(2 * np.pi * f * k * tt) + np.sin(2 * np.pi * f * k * 1.003 * tt)) * .5
    pad *= env_adsr(n, .6, .6) * .045
    out[s:s + n, 0] += pad
    out[s:s + n, 1] += pad * .95
    # bass on beats 1 and 3
    for q in (0, 2):
        bs = s + int(q * beat * SR); bn = int(beat * 1.6 * SR)
        bt = np.arange(bn) / SR
        bass = np.sin(2 * np.pi * hz(ch[0] - 24) * bt) * np.exp(-bt * 2.2) * .16
        out[bs:bs + bn] += bass[:, None][: len(out[bs:bs + bn])]
    # plucked arpeggio, 8th notes
    arp = [ch[0], ch[1], ch[2], ch[3], ch[2], ch[1], ch[2], ch[3]]
    for i, m in enumerate(arp):
        ps = s + int(i * beat / 2 * SR); pn = int(beat * 1.2 * SR)
        pt = np.arange(pn) / SR
        f = hz(m + 12)
        pl = (np.sin(2 * np.pi * f * pt) + .3 * np.sin(4 * np.pi * f * pt)) * np.exp(-pt * 6) * .05
        pan = .35 + .3 * (i % 2)
        seg = out[ps:ps + pn]
        seg[:, 0] += pl[: len(seg)] * (1 - pan)
        seg[:, 1] += pl[: len(seg)] * pan
    # soft shaker on off-beats
    rng = np.random.default_rng(b)
    for q in range(8):
        if q % 2 == 1:
            hs = s + int(q * beat / 2 * SR); hn = int(.06 * SR)
            hn = min(hn, N - hs)
            noise = rng.standard_normal(hn).astype(np.float32)
            noise = np.diff(noise, prepend=0) * np.exp(-np.arange(hn) / SR * 60) * .012
            out[hs:hs + hn] += noise[:, None]

# gentle fade at loop edges to avoid clicks, normalise
fade = int(.05 * SR)
out[:fade] *= np.linspace(0, 1, fade)[:, None]
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out /= np.abs(out).max() / .7
dst = Path(__file__).resolve().parents[1] / '_src' / 'music.wav'
sf.write(dst, out, SR)
print('music', dst, round(N / SR, 1), 's')
