<div align="center">

<img src="docs/images/logo.png" width="132" alt="Blason">

# Blason

<p><strong>An emblem on a white background, out as a cut-out SVG, ready to use.</strong></p>
<p>Everything is computed on your own machine. No image is ever sent to a server.</p>

<p>
<img alt="React 18" src="https://img.shields.io/badge/React-18-1c1714?style=flat-square&logo=react&logoColor=61DAFB&labelColor=1c1714">
<img alt="TypeScript 5.6" src="https://img.shields.io/badge/TypeScript-5.6-1c1714?style=flat-square&logo=typescript&logoColor=3178C6&labelColor=1c1714">
<img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-1c1714?style=flat-square&logo=vite&logoColor=FFC24B&labelColor=1c1714">
<img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-1c1714?style=flat-square&logo=tauri&logoColor=FFC131&labelColor=1c1714">
<img alt="Rust 1.77" src="https://img.shields.io/badge/Rust-1.77-1c1714?style=flat-square&logo=rust&logoColor=FFFFFF&labelColor=1c1714">
</p>

<p>
<img alt="Linux, Windows, macOS" src="https://img.shields.io/badge/Linux%20%C2%B7%20Windows%20%C2%B7%20macOS-C2410C?style=flat-square">
<img alt="18 tests" src="https://img.shields.io/badge/tests-18%20green-C2410C?style=flat-square">
<img alt="Fidelity 0.986 to 0.996" src="https://img.shields.io/badge/fidelity-0.986%20to%200.996-C2410C?style=flat-square">
<img alt="Dependency-free processing" src="https://img.shields.io/badge/processing-dependency--free-C2410C?style=flat-square">
<img alt="MIT license" src="https://img.shields.io/badge/license-MIT-C2410C?style=flat-square">
</p>

<img src="docs/images/interface.png" width="820" alt="The interface, with an image vectorized">

</div>

## The project

A logo that was scanned, exported from a sheet or saved as a PNG stays a raster image:
it smears as soon as you enlarge it, and its white background shows on any surface that
is not white. Redrawing it by hand in a vector editor takes an hour per emblem.

Blason does that conversion automatically. You drop in PNG, WebP or JPEG files, and out
come SVGs that hold nothing but a filled path, with no background: they sit on any
color, print at any size and weigh a few kilobytes.

The project grew out of a throwaway Python script that cut up a sheet of fourteen
emblems at coordinates written straight into the code. The idea is all that is left of
it; the processing has been rewritten, corrected and measured. The original script is
kept in [`legacy/`](legacy/README.md).

## Three conditions for a good result

> [!IMPORTANT]
> The image you drop in must carry **one single color, even across the whole emblem**.
> Blason outputs a path filled with one color: it cannot cut out a photo, a gradient, a
> logo in several shades or a detailed illustration. A monochrome emblem on a white
> background gives a crisp SVG; a complex image gives a solid silhouette, stripped of
> its shading.

1. **One single, even color.** Everything inked becomes the same flat fill. Internal
   shading, gradients and second colors are lost.
2. **A perfectly white background**, with no drop shadow and no gradient. Anything that
   is not white is treated as part of the emblem.
3. **A solid, clearly visible color.** An almost white emblem is confused with the
   background; the detection threshold can be lowered, but the result will stay
   uncertain.

The software checks these points on every image and says so plainly when they are not
met, rather than handing back a disappointing file with no explanation.

## The technologies, and why

| Piece | Choice | Reason |
| --- | --- | --- |
| Image processing | TypeScript, **no library** | The pipeline is written by hand, with no OpenCV and no WASM to ship. It never touches the DOM, so the same code runs in the browser, in a worker, in Node under test and in the webview of the desktop app. |
| Computation | **Web Worker** | A large image must not freeze the interface. The worker keeps the pixels: moving a slider sends only the settings. |
| Interface | **React 18** and **Vite 5** | Little state, plenty of rendering: React is enough. Vite starts instantly and produces a 51 KB compressed bundle. |
| Types | **TypeScript 5.6**, strict mode | Pixel arrays and coordinate systems are exactly where you get an off-by-one. |
| Desktop | **Tauri 2** and **Rust 1.77** | The system webview instead of a bundled Chromium: a 1.7 MB Linux package, where an Electron equivalent runs into hundreds of megabytes. Rust only opens the window and saves the file. |
| Tests | `node:test`, no dependency | The tests check geometry, not components: they need no browser at all. |

## Download

Ready-to-install packages are in [`installers/`](installers/README.md):

