# Desktop build (Linux, Windows, macOS)

The web application becomes a desktop app through Tauri. The Rust shell, the
configuration, the permissions and the icons are all in place in `src-tauri/`.

## The rule that governs everything

**A package can only be built on the system it targets.** Tauri relies on each
system's native webview: WebKitGTK on Linux, WebView2 on Windows, WebKit on macOS.
There is no reliable cross-compilation, and a `.dmg` additionally requires Apple's
tools, which only run on macOS.

So the three packages are produced in one of two ways:

| Route | What it gives you | When |
| --- | --- | --- |
| Local build | The package for the system you are on | To test, or if you only have one system to serve |
| GitHub Actions | All three systems at once | To ship |

## Route 1: build here

### Prerequisites

Rust is already installed on this machine (`cargo 1.99`). What is missing is the
WebKitGTK development headers, which need administrator rights:

```bash
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev libssl-dev \
  librsvg2-dev libayatana-appindicator3-dev patchelf build-essential file
```

On **Windows**: Visual Studio Build Tools (the C++ workload) and WebView2, present by
default on Windows 11.
On **macOS**: `xcode-select --install`.

### Build

```bash
npm run tauri dev      # development window, hot reload
npm run tauri build    # package for the current system
```

The packages land in `src-tauri/target/release/bundle/`:

| System | Formats produced | Expected size |
| --- | --- | --- |
| Linux | `.deb` | about 1.7 MB, depends on the system WebKit |
| Linux | `.AppImage` | about 80 MB, bundles GTK and WebKit |
| Windows | `.exe` (NSIS) and `.msi` (WiX) | about 1.4 MB, WebView2 supplied by the system |
| macOS | `.app`, `.dmg` | about 10 MB |

The size gap is normal: the `.deb` declares its dependencies (`libwebkit2gtk-4.1-0`,
`libgtk-3-0`) and borrows them from the system, whereas the AppImage bundles everything
so it runs on any distribution.

To produce only one format: `npm run tauri build -- --bundles deb`.

## Route 2: all three packages through GitHub Actions

`.github/workflows/release.yml` builds on four machines: Ubuntu, Windows, macOS Apple
Silicon and macOS Intel. The tests run before every build.

```bash
git remote add origin git@github.com:<account>/blason.git
git push -u origin main
git tag v0.1.0 && git push origin v0.1.0
```

The tag triggers the build and drops the packages into a GitHub draft release, which
you then review and publish. The workflow can also be started by hand from the Actions
tab (`workflow_dispatch`), which produces the packages as artifacts without publishing
anything.

No secret to configure: `GITHUB_TOKEN` is supplied by GitHub.

## Appendix: building the Windows package from Linux

Tauri calls this route experimental, and it requires swapping in Microsoft's toolchain
by hand. It works, but the resulting package has never been opened on a real Windows
machine: keep it for a trial run, and leave shipping to GitHub Actions.

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin                 # MSVC headers and libraries
sudo apt install clang lld llvm nsis     # clang-cl, lld-link, llvm-rc, makensis

npm run tauri build -- --runner cargo-xwin \
  --target x86_64-pc-windows-msvc --bundles nsis
```

Three tools are indispensable, and the error does not always say so clearly:

| Tool | Role | Error when it is missing |
| --- | --- | --- |
| `clang-cl` | Compiles the C of the dependencies for the Windows target | `failed to find tool "clang-cl"` |
| `llvm-rc` | Burns the icon and the version into the `.exe` | `NotAttempted("llvm-rc")` |
| `makensis` | Builds the installer | `Failed to bundle app with makensis` |

macOS, on the other hand, cannot be built from Linux: the `.dmg` demands Apple's SDK
and the `codesign` and `hdiutil` tools, which exist only on macOS. That means GitHub
Actions, or an Apple machine.

## Signing

The packages are not signed. As things stand:

- **Windows** shows a SmartScreen warning on first launch. Clearing it requires a code
  signing certificate (roughly 200 to 400 EUR per year).
- **macOS** refuses to open the application unless you right-click and choose Open.
  Clearing that requires an Apple Developer account (99 EUR per year), then signing and
  notarization, which `tauri-action` knows how to do through repository secrets.
- **Linux** asks for nothing.

This is a decision to make at distribution time, not a configuration flaw.

## The window

The app does one thing in a few seconds: the window opens centered, at 620 by 620, with
no maximize button, and does not go below 400 by 460. Under 680 pixels wide the layout
tightens up and the reminder of the requirements disappears as soon as an image is
loaded, so that the preview, the numbers and the download button fit together without
scrolling.

These values live in `src-tauri/tauri.conf.json`, section `app.windows`. To keep the
window above the others, add `"alwaysOnTop": true` there.

## What the shell does, and does not do

Vectorization runs in the webview, with exactly the same TypeScript code as the web
version. Rust is there for two things only:

- opening the window;
- saving the file, because a webview does not download the way a browser does.

`src/platform/save.ts` picks the right route on its own: a download link on the web, a
native dialog under Tauri. The Tauri modules are only loaded on demand, so the web
bundle carries nothing it does not need.

## Permissions

`src-tauri/capabilities/default.json` grants the bare minimum: open a save dialog, and
write a text file inside the user's personal folders. No network access is requested,
and the content security policy (`tauri.conf.json`) forbids any external source.

## Icons

Every icon derives from a single file, `public/logo.svg`. After a retouch:

```bash
npm run tauri icon public/logo.svg
```

The command regenerates `src-tauri/icons/`: the Linux PNGs, the Windows `.ico`, the
macOS `.icns` and the Microsoft Store tiles. The `android/` and `ios/` folders it
creates along the way are of no use here and can be deleted.
