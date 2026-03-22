// scripts/feed.js
lucide.createIcons();

// ===== PERFIL =====
function aplicarPerfil() {
  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  const perfil = JSON.parse(localStorage.getItem(`brainhub_perfil_${sessao?.email}`) || 'null');
  const nome = perfil?.nome || sessao?.nome || 'Usuário';
  const curso = perfil?.curso || '';
  const periodo = perfil?.periodo || '';
  const cor = perfil?.corAvatar || '';
  const iniciais = nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const avatarEl = document.getElementById('feedAvatar');
  const nomeEl   = document.getElementById('feedNome');
  const cursoEl  = document.getElementById('feedCurso');
  const composeEl = document.getElementById('composeAvatar');

  if (avatarEl)  { avatarEl.textContent = iniciais; avatarEl.className = `mini-profile-avatar ${cor}`; }
  if (nomeEl)    nomeEl.textContent  = nome;
  if (cursoEl)   cursoEl.textContent = [curso, periodo].filter(Boolean).join(' • ') || 'Sem curso definido';
  if (composeEl) { composeEl.textContent = iniciais; composeEl.className = `mini-avatar ${cor}`; }
}

aplicarPerfil();

// ===== POSTS DO FEED ACADÊMICO =====
const FEED_KEY = 'brainhub_feed_academico';

const postsPadraoFeed = [
  {
    id: 1,
    autor: 'Rafael Cunha',
    role: 'Mestrando em IA · UNICAMP',
    iniciais: 'RC',
    cor: 'green',
    tempo: '5h',
    texto: 'Alguém mais está achando que a tendência de <strong>LLMs fine-tuned para domínios científicos</strong> está sendo subestimada nas conferências principais? Os modelos especializados estão destruindo os generalistas em tarefas específicas.',
    area: 'Inteligência Artificial',
    tipo: '💬 Discussão',
    likes: 87,
    comentarios: 42,
    curtido: false,
    salvo: false
  },
  {
    id: 2,
    autor: 'Julia Lopes',
    role: 'Pesquisadora · FIOCRUZ',
    iniciais: 'JL',
    cor: '',
    tempo: '8h',
    texto: 'Mapeamento atualizado da distribuição de <strong>arbovírus no Centro-Oeste brasileiro</strong> (2023–2025). Os dados apontam expansão geográfica 40% acima do esperado pelos modelos climáticos anteriores.',
    area: 'Epidemiologia',
    tipo: '📊 Dados',
    likes: 156,
    comentarios: 29,
    curtido: false,
    salvo: false
  },
  {
    id: 3,
    autor: 'Pedro Souza',
    role: 'Físico · INPE',
    iniciais: 'PS',
    cor: 'purple',
    tempo: '12h',
    texto: 'Acabamos de submeter um preprint sobre <strong>detecção de exoplanetas via aprendizado profundo</strong> usando dados do telescópio James Webb. Acurácia 23% superior aos métodos tradicionais.',
    area: 'Astrofísica',
    tipo: '📄 Preprint',
    likes: 203,
    comentarios: 58,
    curtido: false,
    salvo: false
  }
];

