// chat.js — DMs e grupos de chat via Supabase + Realtime
lucide.createIcons();
sincronizarStatusPro();

// Conta oficial BrainHUB — sempre aparece online
const BRAINHUB_BOT_ID = 'e4e44716-1fa4-4fc3-8d33-c746841c7345';

// ===== ESTADO =====
let usuarioAtual  = null;
let ME            = {};
let conversas     = [];
let conversaAtualId = null;
let parceiroDMAtual = null; // UUID do parceiro atual
let filtroAtual   = 'all';
let realtimeChannel = null;
let grupoRealtimeChannels = {}; // group_id → channel
let pedidos = [];           // pedidos de mensagem recebidos
let mostrandoPedidos = false;

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

// ===== GRUPOS DE CHAT VIA SUPABASE =====
async function carregarGruposChat() {
  if (!usuarioAtual || !window.supabase) return [];

  // Busca grupos do usuário
  const { data: memberships } = await window.supabase
    .from('chat_group_members')
    .select('group_id')
    .eq('user_id', usuarioAtual.id);

  if (!memberships?.length) return [];
  const groupIds = memberships.map(m => m.group_id);

  const { data: grupos } = await window.supabase
    .from('chat_groups')
    .select('id, name, emoji, created_at')
    .in('id', groupIds);

  if (!grupos?.length) return [];

  // Busca última mensagem de cada grupo
  const { data: lastMsgs } = await window.supabase
    .from('group_messages')
    .select('group_id, texto, created_at')
    .in('group_id', groupIds)
    .order('created_at', { ascending: false });

  const lastMsgMap = {};
  for (const m of (lastMsgs || [])) {
    if (!lastMsgMap[m.group_id]) lastMsgMap[m.group_id] = m;
  }

  // Busca contagem de membros
  const { data: allMembers } = await window.supabase
    .from('chat_group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds);

  const memberCountMap = {};
  for (const m of (allMembers || [])) {
    memberCountMap[m.group_id] = (memberCountMap[m.group_id] || 0) + 1;
  }

  return grupos.map(g => {
    const last = lastMsgMap[g.id];
    return {
      id:        `grpchat_${g.id}`,
      tipo:      'group',
      nome:      g.name,
      iniciais:  g.emoji || '💬',
      cor:       'group',
      group_id:  g.id,
      subtitulo: `${memberCountMap[g.id] || 1} membros`,
      naoLidas:  0,
      preview:   last?.texto || 'Sem mensagens',
      hora:      last ? tempoRelativo(last.created_at) : '',
      _lastTime: last?.created_at || g.created_at,
      mensagens: []
    };
  }).sort((a, b) => new Date(b._lastTime) - new Date(a._lastTime));
}

async function carregarMensagensGrupo(groupId) {
  const { data } = await window.supabase
    .from('group_messages')
    .select('id, sender_id, texto, created_at, profiles(nome, cor_avatar)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  return (data || []).map(m => ({
    id:       m.id,
    autor:    m.profiles?.nome || 'Usuário',
    iniciais: gerarIniciais(m.profiles?.nome || 'Usuário'),
    cor:      m.profiles?.cor_avatar || '',
    texto:    m.texto,
    hora:     hora(m.created_at),
    minha:    m.sender_id === usuarioAtual.id
  }));
}

async function enviarMensagemGrupo(groupId, texto) {
  await window.supabase.from('group_messages').insert({
    group_id:  groupId,
    sender_id: usuarioAtual.id,
    texto
  });
}

async function criarGrupoChat(nome, emoji, membroIds) {
  const { data: grupo, error: errGrupo } = await window.supabase
    .from('chat_groups')
    .insert({ name: nome, emoji, created_by: usuarioAtual.id })
    .select('id').single();

  if (errGrupo || !grupo) {
    console.error('Erro ao criar chat_groups:', errGrupo);
    alert('Erro: ' + (errGrupo?.message || 'desconhecido'));
    return null;
  }

  const todos = [...new Set([usuarioAtual.id, ...membroIds])];
  const { error: errMembros } = await window.supabase
    .from('chat_group_members')
    .insert(todos.map(uid => ({ group_id: grupo.id, user_id: uid })));

  if (errMembros) {
    console.error('Erro ao inserir membros:', errMembros);
    alert('Erro ao adicionar membros: ' + errMembros.message);
    return null;
  }

  return grupo.id;
}

