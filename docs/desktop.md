# Version bureau (Linux, Windows, macOS)

L'application web devient un logiciel de bureau avec Tauri. La coque Rust, la
configuration, les permissions et les icônes sont en place dans `src-tauri/`.

## La règle qui commande tout

**Un paquet ne se fabrique que sur le système qu'il vise.** Tauri s'appuie sur la
webview native de chaque système : WebKitGTK sous Linux, WebView2 sous Windows, WebKit
sous macOS. Il n'existe pas de compilation croisée fiable, et un `.dmg` exige en plus
les outils Apple, qui ne tournent que sur macOS.

Les trois paquets se produisent donc de deux façons :

| Voie | Ce qu'elle donne | Quand |
| --- | --- | --- |
| Compilation locale | Le paquet du système sur lequel vous êtes | Pour tester, ou si vous n'avez qu'un système à servir |
| GitHub Actions | Les trois systèmes d'un coup | Pour livrer |

## Voie 1 : compiler ici

### Prérequis

Rust est déjà installé sur cette machine (`cargo 1.99`). Il manque les en-têtes de
développement de WebKitGTK, qui demandent les droits administrateur :

```bash
sudo apt install libwebkit2gtk-4.1-dev libxdo-dev libssl-dev \
  librsvg2-dev libayatana-appindicator3-dev patchelf build-essential file
```

Sous **Windows** : Visual Studio Build Tools (charge de travail C++) et WebView2,
présent par défaut sur Windows 11.
Sous **macOS** : `xcode-select --install`.

### Compiler

```bash
npm run tauri dev      # fenêtre de développement, rechargement à chaud
npm run tauri build    # paquet pour le système courant
```

Les paquets sortent dans `src-tauri/target/release/bundle/` :

| Système | Formats produits | Taille attendue |
| --- | --- | --- |
| Linux | `.deb` | environ 1,6 Mo, dépend du WebKit du système |
| Linux | `.AppImage` | environ 80 Mo, embarque GTK et WebKit |
| Windows | `.exe` (NSIS) et `.msi` (WiX) | environ 3 Mo, WebView2 fourni par le système |
| macOS | `.app`, `.dmg` | environ 10 Mo |

L'écart de taille est normal : le `.deb` déclare ses dépendances
(`libwebkit2gtk-4.1-0`, `libgtk-3-0`) et les emprunte au système, là où l'AppImage
embarque tout pour tourner sur n'importe quelle distribution.

Pour ne produire qu'un format : `npm run tauri build -- --bundles deb`.

## Voie 2 : les trois paquets par GitHub Actions

`.github/workflows/release.yml` compile sur quatre machines : Ubuntu, Windows, macOS
Apple Silicon et macOS Intel. Les tests tournent avant chaque compilation.

```bash
git remote add origin git@github.com:<compte>/emblem-vectorizer.git
git push -u origin main
git tag v0.1.0 && git push origin v0.1.0
```

Le tag déclenche la compilation et dépose les paquets dans un brouillon de publication
GitHub, qu'il reste à relire puis à publier. Le workflow se lance aussi à la main
depuis l'onglet Actions (`workflow_dispatch`), ce qui produit les paquets comme
artefacts sans rien publier.

Aucun secret à configurer : `GITHUB_TOKEN` est fourni par GitHub.

## Annexe : compiler le Windows depuis Linux

Tauri qualifie cette voie d'expérimentale, et elle demande de remplacer à la main la
chaîne d'outils Microsoft. Elle fonctionne, mais le paquet obtenu n'a jamais été ouvert
sur une vraie machine Windows : à réserver à un essai, et à confier à GitHub Actions
pour une livraison.

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin                 # en-têtes et bibliothèques MSVC
sudo apt install clang lld llvm nsis     # clang-cl, lld-link, llvm-rc, makensis

npm run tauri build -- --runner cargo-xwin \
  --target x86_64-pc-windows-msvc --bundles nsis
```

Trois outils sont indispensables, et l'erreur ne le dit pas toujours clairement :

| Outil | Rôle | Erreur quand il manque |
| --- | --- | --- |
| `clang-cl` | Compile le C des dépendances pour la cible Windows | `failed to find tool "clang-cl"` |
| `llvm-rc` | Grave l'icône et la version dans le `.exe` | `NotAttempted("llvm-rc")` |
| `makensis` | Fabrique l'installateur | `Failed to bundle app with makensis` |

macOS, lui, ne se compile pas depuis Linux : le `.dmg` réclame le SDK d'Apple et les
outils `codesign` et `hdiutil`, qui n'existent que sur macOS. C'est GitHub Actions, ou
une machine Apple.

## Signature

Les paquets ne sont pas signés. En l'état :

- **Windows** affiche un avertissement SmartScreen au premier lancement. Le lever
  demande un certificat de signature de code (environ 200 à 400 € par an).
- **macOS** refuse d'ouvrir l'application sans passer par « clic droit puis Ouvrir ».
  La lever demande un compte Apple Developer (99 € par an), puis la signature et la
  notarisation, que `tauri-action` sait faire via des secrets de dépôt.
- **Linux** ne demande rien.

C'est un choix à faire au moment de distribuer, pas un défaut de configuration.

## La fenêtre

Le logiciel fait une chose en quelques secondes : la fenêtre s'ouvre centrée, en 620
par 620, sans bouton d'agrandissement, et ne descend pas sous 400 par 460. En dessous
de 680 pixels de large, la mise en page se resserre et le rappel des deux conditions
s'efface dès qu'une image est chargée, pour que l'aperçu, les chiffres et le bouton de
téléchargement tiennent ensemble sans défilement.

Ces valeurs sont dans `src-tauri/tauri.conf.json`, section `app.windows`. Pour que la
fenêtre reste au-dessus des autres, ajoutez-y `"alwaysOnTop": true`.

## Ce que la coque fait, et ne fait pas

La vectorisation tourne dans la webview, avec exactement le même code TypeScript que la
version web. Rust ne sert qu'à deux choses :

- ouvrir la fenêtre ;
- enregistrer le fichier, parce qu'une webview ne télécharge pas comme un navigateur.

`src/platform/save.ts` choisit seul la bonne voie : lien de téléchargement sur le web,
boîte de dialogue native sous Tauri. Les modules Tauri ne sont chargés qu'à la demande,
donc le paquet web n'embarque rien d'inutile.

## Permissions

`src-tauri/capabilities/default.json` n'accorde que le strict nécessaire : ouvrir une
boîte d'enregistrement, et écrire un fichier texte dans les dossiers personnels de
l'utilisateur. Aucun accès réseau n'est demandé, et la politique de sécurité du contenu
(`tauri.conf.json`) interdit toute source externe.

## Icônes

Toutes les icônes dérivent d'un seul fichier, `public/logo.svg`. Après une retouche :

```bash
npm run tauri icon public/logo.svg
```

La commande régénère `src-tauri/icons/` : les PNG de Linux, le `.ico` de Windows, le
`.icns` de macOS et les tuiles du Microsoft Store. Les dossiers `android/` et `ios/`
qu'elle crée au passage ne servent pas ici et peuvent être supprimés.
