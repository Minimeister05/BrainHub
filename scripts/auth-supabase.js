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
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      window.location.href = 'login.html'
    }
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