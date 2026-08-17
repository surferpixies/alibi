# Activer la description de repas par photo

La clé Gemini reste dans Supabase. Elle ne doit jamais être ajoutée à `app.js`, à GitHub ou envoyée dans une conversation.

## 1. Créer la clé Gemini

Dans Google AI Studio, crée une clé API Gemini pour ce projet.

## 2. Ajouter le secret dans Supabase

Dans le tableau de bord Supabase du projet, ouvre **Edge Functions > Secrets** et ajoute :

- Nom : `GEMINI_API_KEY`
- Valeur : la clé créée dans Google AI Studio

Avec la CLI, l’équivalent est :

```bash
supabase secrets set GEMINI_API_KEY=VOTRE_CLE
```

## 3. Déployer la fonction

Depuis le dossier qui contient `supabase/` :

```bash
supabase login
supabase link --project-ref VOTRE_REFERENCE_DE_PROJET
supabase functions deploy analyze-meal-photo
```

La vérification JWT est activée : seules les personnes connectées à l’application peuvent appeler la fonction.

## 4. Tester

Connecte-toi à Énergie, ouvre un repas et touche **Photo IA** dans le champ « Ce que tu as mangé ou bu ».

- Si le champ est vide, la suggestion est insérée automatiquement.
- S’il contient déjà du texte, l’application montre la suggestion sans écraser le texte.
- La personne doit toujours vérifier et corriger la description.
- Aucune estimation nutritionnelle n’est demandée à Gemini.
