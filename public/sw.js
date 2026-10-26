const CACHE = 'kwizy-v24';
const ASSETS = [
  'index.html',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'AI/KwizyEngine.js',
  'assets/kwizy-loader.js',

  // Espace professeurs (professeurs.html exclu du cache pour toujours charger la dernière version)
  'professeurs/inscription.html',
  'professeurs/login.html',
  'professeurs/monitoring/dashboard.html',

  // Espace landing (accueil)
  'landing/landing.html',

  // Espace élèves
  'eleves/classroom.html',

  // Ajoute ici d'autres fichiers statiques JS/CSS nécessaires
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Utilisation d'un ajout individuel pour éviter qu'une seule erreur 404 ne bloque tout le Service Worker
      return Promise.allSettled(
        ASSETS.map(asset => c.add(asset).catch(err => console.warn('SW: Impossible de cacher ' + asset, err)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // HTML pages: network first so updates are always visible
  if (e.request.destination === 'document' || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // JS/CSS/assets: cache first with network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
