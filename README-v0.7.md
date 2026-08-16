# ALIBI v0.7 — scène du quai raffinée

## Changements

La scène du quai contient maintenant 4 éléments cohérents :

1. **Corde**
   - toujours attachée au poteau;
   - l'autre extrémité pend dans l'eau;
   - indique que le canot a été détaché.

2. **Empreintes boueuses**
   - traces visibles sur le quai;
   - pourront plus tard être comparées à des chaussures.

3. **Morceau de tissu**
   - accroché à une écharde du quai;
   - son origine n'est pas encore connue.

4. **Foyer extérieur**
   - observation seulement pour l'instant;
   - n'est PAS ajouté automatiquement aux preuves;
   - pourra devenir pertinent plus tard pour la chronologie ou un objet brûlé.

Le canot disparu est désormais un **fait initial automatique** de la scène et non un hotspot artificiel.

## Cartes visuelles

Quand on touche un hotspot :
- une petite carte visuelle apparaît;
- elle affiche un zoom de la scène;
- le texte d'observation est plus court;
- les vrais indices sont ajoutés aux preuves;
- une simple observation, comme le feu, n'est pas nécessairement une preuve.

Pour l'instant les cartes utilisent un zoom de `chalet-main.png`.

Le moteur accepte déjà `detailImage` dans `scene.json`.
Quand on aura de vraies petites images dédiées (corde, empreintes, tissu, foyer),
il suffira de remplacer le chemin dans le JSON sans modifier le JavaScript.