| System | File | Size |
| --- | --- | --- |
| Linux (Debian, Ubuntu) | `Blason_0.1.0_amd64.deb` | 1.7 MB |
| Linux (any distribution) | `Blason_0.1.0_amd64.AppImage` | 78 MB |
| Windows 10 and 11 | `Blason_0.1.0_x64-setup.exe` | 1.4 MB |

macOS has to be built on a Mac, see [`docs/desktop.md`](docs/desktop.md). The packages
are not signed, so Windows shows a SmartScreen warning on first launch.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

| Command | Role |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Checks the types, then produces the static site in `dist/` |
| `npm run preview` | Serves the result of `build` |
| `npm test` | Types, then the test suite of the processing core |
| `npm run vectorize -- image.png output.svg` | Vectorizes one file from the command line |
| `npm run tauri dev` / `npm run tauri build` | Desktop build, see [`docs/desktop.md`](docs/desktop.md) |
| `npm run tauri icon public/logo.svg` | Regenerates every icon from the logo |

## Using it

Drop in one or more images, then download the SVGs. Each card shows the resulting path
on a checkerboard, which makes the missing background visible, and gives the number of
paths, the number of points and the file size.

The color is detected from the image. The picker lets you replace it, for instance to
issue the same emblem in several shades.

### Settings

| Setting | Effect |
| --- | --- |
| Detection threshold | What counts as the emblem. Lower it for a light shade, raise it if the scanned paper is greyish. |
| Contour precision | Upsampling applied before the contours are traced. 3 is almost always enough. |
| Smoothing | Softens the pixel staircase. Too much, and the corners round off. |
| Simplification | Trades file size against fidelity to the pixels. |
| Ignored shapes | Area below which a speck is treated as dust. |
| Padding | White space left around the emblem inside the SVG. |

## How it works

The image becomes an ink field, that is, the distance from white of every pixel. That
field is upsampled, smoothed, then binarized halfway between the detection threshold
and the real intensity of the emblem, which places the contour on the perceived edge
instead of dilating it. The contours of that mask are followed on the lattice of pixel
corners, simplified by Ramer-Douglas-Peucker, then turned into cubic Bezier curves by a
centripetal Catmull-Rom spline. The final SVG holds a single path in
`fill-rule="evenodd"`: the holes cut themselves out.

The detail of the seven steps and of the choices behind them is in
[`docs/architecture.md`](docs/architecture.md).

## Reliability

The test suite vectorizes known shapes (square, disc, ring, thin shape),
**re-rasterizes the resulting SVG** with its own fill engine and compares it pixel by
pixel to the starting image. The measured fidelity ranges from 0.986 to 0.996
intersection over union. A well-formed file that did not follow the shape would pass
every other test and fail that one.

```bash
npm test
```

To check the full chain in a real browser, decoding and worker included, run
`npm run dev` then open `/dev/selftest.html`.

## Desktop build

The app installs on Linux, Windows and macOS. A package can only be built on the system
it targets, hence the GitHub Actions workflow that builds on four machines.

| System | Formats | Size |
| --- | --- | --- |
| Linux | `.deb`, `.AppImage` | 1.7 MB and 78 MB |
| Windows | `.exe` (NSIS), `.msi` | 1.4 MB |
| macOS | `.app`, `.dmg` | about 10 MB |

The window opens centered, small and square: 620 by 620, resizable, with nothing to
scroll to reach the download button.

<img src="docs/images/desktop-window.png" width="420" alt="The window of the desktop app">

Prerequisites, local build, cross-compilation and signing:
[`docs/desktop.md`](docs/desktop.md).

## Structure

```
public/logo.svg   the mark, single source of every icon
src/
  core/           pure image processing, no DOM, testable in Node
  platform/       file decoding, worker, web or desktop saving
  workers/        the vectorization worker and its protocol
  components/     React interface
  hooks/          application state
  styles/         the color variables and the layout
src-tauri/        Rust desktop shell, and the icons
tests/            geometry, fidelity, curve tangents
scripts/          command line vectorization
dev/              browser self-test
docs/             architecture, identity and desktop guide
installers/       the packages to download, one per system
legacy/           the original Python script, kept for the record
.github/          builds the Linux, Windows and macOS packages
```

## License

[MIT](LICENSE), copyright 2026 PANK4SS.

You may use it, modify it, redistribute it, sell it and fork it, for any purpose at
all. The only obligation is to keep the copyright notice and the license text in the
copies, so that the original source stays credited.
