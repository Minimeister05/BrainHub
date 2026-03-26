import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://ilfhsgecffxusgimopmx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wdr4-5H2vtmGjRdEFKKNIg_SHEUakm3'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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

// O Supabase redireciona com o token na URL como hash fragment (#access_token=...&type=recovery)
// O SDK detecta isso automaticamente via onAuthStateChange
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    // Token válido — mostra o formulário
    document.getElementById('cardRedefinir').style.display = ''
    document.getElementById('cardLinkInvalido').style.display = 'none'
  }
})

// Verifica se a URL tem parâmetros de recovery — se não tiver, mostra link inválido
window.addEventListener('load', () => {
  const hash = window.location.hash
  const hasToken = hash.includes('access_token') && hash.includes('type=recovery')
  if (!hasToken) {
    document.getElementById('cardRedefinir').style.display = 'none'
    document.getElementById('cardLinkInvalido').style.display = ''
  }
})

const form = document.getElementById('formRedefinirSenha')
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const novaSenha     = document.getElementById('novaSenha').value
  const confirmar     = document.getElementById('confirmarSenha').value
  const btnRedefinir  = form.querySelector('button[type="submit"]')

  if (novaSenha !== confirmar) {
    mostrarAviso('As senhas não coincidem.', 'error')
    return
  }

  btnRedefinir.disabled = true
  btnRedefinir.textContent = 'Salvando...'

  const { error } = await supabase.auth.updateUser({ password: novaSenha })

  btnRedefinir.disabled = false
  btnRedefinir.textContent = 'Redefinir senha'

  if (error) {
    mostrarAviso('Erro ao redefinir a senha. Tente novamente.', 'error')
    return
  }

  mostrarAviso('Senha redefinida com sucesso! Redirecionando...', 'success')
  setTimeout(() => window.location.href = 'login.html', 2000)
})
