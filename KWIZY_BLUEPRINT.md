# 🛡️ Projet Kwizy : Blueprint Technique & Logique Système v2.0

Ce document définit l'architecture complète d'une application web, une solution de QCM sécurisée conçue pour fonctionner sur un hébergement PHP standard (Hostinger) sans Node.js.

---

## 1. Architecture "Poids Plume" (Contraintes Hostinger)
Puisque nous n'avons pas de WebSockets (Node.js), nous devons simuler le temps réel sans saturer le serveur (limite de processus PHP).

### A. Flux Élève -> Serveur (Le Pulsar)
- **Le Heartbeat (Battement)** : Le navigateur de l'élève envoie un "Ping" (requête AJAX ultra-légère) toutes les **10 secondes**.
- **Contenu du Ping** : `quiz_id`, `student_id`, `status` (active/cheating/finished), `last_question_id`.
- **Réponse du Serveur** : `lock_status` (Boolean). Si `true`, l'interface de l'élève se bloque immédiatement avec un message "Attendez que le professeur vous débloque".

### B. Flux Serveur -> Prof (Monitoring Live)
- **Technologie** : **Server-Sent Events (SSE)** via un fichier `stream_profs.php`.
- **Avantage** : Contrairement au polling, le SSE garde une connexion ouverte. Le serveur ne renvoie des données (JSON) que lorsqu'il y a un changement détecté dans la DB (nouveau tricheur, nouvel élève connecté).
- **Consommation** : Réduit drastiquement l'usage CPU par rapport au rafraîchissement automatique de page.

---

## 2. Logique Anti-Triche "Zéro Limite"

### A. Les 4 Niveaux de Surveillance (Frontend JS)
1.  **Niveau 1 : Fullscreen Enforcement**
    - Au clic sur "Démarrer", on appelle `document.documentElement.requestFullscreen()`.
    - Si l'élève quitte le plein écran (`fullscreenchange` event), on envoie un signal de triche et on affiche un calque noir opaque sur tout le QCM.
2.  **Niveau 2 : Visibility Tracking**
    - `document.visibilityState === 'hidden'` : Déclenche une alerte instantanée.
3.  **Niveau 3 : Window Focus (Le plus sensible)**
    - `window.addEventListener('blur', ...)` : Détecte si l'élève clique hors du navigateur, ouvre un Overlay, ou change d'application sur tablette.
4.  **Niveau 4 : Keyboard Lockdown**
    - Bloquer `Alt`, `Tab`, `F12`, `Ctrl+C`, `Ctrl+V`, `Right Click`.

