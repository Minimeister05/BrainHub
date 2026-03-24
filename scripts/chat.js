// chat.js — mensagens bidirecionais via localStorage compartilhado
lucide.createIcons();
sincronizarStatusPro();

const _u  = getPerfilAtual();
const ME  = { nome: _u.nome, iniciais: _u.iniciais, cor: _u.corAvatar || 'c1', email: _u.email };

// Chave de conversas "fake" por usuário (grupos + DMs demo)
const CHAT_KEY = 'brainhub_chat';
// Chave compartilhada entre todos os usuários para DMs reais
const DMS_KEY  = 'brainhub_dms';

// ===== USUÁRIOS DISPONÍVEIS PARA CHAT =====
function getUsuariosParaChat() {
  const fixos = [
    { nome: 'Ana Martins',     email: 'ana@gmail.com',     iniciais: 'AM', cor: 'c3', subtitulo: 'Engenharia de Software'  },
    { nome: 'Rafael Ferreira', email: 'rf@gmail.com',      iniciais: 'RF', cor: 'c2', subtitulo: 'Sistemas de Informação'  },
    { nome: 'Carla Lima',      email: 'carla@gmail.com',   iniciais: 'CL', cor: 'c3', subtitulo: 'Ciência da Computação'   },
    { nome: 'Pedro Alves',     email: 'pedro@gmail.com',   iniciais: 'PA', cor: 'c5', subtitulo: 'Engenharia de Software'  },
    { nome: 'Lucas Mendes',    email: 'lucas@gmail.com',   iniciais: 'LM', cor: 'c1', subtitulo: 'Ciência da Computação'   },
    { nome: 'Mariana Costa',   email: 'mariana@gmail.com', iniciais: 'MC', cor: 'c4', subtitulo: 'Design'                  },
    { nome: 'Julia Santos',    email: 'julia@gmail.com',   iniciais: 'JS', cor: 'c6', subtitulo: 'Biologia'                },
  ];

  // Usuários cadastrados no app também aparecem
  const registrados = JSON.parse(localStorage.getItem('usuarios_brainhub') || '[]');
  registrados.forEach(u => {
    if (u.email === ME.email) return;
    if (fixos.find(f => f.email === u.email)) return;
    const perfil   = JSON.parse(localStorage.getItem(`brainhub_perfil_${u.email}`) || 'null');
    const nome     = perfil?.nome || u.nome;
    const iniciais = nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    fixos.push({ nome, email: u.email, iniciais, cor: perfil?.corAvatar || 'c1', subtitulo: perfil?.curso || '' });
  });

  return fixos.filter(u => u.email !== ME.email);
}

// ===== DMs REAIS (bidirecionais) =====
function carregarDMsReais() {
  const todos = JSON.parse(localStorage.getItem(DMS_KEY) || '[]');
  return todos
    .filter(t => t.participantes && t.participantes[ME.email])
    .map(normalizarDM);
}

function normalizarDM(thread) {
  const outroEmail = Object.keys(thread.participantes).find(e => e !== ME.email) || '';
  const outro      = thread.participantes[outroEmail] || {};
  return {
    id:        thread.id,
    tipo:      'dm',
    nome:      outro.nome     || 'Usuário',
    iniciais:  outro.iniciais || '?',
    cor:       outro.cor      || 'c1',
    online:    false,
    subtitulo: outro.subtitulo || outro.curso || '',
    naoLidas:  (thread.naoLidas || {})[ME.email] || 0,
    mensagens: (thread.mensagens || []).map(m => ({
      id:       m.id,
      autor:    m.de === ME.email ? ME.nome     : outro.nome,
      iniciais: m.de === ME.email ? ME.iniciais : outro.iniciais,
      cor:      m.de === ME.email ? ME.cor      : outro.cor,
      texto:    m.texto,
      hora:     m.hora,
      minha:    m.de === ME.email
    })),
    _dmId: thread.id
  };
}

function criarDM(outroEmail, outroInfo) {
  const todos    = JSON.parse(localStorage.getItem(DMS_KEY) || '[]');
  const threadId = [ME.email, outroEmail].sort().join('::');
  if (!todos.find(t => t.id === threadId)) {
    todos.push({
      id: threadId,
      participantes: {
        [ME.email]:   { nome: ME.nome, iniciais: ME.iniciais, cor: ME.cor },
        [outroEmail]: outroInfo
      },
      mensagens: [],
      naoLidas:  {}
    });
    localStorage.setItem(DMS_KEY, JSON.stringify(todos));
  }
  return threadId;
}

