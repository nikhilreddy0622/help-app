"""Capture full-screen app shots (1080x1920) and short scroll clips from the LOCAL demo stack.

Needs: local API on :4100 (demo DB), Expo web on :8082. Never points at production.
Usage: python capture_app.py <api-log-file>
"""
import base64, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

LOG = Path(sys.argv[1])
BASE = 'http://localhost:8082'
OUT = Path(__file__).resolve().parents[1] / '_src' / 'app'
CLIPS = Path(__file__).resolve().parents[1] / '_src' / 'clips'
OUT.mkdir(parents=True, exist_ok=True)
CLIPS.mkdir(parents=True, exist_ok=True)


def otp_for(phone: str, since: int = 0) -> str:
    for _ in range(30):
        m = re.findall(rf'DEV OTP for \+91{phone}: (\d{{6}})', LOG.read_text(errors='ignore')[since:])
        if m:
            return m[-1]
        time.sleep(0.5)
    raise RuntimeError('no OTP in log')


def settle(page, ms=1800):
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(ms)


HIDE_DEV = """(() => {
  const all = [...document.querySelectorAll('div,span')].filter(e => /BackHandler|not supported on/.test(e.textContent || '') && ![...e.children].some(c => /BackHandler|not supported on/.test(c.textContent || '')));
  for (let el of all) { let n = el; for (let i = 0; i < 12 && n; i++) { const st = getComputedStyle(n); if (st.position === 'fixed' || st.position === 'absolute') { n.style.visibility = 'hidden'; } n = n.parentElement; if (n && n.getBoundingClientRect().height > 200) break; } }
})()"""


def shot(page, name, ms=1800):
    settle(page, ms)
    loc = page.get_by_text(re.compile('not supported on'))
    for i in range(loc.count()):
        loc.nth(i).evaluate('''el => { let n = el; for (let k = 0; k < 14 && n; k++) { if (n.nodeType === 1) { const st = getComputedStyle(n); if (st.position === 'fixed' || st.position === 'absolute') n.style.visibility = 'hidden'; } n = n.parentNode || n.host; } }''')
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / f'{name}.png'))
    print('shot', name)


def go(page, path, name, ms=2200):
    page.goto(BASE + path)
    shot(page, name, ms)


def record_scroll(page, cdp, name, total_px, seconds=4.0, fps=24):
    """Smooth scroll while grabbing frames via CDP captureScreenshot."""
    d = CLIPS / name
    d.mkdir(parents=True, exist_ok=True)
    for f in d.glob('*.jpg'):
        f.unlink()
    n = int(seconds * fps)
    for i in range(n + fps // 2):  # extra half second still at the end
        t = min(i / n, 1.0)
        ease = t * t * (3 - 2 * t)
        page.evaluate(f'(() => {{ const els=[...document.querySelectorAll("*")].filter(e=>e.scrollHeight>e.clientHeight+40 && getComputedStyle(e).overflowY.match(/auto|scroll/)); const el=els.sort((a,b)=>b.clientHeight-a.clientHeight)[0]||document.scrollingElement; el.scrollTop={int(total_px * ease)}; }})()')
        data = cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 92})['data']
        (d / f'{i:04d}.jpg').write_bytes(base64.b64decode(data))
    print('clip', name, n)


def sign_in(page, phone):
    page.goto(BASE + '/auth/phone')
    settle(page, 1500)
    page.get_by_placeholder('98765 43210').click()
    page.keyboard.type(phone, delay=40)
    since = len(LOG.read_text(errors='ignore'))
    page.get_by_text('Send code', exact=True).click()
    code = otp_for(phone, since)
    page.wait_for_timeout(1500)
    page.keyboard.type(code)
    settle(page, 3000)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--host-resolver-rules=MAP i.pravatar.cc 127.0.0.1', '--hide-scrollbars'])

    def ctx():
        c = browser.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, is_mobile=True, has_touch=True,
                                geolocation={'latitude': 12.9352, 'longitude': 77.6245}, permissions=['geolocation'], locale='en-IN')
        return c

    def nav(page, path, name, ms=2500):
        page.evaluate(f"(() => {{ window.history.pushState({{}}, '', '{path}'); window.dispatchEvent(new PopStateEvent('popstate')); }})()")
        shot(page, name, ms)

    ONLY = set(sys.argv[2:])
    # ---- signed out: discovery extras ----

    # ---- professional ----
    c = ctx(); page = c.new_page(); cdp = c.new_cdp_session(page)
    sign_in(page, '9000000202')
    nav(page, '/profile', 'pro-switch', 2000)
    page.get_by_text('Switch to professional mode').first.click()
    settle(page, 3000)
    nav(page, '/dashboard', 'pro-dashboard', 3000)
    record_scroll(page, cdp, 'pro-dashboard-scroll', 1200, 4)
    nav(page, '/p-profile', 'pro-profile')
    nav(page, '/my-jobs', 'pro-jobs')
    nav(page, '/subscription', 'pro-subscription', 2500)
    nav(page, '/p-messages', 'pro-messages')
    c.close()
    browser.close()
