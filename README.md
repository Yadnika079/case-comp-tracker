# Case Comp Tracker

A static website that lists case competitions as **open**, **upcoming** or **closed**, with filters for status, UG/PG, domain and host type (college/company). A nightly agent researches new competitions and updates the data.

## How it fits together

```
nightly agent (10 PM IST)  ->  commits data/competitions.json to GitHub
                                       |
                          Vercel / Netlify / GitHub Pages auto-redeploys
                                       |
                              index.html + app.js read the JSON
```

- No build step and no dependencies. It is plain HTML, CSS and JavaScript.
- **Status is computed in the browser from dates**, not stored. Open = registration started and deadline not passed. Upcoming = registration has not started yet. Closed = deadline passed.
- Entries with `"needs_review": true` are **hidden** from the public site until you flip them to `false`.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The website |
| `programmes.js` | Code for the Programmes tab |
| `data/competitions.json` | All case competitions (the agent edits this and `programmes.json`, plus logs) |
| `data/programmes.json` | All programmes for MBA students and aspirants (Programmes tab) |
| `schema.json` | Field definitions and allowed values for competitions |
| `programmes.schema.json` | Field definitions and allowed values for programmes |
| `agent/nightly-prompt.md` | The prompt the nightly agent runs (competitions, every night 10 PM IST) |
| `agent/weekly-programmes-prompt.md` | The prompt the weekly agent runs (programmes, every Monday 10:15 PM IST) |
| `logs/` | One short log per nightly run (created by the agent) |

## Run locally

```bash
cd case-comp-tracker
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly will not work, because browsers block `fetch` on `file://` pages.)

## Deploy

1. Create a GitHub repo and push this folder.
2. Connect the repo to Vercel, Netlify or GitHub Pages. Publish directory is the repo root; no build command.
3. Every commit to the default branch redeploys the site.

## Set up the nightly agent

1. The repo name is already set in `agent/nightly-prompt.md`.
2. Run the prompt manually a few times first and check the diff it produces.
3. Create a scheduled task in Claude that runs the prompt daily at 10:00 PM IST (`CRON_TZ=Asia/Kolkata 0 22 * * *`). Each run is a fresh session, so the prompt must stay self-contained.
4. Review `logs/` and any entries with `needs_review: true` once a day at first.

## Before launch

- Delete the five `SAMPLE:` entries in `data/competitions.json`.
- Add 15-20 real, hand-verified entries, or let the first agent runs fill them in and review them.

## Adding or approving an entry by hand

Add an object to `competitions` in `data/competitions.json` following `schema.json`, or change `needs_review` from `true` to `false` to publish a flagged entry.
