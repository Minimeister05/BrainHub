// inicializa os ícones da biblioteca Lucide
lucide.createIcons();

// referências principais da área de criação de post
const publishBtn = document.getElementById("publishBtn");
const postInput = document.getElementById("postInput");
const feedList = document.getElementById("feedList");

// chave usada para salvar os posts no navegador
const STORAGE_KEY = "brainhub_posts";

localStorage.removeItem("brainhub_posts");

// dados iniciais exibidos quando ainda não existe nada salvo
const postsPadrao = [
  {
    id: 1,
    autor: "Lucas Mendes",
    curso: "Ciência da Computação",
    tempo: "2h atrás",
    titulo: "Alguém pode me ajudar com Estrutura de Dados?",
    texto:
      "Estou com dificuldade em entender árvores AVL e balanceamento. Alguém tem algum material bom ou pode explicar de forma simples? Agradeço qualquer ajuda! 🌲",
    tags: ["Estrutura de Dados", "Árvore AVL", "Ajuda"],
    likes: 24,
    comentarios: [
      "Tenho um resumo bom disso, posso te mandar.",
      "Procura por animações visuais de AVL, ajuda bastante."
    ],
    curtido: false,
    salvo: false,
    corAvatar: "default"
  },
  {
    id: 2,
    autor: "Ana Martins",
    curso: "Engenharia de Software",
    tempo: "5h atrás",
    titulo: "Resumo completo de Banco de Dados Relacional 📚",
    texto:
      "Galera, fiz um resumo bem detalhado sobre normalização, SQL avançado e modelagem ER. Quem quiser, é só comentar que eu mando o link do PDF.",
    tags: ["Banco de Dados", "Resumo", "SQL"],
    likes: 67,
    comentarios: [
      { autor: "Julia martins", texto: "Me manda, por favor!" },
      { autor: "Pabllo Vittar", texto: "Tava precisando muito disso." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "purple"
  },
  {
    id: 3,
    autor: "Rafael Ferreira",
    curso: "Sistemas de Informação",
    tempo: "7h atrás",
    titulo: "Vale a pena aprender React antes de backend?",
    texto:
      "Tô montando meu roadmap e queria saber se faz sentido focar em front primeiro ou se já começo com Node junto. Quem já passou por isso?",
    tags: ["Carreira", "React", "Frontend"],
    likes: 18,
    comentarios: [
      { autor: "Arrascaeta", texto: "Eu começaria pelo front." },
      { autor: "Alef Manga", texto: "Depende do teu objetivo." }
    ],
    curtido: false,
    salvo: false,
    corAvatar: "green"
  }
];

// gera iniciais do nome para avatar
function gerarIniciais(nome) {
  return nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// lê posts salvos no navegador
function carregarPosts() {
  const postsSalvos = localStorage.getItem(STORAGE_KEY);

  if (postsSalvos) {
    return JSON.parse(postsSalvos);
  }

  salvarPosts(postsPadrao);
  return postsPadrao;
}

// salva posts no navegador
function salvarPosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// monta o HTML de um comentário
function criarComentarioHTML(comentario) {
  if (typeof comentario === "string") {
    return `
      <div class="comment-item">
        <strong class="comment-author">Usuário</strong>
        <p class="comment-text">${comentario}</p>
      </div>
    `;
  }

  return `
    <div class="comment-item">
      <strong class="comment-author">${comentario.autor}</strong>
      <p class="comment-text">${comentario.texto}</p>
    </div>
  `;
}

// monta o HTML de um post
function criarPostHTML(post) {
  const iniciais = gerarIniciais(post.autor);
  const tagsHTML = post.tags.map((tag) => `<span>${tag}</span>`).join("");
  const comentariosHTML = post.comentarios
    .map((comentario) => criarComentarioHTML(comentario))
    .join("");

  return `
    <article class="post-card card" data-id="${post.id}">
      <div class="post-header">
        <div class="post-user">
          <div class="mini-avatar ${post.corAvatar === "default" ? "" : post.corAvatar}">${iniciais}</div>
          <div>
            <h4>${post.autor}</h4>
            <p>${post.curso} • ${post.tempo}</p>
          </div>
        </div>
        <button class="icon-btn small">
          <i data-lucide="more-vertical"></i>
        </button>
      </div>

      <h3>${post.titulo}</h3>
      <p class="post-text">${post.texto}</p>

      <div class="tags">
        ${tagsHTML}
      </div>

      <div class="post-actions">
        <button class="action-btn like-btn ${post.curtido ? "liked" : ""}">
          <i data-lucide="thumbs-up"></i>
          <span>${post.likes}</span>
        </button>

        <button class="action-btn comment-toggle-btn">
          <i data-lucide="message-square"></i>
          <span>${post.comentarios.length}</span>
        </button>

        <button class="action-btn">
          <i data-lucide="share-2"></i>
          <span>0</span>
        </button>

        <button class="action-btn save-btn right ${post.salvo ? "saved" : ""}">
          <i data-lucide="bookmark"></i>
        </button>
      </div>

      <div class="comments-section hidden">
        <div class="comment-form">
          <input
            type="text"
            class="comment-input"
            placeholder="Escreva um comentário..."
            style="background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.2); color: white; outline: none;"/>
          <button
            class="comment-send"
            style="background: #23232b; border: 1px solid rgba(255,255,255,0.16); color: white; padding: 8px 16px; border-radius: 12px; margin-left: 10px; cursor: pointer; font-weight: 500;">
            Enviar
          </button>
        </div>

        <div class="comments-list">
          ${comentariosHTML}
        </div>
      </div>
    </article>
    `;
}

// renderiza todos os posts no feed
function renderizarPosts() {
  const posts = carregarPosts();

  feedList.innerHTML = posts.map((post) => criarPostHTML(post)).join("");

  lucide.createIcons();
  ativarEventosDosPosts();
}

document.querySelectorAll(".comments-section").forEach((secao) => {
  secao.classList.add("hidden");
});

// cria um novo post e salva
function publicarNovoPost() {
  const texto = postInput.value.trim();

  if (texto === "") {
    alert("Escreva algo antes de publicar.");
    return;
  }

  const posts = carregarPosts();

  const novoPost = {
    id: Date.now(),
    autor: "Você",
    curso: "Ciência da Computação",
    tempo: "agora",
    titulo: "Novo post",
    texto: texto,
    tags: ["Post", "BrainHUB"],
    likes: 0,
    comentarios: [],
    curtido: false,
    salvo: false,
    corAvatar: "default"
  };

  posts.unshift(novoPost);
  salvarPosts(posts);
  postInput.value = "";
  renderizarPosts();
}

// adiciona comentário em um post específico
function adicionarComentario(postId, textoComentario) {
  const posts = carregarPosts();
  const post = posts.find((item) => item.id === postId);

  if (!post) return;

  post.comentarios.push({
    autor: "Você",
    texto: textoComentario
  });

  salvarPosts(posts);
  renderizarPosts();
}

// alterna like de um post específico
function alternarLike(postId) {
  const posts = carregarPosts();
  const post = posts.find((item) => item.id === postId);

  if (!post) return;

  if (post.curtido) {
    post.likes -= 1;
    post.curtido = false;
  } else {
    post.likes += 1;
    post.curtido = true;
  }

  salvarPosts(posts);
  renderizarPosts();
}

// alterna salvar de um post específico
function alternarSalvar(postId) {
  const posts = carregarPosts();
  const post = posts.find((item) => item.id === postId);

  if (!post) return;

  post.salvo = !post.salvo;
  salvarPosts(posts);
  renderizarPosts();
}

// conecta eventos dos botões existentes no feed
function ativarEventosDosPosts() {
  const todosPosts = document.querySelectorAll(".post-card");

  todosPosts.forEach((postElemento) => {
    const postId = Number(postElemento.dataset.id);

    const likeBtn = postElemento.querySelector(".like-btn");
    const saveBtn = postElemento.querySelector(".save-btn");
    const commentToggleBtn = postElemento.querySelector(".comment-toggle-btn");
    const commentsSection = postElemento.querySelector(".comments-section");
    const commentInput = postElemento.querySelector(".comment-input");
    const commentSend = postElemento.querySelector(".comment-send");

    likeBtn.addEventListener("click", () => {
      alternarLike(postId);
    });

    saveBtn.addEventListener("click", () => {
      alternarSalvar(postId);
    });

    commentToggleBtn.addEventListener("click", () => {
      commentsSection.classList.toggle("hidden");
    });

    commentSend.addEventListener("click", () => {
      const textoComentario = commentInput.value.trim();

      if (textoComentario === "") {
        return;
      }

      adicionarComentario(postId, textoComentario);
    });

    commentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        const textoComentario = commentInput.value.trim();

        if (textoComentario === "") {
          return;
        }

        adicionarComentario(postId, textoComentario);
      }
    });
    commentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        const textoComentario = commentInput.value.trim();

        if (textoComentario === "") {
          return;
        }

        adicionarComentario(postId, textoComentario);
      }
    });
  });
}

// eventos da caixa principal de criação de posts
publishBtn.addEventListener("click", publicarNovoPost);

postInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    publicarNovoPost();
  }
});

// renderização inicial da página
renderizarPosts();