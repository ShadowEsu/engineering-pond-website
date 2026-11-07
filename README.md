# Engineering Pond Website (https://shadowesu.github.io/engineering-pond-website/)

Static website for the **DVC Pond Research Project** (engineering team). This repo is deployable as a GitHub Pages site (no build step).

## Live site

- **GitHub Pages**: `https://shadowesu.github.io/engineering-pond-website/`

## What's in this repo

The site follows harvey.ai's page structure and layout system (6-column grid, 1728px container, 128px section rhythm; type: Newsreader for headings, Hanken Grotesk for text). Each page is plain HTML that shares the header, footer, `styles.css` and `main.js`:

- `index.html` — home: hero, project facts, research/systems cards, build-log teaser, systems tabs, project statement, build steps, big numbers, repositories and records
- `research.html` — mission and problem framing, at a glance, monitoring and proof of concept (measurement plan, instruments)
- `systems.html` — growth capsule, control electronics, field robotics, workstreams, repositories and tools
- `build.html` — heater-controller build log (5 steps)
- `data.html` — outputs and live data, milestones, roadmap
- `team.html` — roster, team photos, incubator planning notes
- `gallery.html` — photo and document gallery with filters and lightbox
- `references.html` — reference library and how to cite the project
- `styles.css` — site styles (palette, type scale and grid tokens at the top of the file)
- `main.js` — site behavior (mobile nav, scroll-to-colour photos, WebGL water ripples over the photo frames, systems tabs, milestones line, gallery filters and lightbox, copy citation)
- `assets/img/` — responsive WebP versions of the photos that the pages load (EXIF/GPS stripped)
- `assets/` — original photos, kept as source files; the pages do not load them

Old links into the single-page version (`index.html#team`, `#gallery`, ...) are forwarded to the page that now holds that section.

### Adding a photo

Convert it to WebP at 2 widths (cwebp drops EXIF, including GPS, with `-metadata none`) and reference both in a `srcset`:

```bash
cwebp -q 70 -m 6 -metadata none -resize 800 0 photo.jpg -o assets/img/photo-800.webp
cwebp -q 70 -m 6 -metadata none -resize 1600 0 photo.jpg -o assets/img/photo-1600.webp
```

iPhone HEIC files: convert with `sips -s format jpeg photo.HEIC --out photo.jpg` first, and rotate with `sips -r 90` if the photo was taken in portrait (cwebp ignores the EXIF orientation tag).

Photos start in black and white (CSS `filter: grayscale(1)`, only when JavaScript runs) and turn to full colour once they scroll into view, then stay in colour (`main.js`, IntersectionObserver; the water-ripple canvases fade their colour in the same way). With reduced motion, or without JavaScript, photos are in colour straight away.

### Rolling back

- `v3-before-round3`: round 2, the single-page monochrome editorial version
- `v2-before-round2`: the first redesign (pond-green, Nov 2026)
- `v1-before-redesign`: the original site

To restore one: `git checkout <tag> -- .` (or just the files you need), commit and push. Round 3 added the separate pages; restoring an older tag leaves them in place unless you delete them.

## Run locally

Because this is a static site, you can open `index.html` directly, but some browsers restrict certain features when opening files from disk.

Recommended: serve the folder with a tiny local web server:

```bash
python3 -m http.server 5173
```

Then open:

- `http://localhost:5173/`

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow that publishes the repository root to **GitHub Pages** on pushes to `main`.

One-time GitHub setting (repo admin):

1. Go to **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**

After that, every push to `main` will deploy automatically.

