# ALIBI v0.8 — personnages vivants

Cette version recentre le prototype sur les personnages et les interactions.

## Nouveautés

- portraits distincts pour les 10 personnages du dossier;
- portraits stockés comme assets SVG légers;
- portrait affiché sur chaque fiche personnage;
- portrait affiché dans chaque conversation;
- mini-portrait affiché à chaque réplique du personnage;
- première interface de conversation en panneau/modal;
- deux sujets de conversation pour Mathieu, Camille, David et Alex;
- données de dialogue déplacées dans `dialogue.json`;
- Maxime et Julie sont ajoutés au dossier comme invités du vendredi soir;
- les enfants et les personnes absentes ne sont pas encore interrogables;
- retour à une observation du quai simple : plus de faux gros plans dédiés.

## Nouveaux assets

`assets/images/cases/case-001-chalet/characters/`

- elodie.svg
- mathieu.svg
- camille.svg
- david.svg
- alex.svg
- lea.svg
- thomas.svg
- nathan.svg
- maxime.svg
- julie.svg

## Nouveau fichier de données

`cases/case-001-chalet/dialogue.json`

Le système est générique : une interaction utilise l'ID du personnage puis récupère automatiquement :
- son nom;
- son rôle;
- son portrait;
- ses lignes de dialogue;
- ses sujets de conversation.

Cela permettra de réutiliser le même composant pour les interrogatoires, confrontations et autres interactions plus tard.
