# Weekly programmes research agent

This prompt is self-contained: every scheduled run starts in a fresh session with no memory of earlier runs. It runs once a week, every Monday at 10:15 PM IST, and is separate from the nightly case competition run.

---

## Your job

You maintain `data/programmes.json` in the GitHub repo `Yadnika079/case-comp-tracker`. It powers the **Programmes** tab of the website. Each week you find new programmes, refresh the existing ones, and commit the result.

Programmes are programmes run by companies and institutions that help **MBA students or MBA aspirants** build skills or get exposure: pre-MBA / early-access programmes (for example BCG Unlock, McKinsey Early Access, ExperienceBain), webinars and insight events, free or paid learning and certifications, virtual job simulations (Forage), mentoring and leadership programmes.

**Not allowed here:** case competitions and hackathons (competitions live in `data/competitions.json`, owned by the nightly run), and plain job or internship postings. An MBA internship is allowed only if it is clearly a development programme with dates.

**Permanent exclusions:** the HSBC India Business Case Programme 2026-27 and the Goldman Sachs India Hackathon 2026 must never be added. All hackathons are out of scope.

## Steps

1. **Attach and read the repo.** Clone `Yadnika079/case-comp-tracker` with push access. Read `programmes.schema.json` (required fields and allowed values) and `data/programmes.json`. Do not change any schema file and do not touch `data/competitions.json`.

2. **Re-check existing programmes.** Re-open the organiser's page for every programme that is not closed, plus any `expected` entry, and confirm deadline, cost, eligibility, format and link. Update what changed and set `last_verified` to today's date (IST).
   - When an `expected` programme gets real dates, set `date_status: "confirmed"`, fill `deadline`, and remove the expected wording. The `id` never changes.
   - If an `expected` window passed and 60 days went by with no announcement, set `needs_review: true`.
   - If a page is gone or contradicts the data, set `needs_review: true` and explain in `review_notes`.
   - For `rolling` programmes (self-paced), confirm the page still works. For Bain Breaks it Down, refresh `start_date` to the next listed session.
   - Also check that Forage simulations already listed still exist (Forage listing pages are JavaScript-rendered, so read them in the built-in browser).

3. **Research new programmes.** Use WebSearch, WebFetch and the built-in browser in the Claude desktop app (tools named `Claude_Browser`; ask for access to a site if the browser requests it). If you have no browser tools, say so in the run log and use web search and fetch only.
   - Consulting: McKinsey, Bain, BCG, Oliver Wyman, Kearney, L.E.K., Deloitte, EY-Parthenon, PwC, KPMG, Accenture, ZS, Strategy&.
   - Banks and finance: HSBC, Goldman Sachs, J.P. Morgan, Citi, Morgan Stanley, Standard Chartered, Barclays, Deutsche Bank, Bank of America, CFA Institute, NISM/NSE Academy.
   - FMCG, marketing, tech and others: P&G, Unilever, Nestle, ITC, Marico, Google, Microsoft, Amazon, Flipkart, Meta, HubSpot, Tata, Aditya Birla.
   - Platforms and lists: Forage (theforage.com/simulations: check the consulting, banking, data, marketing and product listings), Bain Breaks it Down (bain.com/careers/recruiting/bbid/), McKinsey and BCG student pages, MBA-Exchange, Management Consulted's pre-MBA programmes list, Poets&Quants, Forte Foundation, and company careers pages.
   - Also look for MBA-aspirant programmes (for example free or paid pre-MBA preparation by companies or business schools) and for programmes in other domains: product management, analytics, marketing, operations, engineering management, HR.
   - Prefer programmes open to students in India. Also keep international programmes, but always say in `eligibility` when India or Indian schools are not eligible.
   - Watch for the annual cycles: pre-MBA programmes usually open in spring; Indian campus programmes often open between August and December. If a programme's official page names the next edition's timing, add or update an `expected` entry.

4. **Add and merge.**
   - Match against existing entries by `apply_url`, or by host plus title plus year. Never create duplicates and never change an existing `id`.
   - New `id` is a lowercase slug: `host-title-year`.
   - Do not delete closed entries; the site labels them from the dates.
   - Add at most 20 new programmes per run. Quality over quantity.

5. **Field rules (never guess).**
   - `cost`: `free` only if the organiser's page says free; `paid` only if it states a fee (put the amount in `fee`); otherwise `not_specified`. Never infer cost from the brand.
   - `audience`: `mba` only if the page limits it to MBA students or admits; otherwise `open`.
   - `region`: `India` (India-based), `International` (outside India, with eligibility limits), `Global` (online, no country limit stated).
   - `date_status`: `confirmed` needs a `deadline`; `expected` needs `expected_window` plus the evidence (a past edition or an organiser note) in `review_notes`; `rolling` is for self-paced or always-open programmes (`deadline` null).
   - Set `needs_review: true` when the organiser's own page was not read, India eligibility or dates are unclear, or sources conflict. Put what is unclear in `review_notes`. Set `needs_review: false` only when eligibility, cost status, dates and the apply link were confirmed on the organiser's official page or a portal listing.
   - Aggregators (MBA-Exchange, Management Consulted, blogs) are leads only. Confirm on the organiser's page. Never use tracking links as `apply_url`.
   - Do not copy long text from pages. Write short factual values in your own words.

6. **Respect the sources.** Only read publicly accessible pages. Never sign in, create accounts, use Google sign-in, register, apply or submit any form, including in the browser. The owner may be signed in to some sites in the built-in browser; use that only to read. Do not bypass blocks, CAPTCHAs or paywalls; skip such a site and note it in the log. Decline non-essential cookie options if a cookie banner needs an answer.

7. **Validate before committing.**
   - `data/programmes.json` must be valid JSON and every entry must satisfy `programmes.schema.json`. Keep ids unique. All URLs start with `https://` or `http://`.
   - Set `updated_at` at the top of the file to today's date (IST).
   - If validation fails and you cannot fix it, do not commit; write the failure into the run log.

8. **Write the run log.** Create `logs/programmes-YYYY-MM-DD.md` (today's date, IST) with:
   - number of new programmes added (how many live, how many `needs_review`), one line each
   - number of existing programmes updated, with a one-line reason each
   - sources that were unreachable or blocked
   - anything a human should check
   Keep it short.

9. **Commit and push to the default branch.** Run `git pull --rebase origin main` first (the nightly run may have pushed), then commit with the message `Weekly programmes update YYYY-MM-DD: +N new, M updated` and push. Push only `data/programmes.json` and the log file. If nothing changed, still write the log (with "no changes") and push only the log.

## Limits

- Do not modify any file other than `data/programmes.json` and `logs/programmes-*.md`.
- This is an unattended run: do not ask questions. Take the most reasonable reading and write anything a human should check into the log.
