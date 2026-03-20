// scripts/chat.js

lucide.createIcons();

// ===== DADOS =====
const ME = { nome: "Lucas Mendes", iniciais: "LM", cor: "c1" };

const conversasFake = [
  {
    id: 1, tipo: "dm", nome: "Ana Martins", iniciais: "AM", cor: "c3",
    online: true, subtitulo: "Engenharia de Software", naoLidas: 2,
    mensagens: [
      { id: 1, autor: "Ana Martins", iniciais: "AM", cor: "c3", texto: "Oi Lucas! Vi seu post sobre AVL, posso te ajudar 😊", hora: "14:30", minha: false },
      { id: 2, autor: "Ana Martins", iniciais: "AM", cor: "c3", texto: "Tenho uns materiais bem bons sobre árvores AVL.", hora: "14:30", minha: false },
      { id: 3, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Oi Ana! Que ótimo, muito obrigado!", hora: "14:32", minha: true },
      { id: 4, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Pode me mandar sim, vou adorar!", hora: "14:32", minha: true },
      { id: 5, autor: "Ana Martins", iniciais: "AM", cor: "c3", texto: "Claro! Vou te mandar o link agora.", hora: "14:33", minha: false },
      { id: 6, autor: "Ana Martins", iniciais: "AM", cor: "c3", texto: "Qualquer dúvida me chama 😊", hora: "14:34", minha: false },
    ]
  },
  {
    id: 2, tipo: "dm", nome: "Rafael Ferreira", iniciais: "RF", cor: "c2",
    online: false, subtitulo: "Sistemas de Informação", naoLidas: 0,
    mensagens: [
      { id: 1, autor: "Rafael Ferreira", iniciais: "RF", cor: "c2", texto: "E aí bro, você já trabalhou com React antes?", hora: "10:15", minha: false },
      { id: 2, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Sim! Já fiz alguns projetos pessoais.", hora: "10:20", minha: true },
      { id: 3, autor: "Rafael Ferreira", iniciais: "RF", cor: "c2", texto: "Você acha que vale aprender antes de backend?", hora: "10:21", minha: false },
      { id: 4, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Depende do objetivo, mas eu comecei pelo front e funcionou bem.", hora: "10:23", minha: true },
      { id: 5, autor: "Rafael Ferreira", iniciais: "RF", cor: "c2", texto: "Faz sentido, valeu!", hora: "10:24", minha: false },
    ]
  },
  {
    id: 3, tipo: "group", nome: "Programação & Dev", iniciais: "💻", cor: "group",
    online: false, subtitulo: "2.4k membros", naoLidas: 5,
    mensagens: [
      { id: 1, autor: "Mariana Costa", iniciais: "MC", cor: "c4", texto: "Alguém sabe resolver um problema de CORS no Node?", hora: "09:00", minha: false },
      { id: 2, autor: "Pedro Alves", iniciais: "PA", cor: "c5", texto: "Instala o pacote cors e configura no app.use()", hora: "09:02", minha: false },
      { id: 3, autor: "Mariana Costa", iniciais: "MC", cor: "c4", texto: "Funcionou! Obrigada Pedro 🙏", hora: "09:05", minha: false },
      { id: 4, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Boa! Esse erro é clássico mesmo.", hora: "09:10", minha: true },
      { id: 5, autor: "Pedro Alves", iniciais: "PA", cor: "c5", texto: "Todo mundo passa por isso haha", hora: "09:11", minha: false },
      { id: 6, autor: "Julia Santos", iniciais: "JS", cor: "c6", texto: "Galera, dica de deploy gratuito pra projetos Node?", hora: "11:30", minha: false },
      { id: 7, autor: "Rafael Ferreira", iniciais: "RF", cor: "c2", texto: "Railway ou Render, os dois são ótimos!", hora: "11:32", minha: false },
      { id: 8, autor: "Julia Santos", iniciais: "JS", cor: "c6", texto: "Show! Vou testar o Railway 🚀", hora: "11:33", minha: false },
    ]
  },
  {
    id: 4, tipo: "group", nome: "Cálculo III — Turma 3B", iniciais: "📐", cor: "group",
    online: false, subtitulo: "34 membros", naoLidas: 0,
    mensagens: [
      { id: 1, autor: "Prof. Souza", iniciais: "PS", cor: "c5", texto: "Bom dia pessoal! Prova semana que vem, não esqueçam.", hora: "08:00", minha: false },
      { id: 2, autor: "Carla Lima", iniciais: "CL", cor: "c3", texto: "Professor, vai cair integrais duplas?", hora: "08:05", minha: false },
      { id: 3, autor: "Prof. Souza", iniciais: "PS", cor: "c5", texto: "Sim, toda a matéria de séries e integrais múltiplas.", hora: "08:07", minha: false },
      { id: 4, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Vou revisar os exercícios do capítulo 12 então.", hora: "08:10", minha: true },
      { id: 5, autor: "Carla Lima", iniciais: "CL", cor: "c3", texto: "Alguém quer fazer um grupo de estudos?", hora: "08:15", minha: false },
      { id: 6, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Eu topo! Pode ser na biblioteca na sexta?", hora: "08:16", minha: true },
    ]
  },
  {
    id: 5, tipo: "dm", nome: "Carla Lima", iniciais: "CL", cor: "c3",
    online: true, subtitulo: "Ciência da Computação", naoLidas: 1,
    mensagens: [
      { id: 1, autor: "Carla Lima", iniciais: "CL", cor: "c3", texto: "Lucas, você tem os slides do Souza da aula passada?", hora: "Hoje", minha: false },
    ]
  },
  {
    id: 6, tipo: "dm", nome: "Pedro Alves", iniciais: "PA", cor: "c5",
    online: false, subtitulo: "Engenharia de Software", naoLidas: 0,
    mensagens: [
      { id: 1, autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto: "Pedro, você toparia fazer o trabalho de IA juntos?", hora: "Ontem", minha: true },
      { id: 2, autor: "Pedro Alves", iniciais: "PA", cor: "c5", texto: "Sim! Me manda os requisitos quando tiver.", hora: "Ontem", minha: false },
    ]
  }
];

// ===== ESTADO =====
const STORAGE_KEY = "brainhub_chat";
let conversas = [];
let conversaAtualId = null;
let filtroAtual = "all";

// ===== INIT =====
function inicializar() {
  const salvas = localStorage.getItem(STORAGE_KEY);
  conversas = salvas ? JSON.parse(salvas) : conversasFake;
  if (!salvas) salvar();
  renderizarLista();
}

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversas));
}

// ===== LISTA =====
function renderizarLista() {
  const lista = document.getElementById("conversationList");
  const busca = document.getElementById("searchInput").value.toLowerCase();

  const visiveis = conversas.filter(c => {
    const passaFiltro = filtroAtual === "all" || c.tipo === filtroAtual;
    const passaBusca = c.nome.toLowerCase().includes(busca);
    return passaFiltro && passaBusca;
  });

  if (visiveis.length === 0) {
    lista.innerHTML = `<li style="padding:24px;text-align:center;color:var(--muted);font-size:0.9rem;">Nenhuma conversa encontrada.</li>`;
    return;
  }

  lista.innerHTML = visiveis.map(c => {
    const ultima = c.mensagens[c.mensagens.length - 1];
    const preview = ultima ? (ultima.minha ? `Você: ${ultima.texto}` : ultima.texto) : "Sem mensagens";
    const hora = ultima ? ultima.hora : "";

    return `
      <li class="conv-item ${c.id === conversaAtualId ? "active" : ""}" data-id="${c.id}">
        <div class="conv-avatar ${c.cor} ${c.tipo === "group" ? "group" : ""}">
          ${c.iniciais}
          ${c.online && c.tipo === "dm" ? '<span class="online-dot"></span>' : ""}
        </div>
        <div class="conv-info">
          <div class="conv-top">
            <span class="conv-name">${c.nome}</span>
            <span class="conv-time">${hora}</span>
          </div>
          <div class="conv-bottom">
            <span class="conv-preview ${c.naoLidas > 0 ? "unread" : ""}">${preview}</span>
            ${c.naoLidas > 0 ? `<span class="unread-badge">${c.naoLidas}</span>` : ""}
          </div>
        </div>
      </li>
    `;
  }).join("");

  lista.querySelectorAll(".conv-item").forEach(item => {
    item.addEventListener("click", () => abrirConversa(Number(item.dataset.id)));
  });
}

// ===== ABRIR CONVERSA =====
function abrirConversa(id) {
  conversaAtualId = id;
  const c = conversas.find(x => x.id === id);
  if (!c) return;

  c.naoLidas = 0;
  salvar();

  document.getElementById("chatEmpty").classList.add("hidden");
  document.getElementById("chatOpen").classList.remove("hidden");

  document.getElementById("chatHeader").innerHTML = `
    <div class="conv-avatar ${c.cor} ${c.tipo === "group" ? "group" : ""}" style="width:40px;height:40px;font-size:${c.tipo === "group" ? "1.2rem" : "0.9rem"};">
      ${c.iniciais}
      ${c.online && c.tipo === "dm" ? '<span class="online-dot"></span>' : ""}
    </div>
    <div class="chat-header-info">
      <div class="chat-header-name">${c.nome}</div>
      <div class="chat-header-sub">
        ${c.tipo === "dm"
          ? (c.online ? "🟢 Online agora" : "⚫ Offline")
          : `👥 ${c.subtitulo}`}
      </div>
    </div>
    <div class="chat-header-actions">
      <button class="icon-btn"><i data-lucide="phone"></i></button>
      <button class="icon-btn"><i data-lucide="video"></i></button>
      <button class="icon-btn"><i data-lucide="info"></i></button>
    </div>
  `;

  renderizarMensagens(c);
  renderizarLista();
  lucide.createIcons();
  document.getElementById("msgInput").focus();
}

// ===== MENSAGENS =====
function renderizarMensagens(c) {
  const area = document.getElementById("chatMessages");
  area.innerHTML = "";

  c.mensagens.forEach(msg => {
    const row = document.createElement("div");
    row.className = `msg-row ${msg.minha ? "mine" : ""}`;

    const mostrarAutor = c.tipo === "group" && !msg.minha;

    row.innerHTML = `
      ${!msg.minha ? `
        <div class="conv-avatar ${msg.cor}" style="width:28px;height:28px;border-radius:50%;font-size:0.62rem;font-weight:700;display:grid;place-items:center;flex-shrink:0;">
          ${msg.iniciais}
        </div>
      ` : ""}
      <div class="msg-bubble ${msg.minha ? "mine" : "theirs"}">
        ${mostrarAutor ? `<div class="msg-author">${msg.autor}</div>` : ""}
        ${msg.texto}
        <div class="msg-time">${msg.hora}</div>
      </div>
    `;

    area.appendChild(row);
  });

  area.scrollTop = area.scrollHeight;
}

// ===== ENVIO =====
function enviarMensagem() {
  const input = document.getElementById("msgInput");
  const texto = input.value.trim();
  if (!texto || conversaAtualId === null) return;

  const c = conversas.find(x => x.id === conversaAtualId);
  if (!c) return;

  const agora = new Date();
  const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

  c.mensagens.push({ id: Date.now(), autor: ME.nome, iniciais: ME.iniciais, cor: ME.cor, texto, hora, minha: true });
  salvar();
  input.value = "";
  renderizarMensagens(c);
  renderizarLista();

  if (c.tipo === "dm") simularResposta(c);
}

// ===== RESPOSTA SIMULADA =====
const respostas = [
  "Entendi! Vou ver isso mais tarde 😄",
  "Boa! Me manda quando tiver pronto.",
  "Com certeza! Podemos marcar.",
  "Haha é verdade! Bem lembrado.",
  "Pode deixar, eu cuido disso.",
  "Ótima ideia! Vamos nessa 🚀",
  "Tô dentro! Conta comigo.",
  "Faz sentido, valeu pela dica!",
];

function simularResposta(c) {
  const area = document.getElementById("chatMessages");
  const typing = document.createElement("div");
  typing.id = "typingIndicator";
  typing.className = "typing-indicator";
  typing.innerHTML = `
    <div class="conv-avatar ${c.cor}" style="width:28px;height:28px;border-radius:50%;font-size:0.62rem;font-weight:700;display:grid;place-items:center;flex-shrink:0;">
      ${c.iniciais}
    </div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
  `;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;

  setTimeout(() => {
    document.getElementById("typingIndicator")?.remove();

    const agora = new Date();
    const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    c.mensagens.push({
      id: Date.now(),
      autor: c.nome, iniciais: c.iniciais, cor: c.cor,
      texto: respostas[Math.floor(Math.random() * respostas.length)],
      hora, minha: false
    });

    salvar();
    renderizarMensagens(c);
    renderizarLista();
  }, 1200 + Math.random() * 800);
}

// ===== EVENTOS =====
document.getElementById("sendBtn").addEventListener("click", enviarMensagem);

document.getElementById("msgInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); enviarMensagem(); }
});

document.querySelectorAll(".chat-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".chat-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    filtroAtual = tab.dataset.tab;
    renderizarLista();
  });
});

document.getElementById("searchInput").addEventListener("input", renderizarLista);

inicializar();