function subscribeGrupoRealtime(groupId) {
  if (grupoRealtimeChannels[groupId]) return;

  grupoRealtimeChannels[groupId] = window.supabase
    .channel(`group_msg_${groupId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'group_messages',
      filter: `group_id=eq.${groupId}`
    }, async (payload) => {
      const msg = payload.new;
      if (msg.sender_id === usuarioAtual.id) return; // já foi adicionado localmente

      const c = conversas.find(x => x.group_id === groupId);
      if (!c) return;

      // Busca nome do remetente
      const { data: perfil } = await window.supabase
        .from('profiles').select('nome, cor_avatar').eq('id', msg.sender_id).single();

      c.mensagens.push({
        id:       msg.id,
        autor:    perfil?.nome || 'Usuário',
        iniciais: gerarIniciais(perfil?.nome || 'Usuário'),
        cor:      perfil?.cor_avatar || '',
        texto:    msg.texto,
        hora:     hora(msg.created_at),
        minha:    false
      });
      c.preview   = previewTexto(msg.texto);
      c.hora      = tempoRelativo(msg.created_at);
      c._lastTime = msg.created_at;

      if (conversaAtualId === c.id) {
        renderizarMensagens(c);
      } else {
        c.naoLidas = (c.naoLidas || 0) + 1;
      }
      conversas = [c, ...conversas.filter(x => x.id !== c.id)];
      renderizarLista();
    })
    .subscribe();
}

// ===== DMs VIA SUPABASE =====
async function carregarConversasDM() {
  if (!usuarioAtual || !window.supabase) return [];

  const { data: msgs } = await window.supabase
    .from('messages')
    .select('sender_id, receiver_id, texto, created_at, lida, pedido')
    .or(`sender_id.eq.${usuarioAtual.id},and(receiver_id.eq.${usuarioAtual.id},pedido.eq.false)`)
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
    .select('id, nome, cor_avatar, curso, foto_url')
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
      foto_url:    p.foto_url || null,
      parceiro_id: p.id,
      online:      p.id === BRAINHUB_BOT_ID,
      subtitulo:   p.curso || '',
      naoLidas:    unreadMap.get(p.id) || 0,
      preview:     previewTexto(last?.texto || ''),
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

async function enviarMensagemDM(parceiroId, texto, pedido = false) {
  await window.supabase.from('messages').insert({
    sender_id:   usuarioAtual.id,
    receiver_id: parceiroId,
    texto,
    pedido: pedido === true
  });
}

function subscribeRealtimeGlobal() {
  if (realtimeChannel) realtimeChannel.unsubscribe();

  realtimeChannel = window.supabase
    .channel(`inbox_${usuarioAtual.id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, async (payload) => {
      const msg = payload.new;
      // Ignora mensagens que não são para mim ou que eu mesmo enviei
      if (msg.receiver_id !== usuarioAtual.id) return;
      const senderId = msg.sender_id;

      // Pedido de mensagem — vai para a fila de pedidos, não para a inbox normal
      if (msg.pedido === true) {
        const existePedido = pedidos.find(p => p.senderId === senderId);
        if (!existePedido) {
          const { data: perfil } = await window.supabase
            .from('profiles').select('nome, cor_avatar, foto_url').eq('id', senderId).single();
          const nome = perfil?.nome || 'Usuário';
          pedidos.unshift({
            senderId, nome, iniciais: gerarIniciais(nome),
            cor: perfil?.cor_avatar || '', foto_url: perfil?.foto_url || null,
            preview: previewTexto(msg.texto), hora: tempoRelativo(msg.created_at), count: 1
          });
        } else {
          existePedido.count++;
          existePedido.preview = previewTexto(msg.texto);
          existePedido.hora = tempoRelativo(msg.created_at);
        }
        atualizarBotaoPedidos();
        if (mostrandoPedidos) renderizarPedidos();
        return;
      }

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
          parceiro_id: senderId, online: senderId === BRAINHUB_BOT_ID, subtitulo: perfil?.curso || '',
          naoLidas: 0, preview: '', hora: '', _lastTime: '', mensagens: []
        };
        conversas.unshift(c);
      }

      c.preview   = previewTexto(msg.texto);
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

// ===== PEDIDOS DE MENSAGEM =====
async function carregarPedidos() {
  if (!usuarioAtual || !window.supabase) return [];

  const { data: msgs } = await window.supabase
    .from('messages')
    .select('sender_id, texto, created_at')
    .eq('receiver_id', usuarioAtual.id)
    .eq('pedido', true)
    .order('created_at', { ascending: false });

  if (!msgs?.length) return [];

  const senderIds = [...new Set(msgs.map(m => m.sender_id))];
  const { data: perfis } = await window.supabase
    .from('profiles').select('id, nome, cor_avatar, foto_url').in('id', senderIds);

  const perfilMap = {};
  (perfis || []).forEach(p => perfilMap[p.id] = p);

  const byS = {};
  for (const m of msgs) {
    if (!byS[m.sender_id]) byS[m.sender_id] = { first: m, count: 0 };
    byS[m.sender_id].count++;
  }

  return Object.entries(byS).map(([senderId, { first, count }]) => {
    const p = perfilMap[senderId] || {};
    const nome = p.nome || 'Usuário';
    return {
      senderId, nome, iniciais: gerarIniciais(nome),
      cor: p.cor_avatar || '', foto_url: p.foto_url || null,
      preview: previewTexto(first.texto || ''),
      hora: tempoRelativo(first.created_at), count
    };
  });
}

async function aceitarPedido(senderId) {
  await window.supabase.from('messages')
    .update({ pedido: false })
    .eq('sender_id', senderId)
    .eq('receiver_id', usuarioAtual.id)
    .eq('pedido', true);

  const [dmsReais, gruposReais] = await Promise.all([carregarConversasDM(), carregarGruposChat()]);
  conversas = [...dmsReais, ...gruposReais]
    .sort((a, b) => new Date(b._lastTime || 0) - new Date(a._lastTime || 0));

  pedidos = pedidos.filter(p => p.senderId !== senderId);
  atualizarBotaoPedidos();

  if (!pedidos.length) fecharPedidos();
  else renderizarPedidos();

  renderizarLista();
  abrirConversa(`dm_${senderId}`);
}

async function recusarPedido(senderId) {
  await window.supabase.from('messages')
    .delete()
    .eq('sender_id', senderId)
    .eq('receiver_id', usuarioAtual.id)
    .eq('pedido', true);

  pedidos = pedidos.filter(p => p.senderId !== senderId);
  atualizarBotaoPedidos();

  if (!pedidos.length) fecharPedidos();
  else renderizarPedidos();
}

function atualizarBotaoPedidos() {
  const btn = document.getElementById('pedidosMsgBtn');
  if (!btn) return;
  if (pedidos.length > 0) {
    btn.style.display = '';
    const countEl = btn.querySelector('.pedidos-count');
    if (countEl) countEl.textContent = pedidos.length;
  } else {
    btn.style.display = 'none';
  }
}

function renderizarPedidos() {
  const lista = document.getElementById('conversationList');
  const header = document.getElementById('pedidosHeader');
  if (header) header.style.display = '';
  mostrandoPedidos = true;
  document.getElementById('pedidosMsgBtn')?.classList.add('active');

  lista.innerHTML = pedidos.map(p => {
    const avatarHTML = p.foto_url
      ? `<div class="conv-avatar av-foto"><img src="${p.foto_url}" alt="${_escapeHtml(p.nome)}" /></div>`
      : `<div class="conv-avatar ${p.cor}">${p.iniciais}</div>`;
    return `
      <li class="conv-item pedido-item">
        ${avatarHTML}
        <div class="conv-info">
          <div class="conv-top">
            <span class="conv-name">${_escapeHtml(p.nome)}</span>
            <span class="conv-time">${p.hora}</span>
          </div>
          <div class="conv-bottom">
            <span class="conv-preview">${_escapeHtml(p.preview)}</span>
            ${p.count > 1 ? `<span class="unread-badge">${p.count}</span>` : ''}
          </div>
          <div class="pedido-actions">
            <button class="pedido-aceitar" data-sender="${p.senderId}">Aceitar</button>
            <button class="pedido-recusar" data-sender="${p.senderId}">Recusar</button>
          </div>
        </div>
      </li>`;
  }).join('') || `<li style="padding:24px;text-align:center;color:var(--muted);font-size:0.9rem">Nenhum pedido de mensagem.</li>`;

  lista.querySelectorAll('.pedido-aceitar').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); aceitarPedido(btn.dataset.sender); });
  });
  lista.querySelectorAll('.pedido-recusar').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); recusarPedido(btn.dataset.sender); });
  });
}

