# Engineering Pond Website (https://shadowesu.github.io/engineering-pond-website/)

Static website for the **DVC Pond Research Project** (engineering team). This repo is deployable as a GitHub Pages site (no build step).

## Live site

- **GitHub Pages**: `https://shadowesu.github.io/engineering-pond-website/`

## What's in this repo

- `index.html` — main page (research narrative: question, methods, systems, heater-controller build log, data, milestones, roadmap, team, gallery, references, citation)
- `styles.css` — site styles (monochrome palette and type tokens at the top of the file)
- `main.js` — site behavior (nav, WebGL water ripples over the black-and-white photo sections, milestones line, gallery filters and lightbox, copy citation)
- `assets/img/` — responsive WebP versions of the photos that the page loads (2 widths each; EXIF/GPS stripped)
- `assets/` — original photos, kept as source files; the page does not load them

### Adding a photo

Convert it to WebP at 2 widths (cwebp drops EXIF, including GPS, with `-metadata none`) and reference both in a `srcset`:

```bash
cwebp -q 70 -m 6 -metadata none -resize 800 0 photo.jpg -o assets/img/photo-800.webp
cwebp -q 70 -m 6 -metadata none -resize 1600 0 photo.jpg -o assets/img/photo-1600.webp
```

iPhone HEIC files: convert with `sips -s format jpeg photo.HEIC --out photo.jpg` first, and rotate with `sips -r 90` if the photo was taken in portrait (cwebp ignores the EXIF orientation tag).

Photos are shown in black and white by CSS (`filter: grayscale(1)`); the full-size view in the gallery shows the original colour.

### Rolling back

- `v2-before-round2`: the first redesign (pond-green, Nov 2026)
- `v1-before-redesign`: the original site

To restore one: `git checkout <tag> -- index.html styles.css main.js`, commit and push.

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

