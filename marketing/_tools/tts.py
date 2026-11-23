"""Narrate every line in spec.py with Kokoro (voice af_heart, Apache-2.0). One cached wav per line."""
import hashlib, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(__file__).parent))
from spec import VIDEOS

CACHE = Path(__file__).resolve().parents[1] / '_src' / 'tts'
CACHE.mkdir(parents=True, exist_ok=True)
VOICE, SPEED, SR = 'af_heart', 1.0, 24000

# Words the voice mangles -> how to say them.
PRON = {r'\bA C\b': 'A.C.', r'\bI D\b': 'I.D.', r'\bhelp bharath dot com\b': 'help bharath dot com',
        r'\bhelpbharath\.com\b': 'help bharath dot com', r'\bUPI\b': 'U P I', r'\bPDF\b': 'P D F'}


def clean(t: str) -> str:
    for k, v in PRON.items():
        t = re.sub(k, v, t)
    return t


def key(t: str) -> str:
    return hashlib.sha1(f'{VOICE}|{SPEED}|{clean(t)}'.encode()).hexdigest()[:16]


def path_for(t: str) -> Path:
    return CACHE / f'{key(t)}.wav'


def lines():
    seen = []
    for v in VIDEOS:
        for s in v['scenes']:
            if s.get('say') and s['say'] not in seen:
                seen.append(s['say'])
    return seen


if __name__ == '__main__':
    todo = [t for t in lines() if not path_for(t).exists()]
    print(f'{len(todo)} lines to narrate')
    if todo:
        from kokoro import KPipeline
        pipe = KPipeline(lang_code='a')
        for i, t in enumerate(todo):
            chunks = [a.numpy() if hasattr(a, 'numpy') else np.asarray(a) for _, _, a in pipe(clean(t), voice=VOICE, speed=SPEED)]
            audio = np.concatenate(chunks).astype(np.float32)
            sf.write(path_for(t), audio, SR)
            print(f'{i + 1}/{len(todo)} {len(audio) / SR:.1f}s', flush=True)
