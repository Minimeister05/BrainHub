lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const feedMeusPosts = document.getElementById('feedMeusPosts');
const publishBtn    = document.getElementById('publishBtn');
const postInput     = document.getElementById('postInput');

function carregarMeusPosts() {
  const u = getPerfilAtual();
  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  const todos = carregarPosts();

  return todos.filter(p =>
    p.autor === u.nome ||
    (p.isOwnPost === true && p.proAuthorEmail === sessao?.email)
  );
}

function renderizar() {
  const meus = carregarMeusPosts();
  if (meus.length === 0) {
    feedMeusPosts.innerHTML = `
      <div class="aba-empty">
        <i data-lucide="edit-3"></i>
        <h3>Você ainda não publicou nenhum post.</h3>
        <p>Que tal compartilhar algo com a comunidade?</p>
      </div>`;
    lucide.createIcons();
    return;
  }
  renderizarFeed(feedMeusPosts, meus, false);
}

function publicarPost() {
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
  renderizar();
}

publishBtn.addEventListener('click', publicarPost);
postInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); publicarPost(); } });

renderizar();
