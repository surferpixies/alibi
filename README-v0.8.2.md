# ALIBI v0.8.2 — cache-buster portraits

Cette version ajoute un cache-buster automatique aux portraits :

`?v=082`

Exemple :
`assets/images/cases/case-001-chalet/characters/mathieu.png?v=082`

Le cache-buster est appliqué :
- aux cartes personnages;
- à l'entête de conversation;
- aux mini-portraits dans les répliques.

Une trace `console.warn` est aussi ajoutée si un portrait ne peut pas être chargé.
