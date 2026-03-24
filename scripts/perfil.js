lucide.createIcons()

const PRO_ACCOUNTS = ['suckowerick@gmail.com']

function gerarIniciais(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

function mostrarToast(mensagem, tipo = 'success') {
  let container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerText = mensagem
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

function atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar }) {
  const iniciais = gerarIniciais(nome || '?')
  const avatarEl = document.getElementById('perfilAvatar')
  avatarEl.textContent = iniciais
  avatarEl.className = 'perfil-avatar' + (corAvatar ? ` ${corAvatar}` : '')
  document.getElementById('perfilNome').textContent  = nome || '—'
  document.getElementById('perfilCurso').textContent = [curso, faculdade, periodo].filter(Boolean).join(' • ') || '—'
  document.getElementById('perfilBio').textContent   = bio  || ''
}

async function carregarDados() {
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const isPro = PRO_ACCOUNTS.includes(user.email)
  if (isPro) localStorage.setItem('brainhub_pro', 'true')
  else localStorage.removeItem('brainhub_pro')

  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const nome      = perfil?.nome      || user.user_metadata?.nome || ''
  const curso     = perfil?.curso     || ''
  const faculdade = perfil?.faculdade || ''
  const periodo   = perfil?.periodo   || ''
  const bio       = perfil?.bio       || ''
  const corAvatar = perfil?.cor_avatar || ''

  // Sincroniza localStorage com os dados do Supabase
  localStorage.setItem(`brainhub_perfil_${user.email}`, JSON.stringify({
    nome, curso, faculdade, periodo, bio, corAvatar
  }))

  document.getElementById('infoEmail').textContent    = user.email || '—'
  document.getElementById('inputNome').value          = nome
  document.getElementById('inputCurso').value         = curso
  document.getElementById('inputFaculdade').value     = faculdade
  document.getElementById('inputPeriodo').value       = periodo
  document.getElementById('inputBio').value           = bio
  document.getElementById('bioCount').textContent     = `${bio.length}/160`

  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === corAvatar)
  })

  document.getElementById('proBadgePerfil').style.display   = isPro ? 'flex'        : 'none'
  document.getElementById('verifiedBadge').style.display    = isPro ? 'inline-flex' : 'none'
  document.getElementById('proPlanCard').style.display      = isPro ? 'flex'        : 'none'
  document.getElementById('proCTACard').style.display       = isPro ? 'none'        : 'flex'
  document.getElementById('proColorsSection').style.display = isPro ? 'block'       : 'none'
  document.getElementById('proColorsLocked').style.display  = isPro ? 'none'        : 'flex'
  document.getElementById('infoPlanoBadge').innerHTML       = isPro
    ? '<span class="info-pro-badge"><i data-lucide="crown"></i> Pro</span>'
    : 'Gratuito'

  // Stats reais
  const [{ count: posts }, { count: seguidores }, { count: seguindo }] = await Promise.all([
    window.supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    window.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
  ])
  const el = id => document.getElementById(id)
  if (el('perfilStatPosts'))      el('perfilStatPosts').textContent      = posts      || 0
  if (el('perfilStatSeguidores')) el('perfilStatSeguidores').textContent = seguidores || 0
  if (el('perfilStatSeguindo'))   el('perfilStatSeguindo').textContent   = seguindo   || 0

  atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar })
  lucide.createIcons()
}

async function salvarPerfil() {
  const nome      = document.getElementById('inputNome').value.trim()
  const curso     = document.getElementById('inputCurso').value.trim()
  const faculdade = document.getElementById('inputFaculdade').value.trim()
  const periodo   = document.getElementById('inputPeriodo').value
  const bio       = document.getElementById('inputBio').value.trim()
  const corAvatar = document.querySelector('.color-opt.selected')?.dataset.cor || ''

  if (!nome) {
    mostrarToast('Por favor, insira seu nome.', 'error')
    document.getElementById('inputNome').focus()
    return
  }

  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  const { error } = await window.supabase
    .from('profiles')
    .upsert({ id: user.id, nome, curso, faculdade, periodo, bio, cor_avatar: corAvatar })

  if (error) {
    mostrarToast('Erro ao salvar perfil.', 'error')
    console.error(error)
    return
  }

  // Mantém localStorage como cache
  localStorage.setItem(`brainhub_perfil_${user.email}`, JSON.stringify({
    nome, curso, faculdade, periodo, bio, corAvatar
  }))

  atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar })
  mostrarToast('Perfil salvo com sucesso! ✨', 'success')

  const btn = document.getElementById('btnSalvar')
  btn.textContent = '✓ Salvo!'
  btn.style.background = 'linear-gradient(135deg, #20d3ae, #10a47f)'
  setTimeout(() => {
    btn.innerHTML = '<i data-lucide="check"></i> Salvar Alterações'
    btn.style.background = ''
    lucide.createIcons()
  }, 2000)
}

['inputNome', 'inputCurso', 'inputFaculdade', 'inputBio'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    atualizarPreview({
      nome:       document.getElementById('inputNome').value,
      curso:      document.getElementById('inputCurso').value,
      faculdade:  document.getElementById('inputFaculdade').value,
      periodo:    document.getElementById('inputPeriodo').value,
      bio:        document.getElementById('inputBio').value,
      corAvatar:  document.querySelector('.color-opt.selected')?.dataset.cor || ''
    })
  })
})

document.getElementById('inputPeriodo').addEventListener('change', () => {
  atualizarPreview({
    nome:       document.getElementById('inputNome').value,
    curso:      document.getElementById('inputCurso').value,
    faculdade:  document.getElementById('inputFaculdade').value,
    periodo:    document.getElementById('inputPeriodo').value,
    bio:        document.getElementById('inputBio').value,
    corAvatar:  document.querySelector('.color-opt.selected')?.dataset.cor || ''
  })
})

document.getElementById('inputBio').addEventListener('input', function () {
  document.getElementById('bioCount').textContent = `${this.value.length}/160`
})

document.querySelectorAll('.color-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'))
    btn.classList.add('selected')
    atualizarPreview({
      nome:       document.getElementById('inputNome').value,
      curso:      document.getElementById('inputCurso').value,
      faculdade:  document.getElementById('inputFaculdade').value,
      periodo:    document.getElementById('inputPeriodo').value,
      bio:        document.getElementById('inputBio').value,
      corAvatar:  btn.dataset.cor
    })
  })
})

document.getElementById('colorPickerPro')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-opt')
  if (!btn) return
  document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  atualizarPreview({
    nome:       document.getElementById('inputNome').value,
    curso:      document.getElementById('inputCurso').value,
    faculdade:  document.getElementById('inputFaculdade').value,
    periodo:    document.getElementById('inputPeriodo').value,
    bio:        document.getElementById('inputBio').value,
    corAvatar:  btn.dataset.cor
  })
})

document.getElementById('btnSalvar').addEventListener('click', salvarPerfil)

document.getElementById('btnEditarPerfil').addEventListener('click', () => {
  document.getElementById('inputNome').focus()
  document.querySelector('.perfil-main').scrollTo({ top: 0, behavior: 'smooth' })
})

document.getElementById('btnSair').addEventListener('click', async () => {
  await window.supabase.auth.signOut()
  localStorage.removeItem('brainhub_usuario_logado')
  window.location.href = 'login.html'
})

carregarDados()