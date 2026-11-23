"""Desktop screenshots of public website pages (read-only) for the laptop frame: 1600x1000 CSS @1.2 = 1920x1200."""
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT = Path(__file__).resolve().parents[1] / '_src' / 'web'; OUT.mkdir(parents=True, exist_ok=True)
SITE = 'https://www.helpbharath.com'
PAGES = {'web-home': '/', 'web-services': '/services', 'web-city': '/c/electrician/bengaluru', 'web-jobs': '/jobs',
         'web-pros': '/for-professionals', 'web-blog': '/blog', 'web-delete': '/delete-account'}
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--host-resolver-rules=MAP i.pravatar.cc 127.0.0.1', '--hide-scrollbars'])
    c = b.new_context(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1.2, locale='en-IN')
    pg = c.new_page()
    for name, path in PAGES.items():
        pg.goto(SITE + path, timeout=90000); pg.wait_for_load_state('networkidle', timeout=90000); pg.wait_for_timeout(2500)
        pg.screenshot(path=str(OUT / f'{name}.png')); print('web', name)
    pg.goto(SITE + '/c/electrician/bengaluru'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(2000)
    a = pg.locator('a[href^="/professionals/"]').first
    if a.count():
        pg.goto(SITE + a.get_attribute('href')); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(2500)
        pg.screenshot(path=str(OUT / 'web-profile.png')); print('web profile')
    b.close()
