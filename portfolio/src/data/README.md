# Project Images

Put image files under `src/assets` and use the path relative to that folder in JSON:

```json
{
  "thumbnail": "/frontend/liv/product.png",
  "thumbnail2": "/frontend/liv/product2.png"
}
```

The same rule applies to `images[].url` in wireframe, presentation, and other pages.
Paths under `/src/assets/` or `/assets/` are also accepted. Public-folder paths and
external image URLs continue to work. `/` means no image.

No JavaScript imports or manual image registration are needed. JSON edits update
the image mapping during development. Production builds include only images
referenced by JSON. Each project's `id` must be unique.

List cards and main-page previews automatically use cached 480px/960px/1920px WebP images generated from
`pages.project.thumbnail`. Detail pages still use the unchanged originals.
Animated thumbnails use a still preview on cards, while their originals remain
animated on detail pages. Previews are regenerated when the source image changes;
there is no additional JSON field or image registration step.

## Industrial Design

`industrialDesign.json` uses the same `pages` structure as `frontend.json`.
The current projects follow the folders under `src/assets/industrialdesign/industrialdesign`.
Their detail routes are `/project/industrial01` through `/project/industrial13`.
Gallery entries reference the original filenames and are sorted in numeric order.
Local PDF URLs in `images` are automatically converted to cached WebP page
images during development/build. Pages appear in document order with the same
width and spacing as other gallery images, without a PDF toolbar or nested
scrolling. The browser loads only the lazy page images, not the large source PDF.
Original PDFs are unchanged; source edits invalidate the conversion cache.
PDF conversion uses PDF.js only in the build tools, not in the browser bundle.
External PDFs without local previews fall back to a link to the original document.
Video URLs (MP4, WebM, etc.) in `images`
render as players with native play/pause, seek, volume, and fullscreen controls.
Video-only pages fit within one screen, preserving the full video aspect ratio
and keeping the floating navigation clear. Videos do not autoplay and only
preload metadata before playback.

Unconfirmed summaries are empty strings, explanations are empty objects, and
`category` / `teamProject` are `null`. These projects appear under `all` until
their categories and team status are supplied. Set `category` to `product`,
`branding`, `ui`, or `video`, and `teamProject` to `true` or `false` when known.