function fecharPedidos() {
  mostrandoPedidos = false;
  const header = document.getElementById('pedidosHeader');
  if (header) header.style.display = 'none';
  document.getElementById('pedidosMsgBtn')?.classList.remove('active');
  renderizarLista();
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

  lista.innerHTML = visiveis.map(c => {
    const rawPreview = c.tipo === 'dm'
      ? (c.preview || 'Sem mensagens')
      : (c.mensagens[c.mensagens.length - 1]?.texto || 'Sem mensagens');
    const preview = previewTexto(rawPreview);
    const horaStr = c.hora || '';
    const avatarHTML = c.foto_url
      ? `<div class="conv-avatar av-foto" style="position:relative"><img src="${c.foto_url}" alt="${c.nome}" />${c.online ? '<span class="online-dot"></span>' : ''}</div>`
      : `<div class="conv-avatar ${c.cor} ${c.tipo === 'group' ? 'group' : ''}" style="position:relative">${c.iniciais}${c.online ? '<span class="online-dot"></span>' : ''}</div>`;
    return `
      <li class="conv-item ${c.id === conversaAtualId ? 'active' : ''}" data-id="${c.id}">
        ${avatarHTML}
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
      <div class="chat-header-sub">${c.tipo === 'dm' ? (c.online ? '<span style="color:#20d3ae">● Online</span>' : '⚫ Offline') : `👥 ${c.subtitulo}`}</div>
    </div>
    <div class="chat-header-actions">
      ${c.tipo === 'dm' && c.parceiro_id ? `
        <button class="icon-btn" title="Chamada de voz"
          onclick="CallManager.startCall('${c.parceiro_id}','${c.nome.replace(/'/g,"\\'")}','audio')">
          <i data-lucide="phone"></i></button>
        <button class="icon-btn" title="Chamada de vídeo"
          onclick="CallManager.startCall('${c.parceiro_id}','${c.nome.replace(/'/g,"\\'")}','video')">
          <i data-lucide="video"></i></button>
      ` : `
        <button class="icon-btn"><i data-lucide="phone"></i></button>
        <button class="icon-btn"><i data-lucide="video"></i></button>
      `}
      ${perfilLink
        ? `<a href="${perfilLink}" class="icon-btn" title="Ver perfil"><i data-lucide="user"></i></a>`
        : c.group_id
          ? `<button class="icon-btn" title="Info do grupo" onclick="abrirInfoGrupo(conversas.find(x=>x.id==='${c.id}'))"><i data-lucide="info"></i></button>`
          : `<button class="icon-btn"><i data-lucide="info"></i></button>`
      }
    </div>`;

  if (c.tipo === 'dm' && c.parceiro_id) {
    parceiroDMAtual = c.parceiro_id;
    document.getElementById('chatMessages').innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px">Carregando...</p>';
    c.mensagens = await carregarMensagensDM(c.parceiro_id);
    subscribeRealtime(c.parceiro_id);
  } else if (c.tipo === 'group' && c.group_id) {
    document.getElementById('chatMessages').innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px">Carregando...</p>';
    c.mensagens = await carregarMensagensGrupo(c.group_id);
    subscribeGrupoRealtime(c.group_id);
  }

  renderizarMensagens(c);
  renderizarLista();
  lucide.createIcons();
  document.getElementById('msgInput').focus();
}

