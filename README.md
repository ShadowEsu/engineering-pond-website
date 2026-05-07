# Engineering Pond Website (https://shadowesu.github.io/engineering-pond-website/)

Static website for the **DVC Pond Research Project** (engineering team). This repo is deployable as a GitHub Pages site (no build step).

## Live site

- **GitHub Pages**: `https://shadowesu.github.io/engineering-pond-website/`

## What's in this repo

- `index.html` — main page
- `styles.css` — site styles
- `main.js` — site behavior (nav, reveal animations, lightbox, etc.)
- `assets/` — images and media used on the page

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