function salvarMensagemDM(dmId, texto, hora) {
  const todos  = JSON.parse(localStorage.getItem(DMS_KEY) || '[]');
  const thread = todos.find(t => t.id === dmId);
  if (!thread) return;
  thread.mensagens.push({ id: Date.now(), de: ME.email, texto, hora });
  const outroEmail = Object.keys(thread.participantes).find(e => e !== ME.email);
  if (!thread.naoLidas) thread.naoLidas = {};
  thread.naoLidas[ME.email]   = 0;
  thread.naoLidas[outroEmail] = (thread.naoLidas[outroEmail] || 0) + 1;
  localStorage.setItem(DMS_KEY, JSON.stringify(todos));
}

function marcarLidoDM(dmId) {
  const todos  = JSON.parse(localStorage.getItem(DMS_KEY) || '[]');
  const thread = todos.find(t => t.id === dmId);
  if (!thread) return;
  if (!thread.naoLidas) thread.naoLidas = {};
  thread.naoLidas[ME.email] = 0;
  localStorage.setItem(DMS_KEY, JSON.stringify(todos));
}

// ===== GRUPOS FIXOS (demo) =====
const gruposFake = [
  {
    id: 'g1', tipo: 'group', nome: 'Programação & Dev', iniciais: '💻', cor: 'group',
    online: false, subtitulo: '2.4k membros', naoLidas: 5,
    mensagens: [
      { id: 1, autor: 'Mariana Costa', iniciais: 'MC', cor: 'c4', texto: 'Alguém sabe resolver um problema de CORS no Node?', hora: '09:00', minha: false },
      { id: 2, autor: 'Pedro Alves',   iniciais: 'PA', cor: 'c5', texto: 'Instala o pacote cors e configura no app.use()',       hora: '09:02', minha: false },
      { id: 3, autor: 'Mariana Costa', iniciais: 'MC', cor: 'c4', texto: 'Funcionou! Obrigada Pedro 🙏',                         hora: '09:05', minha: false },
      { id: 4, autor: ME.nome,         iniciais: ME.iniciais, cor: ME.cor, texto: 'Boa! Esse erro é clássico mesmo.',             hora: '09:10', minha: true  },
    ]
  },
  {
    id: 'g2', tipo: 'group', nome: 'Cálculo III — Turma 3B', iniciais: '📐', cor: 'group',
    online: false, subtitulo: '34 membros', naoLidas: 0,
    mensagens: [
      { id: 1, autor: 'Prof. Souza', iniciais: 'PS', cor: 'c5', texto: 'Bom dia pessoal! Prova semana que vem.',                hora: '08:00', minha: false },
      { id: 2, autor: 'Carla Lima',  iniciais: 'CL', cor: 'c3', texto: 'Professor, vai cair integrais duplas?',                 hora: '08:05', minha: false },
      { id: 3, autor: 'Prof. Souza', iniciais: 'PS', cor: 'c5', texto: 'Sim, toda a matéria de séries e integrais múltiplas.',  hora: '08:07', minha: false },
      { id: 4, autor: ME.nome,       iniciais: ME.iniciais, cor: ME.cor, texto: 'Vou revisar os exercícios do capítulo 12.',     hora: '08:10', minha: true  },
    ]
  }
];

// ===== ESTADO =====
let conversas      = [];
let conversaAtualId = null;
let filtroAtual    = 'all';

// ===== INIT =====
function inicializar() {
  const dmsReais   = carregarDMsReais();
  const nomesReais = new Set(dmsReais.map(d => d.nome));
  conversas = [...dmsReais, ...gruposFake.filter(g => !nomesReais.has(g.nome))];
  renderizarLista();
}

async function init() {
  inicializar();
  await verificarUrlUsuario();
}

function salvarGrupo() {
  // grupos são imutáveis no prototype — nada a salvar
}

