# help — marketing assets

Everything here was made locally with free tools, from real app screens (local demo data, never production)
and the brand in `packages/ui-tokens`. Claims follow [BRIEF.md](BRIEF.md).

## Deliverables
| File | Format | Length | Use |
|---|---|---|---|
| `overview-videos/help-explainer.mp4` | 16:9 1080p | 5:21 | Flagship "what is help" video for people who've never heard of it |
| `youtube/yt-01-customer-walkthrough.mp4` | 16:9 | 1:10 | Find and contact a pro |
| `youtube/yt-02-professional-walkthrough.mp4` | 16:9 | 0:53 | Professionals: set up and grow |
| `youtube/yt-03-jobs-walkthrough.mp4` | 16:9 | 1:02 | Hire helpers / find work |
| `youtube/yt-04-website-tour.mp4` | 16:9 | 0:53 | helpbharath.com tour |
| `reels/reel-01 … reel-06` | 9:16 1080×1920 | 20–25 s | Instagram reels: free for customers, find a pro fast, trust, chat and call, for professionals, find work |
| `shorts/short-01 … short-04` | 9:16 | 19–20 s | YouTube Shorts: map view, live status, hire helpers, privacy |
| `*-thumbnail.jpg` | next to each video | | Cover / thumbnail |
| `help-sales-deck.pptx` | 10 slides | | Sales deck for local professionals |

All audio is normalised to about −15.7 LUFS (target I=−15, TP=−1.5), so volumes match across videos.

## How it was made (re-run any step)
```
marketing/_tools/capture_app.py   # app screens from the LOCAL demo stack (devdb + API :4100 + Expo web :8082)
marketing/_tools/capture_web.py   # public website pages (read-only)
marketing/_tools/tts.py           # narration: Kokoro, voice af_heart (Apache-2.0), cached per line
marketing/_tools/music.py         # original generated music bed
marketing/_tools/render.py [id]   # compose videos (PIL + ffmpeg), thumbnails, loudness
marketing/_tools/deck.js          # sales deck (pptxgenjs)
```
Copy and scenes live in `_tools/spec.py`. Change a line there, re-run `tts.py`, then `render.py <video-id>`.

Notes
- The deck uses Segoe UI because Inter (the brand font) isn't installed with Office.
- Names in the screens are seeded demo profiles, not real people.
