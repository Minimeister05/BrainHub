lucide.createIcons()

let _isPro = false

function confirmarExclusao(mensagem = 'Esta ação não pode ser desfeita.') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'confirm-overlay'
    overlay.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-icon">🗑️</div>
        <h3>Excluir post</h3>
        <p>${mensagem}</p>
        <div class="confirm-actions">
          <button class="confirm-btn-cancel">Cancelar</button>
          <button class="confirm-btn-delete">Excluir</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => { overlay.remove(); resolve(false) })
    overlay.querySelector('.confirm-btn-delete').addEventListener('click', () => { overlay.remove(); resolve(true) })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false) } })
  })
}

function gerarIniciais(nome) {
  return nome.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function mostrarToast(mensagem, tipo = 'success') {
  let container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerText = mensagem
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

const bannerMap = {
  '':                '',
  'av-green':        'bn-green',
  'av-pink':         'bn-pink',
  'av-orange':       'bn-orange',
  'av-blue':         'bn-blue',
  'av-red':          'bn-red',
  'av-pro-gold':     'bn-pro',
  'av-pro-teal':     'bn-teal',
  'av-pro-neon':     'bn-neon',
  'av-pro-ocean':    'bn-ocean',
  'av-pro-magenta':  'bn-magenta',
  'av-pro-sunset':   'bn-sunset',
}

function atualizarPreview({ nome, curso, faculdade, periodo, bio, corAvatar }) {
  const iniciais = gerarIniciais(nome || '?')
  const avatarEl = document.getElementById('perfilAvatar')
  avatarEl.textContent = iniciais
  avatarEl.className = 'perfil-avatar' + (corAvatar ? ` ${corAvatar}` : '')
  document.getElementById('perfilNome').textContent  = nome || '—'
  document.getElementById('perfilCurso').textContent = [curso, faculdade, periodo].filter(Boolean).join(' • ') || '—'
  document.getElementById('perfilBio').textContent   = bio  || ''

  // Banner: Pro sempre gold, outros seguem avatar
  const banner = document.getElementById('perfilBanner')
  const bnClass = _isPro ? 'bn-pro' : (bannerMap[corAvatar] || '')
  banner.className = 'perfil-banner' + (bnClass ? ` ${bnClass}` : '')
}

async function carregarDados() {
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) { window.location.href = 'login.html'; return }

  const { data: perfil } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isPro = perfil?.is_pro === true
  _isPro = isPro
  if (isPro) localStorage.setItem('brainhub_pro', 'true')
  else localStorage.removeItem('brainhub_pro')

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
  localStorage.removeItem('brainhub_remember')
  sessionStorage.removeItem('brainhub_remember')
  window.location.href = 'login.html'
})

// ===== MEUS POSTS =====
async function carregarMeusPosts() {
  const container = document.getElementById('perfilPostsList')
  const { data: { user } } = await window.supabase.auth.getUser()
  if (!user) return

  const { data: posts, error } = await window.supabase
    .from('posts')
    .select('id, texto, created_at, likes(user_id), comments(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = '<p style="text-align:center;padding:32px;color:var(--muted)">Erro ao carregar posts.</p>'
    console.error('Erro ao carregar posts do perfil:', error)
    return
  }

  if (!posts?.length) {
    container.innerHTML = `
      <div class="perfil-posts-empty">
        <div class="empty-icon">📝</div>
        <p>Você ainda não publicou nada.</p>
        <a href="home.html" style="color:#7c5cff;font-size:0.85rem;text-decoration:none;margin-top:8px;display:inline-block;">Ir para o feed →</a>
      </div>`
    return
  }

  container.innerHTML = posts.map(p => `
    <div class="perfil-post-card">
      <div class="perfil-post-texto">${p.texto}</div>
      <div class="perfil-post-meta">
        <span><i data-lucide="heart"></i> ${p.likes?.length || 0} curtidas</span>
        <span><i data-lucide="message-circle"></i> ${p.comments?.length || 0} comentários</span>
        <span class="perfil-post-data">${tempoRelativo(p.created_at)}</span>
      </div>
      <div class="perfil-post-footer">
        <button class="perfil-post-delete" data-id="${p.id}">
          <i data-lucide="trash-2"></i> Excluir
        </button>
      </div>
    </div>`).join('')

  container.querySelectorAll('.perfil-post-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmarExclusao('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')
      if (!confirmado) return
      await window.supabase.from('posts').delete().eq('id', btn.dataset.id)
      btn.closest('.perfil-post-card').remove()
      const stat = document.getElementById('perfilStatPosts')
      if (stat) stat.textContent = Math.max(0, parseInt(stat.textContent) - 1)
    })
  })

  lucide.createIcons()
}

// ===== ABAS =====
let postsCarregados = false
document.querySelectorAll('.perfil-right-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.perfil-right-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    const nome = tab.dataset.tab
    document.getElementById('tabEditar').style.display = nome === 'editar' ? '' : 'none'
    document.getElementById('tabPosts').style.display  = nome === 'posts'  ? '' : 'none'
    if (nome === 'posts' && !postsCarregados) {
      postsCarregados = true
      carregarMeusPosts()
    }
  })
})

carregarDados()