function gerarIniciais(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function carregarFeedAcad() {
  const salvo = localStorage.getItem(FEED_KEY);
  if (salvo) return JSON.parse(salvo);
  localStorage.setItem(FEED_KEY, JSON.stringify(postsPadraoFeed));
  return postsPadraoFeed;
}

function salvarFeedAcad(posts) {
  localStorage.setItem(FEED_KEY, JSON.stringify(posts));
}

function criarPostFeedHTML(post) {
  return `
    <article class="feed-post-card" data-id="${post.id}">
      <div class="feed-post-header">
        <div class="mini-avatar ${post.cor}" style="width:42px;height:42px;font-size:0.9rem;flex-shrink:0">${post.iniciais}</div>
        <div class="feed-post-meta">
          <div class="feed-post-name">${post.autor}</div>
          <div class="feed-post-role">${post.role}</div>
        </div>
        <span class="feed-post-time">${post.tempo}</span>
        <button class="icon-btn"><i data-lucide="more-vertical"></i></button>
      </div>

      <div class="feed-tags">
        <span class="feed-tag">${post.area}</span>
        <span class="feed-tag tipo">${post.tipo}</span>
      </div>

      <div class="feed-post-body">${post.texto}</div>

      <div class="feed-post-actions">
        <button class="feed-action-btn feed-like-btn ${post.curtido ? 'liked' : ''}">
          <i data-lucide="thumbs-up"></i> <span>${post.likes}</span>
        </button>
        <button class="feed-action-btn feed-comment-toggle">
          <i data-lucide="message-square"></i> <span>${post.comentarios}</span>
        </button>
        <button class="feed-action-btn">
          <i data-lucide="share-2"></i>
        </button>
        <button class="feed-action-btn right feed-save-btn ${post.salvo ? 'saved' : ''}">
          <i data-lucide="bookmark"></i>
        </button>
      </div>
    </article>
  `;
}

function renderizarFeedAcad() {
  const posts = carregarFeedAcad();
  const container = document.getElementById('feedDinamicoAcad');
  if (!container) return;
  container.innerHTML = posts.map(criarPostFeedHTML).join('');
  lucide.createIcons();
  ativarEventosFeed();
}

function ativarEventosFeed() {
  document.querySelectorAll('#feedDinamicoAcad .feed-post-card').forEach(card => {
    const id = Number(card.dataset.id);

    card.querySelector('.feed-like-btn')?.addEventListener('click', () => {
      const posts = carregarFeedAcad();
      const post = posts.find(p => p.id === id);
      if (!post) return;
      post.curtido = !post.curtido;
      post.likes += post.curtido ? 1 : -1;
      salvarFeedAcad(posts);
      const btn = card.querySelector('.feed-like-btn');
      const span = btn.querySelector('span');
      btn.classList.toggle('liked', post.curtido);
      span.textContent = post.likes;
    });

    card.querySelector('.feed-save-btn')?.addEventListener('click', () => {
      const posts = carregarFeedAcad();
      const post = posts.find(p => p.id === id);
      if (!post) return;
      post.salvo = !post.salvo;
      salvarFeedAcad(posts);
      card.querySelector('.feed-save-btn').classList.toggle('saved', post.salvo);
    });
  });

  // Botão de like do card estático (em destaque)
  document.querySelector('.destaque .feed-like-btn')?.addEventListener('click', function() {
    const isLiked = this.classList.contains('liked');
    const span = this.querySelector('span');
    this.classList.toggle('liked');
    span.textContent = isLiked ? parseInt(span.textContent) - 1 : parseInt(span.textContent) + 1;
  });

  document.querySelector('.destaque .feed-save-btn')?.addEventListener('click', function() {
    this.classList.toggle('saved');
  });
}

// ===== PUBLICAR NOVO POST =====
document.getElementById('feedPublishBtn')?.addEventListener('click', () => {
  const input = document.getElementById('feedPostInput');
  const texto = input.value.trim();
  if (!texto) return;

  const sessao = JSON.parse(localStorage.getItem('brainhub_usuario_logado') || 'null');
  const perfil = JSON.parse(localStorage.getItem(`brainhub_perfil_${sessao?.email}`) || 'null');
  const nome = perfil?.nome || sessao?.nome || 'Você';
  const iniciais = nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const posts = carregarFeedAcad();
  posts.unshift({
    id: Date.now(),
    autor: nome,
    role: [perfil?.curso, perfil?.periodo].filter(Boolean).join(' • ') || 'BrainHUB',
    iniciais,
    cor: perfil?.corAvatar || '',
    tempo: 'agora',
    texto,
    area: 'Geral',
    tipo: '💬 Post',
    likes: 0,
    comentarios: 0,
    curtido: false,
    salvo: false
  });

  salvarFeedAcad(posts);
  input.value = '';
  renderizarFeedAcad();
  mostrarAviso('Post publicado com sucesso!', 'success');
});

// ===== FILTROS ===
document.querySelectorAll('.feed-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.feed-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

// ===== SEGUIR =====
function toggleSeguir(btn) {
  const isSeguindo = btn.classList.contains('seguindo');
  btn.classList.toggle('seguindo');
  btn.textContent = isSeguindo ? 'Seguir' : 'Seguindo';
}

// ===== INIT =====
renderizarFeedAcad();