// ===== UPLOAD DE ARQUIVO =====
async function uploadAndSendArquivo(file) {
  const c = conversas.find(x => x.id === conversaAtualId);
  if (!c) return;

  if (file.size > 25 * 1024 * 1024) { alert('Arquivo muito grande (máx 25MB).'); return; }

  let publicUrl;
  try {
    publicUrl = await uploadParaCloudinary(file, 'chat');
  } catch (e) { alert('Erro ao enviar arquivo. Tente novamente.'); return; }

  const isImage = file.type.startsWith('image/');
  const texto   = isImage ? `__img__:${publicUrl}` : `__file__:${file.name}||${publicUrl}`;
  const preview = isImage ? '📷 Imagem' : `📎 ${file.name}`;

  const agora  = new Date();
  const horaStr = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  c.mensagens.push({ id: Date.now(), autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto, hora: horaStr, minha: true });
  c.preview = preview; c.hora = 'agora'; c._lastTime = new Date().toISOString();
  conversas = [c, ...conversas.filter(x => x.id !== c.id)];
  renderizarMensagens(c);
  renderizarLista();

  if (c.tipo === 'dm' && c.parceiro_id) await enviarMensagemDM(c.parceiro_id, texto);
  else if (c.tipo === 'group' && c.group_id) await enviarMensagemGrupo(c.group_id, texto);
}

