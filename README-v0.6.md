# ALIBI v0.6 — première scène interactive

## Ce que cette version ajoute

- premières données d'Affaire 001 déplacées dans des fichiers JSON;
- scène du quai interactive;
- 5 zones à examiner;
- observations qui s'ouvrent sans quitter la scène;
- preuves ajoutées automatiquement au dossier;
- chronologie mise à jour selon les découvertes;
- premier objectif d'enquête;
- bouton « Parler aux autres » après quelques observations;
- premières fiches des adultes présents au chalet;
- progression de la scène conservée dans `localStorage`.

## Nouveaux fichiers

`cases/case-001-chalet/`
- `case.json`
- `characters.json`
- `evidence.json`
- `timeline.json`
- `events.json`
- `scene.json`

## Image attendue dans ton repo

La scène utilise :

`assets/images/cases/case-001-chalet/chalet-main.png`

Le ZIP ne remplace pas cette image : il utilise celle déjà présente dans ton repo.

## Important

Cette version charge les JSON avec `fetch()`. Elle doit donc être testée via GitHub Pages
(ou un petit serveur local) et non simplement en ouvrant `index.html` en `file://`.

## Pour la suite

Le prochain morceau naturel sera :
1. vraie interaction avec les personnages;
2. premier objectif « Où est Élodie ? »;
3. premiers témoignages enregistrés comme déclarations;
4. recherche du canot;
5. découverte du téléphone d'Élodie.
