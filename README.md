# One Year of Us

A retro Y2K-style photo timeline celebrating Margarita and Daniel's first year together.

## Features

- **Seasonal Timeline**: Photos organized by Spring, Summer, Autumn, and Winter
- **Date-based Carousels**: Multiple photos from the same day appear in a horizontally scrollable carousel
- **Responsive Design**: Works on desktop and mobile with touch-friendly navigation
- **No External Dependencies**: Fully static site - no CDNs, no API calls
- **Self-hosted Fonts**: JetBrains Mono font bundled locally
- **Y2K Aesthetic**: Pastel rainbow gradient, monospace font, pixel-art avatars

## Quick Start

```bash
./build.sh
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## File Structure

```
├── index.html          # Main page
├── style.css           # Y2K retro styling
├── script.js           # Timeline logic
├── build.sh            # Build script (generates public/)
├── public/             # Static files for deployment
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── fonts/          # JetBrains Mono (self-hosted)
│   ├── svgs/
│   └── photos/
├── fonts/              # JetBrains Mono source fonts
├── svgs/               # Source SVG assets
│   ├── favicon.svg
│   ├── daniel-avatar.svg
│   └── margarita-avatar.svg
├── photos/
│   ├── photos-metadata.json  # Pre-generated dates (auto-generated)
│   ├── build-photos.js       # Metadata generator (Node.js)
│   ├── convert-heic.sh       # HEIC to JPEG converter
│   ├── heic-backup/         # Original HEIC files
│   └── *.jpg, *.png          # Your photos
└── docs/
    ├── PRD.md           # Product requirements
    └── TDD.md           # Technical design
```

## Workflow

### 1. Adding Photos

1. Add your photos (`.jpg`, `.png`, or `.heic`) to the `photos/` folder
2. Run `./build.sh` - it will:
   - Convert any HEIC files to JPEG (preserving EXIF data)
   - Generate `photos-metadata.json` with dates
   - Build static files to `public/`
   - Start the development server

### 2. Previewing Locally

```bash
./build.sh           # Build and serve
./build.sh --build   # Build only (no server)
```

### 3. Deploying

```bash
./build.sh --deploy
```

This will:
1. Build the `public/` directory with all photos and assets
2. Commit with a timestamp
3. Push to the `hostinger` branch using git subtree split

Hostinger can then pull from this branch for deployment.

### Photo Safety

**Important:** The conversion scripts are designed to be safe and will **never delete or overwrite existing photos**:

- HEIC files are converted to JPEG, originals are moved to `photos/heic-backup/`
- Existing `.jpg` and `.png` files are **never deleted**
- If a JPEG with the same name already exists, the HEIC is moved to backup without converting (avoids duplicates)

### Photo Backup

- Original HEIC files are automatically moved to `photos/heic-backup/`
- Always keep backups of your original photos in a separate location (iCloud, Google Photos, Time Machine, etc.)
- The `heic-backup/` folder contains originals in case you need them

## Development

### Scripts

| Script | Description |
|--------|-------------|
| `./build.sh` | Build and start dev server |
| `./build.sh --build` | Build only to `public/` |
| `photos/build-photos.js` | Regenerate photo metadata (requires Node.js) |
| `photos/convert-heic.sh` | Convert HEIC files (can run standalone) |

### Technical Details

- **Date Extraction**: Dates are extracted from EXIF metadata or filename patterns
- **Photo Grouping**: Photos with the same date are grouped into carousels
- **Seasons**: Based on astronomical calendar for 2025-2026
  - Spring: March 20 - June 20, 2025
  - Summer: June 21 - September 22, 2025
  - Autumn: September 23 - December 21, 2025
  - Winter: December 22, 2025 - March 19, 2026

## Deployment

### Quick Deploy

```bash
./build.sh --deploy
```

This will:
1. Build the `public/` directory with all photos and assets
2. Commit with a timestamp
3. Push to the `hostinger` branch using git subtree split

Hostinger can then pull from this branch for deployment.

### Branch Structure

- **`main`**: Source code (website files, fonts, build scripts)
- **`hostinger`**: Production-ready static files for deployment

### Manual Deployment

The `public/` directory contains all static files needed for deployment:

1. **Hostinger**: Push to `hostinger` branch and configure Hostinger to pull from it
2. **GitHub Pages**: Push `public/` contents to a `gh-pages` branch
3. **Netlify/Vercel**: Connect repo and set build output to `public/`

No build step or server required for production.

## Customization

### Avatars

Replace the placeholder SVGs in `svgs/`:
- `daniel-avatar.svg` - Your pixel-art avatar
- `margarita-avatar.svg` - Margarita's pixel-art avatar

### Colors

Edit CSS variables in `style.css`:

```css
:root {
  --bg-pink: #FFB6C1;
  --accent-pink: #FF69B4;
  --accent-red: #FF1493;
  /* ... */
}
```

## License

Made with love for our first year together.