function previewTexto(texto) {
  if (texto.startsWith('__img__:'))  return '📷 Imagem';
  if (texto.startsWith('__file__:')) return '📎 Arquivo';
  if (texto.startsWith('__post__:')) return '📤 Post compartilhado';
  return texto;
}

function renderTextoMensagem(texto, msg) {
  if (texto.startsWith('__img__:')) {
    const url = texto.slice(8);
    return `<img src="${url}" class="msg-img" alt="imagem" onclick="window.open('${url}','_blank')" onerror="this.style.display='none'">`;
  }
  if (texto.startsWith('__file__:')) {
    const rest   = texto.slice(9);
    const sepIdx = rest.indexOf('||');
    const nome   = sepIdx >= 0 ? rest.slice(0, sepIdx) : 'Arquivo';
    const url    = sepIdx >= 0 ? rest.slice(sepIdx + 2) : rest;
    return `<a href="${url}" target="_blank" rel="noopener" class="msg-file"><span>📎</span> ${nome}</a>`;
  }
  if (texto.startsWith('__post__:')) {
    const parts    = texto.slice(9).split('||');
    const autor    = parts[1] || 'Usuário';
    const textoP   = parts[2] || '';
    const imgUrl   = parts[3] || '';
    const esc      = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const remetente = msg?.minha ? 'Você compartilhou' : `${esc(msg?.autor || 'Alguém')} compartilhou`;
    const ini      = (autor||'?').split(' ').map(p=>p[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    const imgHTML  = imgUrl ? `<img src="${esc(imgUrl)}" class="msg-post-img" onerror="this.style.display='none'" />` : '';
    return `<div class="msg-post-card">
      <div class="msg-post-shared-by"><i data-lucide="share-2"></i> ${remetente} um post</div>
      <div class="msg-post-inner">
        <div class="msg-post-header">
          <div class="msg-post-av">${ini}</div>
          <span class="msg-post-autor-nome">${esc(autor)}</span>
        </div>
        ${imgHTML}
        <p class="msg-post-texto">${esc(textoP)}</p>
        <div class="msg-post-footer">
          <a href="home.html" class="msg-post-link">Ver no feed</a>
        </div>
      </div>
    </div>`;
  }
  // Escapa HTML básico para texto normal
  return texto.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      <div class="msg-bubble ${msg.minha ? 'mine' : 'theirs'}${msg.texto.startsWith('__post__:') ? ' has-post' : ''}">
        ${mostrarAutor ? `<div class="msg-author">${msg.autor}</div>` : ''}
        ${renderTextoMensagem(msg.texto, msg)}
        <div class="msg-time">${msg.hora}</div>
      </div>`;
    area.appendChild(row);
  });
  area.scrollTop = area.scrollHeight;
  if (area.querySelector('.msg-post-card') && window.lucide) lucide.createIcons({ nodes: [area] });
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
  c.preview = previewTexto(texto);
  c.hora = 'agora';
  c._lastTime = new Date().toISOString();
  input.value = '';
  // Sobe conversa ativa pro topo
  conversas = [c, ...conversas.filter(x => x.id !== c.id)];
  renderizarMensagens(c);
  renderizarLista();

  if (c.tipo === 'dm' && c.parceiro_id) {
    await enviarMensagemDM(c.parceiro_id, texto, c.isPedidoContext || false);
  } else if (c.tipo === 'group' && c.group_id) {
    await enviarMensagemGrupo(c.group_id, texto);
  }
}

// ===== INFO DO GRUPO =====
let grupoInfoAtual = null;

document.getElementById('groupInfoFechar').addEventListener('click', () => {
  document.getElementById('groupInfoOverlay').classList.add('hidden');
});
document.getElementById('groupInfoOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('groupInfoOverlay'))
    document.getElementById('groupInfoOverlay').classList.add('hidden');
});

async function abrirInfoGrupo(c) {
  grupoInfoAtual = c;
  document.getElementById('giEmoji').textContent = c.iniciais;
  document.getElementById('giNome').textContent  = c.nome;
  document.getElementById('groupInfoOverlay').classList.remove('hidden');
  lucide.createIcons();
  await carregarInfoGrupo(c);
}

async function carregarInfoGrupo(c) {
  const groupId = c.group_id;

  // Busca grupo (criador)
  const { data: grupo } = await window.supabase
    .from('chat_groups').select('created_by').eq('id', groupId).single();
  const isCreator = grupo?.created_by === usuarioAtual.id;

  // Membros
  const { data: membros } = await window.supabase
    .from('chat_group_members')
    .select('user_id, profiles(nome, cor_avatar, curso)')
    .eq('group_id', groupId);

  document.getElementById('giSub').textContent = `${(membros || []).length} participantes`;

  const giMembros = document.getElementById('giMembros');
  giMembros.innerHTML = (membros || []).map(m => {
    const nome     = m.profiles?.nome || 'Usuário';
    const iniciais = gerarIniciais(nome);
    const cor      = m.profiles?.cor_avatar || '';
    const isSelf   = m.user_id === usuarioAtual.id;
    const isOwner  = m.user_id === grupo?.created_by;
    return `
      <div class="gi-membro" data-uid="${m.user_id}">
        <a href="usuario.html?id=${m.user_id}" style="display:flex;align-items:center;gap:10px;flex:1;text-decoration:none;color:inherit">
          <div class="conv-avatar ${cor}" style="width:38px;height:38px;font-size:0.8rem;flex-shrink:0">${iniciais}</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem">${nome}${isOwner ? ' <span style="color:var(--purple);font-size:0.75rem">criador</span>' : ''}</div>
            <div style="font-size:0.78rem;color:var(--muted)">${m.profiles?.curso || ''}</div>
          </div>
        </a>
        ${isCreator && !isSelf ? `<button class="gi-remover-btn" data-uid="${m.user_id}" title="Remover"><i data-lucide="user-minus"></i></button>` : ''}
      </div>`;
  }).join('');

  // Botão adicionar (só criador)
  const addBtn = document.getElementById('giAdicionarBtn');
  if (isCreator) {
    addBtn.classList.remove('hidden');
    addBtn.onclick = () => toggleGiAddSearch(membros || []);
  } else {
    addBtn.classList.add('hidden');
  }

  // Eventos remover
  giMembros.querySelectorAll('.gi-remover-btn').forEach(btn => {
    btn.addEventListener('click', () => removerMembroGrupo(groupId, btn.dataset.uid));
  });

  // Links nas mensagens
  const urlRegex = /https?:\/\/[^\s<]+/g;
  const links = [];
  (c.mensagens || []).forEach(m => {
    const found = m.texto.match(urlRegex);
    if (found) links.push(...found);
  });
  const giLinks = document.getElementById('giLinks');
  giLinks.innerHTML = links.length
    ? links.map(l => `<a class="gi-link" href="${l}" target="_blank" rel="noopener">${l}</a>`).join('')
    : `<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Nenhum link ainda.</p>`;

  // Imagens (mensagens com URLs de imagem)
  const imgRegex = /https?:\/\/[^\s<]+(\.png|\.jpg|\.jpeg|\.gif|\.webp)(\?[^\s<]*)?/gi;
  const imgs = [];
  (c.mensagens || []).forEach(m => {
    const found = m.texto.match(imgRegex);
    if (found) imgs.push(...found);
  });
  const giImagens = document.getElementById('giImagens');
  giImagens.innerHTML = imgs.length
    ? imgs.map(src => `<img src="${src}" class="gi-img" alt="imagem" onerror="this.remove()">`).join('')
    : `<p style="color:var(--muted);font-size:0.85rem;padding:4px 0">Nenhuma imagem ainda.</p>`;

  lucide.createIcons();
}

async function toggleGiAddSearch(membrosAtuais) {
  const wrap = document.getElementById('giAddSearch');
  wrap.classList.toggle('hidden');
  if (!wrap.classList.contains('hidden')) {
    if (!todosUsuarios.length) await carregarAmigosMutuos();
    const membroIds   = new Set(membrosAtuais.map(m => m.user_id));
    const disponiveis = todosUsuarios.filter(u => !membroIds.has(u.id));
    renderGiAddResultados(disponiveis);
    document.getElementById('giAddInput').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      renderGiAddResultados(disponiveis.filter(u => u.nome.toLowerCase().includes(q)));
    };
  }
}

function renderGiAddResultados(lista) {
  const el = document.getElementById('giAddResultados');
  if (!lista.length) { el.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:8px">Nenhum amigo disponível.</p>`; return; }
  el.innerHTML = lista.map(u => `
    <div class="nova-conv-item" style="cursor:pointer" data-uid="${u.id}">
      <div class="conv-avatar ${u.cor}" style="width:34px;height:34px;font-size:0.78rem">${u.iniciais}</div>
      <div><div style="font-weight:600;font-size:0.88rem">${u.nome}</div><div style="font-size:0.78rem;color:var(--muted)">${u.sub}</div></div>
    </div>`).join('');
  el.querySelectorAll('.nova-conv-item').forEach(item => {
    item.addEventListener('click', () => adicionarMembroGrupo(grupoInfoAtual.group_id, item.dataset.uid));
  });
}

async function adicionarMembroGrupo(groupId, userId) {
  const { error } = await window.supabase
    .from('chat_group_members').insert({ group_id: groupId, user_id: userId });
  if (error) { alert('Erro ao adicionar: ' + error.message); return; }
  document.getElementById('giAddSearch').classList.add('hidden');
  await carregarInfoGrupo(grupoInfoAtual);
}

async function removerMembroGrupo(groupId, userId) {
  const ok = await confirmar({ icone: '👤', titulo: 'Remover participante', mensagem: 'Tem certeza que quer remover este participante do grupo?', btnConfirmar: 'Remover', btnCancelar: 'Cancelar', danger: true });
  if (!ok) return;
  const { error } = await window.supabase
    .from('chat_group_members').delete()
    .eq('group_id', groupId).eq('user_id', userId);
  if (error) { alert('Erro ao remover: ' + error.message); return; }
  await carregarInfoGrupo(grupoInfoAtual);
}

// ===== CRIAR GRUPO =====
const novoGrupoModal   = document.getElementById('novoGrupoModal');
const novoGrupoNomeEl  = document.getElementById('novoGrupoNome');
const novoGrupoMembros = document.getElementById('novoGrupoMembros');
let grupoEmoji         = '💬';
let grupoMembersSel    = new Set();

document.getElementById('newGroupBtn').addEventListener('click', async () => {
  grupoMembersSel = new Set();
  grupoEmoji = '💬';
  novoGrupoNomeEl.value = '';
  novoGrupoModal.classList.remove('hidden');
  await carregarAmigosMutuos();
  renderizarMembrosGrupo();
  lucide.createIcons();

  // Emoji picker
  const picker = document.getElementById('emojiPicker');
  picker.querySelectorAll('span').forEach(s => s.classList.remove('selected'));
  picker.querySelector('span')?.classList.add('selected');
  picker.onclick = (e) => {
    const span = e.target.closest('span');
    if (!span) return;
    picker.querySelectorAll('span').forEach(s => s.classList.remove('selected'));
    span.classList.add('selected');
    grupoEmoji = span.textContent.trim();
  };
});

document.getElementById('novoGrupoFechar').addEventListener('click', () => novoGrupoModal.classList.add('hidden'));
novoGrupoModal.addEventListener('click', e => { if (e.target === novoGrupoModal) novoGrupoModal.classList.add('hidden'); });

document.getElementById('novoGrupoCriar').addEventListener('click', async () => {
  const nome = novoGrupoNomeEl.value.trim();
  if (!nome) { novoGrupoNomeEl.focus(); return; }
  if (grupoMembersSel.size === 0) { alert('Selecione pelo menos um membro.'); return; }

  const btn = document.getElementById('novoGrupoCriar');
  btn.textContent = 'Criando...'; btn.disabled = true;

  const groupId = await criarGrupoChat(nome, grupoEmoji, [...grupoMembersSel]);
  btn.textContent = 'Criar grupo'; btn.disabled = false;

  if (!groupId) { alert('Erro ao criar grupo.'); return; }
  novoGrupoModal.classList.add('hidden');

  // Adiciona à lista local e abre
  const novoGrupo = {
    id: `grpchat_${groupId}`, tipo: 'group', nome,
    iniciais: grupoEmoji, cor: 'group', group_id: groupId,
    subtitulo: `${grupoMembersSel.size + 1} membros`,
    naoLidas: 0, preview: '', hora: '', _lastTime: new Date().toISOString(), mensagens: []
  };
  conversas.unshift(novoGrupo);
  subscribeGrupoRealtime(groupId);
  renderizarLista();
  abrirConversa(novoGrupo.id);
});

function renderizarMembrosGrupo() {
  if (!todosUsuarios.length) {
    novoGrupoMembros.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.85rem;text-align:center">Nenhum amigo mútuo ainda.</p>`;
    return;
  }
  novoGrupoMembros.innerHTML = todosUsuarios.map(u => `
    <label class="grupo-membro-item" style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer">
      <input type="checkbox" data-uid="${u.id}" style="width:16px;height:16px;accent-color:var(--purple)" />
      <div class="conv-avatar ${u.cor}" style="width:36px;height:36px;font-size:0.78rem;flex-shrink:0">${u.iniciais}</div>
      <div>
        <div style="font-weight:600;font-size:0.9rem">${u.nome}</div>
        <div style="font-size:0.78rem;color:var(--muted)">${u.sub}</div>
      </div>
    </label>`).join('');

  novoGrupoMembros.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? grupoMembersSel.add(cb.dataset.uid) : grupoMembersSel.delete(cb.dataset.uid);
    });
  });
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