// ===== LISTA =====
function renderizarLista() {
  const lista = document.getElementById('conversationList');
  const busca = document.getElementById('searchInput').value.toLowerCase().trim();

  const visiveis = conversas.filter(c => {
    const passaFiltro = filtroAtual === 'all' || c.tipo === filtroAtual;
    const passaBusca  = !busca || c.nome.toLowerCase().includes(busca);
    return passaFiltro && passaBusca;
  });

  let html = visiveis.map(c => {
    const ultima  = c.mensagens[c.mensagens.length - 1];
    const preview = ultima ? (ultima.minha ? `Você: ${ultima.texto}` : ultima.texto) : 'Sem mensagens';
    const hora    = ultima ? ultima.hora : '';
    return `
      <li class="conv-item ${c.id === conversaAtualId ? 'active' : ''}" data-id="${c.id}">
        <div class="conv-avatar ${c.cor} ${c.tipo === 'group' ? 'group' : ''}">
          ${c.iniciais}
          ${c.online && c.tipo === 'dm' ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="conv-info">
          <div class="conv-top">
            <span class="conv-name">${c.nome}</span>
            <span class="conv-time">${hora}</span>
          </div>
          <div class="conv-bottom">
            <span class="conv-preview ${c.naoLidas > 0 ? 'unread' : ''}">${preview}</span>
            ${c.naoLidas > 0 ? `<span class="unread-badge">${c.naoLidas}</span>` : ''}
          </div>
        </div>
      </li>`;
  }).join('');

  // Se há busca, mostra usuários novos para iniciar DM
  if (busca) {
    const nomesExistentes = new Set(conversas.filter(c => c.tipo === 'dm').map(c => c.nome.toLowerCase()));
    const novos = getUsuariosParaChat().filter(u =>
      u.nome.toLowerCase().includes(busca) && !nomesExistentes.has(u.nome.toLowerCase())
    );
    if (novos.length > 0) {
      html += `<li class="conv-section-label">Iniciar conversa</li>`;
      html += novos.map(u => `
        <li class="conv-item novo-chat-item"
            data-nome="${u.nome}" data-email="${u.email}"
            data-iniciais="${u.iniciais}" data-cor="${u.cor}" data-sub="${u.subtitulo}">
          <div class="conv-avatar ${u.cor}">${u.iniciais}</div>
          <div class="conv-info">
            <div class="conv-top"><span class="conv-name">${u.nome}</span></div>
            <div class="conv-bottom"><span class="conv-preview">${u.subtitulo}</span></div>
          </div>
          <span class="novo-chat-badge">Nova</span>
        </li>`).join('');
    }
    if (visiveis.length === 0 && novos.length === 0) {
      html = `<li style="padding:24px;text-align:center;color:var(--muted);font-size:0.9rem;">Nenhum resultado para "${busca}".</li>`;
    }
  }

  lista.innerHTML = html;
  lista.querySelectorAll('.conv-item:not(.novo-chat-item)').forEach(item => {
    item.addEventListener('click', () => abrirConversa(item.dataset.id));
  });
  lista.querySelectorAll('.novo-chat-item').forEach(item => {
    item.addEventListener('click', () => criarOuAbrirConversa(item));
  });
}

// ===== ABRIR CONVERSA =====
function abrirConversa(id) {
  conversaAtualId = id;
  const c = conversas.find(x => x.id == id);
  if (!c) return;

  if (c._dmId) marcarLidoDM(c._dmId);
  c.naoLidas = 0;

  document.getElementById('chatEmpty').classList.add('hidden');
  document.getElementById('chatOpen').classList.remove('hidden');

  document.getElementById('chatHeader').innerHTML = `
    <div class="conv-avatar ${c.cor} ${c.tipo === 'group' ? 'group' : ''}"
         style="width:40px;height:40px;font-size:${c.tipo === 'group' ? '1.2rem' : '0.9rem'};">
      ${c.iniciais}
      ${c.online && c.tipo === 'dm' ? '<span class="online-dot"></span>' : ''}
    </div>
    <div class="chat-header-info">
      <div class="chat-header-name">${c.nome}</div>
      <div class="chat-header-sub">
        ${c.tipo === 'dm' ? (c.online ? '🟢 Online agora' : '⚫ Offline') : `👥 ${c.subtitulo}`}
      </div>
    </div>
    <div class="chat-header-actions">
      <button class="icon-btn"><i data-lucide="phone"></i></button>
      <button class="icon-btn"><i data-lucide="video"></i></button>
      <button class="icon-btn"><i data-lucide="info"></i></button>
    </div>`;

  renderizarMensagens(c);
  renderizarLista();
  lucide.createIcons();
  document.getElementById('msgInput').focus();
}

