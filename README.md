# Alfie & Lorna — Wedding Website

Single-page wedding site for **Alfie & Lorna** · 15 May 2027 · Fruin Farm, Loch Lomond.

## Files

| File | Purpose |
|---|---|
| `index.html` | All markup — login screen + main site (hero, story, schedule, venue, RSVP, registry) |
| `styles.css` | Elegant/classic floral styling with Scottish wildlife touches |
| `app.js`     | Guest list, login, RSVP form handling |

## How the login works

Every guest gets their own **invitation code**. They type it on the landing screen and the rest of the site unlocks.

Codes live at the top of `app.js`:

```js
const GUESTS = [
  { code: "THISTLE-2026",  name: "The Smiths",        party: 2 },
  { code: "HEATHER-2026",  name: "The Browns",        party: 4 },
  ...
];
```

- `code` — what the guest types (case-insensitive)
- `name` — used in the personal greeting
- `party` — number of seats reserved (shown on the RSVP page)

Add one row per guest/family before sending invitations. Anything nature-themed makes a nice scheme: `THISTLE`, `HEATHER`, `ROWAN`, `BLUEBELL`, `FOX`, `STAG`, `LOCH`...

## Where RSVPs go

By default, RSVPs are saved to the guest's browser (`localStorage`) so they can come back and edit. To collect them centrally, pick **one**:

### Option A — Formspree (easiest)
1. Sign up at https://formspree.io and create a form
2. Copy your endpoint (looks like `https://formspree.io/f/xxxxxxxx`)
3. In `app.js`, set:
   ```js
   const REMOTE_ENDPOINT = "https://formspree.io/f/xxxxxxxx";
   ```

### Option B — Netlify Forms
Host on Netlify and add `netlify` to the `<form>` tag in `index.html`.

### Option C — Google Sheets via Apps Script
Create a Web App in Apps Script that appends rows to a sheet, then put its URL in `REMOTE_ENDPOINT`.

### No backend at all
You can also just open the browser console on your own machine and run `alfieLornaExport()` to download every saved RSVP as JSON — but this only sees RSVPs entered on **that one device**, so it's a fallback, not a real solution.

## Hosting

The site is plain HTML/CSS/JS — no build step. Drop the folder on any static host:

- **Cloudflare Pages** — drag the folder onto the dashboard
- **Netlify** — drag and drop, or `netlify deploy`
- **GitHub Pages** — push to a repo, enable Pages

## Customising

- **Names / date / venue** — search `index.html` for `Alfie`, `Lorna`, `15 May 2027`, `Fruin Farm`
- **Story content** — edit the three "Our Story" cards
- **Schedule times** — `<ol class="schedule">` in `index.html`
- **Menu** — three `<fieldset>` blocks inside the RSVP form
- **Email** — replace `hello@alfieandlorna.co.uk` (login footer + site footer)
- **Colours** — CSS custom properties at the top of `styles.css` (`--cream`, `--sage-deep`, `--blush-deep`, `--fox`, etc.)
- **Wildlife illustrations** — inline SVGs in `index.html` (`.wl-fox`, `.wl-bird`, `.wl-squirrel`, `.floral-corner`)

## A quick note on security

These invite codes are **gentle privacy**, not real authentication. Anyone who sees a code (or reads the JS file) can use it. That's fine for a wedding site — it just keeps the page off the public web for casual visitors. Don't put genuinely sensitive info on the page.
