lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const feedSalvos = document.getElementById('feedSalvos');

function renderizar() {
  const salvos = carregarPosts().filter(p => p.salvo);
  if (salvos.length === 0) {
    feedSalvos.innerHTML = `
      <div class="aba-empty">
        <i data-lucide="bookmark"></i>
        <h3>Nenhum post salvo ainda.</h3>
        <p>Toque no ícone de marcador nos posts para salvar.</p>
      </div>`;
    lucide.createIcons();
    return;
  }
  renderizarFeed(feedSalvos, salvos, false);
}

renderizar();
