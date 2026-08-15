# ALIBI v0.4.1 — icônes navigateur / iPhone

Cette version utilise directement le logo officiel déjà présent dans ton repo :

`assets/images/logo/alibi-logo.png`

## Changements

- favicon configuré pour Safari/Chrome;
- `shortcut icon` ajouté;
- `apple-touch-icon` ajouté pour l'écran d'accueil iPhone;
- `manifest.webmanifest` ajouté;
- mode `standalone` préparé pour la PWA;
- couleur de thème ALIBI configurée;
- paramètre `?v=041` ajouté aux URLs des icônes pour aider à contourner le cache.

## Important après le déploiement

Les favicons sont souvent fortement mis en cache.

### Mac / Safari
1. Attendre que GitHub Pages ait redéployé.
2. Fermer l'onglet ALIBI.
3. Ouvrir de nouveau le site.
4. Si l'ancienne lettre reste affichée, vider les données du site / cache Safari ou tester dans une nouvelle fenêtre privée.

### iPhone
1. Supprimer l'ancien raccourci ALIBI de l'écran d'accueil.
2. Ouvrir le site mis à jour dans Safari.
3. Faire Partager → Sur l'écran d'accueil.
4. Ajouter de nouveau ALIBI.

## Pourquoi il n'y a pas de copies 180/192/512 dans ce ZIP

Je ne veux pas recréer ces fichiers à partir d'une ancienne variante du logo.
La v0.4.1 utilise donc ton vrai `alibi-logo.png` comme source unique.
Plus tard, à partir de ce fichier exact, on pourra générer les icônes dédiées 180×180, 192×192 et 512×512.