### B. Le Verrouillage Automatique (Instant-Lock)
Si une triche est détectée (Perte de focus, Changement d'onglet, Sortie de plein écran) :
1.  **Blocage Local Immédiat** : Le JavaScript client affiche INSTANTANÉMENT un overlay noir opaque (`#cheat-overlay`) par-dessus tout le QCM. 
    - *Message affiché* : "⚠️ SESSION VERROUILLÉE - Tentative de sortie détectée. Veuillez vous présenter au professeur."
2.  **Signal Serveur** : Une requête AJAX est envoyée en arrière-plan pour passer `status = 'cheating'` dans la DB.
3.  **Alerte Prof** : Le prof voit l'élève passer en "Rouge" sur son dashboard (via le flux SSE).
4.  **Défaillance Réseau** : Si l'élève déconnecte son WiFi pour tenter de tricher sans envoyer les signaux, le "Pulsar" (Heartbeat) s'arrêtera. Le prof verra l'élève passer en "Gris" (Déconnecté/Suspect) après 15 secondes d'inactivité.
5.  **Déblocage Manuel** : Seule une action du professeur (Bouton "Libérer") repasse le statut à `'active'`, ce qui sera capté par le prochain Ping de l'élève pour masquer l'overlay de blocage.

---

## 3. Sécurité & Multi-Classes
- **Isolation des Sessions** : Chaque quiz génère un `access_code` alphanumérique (ex: `A7B9C`).
- **Signature Navigateur** : À la première connexion, on stocke un `fingerprint` dans le `localStorage` de l'élève. Si quelqu'un d'autre essaie de se connecter avec le même nom sur une autre tablette, il est rejeté.
- **Requêtes PDO** : Utilisation stricte de requêtes préparées pour empêcher les injections SQL.
- **Accès Professeur** : Filtrage de toutes les requêtes par `SESSION['teacher_id']`. Un prof ne pourra JAMAIS voir ou modifier le quiz d'un autre via une modification d'URL (`quiz_id`).

---

## 4. Expérience Utilisateur (Premium Design)
- **Mode PWA (Progressive Web App)** : Le site doit être "Installable" sur Android/iOS. Une fois installé, il s'ouvre sans barre d'adresse, ce qui renforce l'immersion et la sécurité (pas de bouton 'Back' ou 'Home' visible par erreur).
- **Sauvegarde Auto** : Chaque réponse à une question est envoyée au serveur dès le clic. Si la tablette s'éteint, l'élève reprend exactement là où il en était.

---

## 5. Structure de la Base de Données (Optimisée)
- **Table `student_sessions`** :
    - `id` (PK)
    - `student_name` (VARCHAR)
    - `status` (ENUM: active, cheating, locked, finished)
    - `last_ping` (TIMESTAMP - pour détecter les déconnexions)
    - `current_score` (INT)
- **Table `student_pings`** : (Optionnel, pour un historique précis de la triche pour chaque élève).

---
  
## 6. Rétention des Données & Optimisation (Politique 30 Jours)
Pour garantir la performance sur un hébergement mutualisé Hostinger et limiter l'occupation disque :

### A. Le Système de Corbeille (Soft Delete)
- **Logique** : Supprimer un quiz ne l'efface pas de la base de données immédiatement. Il est marqué avec un tag `deleted_at`.
- **Restauration** : Le professeur peut restaurer un quiz depuis l'onglet "Corbeille" pendant **30 jours**.
- **Purge** : Un script CRON (ou un script PHP déclenché à la connexion) vérifie les quiz marqués depuis > 30 jours et exécute un `DELETE` définitif.

### B. Suppression pour Inactivité
- **Critère** : Tout quiz n'ayant pas été ouvert (consultation ou édition) pendant **30 jours consécutifs** est considéré comme obsolète.
- **Action** : Suppression automatique du fichier JSON/PHP correspondant sur le serveur pour libérer de l'espace.

### C. Stockage par Fichier Unique
- **Structure** : Chaque QCM n'est pas seulement une ligne en DB, mais génère un fichier physique `quiz_[ID].json` sur le serveur.
- **Avantage** : Chargement ultra-rapide des questions sans requêtes SQL complexes, facilitant le déploiement sur Hostinger.

---

## 7. Génération de QR Code & Affichage Live
Pour permettre aux élèves de rejoindre instantanément le quiz, le dashboard du professeur génèrera un QR Code localement sans dépendance externe (Service Tiers).

- **Outil** : Utilisation d'une bibliothèque JS unique et autonome (ex: `qrious.min.js` ou `qrcode.min.js`) chargée localement depuis `/assets/`.
- **Logique** : 
    - Le dashboard récupère l'`access_code` du quiz dans la DB.
    - Le JS génère l'image du QR Code pointant vers `https://ton-domaine.com/join.php?code=XXXXX`.
    - Avantage : Génération instantanée côté client sans charge serveur supplémentaire.
    - Sécurité : Le QR code est "scellé" au code de session unique du prof.

---

## 8. Problèmes Connus & Risques
1.  **Latence Réseau** : Si le WiFi de l'école est mauvais, un élève peut être marqué comme déconnecté par erreur.
2.  **OS Tablettes** : Certains iPads bloquent le plein écran JS s'il n'y a pas eu d'interaction utilisateur au préalable.
3.  **Hardware Cheat** : Le site ne pourra jamais empêcher un élève de regarder la tablette de son voisin ou d'utiliser un papier caché.

