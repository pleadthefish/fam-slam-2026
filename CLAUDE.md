# Parrish Slam Hub — Project Context

## What this is
A static website (GitHub Pages) that's the stylized "front door" for the
Parrish family reunion (Thu 8/6 – Sun 8/9, 2026). It complements — not
replaces — the Google Sheets/Docs, which stay the editable source of truth.
This site is a pretty, fast entry point that links out to them.

## Core principles
- **Static-first.** No dynamic fetching from Sheets/Docs at page load.
  Essential info (itinerary, links) lives in `data/site-data.json` and is
  hand-updated whenever the real docs change. Simplicity over real-time sync.
- **One exception: the suggestion form.** The only piece that talks to an
  external service. It POSTs to a Google Apps Script Web App, which appends
  the submission as a row to a "Suggestions" Google Sheet. See
  `docs/apps-script-setup.md` for the one-time setup (done in Google's
  editor, not this repo).
- **Design language matches the existing family docs** — day-based color
  coding, used consistently across the reunion's Sheets/Docs:
  - Thu = `#FCE4D6` (soft orange)
  - Fri = `#D9E1F2` (soft blue)
  - Sat = `#E2EFDA` (soft green)
  - Sun = `#FFF2CC` (soft yellow)
  Clean typography, mobile-friendly first (family is on iPhones).

## Tech stack
- Plain HTML/CSS/JS. No build step, no framework — keep it inspectable and
  easy to hand-edit later without re-learning tooling.
- Hosted via GitHub Pages.
- Suggestion form → `fetch()` POST → Apps Script Web App URL (stored as a
  const in `js/main.js` once deployed).

## Site sections
1. **Header** — event name, dates, location, headcount
2. **Quick Links** — cards linking to: Meals/Activities/Shopping workbook,
   Meal & Dish Sign-Up doc, Committee Sign-Up doc
3. **Itinerary at a Glance** — day-by-day, color-coded, static content
   (menu + top activity per day), sourced from `data/site-data.json`
4. **Suggestion Portal** — form: Suggestion (textarea), Category
   (select: Meal/Activity/Committee/Other), Initials (text) → POSTs to
   the Apps Script endpoint
5. **Notes** — address, wifi, emergency contact

## Non-goals (for now)
- No login/auth
- No real-time sync with Sheets/Docs for display content
- No build tooling (webpack/vite/etc.) — vanilla is the point

## Data files
- `data/site-data.json` — all editable content (itinerary, links, notes).
  Claude Code should read from this file to render the page, not hardcode
  content into HTML, so future edits stay localized to one file.
