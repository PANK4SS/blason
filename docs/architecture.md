# Architecture

## Principle

The processing never depends on the DOM. `src/core/` knows nothing but arrays of
pixels: the same code runs in the browser, in a Web Worker, in Node for the tests, and
in the webview of the desktop application. No version of the processing is duplicated
for the desktop.

```
file -> platform decoding -> RasterImage -> worker -> core -> SVG -> saving
```

| Layer | Folder | Allowed dependencies |
| --- | --- | --- |
| Processing | `src/core/` | none |
| Platform | `src/platform/`, `src/workers/` | browser, Tauri |
| Interface | `src/components/`, `src/hooks/` | React, platform, core types |

## The processing steps

`src/core/vectorize.ts` chains seven steps, each one in its own module.

### 1. Ink field (`field.ts`)

Every pixel becomes `255 - min(r, g, b)`, multiplied by its alpha: 0 on white, 255 on
black or on a saturated color. An already cut-out PNG therefore works too, its
transparent areas counting as background.

### 2. Upsampling and blur (`field.ts`)

The field is enlarged (bilinear) then blurred slightly. Without this step the contours
follow the pixel staircase; with it, they pass between the pixels.

### 3. Binarization (`field.ts`)

The contour is placed halfway between the detection threshold and the real intensity of
the emblem (`inkMagnitude`). A fixed threshold would dilate heavily colored emblems and
erode pale ones; this midpoint follows the perceived edge in both cases.

### 4. Contour tracing (`contour.ts`)

Every ink pixel lays a directed edge on the sides that touch the background, within the
lattice of pixel corners. The edges chain into closed loops. Because the graph is
balanced (as many incoming as outgoing edges at every vertex), a loop always comes back
to its starting point.

Outer contours wind one way, holes the other: with `fill-rule="evenodd"`, the holes are
cut out with no extra processing. On a vertex where two shapes meet only at a corner,
the tightest turn wins, which separates them instead of merging them.

### 5. Smoothing and simplification (`polyline.ts`)

Circular Gaussian smoothing, then Ramer-Douglas-Peucker: a straight line collapses to
its endpoints, a curve keeps as many points as it needs. Segments that are too long are
split again to bound how far the curves stray.

### 6. Bezier curves (`path.ts`)

A **centripetal** Catmull-Rom spline converted into cubics. The uniform variant
overshoots when the point spacing is irregular, which it always is after
simplification.

### 7. SVG document (`path.ts`)

A single `<path>` element, filled, with no background and no style attribute: the file
sits on any color and resizes without loss.

## Diagnostics

`diagnose.ts` checks the conditions stated to the user: whiteness of the border band,
ink coverage, emblem touching the edge, color too light. A disappointing result is
explained, instead of looking like a bug.

## Color

`color.ts` takes the per-channel median of the solidly inked pixels. The median ignores
washed-out anti-aliasing, which an average would drag towards white. If no pixel is
solid, because the emblem is pale, the measurement is taken again at the detection
threshold.

## Concurrency

The worker keeps the pixels in memory (a `Map` keyed by image id): moving a settings
slider sends only the new settings, never the image. The pixels are transferred, not
copied, when the image is loaded.

Every run carries a request number, and the interface ignores the results of a run that
a more recent setting has replaced: two settings changed in a row cannot display the
older result.

## Tests

`tests/fidelity.test.mjs` is the test that counts: it vectorizes a known shape,
**re-rasterizes the resulting SVG** with its own fill engine (`evenodd`), and compares
it pixel by pixel to the starting image. It is the only measurement that proves the
path really hugs the shape, rather than merely producing a well-formed file.

`tests/vectorize.test.mjs` covers the shape cases (holes, multiple shapes, specks) and
the diagnostics; `tests/path.test.mjs` locks down the tangents of the curves.
