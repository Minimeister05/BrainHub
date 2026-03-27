lucide.createIcons();
sincronizarStatusPro();
aplicarPerfilNoSidebar();
carregarEstatisticasSidebar();

const painelConfig = document.getElementById('painelConfig');
let usuarioAtual = null;
// Prefs de notificação ficam em localStorage (são pessoais do dispositivo)
const PREFS_KEY = () => `brainhub_prefs_${usuarioAtual?.id}`;
const getPrefs = () => JSON.parse(localStorage.getItem(PREFS_KEY()) || '{}');
const cfg = (chave, padrao) => { const p = getPrefs(); return p[chave] !== undefined ? p[chave] : padrao; };
const savePrefs = (chave, valor) => {
  const p = getPrefs(); p[chave] = valor;
  localStorage.setItem(PREFS_KEY(), JSON.stringify(p));
};

function toggleHTML(chave, label, valor, tipo = 'local') {
  return `
    <label class="config-toggle-row">
      <span>${label}</span>
      <div class="toggle-wrap">
        <input type="checkbox" class="toggle-input" data-chave="${chave}" data-tipo="${tipo}" ${valor ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </div>
    </label>`;
}

async function renderizar(perfil) {
  const u = getPrefs();
  const pp  = perfil?.perfil_publico    !== false; // default true
  const msg = perfil?.msg_desconhecidos !== false; // default true

  painelConfig.innerHTML = `
    <h2 class="config-titulo"><i data-lucide="settings"></i> Configurações</h2>

    <div class="config-grupo">
      <h4><i data-lucide="bell"></i> Notificações</h4>
      ${toggleHTML('notif-comentarios', 'Comentários nos seus posts', cfg('notif-comentarios', true))}
      ${toggleHTML('notif-curtidas',    'Curtidas nos seus posts',    cfg('notif-curtidas',    true))}
      ${toggleHTML('notif-seguidores',  'Novos seguidores',           cfg('notif-seguidores',  true))}
    </div>

    <div class="config-grupo">
      <h4><i data-lucide="shield"></i> Privacidade</h4>
      ${toggleHTML('perfil_publico',     'Perfil público',                     pp,  'db')}
      ${toggleHTML('msg_desconhecidos',  'Receber mensagens de desconhecidos', msg, 'db')}
    </div>

    <div class="config-grupo">
      <h4><i data-lucide="user-cog"></i> Conta</h4>
      <a href="perfil.html"  class="config-link-btn"><i data-lucide="pencil"></i> Editar perfil</a>
      <a href="planos.html"  class="config-link-btn">
        <i data-lucide="crown"></i> ${perfil?.is_pro ? 'Gerenciar plano Pro' : 'Assinar BrainHUB Pro'}
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

    <div class="config-grupo">
      <h4><i data-lucide="life-buoy"></i> Suporte</h4>
      <p class="config-suporte-desc">Teve algum problema ou quer mandar um feedback? Fala com a gente.</p>
      <div class="config-field">
        <label>Assunto</label>
        <input type="text" id="supAssunto" placeholder="Ex: Problema no login" maxlength="100" />
      </div>
      <div class="config-field">
        <label>Mensagem</label>
        <textarea id="supMensagem" rows="4" placeholder="Descreva o que aconteceu..."></textarea>
      </div>
      <button class="config-salvar-senha-btn" id="btnSuporteEnviar">
        <i data-lucide="send"></i> Enviar mensagem
      </button>
      <p class="config-senha-msg hidden" id="msgSuporte"></p>
    </div>
  `;

  lucide.createIcons();

  // ===== TOGGLES =====
  painelConfig.querySelectorAll('.toggle-input').forEach(input => {
    input.addEventListener('change', async () => {
      const chave = input.dataset.chave;
      const valor = input.checked;

      if (input.dataset.tipo === 'db') {
        // Salva no Supabase
        input.disabled = true;
        await window.supabase.from('profiles').update({ [chave]: valor }).eq('id', usuarioAtual.id);
        input.disabled = false;
      } else {
        // Salva em localStorage
        savePrefs(chave, valor);
      }
    });
  });

  // ===== TROCAR SENHA =====
  document.getElementById('btnTrocarSenha').addEventListener('click', async () => {
    const nova      = document.getElementById('inputNovaSenha').value;
    const confirmar = document.getElementById('inputConfirmarSenha').value;
    const msg = document.getElementById('msgSenha');
    msg.className = 'config-senha-msg';

    if (!nova || !confirmar)  { msg.textContent = 'Preencha os dois campos.'; msg.classList.add('erro'); return; }
    if (nova.length < 6)      { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; msg.classList.add('erro'); return; }
    if (nova !== confirmar)   { msg.textContent = 'As senhas não coincidem.'; msg.classList.add('erro'); return; }

    const btn = document.getElementById('btnTrocarSenha');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Salvando...';
    lucide.createIcons();

    const { error } = await window.supabase.auth.updateUser({ password: nova });
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="lock"></i> Trocar senha';
    lucide.createIcons();

    if (error) {
      msg.textContent = 'Erro: ' + error.message;
      msg.classList.add('erro');
    } else {
      msg.textContent = 'Senha alterada com sucesso!';
      msg.classList.add('sucesso');
      document.getElementById('inputNovaSenha').value = '';
      document.getElementById('inputConfirmarSenha').value = '';
    }
  });

  // ===== SAIR =====
  document.getElementById('btnSair').addEventListener('click', async () => {
    if (window.supabase) await window.supabase.auth.signOut();
    localStorage.removeItem('brainhub_usuario_logado');
    localStorage.removeItem('brainhub_pro');
    localStorage.removeItem('brainhub_remember');
    sessionStorage.removeItem('brainhub_remember');
    window.location.href = 'login.html';
  });

  // ===== SUPORTE =====
  document.getElementById('btnSuporteEnviar').addEventListener('click', async () => {
    const assunto  = document.getElementById('supAssunto').value.trim();
    const mensagem = document.getElementById('supMensagem').value.trim();
    const msg      = document.getElementById('msgSuporte');
    msg.className  = 'config-senha-msg';

    if (!assunto || !mensagem) {
      msg.textContent = 'Preencha o assunto e a mensagem.';
      msg.classList.add('erro');
      return;
    }

    const btn = document.getElementById('btnSuporteEnviar');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Enviando...';
    lucide.createIcons();

    const nome  = perfil?.nome  || 'Usuário';
    const email = usuarioAtual?.email || '';

    try {
      await emailjs.send('service_9u04ixa', 'template_7ziq0rg', {
        to_email: 'brainhubsuporte@gmail.com',
        subject:  `[Suporte] ${assunto}`,
        message:  `De: ${nome} <${email}>\n\n${mensagem}`,
      });
      msg.textContent = 'Mensagem enviada! Retornaremos em breve.';
      msg.classList.add('sucesso');
      document.getElementById('supAssunto').value  = '';
      document.getElementById('supMensagem').value = '';
    } catch (err) {
      msg.textContent = 'Erro ao enviar. Tente novamente ou use brainhubsuporte@gmail.com';
      msg.classList.add('erro');
      console.error(err);
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send"></i> Enviar mensagem';
    lucide.createIcons();
  });
}

async function init() {
  if (!window.supabase) { setTimeout(init, 150); return; }
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  usuarioAtual = user;

  const { data: perfil } = await window.supabase
    .from('profiles').select('*').eq('id', user.id).single();

  renderizar(perfil);
}

init();
