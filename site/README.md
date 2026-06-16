# TheEEAffair — wedding website

Static site: no build step, no server code. Open `index.html` via any
static host (Vercel, Netlify, GitHub Pages) or locally with
`npx serve site`.

```
site/
  index.html        all twelve sections + travel & stay
  css/styles.css    champagne gold & chocolate design system
  js/main.js        behaviour + CONFIG block (see below)
  js/airports.js    ~90 international airports for the nearest-airport finder
  images/           web-sized engagement photos (gallery + story)
  videos/           TheEEAffairIntro.mp4 — the gold-thread intro
```

## Go-live checklist — `js/main.js` CONFIG block

| Key | What it does | Status |
|---|---|---|
| `RSVP_ENDPOINT` | POST target for RSVP submissions (Formspree URL or Google Apps Script web app). Until set, RSVPs save to the guest's browser only — wire this up **before sending invitations**. | ☐ |
| `WISHES_ENDPOINT` | Same, for Words & Wishes. Until set, wishes appear on the guest's own device only. | ☐ |
| `AMAZON_WISHLIST_URL` | The registry link. Button shows "coming soon" until set. | ☐ |
| `ALBUM_URL` | Shared album link (Google Photos / Dropbox). A QR code renders automatically once set. | ☐ |

Quickest backend for both forms: create two free Formspree forms and
paste their endpoint URLs. Submissions arrive by email and CSV.

## When pre-shoot photos arrive

1. Convert HEIC → JPG, resize to ~1200px wide.
2. Drop into `images/`.
3. Swap the `<img>` sources in the Gallery section and the Story
   portrait in `index.html`. The two "Coming Soon" placeholder tiles
   are ready to become real photos — replace the placeholder `<div>`
   with a `<figure class="gallery__item">` like its neighbours.
4. Optionally update the intro video end-card too
   (see `../intro/WEBSITE-INTEGRATION.md`).

## Seeded wish

The first message on the wishes wall is a placeholder from "The
Odeogberin Family" (`SEEDED` in `js/main.js`). Replace its text with a
real message from family before launch — coordinate with Temitope.

## Notes

- The intro video plays on **every page load** by default
  (`CONFIG.INTRO_MODE: "always"`; set to `"session"` for once per tab).
  If the tab is backgrounded, the video waits and resumes when the
  guest looks at it — Chrome pauses muted video in background tabs and
  the old logic wrongly treated that as failure. If autoplay is blocked
  entirely (some in-app browsers), a gold "Tap to Begin" button appears;
  a broken file or 10 visible seconds without playback dismisses the
  overlay so no guest is ever stranded.
- Directions buttons (Google Maps / Waze / Apple Maps) use the guest's
  live location automatically — no API keys anywhere on the site.
- The "how far am I" and "nearest airports" features ask for browser
  location permission and degrade gracefully to a manual city picker.
- Venue coordinates in CONFIG are approximate (used only for the
  distance estimate, never for navigation).
