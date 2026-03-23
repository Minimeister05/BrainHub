// scripts/search.js

const grupos = [
  { nome: "Programação & Dev", membros: "2.4k membros" },
  { nome: "Economia & Finanças", membros: "1.8k membros" },
  { nome: "Direito & Legislação", membros: "1.3k membros" },
  { nome: "Medicina & Saúde", membros: "3.1k membros" },
  { nome: "Engenharias", membros: "2.7k membros" },
];

function getPostsSalvos() {
  return JSON.parse(localStorage.getItem('brainhub_posts') || '[]');
}

function getConversas() {
  return JSON.parse(localStorage.getItem('brainhub_chat') || '[]');
}


function getUsuarios() {
  const fixos = [
    { nome: "RafaDEV", curso: "Sistemas de Informação" },
    { nome: "ErickDEV", curso: "Ciência da Computação" },
  ];
  const cadastrados = JSON.parse(localStorage.getItem('usuarios_brainhub') || '[]');
  return [...fixos, ...cadastrados];
}

function pesquisar(termo) {
  if (!termo || termo.length < 2) {
    return null;
  }

  const t = termo.toLowerCase();

  const posts = getPostsSalvos().filter(p =>
    p.titulo?.toLowerCase().includes(t) ||
    p.texto?.toLowerCase().includes(t) ||
    p.autor?.toLowerCase().includes(t) ||
    p.tags?.some(tag => tag.toLowerCase().includes(t))
  );

  const gruposFound = grupos.filter(g =>
    g.nome.toLowerCase().includes(t)
  );

  const usuarios = getUsuarios().filter(u =>
    u.nome?.toLowerCase().includes(t) ||
    u.curso?.toLowerCase().includes(t)
  );

  const conversas = getConversas().filter(c =>
    c.nome?.toLowerCase().includes(t) ||
    c.subtitulo?.toLowerCase().includes(t)
  );

  return { posts, grupos: gruposFound, usuarios, conversas };
}

function renderizarResultados(termo) {
  const resultados = pesquisar(termo);
  const container = document.getElementById('searchResults');

  if (!resultados) {
    container.innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
    return;
  }

  const { posts, grupos, usuarios, conversas } = resultados;
  const total = posts.length + grupos.length + usuarios.length + conversas.length;

  if (total === 0) {
    container.innerHTML = `<div class="search-empty">Nenhum resultado para "<strong>${termo}</strong>"</div>`;
    return;
  }

  let html = '';

  if (posts.length > 0) {
    html += `<div class="search-section-title">Posts</div>`;
    html += posts.slice(0, 3).map(p => `
      <div class="search-item">
        <div class="search-item-icon post-icon">P</div>
        <div class="search-item-info">
          <div class="search-item-title">${p.titulo}</div>
          <div class="search-item-sub">${p.autor} • ${p.curso}</div>
        </div>
      </div>
    `).join('');
  }

  if (grupos.length > 0) {
    html += `<div class="search-section-title">Grupos</div>`;
    html += grupos.map(g => `
      <div class="search-item">
        <div class="search-item-icon group-icon">G</div>
        <div class="search-item-info">
          <div class="search-item-title">${g.nome}</div>
          <div class="search-item-sub">${g.membros}</div>
        </div>
      </div>
    `).join('');
  }

  if (usuarios.length > 0) {
    html += `<div class="search-section-title">Usuários</div>`;
    html += usuarios.map(u => `
      <div class="search-item">
        <div class="search-item-icon user-icon">${u.nome[0].toUpperCase()}</div>
        <div class="search-item-info">
          <div class="search-item-title">${u.nome}</div>
          <div class="search-item-sub">${u.curso || 'Sem curso definido'}</div>
        </div>
      </div>
    `).join('');
  }

  if (conversas.length > 0) {
    html += `<div class="search-section-title">Conversas</div>`;
    html += conversas.map(c => `
      <div class="search-item">
        <div class="search-item-icon chat-icon">${c.iniciais || 'C'}</div>
        <div class="search-item-info">
          <div class="search-item-title">${c.nome}</div>
          <div class="search-item-sub">${c.subtitulo || ''}</div>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

function iniciarSearch() {
  const overlay  = document.getElementById('searchOverlay');
  const input    = document.getElementById('searchGlobal');
  const closeBtn = document.getElementById('searchClose');

  // CORRIGIDO: busca pelo botão pai direto em vez do ícone interno
  document.querySelectorAll('.top-actions .icon-btn').forEach(btn => {
    // Verifica se é o botão da lupa (não tem badge de notificação)
    if (!btn.querySelector('.badge')) {
      btn.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        lucide.createIcons();
        setTimeout(() => input.focus(), 100);
      });
    }
  });

  // Fecha ao clicar no X
  closeBtn.addEventListener('click', fecharSearch);

  // Fecha ao clicar fora do modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharSearch();
  });

  // Fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharSearch();
  });

  // Pesquisa ao digitar
  input.addEventListener('input', () => {
    renderizarResultados(input.value.trim());
  });
}

function fecharSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchGlobal');
  overlay.classList.add('hidden');
  input.value = '';
  document.getElementById('searchResults').innerHTML = `<p class="search-hint">Digite algo para pesquisar...</p>`;
}

iniciarSearch();