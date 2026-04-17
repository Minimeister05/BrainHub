import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://ilfhsgecffxusgimopmx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wdr4-5H2vtmGjRdEFKKNIg_SHEUakm3'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== TOAST =====
function mostrarAviso(mensagem, tipo = 'info') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerText = mensagem
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

// ===== CADASTRO =====
const registerForm = document.getElementById('registerForm')
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome  = document.getElementById('reg-nome').value.trim()
    const email = document.getElementById('reg-email').value.trim()
    const senha = document.getElementById('reg-senha').value

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } }
    })

    if (error) {
      mostrarAviso('Erro ao cadastrar: ' + error.message, 'error')
      return
    }

    await supabase.from('profiles').insert({ id: data.user.id, nome })
    mostrarAviso('Cadastrado com sucesso! Redirecionando...', 'success')
    setTimeout(() => window.location.href = 'login.html', 1500)
  })
}

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value.trim()
    const senha = document.getElementById('senha').value
    const lembrar = document.getElementById('lembrar')?.checked ?? false

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })

    if (error) {
      mostrarAviso('Email ou senha incorretos!', 'error')
      return
    }

    // Salva sessão no localStorage para compatibilidade com páginas ainda não migradas
    localStorage.setItem('brainhub_usuario_logado', JSON.stringify({
      nome: data.user.user_metadata?.nome || email,
      email: data.user.email
    }))

    // Controla persistência da sessão com base no "Lembrar de mim"
    if (lembrar) {
      localStorage.setItem('brainhub_remember', 'true')
      sessionStorage.removeItem('brainhub_remember')
    } else {
      sessionStorage.setItem('brainhub_remember', 'true')
      localStorage.removeItem('brainhub_remember')
    }

    mostrarAviso(`Bem vindo!`, 'success')

    const { data: perfil } = await supabase
      .from('profiles')
      .select('curso')
      .eq('id', data.user.id)
      .single()

    setTimeout(() => {
      if (!perfil?.curso) {
        window.location.href = 'onboarding.html'
      } else {
        window.location.href = 'home.html'
      }
    }, 1200)
  })
}

// ===== PROTEÇÃO DE ROTA =====
const paginasPublicas = ['login.html', 'cadastro.html', 'sobre.html', 'suporte.html', 'onboarding.html']
const paginaAtual = window.location.pathname.split('/').pop()

if (!paginasPublicas.includes(paginaAtual)) {
  supabase.auth.getSession().then(async ({ data }) => {
    if (!data.session) {
      window.location.href = 'login.html'
      return
    }

    // Se tem sessão ativa no Supabase, verifica se o usuário quis ser lembrado
    const rememberedPermanently = localStorage.getItem('brainhub_remember') === 'true'
    const rememberedInSession   = sessionStorage.getItem('brainhub_remember') === 'true'

    if (!rememberedPermanently && !rememberedInSession) {
      // Sessão existe no Supabase (localStorage), mas o usuário não marcou "lembrar de mim"
      // e a aba/browser foi fechado → faz logout automático
      await supabase.auth.signOut()
      localStorage.removeItem('brainhub_usuario_logado')
      window.location.href = 'login.html'
    }
  })
}

// ===== RECUPERAR SENHA =====
const btnEsqueceu    = document.getElementById('btnEsqueceuSenha')
const modalRecuperar = document.getElementById('modalRecuperarSenha')
const btnFecharModal = document.getElementById('btnFecharModal')
const formRecuperar  = document.getElementById('formRecuperarSenha')

if (btnEsqueceu && modalRecuperar) {
  let emailParaRecuperar = ''
  let cooldownTimer = null

  function mostrarStep(n) {
    document.getElementById('stepEnviarEmail').style.display = n === 1 ? '' : 'none'
    document.getElementById('stepConfirmacao').style.display = n === 2 ? '' : 'none'
  }

  function fecharModal() {
    modalRecuperar.style.display = 'none'
    mostrarStep(1)
    formRecuperar.reset()
    clearInterval(cooldownTimer)
  }

  function iniciarCooldown(btn) {
    let s = 60
    btn.disabled = true
    btn.textContent = `Reenviar (${s}s)`
    cooldownTimer = setInterval(() => {
      s--
      if (s <= 0) {
        clearInterval(cooldownTimer)
        btn.disabled = false
        btn.textContent = 'Reenviar email'
      } else {
        btn.textContent = `Reenviar (${s}s)`
      }
    }, 1000)
  }

  async function enviarLinkRecuperacao(email) {
    const redirectTo = `${window.location.origin}${window.location.pathname.replace('login.html', '')}redefinir-senha.html`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return error
  }

  btnEsqueceu.addEventListener('click', (e) => {
    e.preventDefault()
    mostrarStep(1)
    modalRecuperar.style.display = 'flex'
  })

  btnFecharModal.addEventListener('click', fecharModal)

  modalRecuperar.addEventListener('click', (e) => {
    if (e.target === modalRecuperar) fecharModal()
  })

  formRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('emailRecuperar').value.trim()
    const btnEnviar = document.getElementById('btnEnviarRecuperar')

    btnEnviar.disabled = true
    btnEnviar.textContent = 'Enviando...'
    const error = await enviarLinkRecuperacao(email)
    btnEnviar.disabled = false
    btnEnviar.textContent = 'Enviar link'

    if (error) {
      mostrarAviso('Erro ao enviar e-mail. Tente novamente.', 'error')
      return
    }

    emailParaRecuperar = email
    document.getElementById('emailEnviado').textContent = email
    mostrarStep(2)
    iniciarCooldown(document.getElementById('btnReenviar'))
  })

  document.getElementById('btnReenviar').addEventListener('click', async () => {
    const btn = document.getElementById('btnReenviar')
    btn.disabled = true
    btn.textContent = 'Enviando...'
    const error = await enviarLinkRecuperacao(emailParaRecuperar)
    if (error) {
      mostrarAviso('Erro ao reenviar e-mail. Tente novamente.', 'error')
      btn.disabled = false
      btn.textContent = 'Reenviar email'
      return
    }
    mostrarAviso('Email reenviado!', 'success')
    iniciarCooldown(btn)
  })

  document.getElementById('btnVoltarModal').addEventListener('click', () => {
    clearInterval(cooldownTimer)
    formRecuperar.reset()
    mostrarStep(1)
  })
}

// ===== SUPORTE =====
const suporteForm = document.getElementById('suporteForm')
if (suporteForm) {
  suporteForm.addEventListener('submit', (e) => {
    e.preventDefault()
    mostrarAviso('Mensagem enviada! Logo entraremos em contato.', 'success')
    suporteForm.reset()
  })
}