// ===== MENSAGENS =====
function renderizarMensagens(c) {
  const area = document.getElementById('chatMessages');
  area.innerHTML = '';
  c.mensagens.forEach(msg => {
    const row = document.createElement('div');
    row.className = `msg-row ${msg.minha ? 'mine' : ''}`;
    const mostrarAutor = c.tipo === 'group' && !msg.minha;
    row.innerHTML = `
      ${!msg.minha ? `
        <div class="conv-avatar ${msg.cor}"
             style="width:28px;height:28px;border-radius:50%;font-size:0.62rem;font-weight:700;display:grid;place-items:center;flex-shrink:0;">
          ${msg.iniciais}
        </div>` : ''}
      <div class="msg-bubble ${msg.minha ? 'mine' : 'theirs'}">
        ${mostrarAutor ? `<div class="msg-author">${msg.autor}</div>` : ''}
        ${msg.texto}
        <div class="msg-time">${msg.hora}</div>
      </div>`;
    area.appendChild(row);
  });
  area.scrollTop = area.scrollHeight;
}

// ===== ENVIO =====
function enviarMensagem() {
  const input = document.getElementById('msgInput');
  const texto = input.value.trim();
  if (!texto || conversaAtualId === null) return;

  const c = conversas.find(x => x.id == conversaAtualId);
  if (!c) return;

  const agora = new Date();
  const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  const novaMsg = { id: Date.now(), autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto, hora, minha: true };

  c.mensagens.push(novaMsg);
  input.value = '';

  if (c._dmId) {
    // DM real → salva no thread compartilhado (ambos os usuários veem)
    salvarMensagemDM(c._dmId, texto, hora);
  } else if (c.tipo === 'dm') {
    // DM demo → simula resposta
    simularResposta(c);
  }

  renderizarMensagens(c);
  renderizarLista();
}

// ===== RESPOSTA SIMULADA (só DMs demo) =====
const respostas = [
  'Entendi! Vou ver isso mais tarde 😄', 'Boa! Me manda quando tiver pronto.',
  'Com certeza! Podemos marcar.', 'Haha é verdade! Bem lembrado.',
  'Pode deixar, eu cuido disso.', 'Ótima ideia! Vamos nessa 🚀',
  'Tô dentro! Conta comigo.', 'Faz sentido, valeu pela dica!',
];

function simularResposta(c) {
  const area   = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.id        = 'typingIndicator';
  typing.className = 'typing-indicator';
  typing.innerHTML = `
    <div class="conv-avatar ${c.cor}"
         style="width:28px;height:28px;border-radius:50%;font-size:0.62rem;font-weight:700;display:grid;place-items:center;flex-shrink:0;">
      ${c.iniciais}
    </div>
    <div class="typing-dots"><span></span><span></span><span></span></div>`;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;

  setTimeout(() => {
    document.getElementById('typingIndicator')?.remove();
    const agora = new Date();
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
    c.mensagens.push({
      id: Date.now(), autor: c.nome, iniciais: c.iniciais, cor: c.cor,
      texto: respostas[Math.floor(Math.random() * respostas.length)],
      hora, minha: false
    });
    renderizarMensagens(c);
    renderizarLista();
  }, 1200 + Math.random() * 800);
}

// ===== NOVA CONVERSA (modal + barra de busca) =====
function criarOuAbrirConversa(item) {
  const nome     = item.dataset.nome;
  const email    = item.dataset.email;
  const iniciais = item.dataset.iniciais;
  const cor      = item.dataset.cor;
  const subtitulo = item.dataset.sub || '';

  // Já existe conversa com esse contato?
  const existe = conversas.find(c => c.tipo === 'dm' && c.nome === nome);
  if (existe) {
    fecharModalNova();
    abrirConversa(existe.id);
    return;
  }

  // Cria thread real no localStorage compartilhado
  const dmId = criarDM(email, { nome, iniciais, cor, subtitulo });
  inicializar();
  fecharModalNova();
  // Abre após o render
  setTimeout(() => {
    const nova = conversas.find(c => c._dmId === dmId);
    if (nova) abrirConversa(nova.id);
  }, 50);
}

// Modal nova conversa
const novaConversaModal  = document.getElementById('novaConversaModal');
const novaConversaInput  = document.getElementById('novaConversaInput');
const novaConversaResult = document.getElementById('novaConversaResultados');

let usuariosParaChat = []; // populado do Supabase

async function carregarSeguidosMutuos() {
  if (!window.supabase) return;
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  // Pega quem eu sigo
  const { data: seguindo } = await window.supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (!seguindo || seguindo.length === 0) return;
  const ids = seguindo.map(f => f.following_id);

  // Busca perfis dessas pessoas
  const { data: perfis } = await window.supabase
    .from('profiles')
    .select('id, nome, cor_avatar, curso')
    .in('id', ids);

  usuariosParaChat = (perfis || []).map(p => ({
    id:       p.id,
    nome:     p.nome || 'Usuário',
    iniciais: (p.nome || '?').split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
    cor:      p.cor_avatar || '',
    sub:      p.curso || ''
  }));
}

