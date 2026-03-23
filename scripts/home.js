// home.js — feed principal (usa brainhub-shared.js)
lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const publishBtn = document.getElementById('publishBtn');
const postInput  = document.getElementById('postInput');
const feedList   = document.getElementById('feedList');

// Aplica mini-avatar na caixa de criar post
(function() {
  const u = getPerfilAtual();
  const mini = document.querySelector('.create-top .mini-avatar');
  if (mini) { mini.textContent = u.iniciais; mini.className = `mini-avatar ${u.corAvatar}`; }
})();

// Esconde banner Pro se já for assinante
if (localStorage.getItem('brainhub_pro') === 'true') {
  const banner = document.getElementById('proBannerFeed');
  if (banner) banner.style.display = 'none';
}

function renderizarPosts() {
  renderizarFeed(feedList, carregarPosts(), true);
}

function publicarNovoPost() {
  const texto = postInput.value.trim();
  if (!texto) return;
  const u = getPerfilAtual();
  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  const posts = carregarPosts();
  posts.unshift({
    id: Date.now(),
    autor: u.nome,
    curso: u.curso,
    tempo: 'agora',
    titulo: 'Novo post',
    texto,
    tags: ['Post', 'BrainHUB'],
    likes: 0,
    comentarios: [],
    curtido: false,
    salvo: false,
    corAvatar: u.corAvatar || 'default',
    isOwnPost: true,
    isProPost: u.isPro,
    proAuthorEmail: sessao?.email || ''
  });
  salvarPosts(posts);
  postInput.value = '';
  renderizarPosts();
}

publishBtn.addEventListener('click', publicarNovoPost);
postInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); publicarNovoPost(); }
});

renderizarPosts();
