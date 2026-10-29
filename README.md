# Emblem Vectorizer

Charge un emblème en PNG, WebP ou JPEG, et renvoie un **SVG vectoriel sans fond**,
téléchargeable. Tout le calcul se fait dans le navigateur : aucune image n'est envoyée
sur un serveur.

L'application web se convertit en logiciel de bureau Linux, Windows et macOS avec
Tauri, sans réécrire une ligne du traitement d'image.

![L'interface, une image vectorisée](docs/images/interface.png)

## Deux conditions pour un bon résultat

1. **Fond parfaitement blanc**, sans ombre portée ni dégradé. Ce qui n'est pas blanc
   est considéré comme faisant partie de l'emblème.
2. **Couleur franche et bien visible.** Un emblème presque blanc est confondu avec le
   fond ; le seuil de détection peut être abaissé, mais le résultat restera incertain.

L'application vérifie ces deux points sur chaque image et le signale clairement quand
ils ne sont pas réunis.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
```

Autres commandes :

| Commande | Rôle |
| --- | --- |
| `npm run build` | Vérifie les types puis produit le site statique dans `dist/` |
| `npm run preview` | Sert le résultat de `build` |
| `npm test` | Types, puis la suite de tests du cœur de traitement |
| `npm run vectorize -- image.png sortie.svg` | Vectorise un PNG en ligne de commande |
| `npm run tauri dev` / `npm run tauri build` | Version bureau (voir `docs/desktop.md`) |
| `npm run tauri icon public/logo.svg` | Régénère toutes les icônes depuis le logo |

## Utiliser

Déposez une ou plusieurs images, puis téléchargez les SVG. Chaque carte montre le
tracé obtenu sur un damier, qui rend le fond manquant visible, et le nombre de tracés,
de points et le poids du fichier.

La couleur est détectée sur l'image ; le sélecteur permet de la remplacer, par exemple
pour décliner un même emblème en plusieurs teintes.

### Réglages

| Réglage | Effet |
| --- | --- |
| Seuil de détection | Ce qui compte comme emblème. À baisser pour une teinte claire, à monter si le papier scanné est grisé. |
| Finesse du tracé | Suréchantillonnage avant le tracé des contours. 3 suffit presque toujours. |
| Lissage | Adoucit l'escalier des pixels. Trop fort, les angles s'arrondissent. |
| Simplification | Arbitre entre le poids du fichier et la fidélité au pixel. |
| Formes ignorées | Surface en dessous de laquelle une tache est tenue pour une poussière. |
| Marge | Espace blanc laissé autour de l'emblème dans le SVG. |

## Comment ça marche

L'image devient un « champ d'encre » (distance au blanc), suréchantillonné et lissé,
puis binarisé. Les contours de ce masque sont suivis sur le réseau des coins de pixels,
simplifiés, et transformés en courbes de Bézier cubiques. Le SVG final contient un seul
tracé rempli, en `fill-rule="evenodd"` : les trous se découpent tout seuls.

Le détail des étapes et des choix est dans [`docs/architecture.md`](docs/architecture.md).

## Fiabilité

La suite de tests vectorise des formes connues (carré, disque, anneau, forme fine),
**re-rasterise le SVG produit** et le compare pixel par pixel à l'image de départ. La
fidélité mesurée est de 0,986 à 0,996 d'intersection sur union. Les diagnostics (fond
non blanc, couleur trop claire, rien à détecter) sont testés eux aussi.

```bash
npm test
```

Pour vérifier la chaîne complète dans un vrai navigateur, y compris le décodage et le
worker, lancez `npm run dev` puis ouvrez `/dev/selftest.html`.

## Identité

Le logo est un seul fichier, `public/logo.svg` : un écusson blanc à oreilles, aux yeux
évidés, posé sur un carré arrondi en dégradé d'orange chaleureux. Il sert à la fois
d'icône d'application, de favicon et de marque dans l'en-tête.

Toute la couleur de l'interface tient dans des variables CSS en haut de
`src/styles/app.css`, en clair comme en sombre. Changer l'orange, c'est changer
`--accent` et les deux teintes du dégradé dans le logo.

| Usage | Clair | Sombre |
| --- | --- | --- |
| Accent (boutons, focus) | `#C2410C` | `#FF8A3D` |
| Fond | `#FAF6F2` | `#171310` |
| Dégradé du logo | `#FFB45E` → `#F97E22` → `#D2400A` | identique |

![Le logo de 256 à 32 pixels](docs/images/logo-tailles.png)

Les icônes de l'application se régénèrent depuis le SVG avec
`npm run tauri icon public/logo.svg`.

## Structure

```
public/logo.svg  la marque, source unique des icônes
src/
  core/          traitement d'image pur, sans DOM, testable dans Node
  platform/      décodage des fichiers, worker, enregistrement web ou bureau
  workers/       le worker de vectorisation et son protocole
  components/    interface React
  hooks/         état de l'application
src-tauri/       coque bureau (Rust) et icônes
.github/         compilation des paquets Linux, Windows et macOS
scripts/         vectorisation en ligne de commande
legacy/          le script Python d'origine, conservé pour mémoire
```

## Licence

Usage interne.
