# ALIBI v0.7.2 — code prêt pour de vraies petites images

## Ce que cette version change

Le moteur des indices est maintenant préparé pour de **vraies images de détail**.

Chaque hotspot du quai peut utiliser :
- `detailMode: "image"` → vraie petite image dédiée;
- ou, si l'image manque, un **fallback automatique** vers un zoom de la scène.

## Détail attendu dans `scene.json`

Chaque indice peut maintenant définir :
- `detailMode`
- `detailImage`
- `fallbackImage`
- `fallbackPosition`

## Fichiers attendus plus tard

Dépose ces images ici :

`assets/images/cases/case-001-chalet/details/`

- `rope-detail.png`
- `footprints-detail.png`
- `fabric-detail.png`
- `firepit-detail.png`

## Important

Ces images ne sont pas incluses ici volontairement.

Tant qu'elles n'existent pas, ALIBI fonctionnera quand même :
- il essaiera d'afficher la vraie image;
- si elle n'existe pas, il reviendra automatiquement au zoom de l'image principale.

## Fichiers modifiés

- `index.html`
- `css/main.css`
- `js/app.js`
- `cases/case-001-chalet/scene.json`

Et un petit fichier d'aide a été ajouté :
- `assets/images/cases/case-001-chalet/details/README-details.txt`
