# Installers

Ready-to-install packages of Blason, one per system. They are built from the tag of the
matching version, and they are not signed.

| System | File | Size | How to install |
| --- | --- | --- | --- |
| Debian, Ubuntu, Mint | `Blason_0.1.0_amd64.deb` | 1.7 MB | `sudo apt install ./Blason_0.1.0_amd64.deb` |
| Any Linux distribution | `Blason_0.1.0_amd64.AppImage` | 78 MB | `chmod +x` then run it, nothing to install |
| Windows 10 and 11 | `Blason_0.1.0_x64-setup.exe` | 1.4 MB | Run the installer |

macOS is missing on purpose: a `.dmg` can only be built on a Mac, because it needs
Apple's SDK and the `codesign` and `hdiutil` tools. See
[`../docs/desktop.md`](../docs/desktop.md).

## Why the AppImage is so much bigger

The `.deb` declares its dependencies (`libwebkit2gtk-4.1-0`, `libgtk-3-0`) and borrows
them from the system. The AppImage bundles GTK and WebKit so it runs on any
distribution, including one whose WebKit is too old. Prefer the `.deb` on a Debian
family system, the AppImage everywhere else.

## First launch

Nothing is signed, which has one consequence per system:

- **Windows** shows a SmartScreen warning. Choose More info, then Run anyway.
- **macOS**, once built, needs a right-click then Open the first time.
- **Linux** asks for nothing.

Clearing those warnings means buying a certificate, which is a distribution decision
rather than a configuration flaw.

## Rebuilding them

The binaries here are not committed to git: they are build output, and a 78 MB file
has no business in a repository. Published versions are attached to the GitHub
releases; to produce them yourself:

```bash
npm run tauri build -- --bundles deb,appimage   # Linux, on Linux
npm run tauri build -- --bundles nsis           # Windows, on Windows
```

The packages come out in `src-tauri/target/release/bundle/`, from where they are copied
into this folder. The full procedure, including building the Windows package from
Linux, is in [`../docs/desktop.md`](../docs/desktop.md).
