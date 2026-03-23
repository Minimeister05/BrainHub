lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();

const painelConfig = document.getElementById('painelConfig');

function toggleConfig(chave, label, valor, usuario) {
  return `
    <label class="config-toggle-row">
      <span>${label}</span>
      <div class="toggle-wrap">
        <input type="checkbox" class="toggle-input" data-chave="${chave}" data-usuario="${usuario}" ${valor ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </div>
    </label>`;
}

function renderizar() {
  const u = getPerfilAtual();
  const prefs = JSON.parse(localStorage.getItem(`brainhub_prefs_${u.nome}`) || '{}');
  const cfg = (chave, padrao) => prefs[chave] !== undefined ? prefs[chave] : padrao;

  painelConfig.innerHTML = `
    <h2 class="config-titulo"><i data-lucide="settings"></i> Configurações</h2>

    <div class="config-grupo">
      <h4><i data-lucide="bell"></i> Notificações</h4>
      ${toggleConfig('notif-comentarios', 'Comentários nos seus posts',       cfg('notif-comentarios', true),  u.nome)}
      ${toggleConfig('notif-curtidas',    'Curtidas nos seus posts',          cfg('notif-curtidas',    true),  u.nome)}
      ${toggleConfig('notif-seguidores',  'Novos seguidores',                 cfg('notif-seguidores',  true),  u.nome)}
      ${toggleConfig('notif-mensagens',   'Mensagens diretas',                cfg('notif-mensagens',   true),  u.nome)}
    </div>

    <div class="config-grupo">
      <h4><i data-lucide="shield"></i> Privacidade</h4>
      ${toggleConfig('perfil-publico',     'Perfil público',                        cfg('perfil-publico',     true),  u.nome)}
      ${toggleConfig('msg-desconhecidos',  'Receber mensagens de desconhecidos',    cfg('msg-desconhecidos',  false), u.nome)}
      ${toggleConfig('mostrar-online',     'Mostrar quando estou online',           cfg('mostrar-online',     true),  u.nome)}
    </div>

    <div class="config-grupo">
      <h4><i data-lucide="user-cog"></i> Conta</h4>
      <a href="perfil.html" class="config-link-btn"><i data-lucide="pencil"></i> Editar perfil</a>
      <a href="planos.html" class="config-link-btn${u.isPro ? ' is-pro' : ''}">
        <i data-lucide="crown"></i> ${u.isPro ? 'Gerenciar plano Pro' : 'Assinar BrainHUB Pro'}
      </a>
    </div>

    <div class="config-grupo">
      <h4><i data-lucide="log-out"></i> Sessão</h4>
      <button class="config-sair-btn" id="btnSair"><i data-lucide="log-out"></i> Sair da conta</button>
    </div>
  `;

  lucide.createIcons();

  painelConfig.querySelectorAll('.toggle-input').forEach(input => {
    input.addEventListener('change', () => {
      const prefs = JSON.parse(localStorage.getItem(`brainhub_prefs_${input.dataset.usuario}`) || '{}');
      prefs[input.dataset.chave] = input.checked;
      localStorage.setItem(`brainhub_prefs_${input.dataset.usuario}`, JSON.stringify(prefs));
    });
  });

  document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('brainhub_usuario_logado');
    localStorage.removeItem('brainhub_pro');
    window.location.href = 'login.html';
  });
}

renderizar();