document.getElementById('newChatBtn').addEventListener('click', async () => {
  novaConversaModal.classList.remove('hidden');
  novaConversaResult.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.9rem;text-align:center;">Carregando...</p>`;
  await carregarSeguidosMutuos();
  renderizarSugestoesModal('');
  setTimeout(() => novaConversaInput?.focus(), 80);
  lucide.createIcons();
});

document.getElementById('novaConversaFechar')?.addEventListener('click', fecharModalNova);
novaConversaModal?.addEventListener('click', e => { if (e.target === novaConversaModal) fecharModalNova(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModalNova(); });

novaConversaInput?.addEventListener('input', () => {
  renderizarSugestoesModal(novaConversaInput.value.trim().toLowerCase());
});

function renderizarSugestoesModal(busca) {
  const filtrados = busca
    ? usuariosParaChat.filter(u => u.nome.toLowerCase().includes(busca))
    : usuariosParaChat;

  if (filtrados.length === 0) {
    novaConversaResult.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.9rem;text-align:center;">${busca ? 'Nenhum usuário encontrado.' : 'Siga alguém para iniciar uma conversa.'}</p>`;
    return;
  }

  novaConversaResult.innerHTML = filtrados.map(u => `
    <div class="nova-conv-item" data-uid="${u.id}" data-nome="${u.nome}"
         data-iniciais="${u.iniciais}" data-cor="${u.cor}" data-sub="${u.sub}">
      <div class="conv-avatar ${u.cor}" style="width:38px;height:38px;font-size:0.8rem;">${u.iniciais}</div>
      <div>
        <div style="font-weight:600;font-size:0.95rem;">${u.nome}</div>
        <div style="font-size:0.8rem;color:var(--muted);">${u.sub}</div>
      </div>
    </div>`).join('');

  novaConversaResult.querySelectorAll('.nova-conv-item').forEach(item => {
    item.addEventListener('click', () => iniciarConversaPorItem(item));
  });
}

function iniciarConversaPorItem(item) {
  const uid      = item.dataset.uid;
  const nome     = item.dataset.nome;
  const iniciais = item.dataset.iniciais;
  const cor      = item.dataset.cor;
  const sub      = item.dataset.sub || '';
  iniciarConversaComUsuario(uid, nome, iniciais, cor, sub);
  fecharModalNova();
}

function iniciarConversaComUsuario(uid, nome, iniciais, cor, sub) {
  // Usa uid como chave da thread
  const todos    = JSON.parse(localStorage.getItem(DMS_KEY) || '[]');
  const meuId    = ME.email; // mantém compatibilidade
  const threadId = [meuId, uid].sort().join('::');

  if (!todos.find(t => t.id === threadId)) {
    todos.push({
      id: threadId,
      participantes: {
        [meuId]: { nome: ME.nome, iniciais: ME.iniciais, cor: ME.cor },
        [uid]:   { nome, iniciais, cor, subtitulo: sub }
      },
      mensagens: [],
      naoLidas:  {}
    });
    localStorage.setItem(DMS_KEY, JSON.stringify(todos));
  }

  inicializar();
  setTimeout(() => {
    const conv = conversas.find(c => c._dmId === threadId);
    if (conv) abrirConversa(conv.id);
  }, 50);
}

function fecharModalNova() {
  novaConversaModal?.classList.add('hidden');
  if (novaConversaInput) novaConversaInput.value = '';
  if (novaConversaResult) novaConversaResult.innerHTML = '';
}

// Abre conversa direto se vier de usuario.html?userId=...
async function verificarUrlUsuario() {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('userId');
  if (!uid || !window.supabase) return;

  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('nome, cor_avatar, curso')
    .eq('id', uid)
    .single();

  if (!perfil) return;

  const nome     = perfil.nome || 'Usuário';
  const iniciais = nome.split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  iniciarConversaComUsuario(uid, nome, iniciais, perfil.cor_avatar || '', perfil.curso || '');

  // Limpa o param da URL sem recarregar
  window.history.replaceState({}, '', 'chat.html');
}

// ===== EVENTOS =====
document.getElementById('sendBtn').addEventListener('click', enviarMensagem);
document.getElementById('msgInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); enviarMensagem(); }
});
document.querySelectorAll('.chat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filtroAtual = tab.dataset.tab;
    renderizarLista();
  });
});
document.getElementById('searchInput').addEventListener('input', renderizarLista);

init();
