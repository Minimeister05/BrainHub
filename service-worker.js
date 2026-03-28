const CACHE_NAME = 'brainhub-v1';

const STATIC_ASSETS = [
  '/offline.html',
  '/css/home.css',
  '/css/login.css',
  '/css/cadastro.css',
  '/css/chat.css',
  '/css/configuracoes.css',
  '/css/exercicios.css',
  '/css/feed.css',
  '/css/grupo-detalhe.css',
  '/css/grupos.css',
  '/css/meus-posts.css',
  '/css/notificacoes.css',
  '/css/onboarding.css',
  '/css/perfil.css',
  '/css/planos.css',
  '/css/salvos.css',
  '/css/sobre.css',
  '/css/suporte.css',
  '/css/usuario.css',
  '/imagens/icon-192.svg',
  '/imagens/icon-512.svg',
];

// Instala e faz cache dos assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Remove caches antigos ao ativar nova versão
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: network first para HTML, cache first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições para Supabase e APIs externas (sempre precisam de rede)
  if (!url.origin.includes(self.location.origin)) return;

  const isNavigation = request.mode === 'navigate';

  if (isNavigation) {
    // HTML: tenta rede primeiro, se falhar mostra offline.html
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
  } else {
    // CSS/JS/Imagens: cache primeiro, se não tiver busca na rede
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
