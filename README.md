# Alfie & Lorna — Wedding Website

Multi-page wedding site for **Alfie & Lorna** · 15 May 2027 · Fruin Farm, Loch Lomond.
Live at **https://www.alflorna.com**

## Files

| File | Purpose |
|---|---|
| `index.html` | Home — hero, widget cards linking to each page, Our Story timeline |
| `day.html` / `venue.html` / `travel.html` / `gallery.html` / `dress.html` / `faq.html` / `rsvp.html` | One page per area; every page carries the login gate and header countdown |
| `styles.css` | Elegant/classic floral styling with Scottish wildlife touches |
| `guests.js`  | **The guest list & personal passwords — the only file to edit to manage guests** |
| `app.js`     | Countdown, animations, login + RSVP handling (shared by all pages) |
| `brand_assets/` | Photos and tartans used across the site |

## How the login works

Every guest has a **personal login**: their name + their own simple password
(e.g. `thistle56`). Both are listed in the **"Website Password" column of the
Guest List spreadsheet** — include the password with each invitation.

Guests live in `guests.js`:

```js
const GUEST_LIST = [
  { name: "Harry Dobson", invite: "day",     password: "crag33" },
  { name: "Jen Smith",    invite: "evening", password: "bud93"  },
  ...
];
```

- `name` — matched ignoring case/extra spaces; guests can type it or pick from a dropdown
- `invite` — `"day"` (whole day, from 1:00 pm) or `"evening"` (from 6:00 pm); shown to the guest when they RSVP
- `password` — their personal password

**To add a guest** (e.g. a space opens up): add a line and give them a password.
**To remove a guest**: delete their line — they can no longer log in or RSVP.
Only people in this list can RSVP. Two guests may share a name (there are two
Helen Beatties) — their different passwords tell them apart.

## RSVP

- Deadline shown on the site: **1st September**
- The guest RSVPs as themselves (name comes from their login — no free-typing)
- Collects: attending (yes/no), dietary requirements/allergies, optional note

## Where RSVPs go

By default, RSVPs are saved to the guest's browser (`localStorage`) so they can
come back and edit. **To actually receive them centrally, pick one:**

### Option A — Formspree (easiest)
1. Sign up at https://formspree.io and create a form
2. Copy your endpoint (looks like `https://formspree.io/f/xxxxxxxx`)
3. In `app.js`, set:
   ```js
   const REMOTE_ENDPOINT = "https://formspree.io/f/xxxxxxxx";
   ```

### Option B — Cloudflare Pages Function + KV
The site already deploys on Cloudflare Pages — a small `functions/api/rsvp.js`
with a KV binding would collect RSVPs with no third party.

### Option C — Google Sheets via Apps Script
Create a Web App in Apps Script that appends rows to a sheet, then put its URL
in `REMOTE_ENDPOINT`.

### No backend at all
On any one device, run `alfieLornaExport()` in the browser console to download
the RSVPs saved on **that device only** — a fallback, not a real solution.

## Hosting / deploying

Plain HTML/CSS/JS — no build step. Deployed via **Cloudflare Pages** from the
GitHub repo (`Holopoint1/Wedding`); pushing to the default branch redeploys.
`CNAME` holds `www.alflorna.com`.

## Customising

- **Names / date / venue** — search `index.html` for `Alfie`, `Lorna`, `15 May 2027`, `Fruin Farm`
- **Schedule times** — `<ol class="schedule">` in `index.html`
- **Accommodation & taxis** — the "Useful info" section in `index.html` (from the venue's own list)
- **Email** — replace `lornaandalfie@outlook.com` (gate + site footer)
- **Colours** — CSS custom properties at the top of `styles.css`
- **Gallery** — drop photos into `/images` and swap the placeholders in `index.html`

## A quick note on security

These logins are **gentle privacy**, not real authentication. The guest list and
passwords ship in `guests.js`, readable by anyone who opens the page source.
That's fine for a wedding site — it keeps the page private from casual visitors
and limits RSVPs to invited guests. Don't put genuinely sensitive info on the page.
