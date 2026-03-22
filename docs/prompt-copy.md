**You are an expert front-end developer. Your task is to create the "One Year of Us" anniversary website for Margarita and Daniel. Follow this prompt exactly to ensure a successful, high-quality build.**

**Step 1: Prerequisites & Research**
*   First, research and confirm the exact astronomical dates for the four seasons of 2025. Based on reliable sources (like timeanddate.com or the Farmers' Almanac), the correct dates and times (in Eastern Time) are:
    *   **Spring 2025**: March 20, 2025, 5:01 AM
    *   **Summer 2025**: June 20, 2025, 10:42 PM
    *   **Autumn/Fall 2025**: September 22, 2025, 2:19 PM
    *   **Winter 2025-2026**: December 21, 2025, 10:03 AM
*   Confirm that the EXIF metadata standard for date is stored as `DateTimeOriginal`.

**Step 2: The Code Generation Task**
*   Generate a complete, production-ready website using **Vanilla HTML, CSS, and JavaScript** (ES6+).
*   The site must strictly adhere to the "early Y2K / Neocities" aesthetic.
*   **Do not use any external frameworks (like React, Vue) or build tools.**
*   The site should be deployed via GitHub to Hostinger.
*   **The code must handle all logic client-side.**

**Step 3: File Structure**
Your generated code must be a single, cohesive unit with this exact file structure:

```
index.html
style.css
script.js
```

**Step 4: Detailed Requirements for Each File**

*   **`style.css`**
    *   Design a responsive, pastel rainbow background using `linear-gradient`.
    *   Use the font family `font-family: 'JetBrains Mono', monospace;` for all text.
    *   Create styles for `h1`, `h2`, and regular text with high-contrast colors (e.g., black/white).
    *   Add styles for a retro, HTML-style button with a "3D" pressed-down effect using borders and shadows.
    *   Add a CSS class for the timeline header (e.g., `.season-marker`) with distinct styling and spacing.

*   **`script.js`**
    *   **1. Define the Season Configuration**: Create a `const seasonsConfig = [...]` array containing the precise start/end dates/times for Spring, Summer, Autumn, and Winter 2025. Use JavaScript `Date` objects.
    *   **2. Fetch Photos**: Create a function that will attempt to fetch the list of photo filenames from a `photos.json` file. *If* this file doesn't exist, the function should console.log an error and gracefully show a message on the page. *If* it does exist, parse it into an array.
    *   **3. Parse EXIF Data**: For each photo filename, create a `new Image()`, set its `src`, and use the `onload` event to run a custom EXIF-parsing function. *If you need an external library, use `exif-js` by including it via a `<script>` tag in your HTML.* The function should extract `DateTimeOriginal`.
    *   **4. Geolocation**: If the EXIF data contains GPS coordinates, use a simple reverse-geocoding library or API (like `js-reverse-geocode-client` from BigDataCloud, which is free and requires no API key). Create a utility function `getPlaceName(lat, lng)` that returns a string like "New York, NY".
    *   **5. Sort and Categorize**: Create a function `categorizePhotoBySeason(date, photosArray)` that iterates through the photos and sorts them into their corresponding season array (Spring, Summer, Autumn, Winter).
    *   **6. Render the Timeline**: Create a function `renderTimeline(photos)` that builds the DOM. It should:
        *   Loop through each season (Spring, Summer, Autumn, Winter).
        *   For each season, create an `h2` element with the class `.season-marker`.
        *   Append all photos belonging to that season below its header.
        *   For each photo, create a card (`<div>`) containing the image and a caption like: "Date Taken: June 14, 2025 (Central Park, NY)".

*   **`index.html`**
    *   A simple HTML5 structure.
    *   Include `style.css`.
    *   Add a `<header>` with the pixel-art avatars of Daniel and Margarita, and a heart in between.
    *   Add a `<main>` element where the timeline will be injected by JavaScript.

**Step 5: Final Output**
*   **Do not generate documentation files like `PRD.md` or `TDD.md`**. That work is already done.
*   Your output must be a single copy-pasteable block of the three files (`index.html`, `style.css`, `script.js`), each clearly labeled.
*   Ensure the code is robust, handles errors gracefully (e.g., missing EXIF data), and renders a beautiful, nostalgic timeline.

**Start generating the code now.**