document.getElementById('attachBtn').addEventListener('click', () => {
  if (!conversaAtualId) return;
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await uploadAndSendArquivo(file);
  e.target.value = '';
});

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

async function iniciarConversaComUsuario(uid, nome, iniciais, cor, sub, isPedidoContext = false) {
  fecharModalNova();

  // Verifica se já existe essa conversa na lista
  const existe = conversas.find(c => c.parceiro_id === uid);
  if (existe) { abrirConversa(existe.id); return; }

  // Cria entrada local e abre
  const novaConv = {
    id: `dm_${uid}`, tipo: 'dm', nome, iniciais, cor,
    parceiro_id: uid, online: uid === BRAINHUB_BOT_ID, subtitulo: sub,
    naoLidas: 0, preview: '', hora: '', mensagens: [],
    isPedidoContext
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
    .from('profiles').select('nome, cor_avatar, curso, foto_url, perfil_publico').eq('id', uid).single();

  if (!perfil) return;

  const nome = perfil.nome || 'Usuário';
  const pedidoParam = params.get('pedido') === '1';
  const jaTemConversa = conversas.some(c => c.parceiro_id === uid);
  const isPedidoContext = (pedidoParam || perfil.perfil_publico === false) && !jaTemConversa;

  await iniciarConversaComUsuario(uid, nome, gerarIniciais(nome), perfil.cor_avatar || '', perfil.curso || '', isPedidoContext);
  window.history.replaceState({}, '', 'chat.html');
}

// ===== EVENTOS =====
document.getElementById('sendBtn').addEventListener('click', enviarMensagem);
document.getElementById('msgInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); enviarMensagem(); }
});
ativarMencoes(document.getElementById('msgInput'), document.getElementById('msgInputDrop'));
document.querySelectorAll('.chat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filtroAtual = tab.dataset.tab;
    renderizarLista();
  });
});
document.getElementById('searchInput').addEventListener('input', renderizarLista);

document.getElementById('pedidosMsgBtn')?.addEventListener('click', () => {
  if (mostrandoPedidos) { fecharPedidos(); return; }
  renderizarPedidos();
});
document.getElementById('pedidosVoltar')?.addEventListener('click', fecharPedidos);

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
  // Registra visita para zerar badge de mensagens não lidas
  localStorage.setItem('brainhub_chat_lastvisit', new Date().toISOString());

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

  const [dmsReais, gruposReais] = await Promise.all([
    carregarConversasDM(),
    carregarGruposChat()
  ]);
  conversas = [...dmsReais, ...gruposReais]
    .sort((a, b) => new Date(b._lastTime || 0) - new Date(a._lastTime || 0));
  renderizarLista();
  pedidos = await carregarPedidos();
  atualizarBotaoPedidos();
  gruposReais.forEach(g => subscribeGrupoRealtime(g.group_id));
  subscribeRealtimeGlobal();
  if (user) CallManager.init(user.id, ME.nome);
  await verificarUrlUsuario();
}

init();
