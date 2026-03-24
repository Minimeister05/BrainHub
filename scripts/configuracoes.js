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
      <h4><i data-lucide="lock"></i> Segurança</h4>
      <div class="config-senha-form">
        <div class="config-field">
          <label>Nova senha</label>
          <input type="password" id="inputNovaSenha" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
        </div>
        <div class="config-field">
          <label>Confirmar nova senha</label>
          <input type="password" id="inputConfirmarSenha" placeholder="Repita a nova senha" autocomplete="new-password" />
        </div>
        <button class="config-salvar-senha-btn" id="btnTrocarSenha">
          <i data-lucide="lock"></i> Trocar senha
        </button>
        <p class="config-senha-msg hidden" id="msgSenha"></p>
      </div>
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

  document.getElementById('btnTrocarSenha').addEventListener('click', async () => {
    const nova = document.getElementById('inputNovaSenha').value;
    const confirmar = document.getElementById('inputConfirmarSenha').value;
    const msg = document.getElementById('msgSenha');

    msg.className = 'config-senha-msg';

    if (!nova || !confirmar) {
      msg.textContent = 'Preencha os dois campos.';
      msg.classList.add('erro');
      return;
    }
    if (nova.length < 6) {
      msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
      msg.classList.add('erro');
      return;
    }
    if (nova !== confirmar) {
      msg.textContent = 'As senhas não coincidem.';
      msg.classList.add('erro');
      return;
    }

    const btn = document.getElementById('btnTrocarSenha');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Salvando...';
    lucide.createIcons();

    const { error } = await window.supabase.auth.updateUser({ password: nova });

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="lock"></i> Trocar senha';
    lucide.createIcons();

    if (error) {
      msg.textContent = 'Erro ao trocar senha: ' + error.message;
      msg.classList.add('erro');
    } else {
      msg.textContent = 'Senha alterada com sucesso!';
      msg.classList.add('sucesso');
      document.getElementById('inputNovaSenha').value = '';
      document.getElementById('inputConfirmarSenha').value = '';
    }
  });

  document.getElementById('btnSair').addEventListener('click', async () => {
    if (window.supabase) await window.supabase.auth.signOut();
    localStorage.removeItem('brainhub_usuario_logado');
    localStorage.removeItem('brainhub_pro');
    window.location.href = 'login.html';
  });
}

renderizar();
