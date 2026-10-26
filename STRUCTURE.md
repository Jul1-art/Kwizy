# 🧠 Kwizy — Carte Mentale de l'Architecture (V2 Modular)

Ce fichier représente la structure actuelle du projet Kwizy. Il sert de guide pour la navigation et le développement.

---

## 📂 Arborescence Globale (Fichiers Réels)

```text
根 (Root)
├── 📂 public/ (Racine Web - Public Facing)
│   ├── 📄 index.html              ← Portail d'entrée principal
│   ├── 📄 404.html                ← Page d'erreur personnalisée
│   ├── 📄 sw.js                   ← Service Worker (PWA & Offline)
│   ├── 📄 manifest.json           ← Manifeste PWA
│   ├── 📂 eleves/                 ← Espace Étudiant
│   │   └── 📄 classroom.html      ← Accès aux quiz (Code/QR)
│   ├── 📂 professeurs/            ← Espace Enseignant
│   │   ├── 📄 login.html          ← Connexion Professeur
│   │   ├── 📄 inscription.html    ← Inscription Professeur
│   │   ├── 📄 professeurs.html    ← Dashboard Gestion Quiz
│   │   └── 📂 monitoring/         ← Live Tracking
│   │       └── 📄 dashboard.html  ← Surveillance en temps réel
│   ├── 📂 quiz/                   ← Moteur de Quiz
│   │   └── 📄 quiz.html           ← Interface de passage & Anti-triche
│   ├── 📂 landing/                ← Présentation
│   │   └── 📄 landing.html        ← Page de présentation du projet
│   ├── 📂 assets/                 ← Ressources statiques
│   │   ├── 📄 tailwind.css        ← Styles compilés
│   │   ├── 📄 tailwind.src.css    ← Source Tailwind
│   │   ├── 📄 icon-192.png        ← Icône PWA 192px
│   │   └── 📄 icon-512.png        ← Icône PWA 512px
│   └── 📂 AI/                     ← Scripts Frontend IA
│       ├── 📄 KwizyEngine.js    ← Moteur de traitement IA
│       └── 📄 ai.html             ← Interface IA standalone
│
├── 📂 api/ (Backend API v1)
│   ├── 📄 .htaccess               ← Routage & Sécurité API
│   ├── 📄 router.php              ← Point d'entrée central (Routeur)
│   └── 📂 v1/                     ← Contrôleurs (Logique métier)
│       ├── 📄 auth.php            ← Login/Register
│       ├── 📄 quiz.php            ← CRUD Quiz & Accès
│       ├── 📄 lookup.php          ← Recherche de quiz pour élèves
│       ├── 📄 session.php         ← Gestion des sessions élèves
│       ├── 📄 results.php         ← Consultation des résultats (Prof)
│       ├── 📄 monitoring.php      ← Live feed & Déverrouillage
│       └── 📄 ai.php              ← Proxy Mistral AI
│
├── 📂 models/ (Abstraction de Données)
│   ├── 📄 User.php                ← Modèle Enseignant
│   ├── 📄 Quiz.php                ← Modèle Questionnaire
│   ├── 📄 Session.php             ← Modèle Session élève
│   └── 📄 Result.php              ← Modèle Résultats/Copies
│
├── 📂 config/ (Paramètres Sensibles)
│   ├── 📄 .htaccess               ← BLOQUE TOUT ACCÈS WEB
│   ├── 📄 db.php                  ← Connexion MySQL PDO
│   ├── 📄 env.php                 ← Variables d'environnement
│   └── 📄 logger.php              ← Système de logs centralisé
│
├── 📂 logs/ (Journaux Système)
│   ├── 📄 errors.log              ← Erreurs PHP/Serveur
│   ├── 📄 cheating.log            ← Détections anti-triche
│   ├── 📄 access.log              ← Tracking HTTP
│   └── 📄 ai.log                  ← Historique appels Mistral
│
├── 📄 .htaccess                   ← Configuration serveur racine (Redirection /public/)
├── 📄 tailwind.config.js          ← Config Tailwind CSS
├── 📄 package.json                ← Dépendances Node.js
├── 📄 migration_v2.sql            ← Script de mise à jour DB
├── 📄 schema.sql                  ← Structure initiale de la DB
└── 📄 KWIZY_BLUEPRINT.md        ← Spécifications du projet
```

---

## 🛠️ Flux de Données

1.  **Requête Client** : L'utilisateur charge une page dans `public/`.
2.  **Appel API** : Le JavaScript `fetch` vers `api/router.php`.
3.  **Routage** : Le routeur délègue au contrôleur `api/v1/*.php`.
4.  **Logique & Données** : Le contrôleur utilise un `models/*.php`.
5.  **Persistance** : Le modèle communique avec la base via `config/db.php`.
6.  **Réponse** : L'API renvoie du JSON au frontend.

---
*Dernière mise à jour : 13 Mai 2026 (Audit complet des fichiers)*
