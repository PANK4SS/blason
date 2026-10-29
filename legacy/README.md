# Script d'origine

`vectorize_emblems.py` est le script qui a lancé ce projet. Il découpait une planche
précise de quatorze emblèmes, à des coordonnées écrites en dur, et écrivait un SVG par
emblème sous des noms eux aussi figés dans le code.

Il est conservé pour mémoire. Il n'est pas utilisé par l'application et n'a pas besoin
de l'être : sa logique a été reprise et corrigée dans `src/core/`.

Ce qui a changé en cours de route :

| Script d'origine | Projet |
| --- | --- |
| Chemins, bandes et noms écrits en dur | N'importe quelle image, déposée par l'utilisateur |
| OpenCV, NumPy, SciPy | Aucune dépendance de traitement |
| Contours OpenCV, un point sur neuf | Suivi des contours sur le réseau des coins de pixels, puis Ramer-Douglas-Peucker |
| Catmull-Rom uniforme | Catmull-Rom centripète, qui ne déborde pas sur un espacement irrégulier |
| Seuil fixe à 70 après flou | Contour placé à mi-chemin entre le seuil et l'intensité réelle de l'emblème |
| Aucune vérification | Tests de fidélité, et diagnostics affichés à l'utilisateur |

Pour vectoriser un lot de fichiers en ligne de commande, c'est désormais :

```bash
npm run vectorize -- image.png sortie.svg --threshold=40
```
