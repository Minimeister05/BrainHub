// chat.js — DMs via Supabase + Realtime, grupos demo
lucide.createIcons();
sincronizarStatusPro();

// ===== ESTADO =====
let usuarioAtual  = null;
let ME            = {};
let conversas     = [];
let conversaAtualId = null;
let parceiroDMAtual = null; // UUID do parceiro atual
let filtroAtual   = 'all';
let realtimeChannel = null;

// ===== HELPERS =====
function gerarIniciais(nome) {
  return (nome || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function hora(dataStr) {
  return new Date(dataStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ===== GRUPOS FIXOS (demo) =====
const gruposFake = [
  {
    id: 'g1', tipo: 'group', nome: 'Programação & Dev', iniciais: '💻', cor: 'group',
    online: false, subtitulo: '2.4k membros', naoLidas: 2,
    mensagens: [
      { id: 1, autor: 'Mariana Costa', iniciais: 'MC', cor: 'c4', texto: 'Alguém sabe resolver um problema de CORS no Node?', hora: '09:00', minha: false },
      { id: 2, autor: 'Pedro Alves',   iniciais: 'PA', cor: 'c5', texto: 'Instala o pacote cors e configura no app.use()',       hora: '09:02', minha: false },
      { id: 3, autor: 'Mariana Costa', iniciais: 'MC', cor: 'c4', texto: 'Funcionou! Obrigada Pedro 🙏',                         hora: '09:05', minha: false },
    ]
  },
  {
    id: 'g2', tipo: 'group', nome: 'Cálculo III — Turma 3B', iniciais: '📐', cor: 'group',
    online: false, subtitulo: '34 membros', naoLidas: 0,
    mensagens: [
      { id: 1, autor: 'Prof. Souza', iniciais: 'PS', cor: 'c5', texto: 'Bom dia pessoal! Prova semana que vem.',               hora: '08:00', minha: false },
      { id: 2, autor: 'Carla Lima',  iniciais: 'CL', cor: 'c3', texto: 'Professor, vai cair integrais duplas?',                hora: '08:05', minha: false },
      { id: 3, autor: 'Prof. Souza', iniciais: 'PS', cor: 'c5', texto: 'Sim, toda a matéria de séries e integrais múltiplas.', hora: '08:07', minha: false },
    ]
  }
];

// ===== DMs VIA SUPABASE =====
async function carregarConversasDM() {
  if (!usuarioAtual || !window.supabase) return [];

  const { data: msgs } = await window.supabase
    .from('messages')
    .select('sender_id, receiver_id, texto, created_at, lida')
    .or(`sender_id.eq.${usuarioAtual.id},receiver_id.eq.${usuarioAtual.id}`)
    .order('created_at', { ascending: false });

  if (!msgs?.length) return [];

  const lastMsgMap = new Map();
  const unreadMap  = new Map();
  const parceirosSet = new Set();

  for (const msg of msgs) {
    const parceiro = msg.sender_id === usuarioAtual.id ? msg.receiver_id : msg.sender_id;
    if (!lastMsgMap.has(parceiro)) lastMsgMap.set(parceiro, msg);
    if (msg.receiver_id === usuarioAtual.id && !msg.lida) {
      unreadMap.set(parceiro, (unreadMap.get(parceiro) || 0) + 1);
    }
    parceirosSet.add(parceiro);
  }

  const { data: perfis } = await window.supabase
    .from('profiles')
    .select('id, nome, cor_avatar, curso')
    .in('id', [...parceirosSet]);

  return (perfis || []).map(p => {
    const last = lastMsgMap.get(p.id);
    const nome = p.nome || 'Usuário';
    return {
      id:          `dm_${p.id}`,
      tipo:        'dm',
      nome,
      iniciais:    gerarIniciais(nome),
      cor:         p.cor_avatar || '',
      parceiro_id: p.id,
      online:      false,
      subtitulo:   p.curso || '',
      naoLidas:    unreadMap.get(p.id) || 0,
      preview:     last?.texto || '',
      hora:        last ? tempoRelativo(last.created_at) : '',
      _lastTime:   last?.created_at || '',
      mensagens:   []
    };
  }).sort((a, b) => new Date(b._lastTime) - new Date(a._lastTime));
}

async function carregarMensagensDM(parceiroId) {
  const { data } = await window.supabase
    .from('messages')
    .select('id, sender_id, texto, created_at')
    .or(`and(sender_id.eq.${usuarioAtual.id},receiver_id.eq.${parceiroId}),and(sender_id.eq.${parceiroId},receiver_id.eq.${usuarioAtual.id})`)
    .order('created_at', { ascending: true });

  // Marca como lidas
  window.supabase.from('messages').update({ lida: true })
    .eq('sender_id', parceiroId).eq('receiver_id', usuarioAtual.id).eq('lida', false)
    .then(() => {});

  return (data || []).map(m => ({
    id:       m.id,
    autor:    m.sender_id === usuarioAtual.id ? ME.nome : null,
    iniciais: m.sender_id === usuarioAtual.id ? ME.iniciais : null,
    cor:      m.sender_id === usuarioAtual.id ? ME.cor : '',
    texto:    m.texto,
    hora:     hora(m.created_at),
    minha:    m.sender_id === usuarioAtual.id
  }));
}

async function enviarMensagemDM(parceiroId, texto) {
  await window.supabase.from('messages').insert({
    sender_id:   usuarioAtual.id,
    receiver_id: parceiroId,
    texto
  });
}

function subscribeRealtimeGlobal() {
  if (realtimeChannel) realtimeChannel.unsubscribe();

  realtimeChannel = window.supabase
    .channel(`inbox_${usuarioAtual.id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `receiver_id=eq.${usuarioAtual.id}`
    }, async (payload) => {
      const msg = payload.new;
      const senderId = msg.sender_id;

      // Acha ou cria a conversa com o remetente
      let c = conversas.find(x => x.parceiro_id === senderId);
      if (!c) {
        // Novo remetente — busca perfil e cria conversa na lista
        const { data: perfil } = await window.supabase
          .from('profiles').select('nome, cor_avatar, curso').eq('id', senderId).single();
        const nome = perfil?.nome || 'Usuário';
        c = {
          id: `dm_${senderId}`, tipo: 'dm', nome,
          iniciais: gerarIniciais(nome), cor: perfil?.cor_avatar || '',
          parceiro_id: senderId, online: false, subtitulo: perfil?.curso || '',
          naoLidas: 0, preview: '', hora: '', _lastTime: '', mensagens: []
        };
        conversas.unshift(c);
      }

      c.preview   = msg.texto;
      c.hora      = tempoRelativo(msg.created_at);
      c._lastTime = msg.created_at;

      if (conversaAtualId === c.id) {
        // Conversa aberta: adiciona mensagem e marca como lida
        c.mensagens.push({
          id: msg.id, autor: c.nome, iniciais: c.iniciais, cor: c.cor,
          texto: msg.texto, hora: hora(msg.created_at), minha: false
        });
        renderizarMensagens(c);
        window.supabase.from('messages').update({ lida: true })
          .eq('id', msg.id).then(() => {});
      } else {
        // Conversa fechada: incrementa não lidas
        c.naoLidas = (c.naoLidas || 0) + 1;
      }

      // Sobe conversa pro topo
      conversas = [c, ...conversas.filter(x => x.id !== c.id)];
      renderizarLista();
    })
    .subscribe();
}

// Substituído por subscribeRealtimeGlobal
function subscribeRealtime(_parceiroId) { /* no-op */ }

// ===== LISTA =====
function renderizarLista() {
  const lista = document.getElementById('conversationList');
  const busca = document.getElementById('searchInput').value.toLowerCase().trim();

  const visiveis = conversas.filter(c => {
    const passaFiltro = filtroAtual === 'all' || c.tipo === filtroAtual;
    const passaBusca  = !busca || c.nome.toLowerCase().includes(busca);
    return passaFiltro && passaBusca;
  });

  lista.innerHTML = visiveis.map(c => {
    const preview = c.tipo === 'dm'
      ? (c.preview || 'Sem mensagens')
      : (c.mensagens[c.mensagens.length - 1]?.texto || 'Sem mensagens');
    const horaStr = c.hora || '';
    return `
      <li class="conv-item ${c.id === conversaAtualId ? 'active' : ''}" data-id="${c.id}">
        <div class="conv-avatar ${c.cor} ${c.tipo === 'group' ? 'group' : ''}">
          ${c.iniciais}
        </div>
        <div class="conv-info">
          <div class="conv-top">
            <span class="conv-name">${c.nome}</span>
            <span class="conv-time">${horaStr}</span>
          </div>
          <div class="conv-bottom">
            <span class="conv-preview ${c.naoLidas > 0 ? 'unread' : ''}">${preview}</span>
            ${c.naoLidas > 0 ? `<span class="unread-badge">${c.naoLidas}</span>` : ''}
          </div>
        </div>
      </li>`;
  }).join('') || `<li style="padding:24px;text-align:center;color:var(--muted);font-size:0.9rem;">Nenhuma conversa ainda.</li>`;

  lista.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => abrirConversa(item.dataset.id));
  });
}

// ===== ABRIR CONVERSA =====
async function abrirConversa(id) {
  conversaAtualId = id;
  const c = conversas.find(x => x.id === id);
  if (!c) return;

  c.naoLidas = 0;
  document.getElementById('chatEmpty').classList.add('hidden');
  document.getElementById('chatOpen').classList.remove('hidden');

  // Mobile: esconde sidebar, mostra chat
  if (window.innerWidth <= 860) {
    document.querySelector('.chat-layout').classList.add('mob-open');
  }

  const perfilLink = c.tipo === 'dm' && c.parceiro_id ? `usuario.html?id=${c.parceiro_id}` : null;
  document.getElementById('chatHeader').innerHTML = `
    ${perfilLink
      ? `<a href="${perfilLink}" class="conv-avatar ${c.cor}" style="width:40px;height:40px;font-size:0.9rem;text-decoration:none;">${c.iniciais}</a>`
      : `<div class="conv-avatar ${c.cor} group" style="width:40px;height:40px;font-size:1.2rem;">${c.iniciais}</div>`
    }
    <div class="chat-header-info">
      ${perfilLink
        ? `<a href="${perfilLink}" class="chat-header-name" style="color:var(--text);text-decoration:none;">${c.nome}</a>`
        : `<div class="chat-header-name">${c.nome}</div>`
      }
      <div class="chat-header-sub">${c.tipo === 'dm' ? '⚫ Offline' : `👥 ${c.subtitulo}`}</div>
    </div>
    <div class="chat-header-actions">
      ${c.tipo === 'dm' && c.parceiro_id ? `
        <a class="icon-btn" title="Chamada de voz" target="_blank"
          href="https://meet.jit.si/brainhub-audio-${[usuarioAtual.id, c.parceiro_id].sort().join('-')}">
          <i data-lucide="phone"></i></a>
        <a class="icon-btn" title="Chamada de vídeo" target="_blank"
          href="https://meet.jit.si/brainhub-${[usuarioAtual.id, c.parceiro_id].sort().join('-')}">
          <i data-lucide="video"></i></a>
      ` : `
        <button class="icon-btn"><i data-lucide="phone"></i></button>
        <button class="icon-btn"><i data-lucide="video"></i></button>
      `}
      ${perfilLink ? `<a href="${perfilLink}" class="icon-btn" title="Ver perfil"><i data-lucide="user"></i></a>` : `<button class="icon-btn"><i data-lucide="info"></i></button>`}
    </div>`;

  if (c.tipo === 'dm' && c.parceiro_id) {
    parceiroDMAtual = c.parceiro_id;
    document.getElementById('chatMessages').innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px">Carregando...</p>';
    c.mensagens = await carregarMensagensDM(c.parceiro_id);
    subscribeRealtime(c.parceiro_id);
  }

  renderizarMensagens(c);
  renderizarLista();
  lucide.createIcons();
  document.getElementById('msgInput').focus();
}

// ===== MENSAGENS =====
function renderizarMensagens(c) {
  const area = document.getElementById('chatMessages');
  area.innerHTML = '';

  if (!c.mensagens.length) {
    area.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px;font-size:0.9rem">Nenhuma mensagem ainda. Diga olá! 👋</p>';
    return;
  }

  c.mensagens.forEach(msg => {
    const row = document.createElement('div');
    row.className = `msg-row ${msg.minha ? 'mine' : ''}`;
    const mostrarAutor = c.tipo === 'group' && !msg.minha;
    row.innerHTML = `
      ${!msg.minha ? `
        <div class="conv-avatar ${msg.cor || c.cor}"
             style="width:28px;height:28px;border-radius:50%;font-size:0.62rem;font-weight:700;display:grid;place-items:center;flex-shrink:0;">
          ${msg.iniciais || c.iniciais}
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
async function enviarMensagem() {
  const input = document.getElementById('msgInput');
  const texto = input.value.trim();
  if (!texto || conversaAtualId === null) return;

  const c = conversas.find(x => x.id === conversaAtualId);
  if (!c) return;

  const agora = new Date();
  const horaStr = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  const novaMsg = { id: Date.now(), autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto, hora: horaStr, minha: true };

  c.mensagens.push(novaMsg);
  c.preview = texto;
  c.hora = 'agora';
  c._lastTime = new Date().toISOString();
  input.value = '';
  // Sobe conversa ativa pro topo
  conversas = [c, ...conversas.filter(x => x.id !== c.id)];
  renderizarMensagens(c);
  renderizarLista();

  if (c.tipo === 'dm' && c.parceiro_id) {
    await enviarMensagemDM(c.parceiro_id, texto);
  } else if (c.tipo === 'group') {
    // grupos são demo, não persiste
  }
}

// ===== NOVA CONVERSA =====
const novaConversaModal  = document.getElementById('novaConversaModal');
const novaConversaInput  = document.getElementById('novaConversaInput');
const novaConversaResult = document.getElementById('novaConversaResultados');

let todosUsuarios = [];

async function carregarAmigosMutuos() {
  if (!window.supabase || !usuarioAtual) return;

  const [{ data: euSigo }, { data: meSeguem }] = await Promise.all([
    window.supabase.from('follows').select('following_id').eq('follower_id', usuarioAtual.id),
    window.supabase.from('follows').select('follower_id').eq('following_id', usuarioAtual.id)
  ]);

  const euSigoIds  = new Set((euSigo  || []).map(f => f.following_id));
  const mutuosIds  = (meSeguem || []).map(f => f.follower_id).filter(id => euSigoIds.has(id));

  if (!mutuosIds.length) { todosUsuarios = []; return; }

  const { data } = await window.supabase
    .from('profiles')
    .select('id, nome, cor_avatar, curso')
    .in('id', mutuosIds)
    .order('nome');

  todosUsuarios = (data || []).map(p => ({
    id:       p.id,
    nome:     p.nome || 'Usuário',
    iniciais: gerarIniciais(p.nome),
    cor:      p.cor_avatar || '',
    sub:      p.curso || ''
  }));
}

document.getElementById('newChatBtn').addEventListener('click', async () => {
  novaConversaModal.classList.remove('hidden');
  novaConversaResult.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.9rem;text-align:center;">Carregando...</p>`;
  await carregarAmigosMutuos();
  renderizarSugestoesModal('');
  setTimeout(() => novaConversaInput?.focus(), 80);
  lucide.createIcons();
});

document.getElementById('novaConversaFechar')?.addEventListener('click', fecharModalNova);
novaConversaModal?.addEventListener('click', e => { if (e.target === novaConversaModal) fecharModalNova(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModalNova(); });
novaConversaInput?.addEventListener('input', () => renderizarSugestoesModal(novaConversaInput.value.trim().toLowerCase()));

function renderizarSugestoesModal(busca) {
  const filtrados = busca
    ? todosUsuarios.filter(u => u.nome.toLowerCase().includes(busca))
    : todosUsuarios;

  if (!filtrados.length) {
    novaConversaResult.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.9rem;text-align:center;">${busca ? 'Nenhum amigo encontrado.' : 'Nenhum amigo em comum ainda. Siga alguém e espere que te sigam de volta.'}</p>`;
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
    item.addEventListener('click', () => iniciarConversaComUsuario(
      item.dataset.uid, item.dataset.nome, item.dataset.iniciais,
      item.dataset.cor, item.dataset.sub
    ));
  });
}

function fecharModalNova() {
  novaConversaModal?.classList.add('hidden');
  if (novaConversaInput) novaConversaInput.value = '';
  if (novaConversaResult) novaConversaResult.innerHTML = '';
}

async function iniciarConversaComUsuario(uid, nome, iniciais, cor, sub) {
  fecharModalNova();

  // Verifica se já existe essa conversa na lista
  const existe = conversas.find(c => c.parceiro_id === uid);
  if (existe) { abrirConversa(existe.id); return; }

  // Cria entrada local e abre
  const novaConv = {
    id: `dm_${uid}`, tipo: 'dm', nome, iniciais, cor,
    parceiro_id: uid, online: false, subtitulo: sub,
    naoLidas: 0, preview: '', hora: '', mensagens: []
  };
  conversas.unshift(novaConv);
  renderizarLista();
  abrirConversa(novaConv.id);
}

// Abre conversa se vier de usuario.html?userId=...
async function verificarUrlUsuario() {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('userId');
  if (!uid || !window.supabase) return;

  const { data: perfil } = await window.supabase
    .from('profiles').select('nome, cor_avatar, curso').eq('id', uid).single();

  if (!perfil) return;

  const nome = perfil.nome || 'Usuário';
  await iniciarConversaComUsuario(uid, nome, gerarIniciais(nome), perfil.cor_avatar || '', perfil.curso || '');
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

// ===== BACK BUTTON (mobile) =====
document.getElementById('chatBackBtn')?.addEventListener('click', () => {
  document.querySelector('.chat-layout').classList.remove('mob-open');
  conversaAtualId = null;
  document.getElementById('chatOpen').classList.add('hidden');
  document.getElementById('chatEmpty').classList.remove('hidden');
});

// ===== INIT =====
async function init() {
  if (!window.supabase) return;
  const { data: { user } } = await window.supabase.auth.getUser();
  usuarioAtual = user;

  if (user) {
    const { data: perfil } = await window.supabase
      .from('profiles').select('nome, cor_avatar, curso').eq('id', user.id).single();
    const nome = perfil?.nome || user.email;
    ME = {
      nome,
      iniciais: gerarIniciais(nome),
      cor:      perfil?.cor_avatar || ''
    };
  }

  const dmsReais = await carregarConversasDM();
  conversas = [...dmsReais, ...gruposFake];
  renderizarLista();
  subscribeRealtimeGlobal();
  await verificarUrlUsuario();
}

init();
