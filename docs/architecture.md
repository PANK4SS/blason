# Architecture

## Principe

Le traitement ne dépend jamais du DOM. `src/core/` ne connaît que des tableaux de
pixels : le même code tourne dans le navigateur, dans un Web Worker, dans Node pour les
tests, et dans la webview de l'application de bureau. Aucune version du traitement n'est
dupliquée pour le bureau.

```
fichier → décodage plateforme → RasterImage → worker → core → SVG → enregistrement
```

| Couche | Dossier | Dépendances autorisées |
| --- | --- | --- |
| Traitement | `src/core/` | aucune |
| Plateforme | `src/platform/`, `src/workers/` | navigateur, Tauri |
| Interface | `src/components/`, `src/hooks/` | React, plateforme, types du cœur |

## Les étapes du traitement

`src/core/vectorize.ts` enchaîne sept étapes, chacune dans son module.

### 1. Champ d'encre — `field.ts`

Chaque pixel devient `255 - min(r, g, b)`, multiplié par son alpha : 0 sur du blanc, 255
sur du noir ou une couleur saturée. Un PNG déjà détouré fonctionne donc aussi, ses zones
transparentes comptant comme du fond.

### 2. Suréchantillonnage et flou — `field.ts`

Le champ est agrandi (bilinéaire) puis légèrement flouté. Sans cette étape, les contours
suivent l'escalier des pixels ; avec elle, ils passent entre les pixels.

### 3. Binarisation — `field.ts`

Le contour est placé à mi-chemin entre le seuil de détection et l'intensité réelle de
l'emblème (`inkMagnitude`). Un seuil fixe dilaterait les emblèmes très colorés et
éroderait les emblèmes pâles ; ce point milieu suit le bord perçu dans les deux cas.

### 4. Tracé des contours — `contour.ts`

Chaque pixel d'encre pose une arête orientée sur les côtés qui touchent le fond, dans le
réseau des coins de pixels. Les arêtes se chaînent en boucles fermées. Le graphe étant
équilibré (autant d'arêtes entrantes que sortantes à chaque sommet), une boucle revient
toujours à son point de départ.

Les contours extérieurs tournent dans un sens, les trous dans l'autre : avec
`fill-rule="evenodd"`, les trous se découpent sans traitement supplémentaire. Sur un
sommet où deux formes ne se touchent que par un coin, le virage le plus serré est
privilégié, ce qui les sépare au lieu de les fusionner.

### 5. Lissage et simplification — `polyline.ts`

Lissage gaussien circulaire, puis Ramer-Douglas-Peucker : une ligne droite se réduit à
ses extrémités, une courbe garde ce qu'il lui faut de points. Les segments trop longs
sont redécoupés pour borner l'écart des courbes.

### 6. Courbes de Bézier — `path.ts`

Spline Catmull-Rom **centripète** convertie en cubiques. La version uniforme déborde
quand l'espacement des points est irrégulier, ce qui est systématique après
simplification.

### 7. Document SVG — `path.ts`

Un seul élément `<path>`, rempli, sans fond, sans attribut de style : le fichier se pose
sur n'importe quelle couleur et se redimensionne sans perte.

## Diagnostics

`diagnose.ts` vérifie les conditions annoncées à l'utilisateur : blancheur du liseré de
bordure, couverture d'encre, emblème touchant le bord, couleur trop claire. Un résultat
décevant est ainsi expliqué, au lieu de passer pour un bug.

## Couleur

`color.ts` prend la médiane par canal des pixels franchement encrés. La médiane ignore
l'anti-aliasing délavé, qu'une moyenne ramènerait vers le blanc. Si aucun pixel n'est
franc, parce que l'emblème est pâle, la mesure est reprise au seuil de détection.

## Concurrence

Le worker garde les pixels en mémoire (`Map` par identifiant d'image) : déplacer un
curseur de réglage n'envoie que les nouveaux réglages, jamais l'image. Les pixels sont
transférés, non copiés, au chargement.

Chaque exécution porte un numéro de requête, et l'interface ignore les résultats d'une
exécution qu'un réglage plus récent a remplacée : deux réglages enchaînés ne peuvent pas
afficher l'ancien résultat.

## Tests

`tests/fidelity.test.mjs` est le test qui compte : il vectorise une forme connue,
**re-rasterise le SVG obtenu** avec son propre moteur de remplissage (`evenodd`), et
compare pixel par pixel à l'image de départ. C'est la seule mesure qui prouve que le
tracé épouse réellement la forme, et non qu'il produit un fichier bien formé.

`tests/vectorize.test.mjs` couvre les cas de forme (trous, formes multiples, poussières)
et les diagnostics ; `tests/path.test.mjs` verrouille les tangentes des courbes.
