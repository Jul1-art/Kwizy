# 🧠 Kwizy — Carte Mentale de l'Architecture (Local-first)

Ce fichier représente la structure actuelle du projet Kwizy, un projet **100% open source** fonctionnant **sans serveur ni base de données** : tout tourne dans le navigateur (mode local-first). Il sert de guide pour la navigation et le développement.

---

## 📂 Arborescence Globale (Fichiers Réels)

```text
Kwizy/
├── 📄 index.html                      ← Portail racine (GitHub Pages, liens vers public/)
├── 📂 public/ (Racine Web - Public Facing)
│   ├── 📄 index.html                  ← Portail d'entrée principal
│   ├── 📄 404.html                    ← Page d'erreur personnalisée
│   ├── 📄 sw.js                       ← Service Worker (PWA & Offline)
│   ├── 📄 manifest.json               ← Manifeste PWA
│   ├── 📂 eleves/                     ← Espace Étudiant
│   │   └── 📄 classroom.html          ← Accès aux quiz (Code/QR)
│   ├── 📂 professeurs/                ← Espace Enseignant
│   │   ├── 📄 login.html              ← Connexion Professeur
│   │   ├── 📄 inscription.html        ← Inscription Professeur
│   │   ├── 📄 professeurs.html        ← Dashboard Gestion Quiz
│   │   ├── 📄 mistral_ai_widget.html  ← Widget IA embarqué
│   │   └── 📂 monitoring/             ← Live Tracking
│   │       └── 📄 dashboard.html      ← Surveillance en temps réel
│   ├── 📂 quiz/                       ← Moteur de Quiz
│   │   └── 📄 quiz.html               ← Interface de passage & Anti-triche
│   ├── 📂 landing/                    ← Présentation
│   │   └── 📄 landing.html            ← Page de présentation du projet
│   ├── 📂 assets/                     ← Ressources statiques
│   │   ├── 📄 kwizy-local-db.js       ← KwizyLocalDB (remplace le backend PHP)
│   │   ├── 📄 kwizy-loader.js         ← Loader d'entrée
│   │   ├── 📄 tailwind.css            ← Styles compilés
│   │   ├── 📄 icon-192.png            ← Icône PWA 192px
│   │   └── 📄 icon-512.png            ← Icône PWA 512px
│   └── 📂 AI/                         ← Scripts Frontend IA
│       ├── 📄 KwizyEngine.js          ← Moteur IA (Mistral, côté client)
│       └── 📄 ai.html                 ← Interface IA standalone
│
└── 📂 desktop/                        ← Application Windows (Electron)
    ├── 📄 main.js                     ← Fenêtre native + online/offline
    ├── 📄 package.json                ← Config Electron & electron-builder
    └── 📂 build/                      ← Icône de l'exécutable
```

> 🗄️ **Historique** : l'ancien backend `api/`, `models/`, `config/` (PHP/MySQL, hébergé Hostinger) a été supprimé — git conserve l'historique.

---

## 🛠️ Flux de Données (Local-first)

1. **Requête Client** : L'utilisateur charge une page dans `public/`.
2. **Interception** : Toute appel d'API passe par `KwizyLocalDB.handleRequest` (`public/assets/kwizy-local-db.js`), qui joue le rôle de l'ancienne API.
3. **Logique & Données** : KwizyLocalDB exploite et met à jour les données persistées dans `localStorage` (professeur/élève).
4. **Réponse** : Une réponse JSON locale (mock `Response`) est renvoyée au frontend — identique au contrat de l'ancienne API PHP.
5. **IA (optionnelle)** : `KwizyEngine.js` appelle directement `https://api.mistral.ai` **du navigateur** avec la clé de l'utilisateur (stockée localement).
6. **Temps réel** : Le monitoring lit/écrit les sessions via KwizyLocalDB (aucune socket externe requise en mode local).

---

## 🖥️ Application Desktop

`desktop/` contient un wrapper **Electron** qui affiche le site Kwizy (GitHub Pages) dans une fenêtre native Windows, sans barre d'adresse. Build :

```bash
cd desktop && npm install && npm run dist
```

Artefacts : `Kwizy.exe` (sans installation) et `Kwizy-Setup.exe` (installeur NSIS), publiés sur [GitHub Releases](https://github.com/Jul1-art/Kwizy/releases).

---
*Dernière mise à jour : Novembre 2026 — Migration local-first 100% open source.*
