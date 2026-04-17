// Registra o Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// Mantém a bottom nav colada na viewport visível no Safari iOS quando a barra do browser recolhe.
(function () {
  if (!window.visualViewport) return;

  const root = document.documentElement;
  let rafId = null;

  function updateBrowserBottomOffset() {
    const vv = window.visualViewport;
    const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    root.style.setProperty('--browser-bottom-offset', `${Math.round(offset)}px`);
  }

  function scheduleUpdate() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateBrowserBottomOffset();
    });
  }

  updateBrowserBottomOffset();
  window.visualViewport.addEventListener('resize', scheduleUpdate);
  window.visualViewport.addEventListener('scroll', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
})();

// Banner de instalação — só aparece em dispositivos móveis
(function () {
  // Detecta se é mobile (touch device ou tela pequena)
  const isMobile =
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Não mostra se já está rodando como app instalado
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (!isMobile || isInstalled) return;

  let deferredPrompt = null;

  // Injeta o banner no DOM
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #1e1e24;
      border-top: 1px solid rgba(124,92,255,0.3);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 9999;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
      font-family: Arial, Helvetica, sans-serif;
    ">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
        <div style="
          width:40px;height:40px;min-width:40px;
          background:#7c5cff;border-radius:10px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:bold;color:white;
        ">B</div>
        <div>
          <div style="color:#f3f3f6;font-size:0.88rem;font-weight:600;line-height:1.2;">Instalar BrainHUB</div>
          <div style="color:#a4a4b3;font-size:0.78rem;line-height:1.3;">Adicione à tela inicial</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="pwa-install-btn" style="
          padding:8px 18px;
          background:#7c5cff;color:white;
          border:none;border-radius:999px;
          font-size:0.85rem;font-weight:600;
          cursor:pointer;white-space:nowrap;
        ">Instalar</button>
        <button id="pwa-dismiss-btn" style="
          padding:8px;background:transparent;
          color:#a4a4b3;border:none;
          font-size:1.2rem;cursor:pointer;line-height:1;
        ">✕</button>
      </div>
    </div>
  `;

  function showBanner() {
    if (!document.getElementById('pwa-install-banner')) {
      document.body.appendChild(banner);
    }
  }

  function hideBanner() {
    const el = document.getElementById('pwa-install-banner');
    if (el) el.remove();
  }

  // Captura o evento do browser antes de mostrar o prompt nativo
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner();
  });

  // Botão instalar
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'pwa-install-btn') {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'accepted') hideBanner();
      } else {
        // iOS Safari: instrução manual
        alert('Para instalar no iPhone/iPad:\n\nToque em Compartilhar ( ⎙ ) e depois em "Adicionar à Tela de Início".');
      }
    }
    if (e.target.id === 'pwa-dismiss-btn') {
      hideBanner();
      sessionStorage.setItem('pwa-dismissed', '1');
    }
  });

  // Se já foi dispensado nesta sessão, não mostra de novo
  if (sessionStorage.getItem('pwa-dismissed')) return;

  // iOS não dispara beforeinstallprompt — mostra banner direto se for Safari iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  if (isIOS && isSafari && !isInstalled) {
    showBanner();
  }
})();
