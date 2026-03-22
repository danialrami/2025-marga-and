**Document Version:** 4.0  
**Last Updated:** 2026-03-21

---

### Technical Decisions (v4.0)
1. **EXIF Parsing**: Pre-generated metadata via Node.js `sharp` library. Client-side fallback to filename parsing. No external CDN dependencies.
2. **Photos List**: Auto-generated via `build-photos.js` script. Stored in `photos-metadata.json` with dates pre-computed.
3. **Reverse Geocoding**: OUT OF SCOPE - returns empty string.
4. **Favicon**: Heart SVG in `svgs/favicon.svg`.
5. **Photo Display**: Centered carousel with all photos preloaded. Horizontal scroll + buttons + dots for navigation.
6. **Styling**: Minimal box styling for continuous timeline feel. Semi-transparent photo cards blending with gradient background.

#### **1. File Structure**
The website's file structure is organized as follows:

```
2025-marga-and/
│
├── index.html              # Main entry point
├── style.css               # Main stylesheet for Y2K design
├── script.js               # Core logic for fetching, sorting, and rendering photos
├── build.sh                # Build & development server script
│
├── docs/                   # Project documentation (PRD.md, TDD.md)
│   ├── PRD.md
│   └── TDD.md
│
├── photos/                 # Folder containing all the anniversary photos
│   ├── photos.json         # List of photo filenames
│   ├── photos-metadata.json # Pre-generated metadata with dates
│   ├── build-photos.js    # Metadata generator (Node.js)
│   ├── convert-heic.sh    # HEIC to JPEG converter
│   ├── package.json       # Node dependencies (sharp, exif-reader)
│   ├── heic-backup/       # Original HEIC files (backup)
│   └── *.jpg, *.png       # Your photos
│
└── svgs/                   # Folder containing pixel-art SVG assets
    ├── favicon.svg         # Heart-shaped site favicon
    ├── daniel-avatar.svg   # Pixel art avatar for Daniel
    └── margarita-avatar.svg # Pixel art avatar for Margarita
```

#### **2. Component & Module Design**

**2.1. `script.js` - Core Application Logic**
*   **`seasonsConfig`**: A constant defining the start/end dates for Spring, Summer, Autumn, and Winter 2025.
*   **`fetchPhotos()`**: An asynchronous function that fetches the `photos/photos.json` file. This file should contain an object with a `photos` array listing all photo filenames. If `photos.json` doesn't exist, it displays a user-friendly error message on the page.
*   **`parseEXIFData(imageUrl)`**: A function that extracts EXIF metadata using vanilla JavaScript (custom `ExifParser` class). Reads JPEG binary data directly via `FileReader` and `DataView`, parsing the EXIF APP1 segment. Returns `{ dateTaken, latitude, longitude }`.
*   **`geocodeLocation(lat, lng)`**: A function that takes latitude and longitude and returns a human-readable location string. **Decision Point**: For this project, we will use an offline map for reverse geocoding or simply display the raw coordinates to avoid external API dependencies. The function will default to returning an empty string if no location can be determined.
*   **`sortPhotosBySeason(photos)`**: The main sorting function. It iterates through the list of parsed photos and places them into one of four arrays (Spring, Summer, Autumn, Winter).
*   **`renderTimeline(sortedPhotos)`**: A function that takes the sorted data and builds the DOM elements for the season headers and photo entries, appending them to the `<main>` element.

**2.2. `style.css` - Styling & Layout**
*   A CSS variable setup for the rainbow palette.
*   Responsive design using media queries to ensure it looks good on mobile devices (`max-width: 768px`).
*   A `phase` class for season headers with distinct styling (bigger font, background color).
*   A `photo-card` class for each photo, containing a style for the caption.

**2.3. `index.html` - The Skeleton**
*   Contains the `<header>` with pixel-art avatars and a title.
*   Contains the `<main>` element, which is where JavaScript will inject the timeline.

#### **3. Data Flow**
1.  **Input**: User visits `2025-marga-and.danialrami.com`.
2.  **Load**: `index.html` loads, then `<script src="script.js">`.
3.  **Fetch**: `fetchPhotos()` retrieves the list of filenames from a predefined list or `photos.json`.
4.  **Process**: For each photo:
    *   The image is loaded into memory.
    *   `parseEXIFData()` extracts its date and location.
    *   `geocodeLocation()` converts coordinates to text (if available).
5.  **Sort**: The processed data is sorted into its correct seasonal array.
6.  **Render**: `renderTimeline()` builds the HTML for the season headers and photo cards.
7.  **Display**: The user sees their beautiful, organized timeline.