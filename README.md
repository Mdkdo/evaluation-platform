# Plateforme d'Évaluation en Ligne

## Description
Une plateforme complète pour créer et passer des évaluations avec correction automatique.

## Fonctionnalités

### Gestion des utilisateurs
- Comptes professeur et élève
- Gestion des classes et listes d'élèves
- Authentification sécurisée

### Types de questions supportés
1. Question ouverte (correction manuelle possible)
2. QCM simple (un seul choix correct)
3. QCM multiple (plusieurs choix corrects)
4. Tableau de choix (radios)
5. Tableau de choix (cases)
6. Drag & Drop sur images
7. Drag & Drop sur image mappée
8. Drag & Drop sur texte mappé
9. Relier les éléments (flèches/lignes)
10. Réponse courte

### Correction automatique
- Correction instantanée à la soumission
- Notes par question et par élément
- Calcul automatique de la note totale /20

### Paramètres d'évaluation
- Afficher/masquer la note globale
- Afficher/masquer les notes par question
- Afficher/masquer les erreurs et bonnes réponses (couleur rouge/vert)
- Ordre aléatoire des éléments
- Copies alternatives des questions
- Support du texte et des images
- Sections avec titres, textes et images

## Installation

```bash
npm install
cp .env.example .env
npm start
```

## Structure du projet

```
├── server.js
├── database.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── classes.js
│   ├── evaluations.js
│   ├── questions.js
│   └── submissions.js
├── public/
│   ├── index.html
│   ├── auth.html
│   ├── teacher-dashboard.html
│   ├── create-evaluation.html
│   ├── take-evaluation.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── evaluation-builder.js
│       ├── evaluation-taker.js
│       └── utils.js
└── README.md
```
