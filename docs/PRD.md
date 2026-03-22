**Document Version:** 3.0  
**Last Updated:** 2026-03-21  
**Project Name:** `2025-marga-and.danialrami.com` (A One-Year Anniversary Timeline)

---

### Changelog
- **v3.0**: Added EXIF parsing implementation details, clarified scope boundaries for reverse geocoding
- **v2.0**: Previous version with initial requirements

#### **1. Project Overview**
This document outlines the requirements for a static, single-page website celebrating a one-year anniversary with Margarita. The site features an auto-generated timeline of photos, styled in a retro, early-Y2K aesthetic.

#### **2. Core Functional Requirements**

**2.1. Photo Timeline Generation**
*   The website must dynamically generate a chronologically ordered list of photos from the `/photos` subdirectory.
*   **Sorting Logic**: Photos must be sorted first by their *season*, and then chronologically within each season. The website will follow the astronomical calendar for the year 2025:
    *   **Spring**: March 20, 2025 - June 20, 2025
    *   **Summer**: June 21, 2025 - September 22, 2025
    *   **Autumn (Fall)**: September 23, 2025 - December 21, 2025
    *   **Winter**: December 22, 2025 - March 19, 2026
*   If a photo's date falls outside this range (e.g., if it was taken in early 2026), the code must gracefully handle it without breaking.

**2.2. Metadata Parsing & Display**
*   The site must extract EXIF data from each photo, specifically:
    *   `DateTimeOriginal`: To determine the season and sort order.
    *   **Implementation**: Uses a custom vanilla JavaScript EXIF parser (no external libraries/CDNs required). The parser reads JPEG binary data directly using `FileReader`, `ArrayBuffer`, and `DataView` APIs.
*   The date must be displayed in a human-readable format (e.g., "June 14, 2023").
*   If a photo is missing its EXIF date, it must be handled by being placed at the bottom of the timeline or in a dedicated "Unknown Date" section, without crashing the page.

**2.2.1. Reverse Geocoding (OUT OF SCOPE)**
*   GPS coordinates (`GPSLatitude`, `GPSLongitude`) parsing is implemented but location name display is disabled.
*   **Rationale**: To keep the website maximally self-reliant with no external API dependencies.
*   **Future Enhancement**: If desired, implement reverse geocoding using:
    *   BigDataCloud's free reverse geocoding API (no API key required)
    *   An offline reverse geocoding library
    *   Raw coordinates display as fallback

**2.3. Seasonal Markers**
*   As the user scrolls down, distinct HTML headers will appear to denote the beginning of a new season (e.g., "Spring 2025"). These headers must be clearly styled and visually distinct from the photo entries.

#### **3. Non-Functional Requirements**

**3.1. Aesthetic & UX**
*   The design must be strictly adherent to an early-Y2K / Neocities aesthetic.
    *   **Colors**: A pastel rainbow gradient background (`linear-gradient(to bottom, #f8b7c9, #fce2d5, ...)`).
    *   **Typography**: `font-family: 'JetBrains Mono', monospace;` (self-hosted via local woff2 files).
    *   **Components**: "3D" style HTML-style buttons and pixel-art SVG icons (Daniel & Margarita).

**3.2. Technical Constraints**
*   The entire site must be built using **Vanilla HTML, CSS, and JavaScript**.
*   No external frameworks (like React or Vue) are permitted.
*   All assets (photos, SVGs, CSS, JS) will be hosted within the same repository and served by Hostinger.

**3.3. Scalability & Maintainability**
*   The code must be modular and scalable, capable of handling anywhere from ~10 to 200+ photos.
*   It must be deployed via a GitHub repository, so any secrets or configuration should be kept outside of the `docs` folder and handled via a `.env.local.example` file.