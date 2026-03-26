// webrtc-call.js — Ligações de áudio/vídeo via WebRTC + Supabase Realtime

const STUN_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const CallManager = (() => {
  let pc            = null;   // RTCPeerConnection
  let localStream   = null;   // MediaStream local
  let myId          = null;
  let myName        = null;
  let partnerId     = null;
  let partnerName   = null;
  let callType      = null;   // 'audio' | 'video'
  let inboxChannel  = null;   // meu canal de recebimento
  let signalChannel = null;   // canal compartilhado durante a chamada
  let pendingOffer  = null;
  let timerInterval = null;
  let timerSeconds  = 0;
  let muted         = false;
  let cameraOff     = false;

  // ===== INIT =====
  function init(userId, userName) {
    myId   = userId;
    myName = userName;

    // Canal pessoal para receber convites
    inboxChannel = window.supabase
      .channel(`call_inbox_${userId}`)
      .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
        partnerId    = payload.from;
        partnerName  = payload.fromName;
        callType     = payload.type;
        pendingOffer = payload.sdp;
        _showIncoming(partnerName, callType);
      })
      .subscribe();
  }

  // ===== INICIAR CHAMADA =====
  async function startCall(toId, toName, type = 'audio') {
    partnerId   = toId;
    partnerName = toName;
    callType    = type;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: type === 'video'
      });
    } catch (e) {
      _toast('Permita acesso ao ' + (type === 'video' ? 'câmera e microfone' : 'microfone') + ' nas configurações do navegador.');
      return;
    }

    _showOutgoing(toName, type);
    _setupPC(toId);
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await _subscribeSignal(toId);

    await _sendSignal(toId, 'call-invite', {
      from: myId, fromName: myName, type, sdp: pc.localDescription
    });
  }

  // ===== ACEITAR =====
  async function acceptCall() {
    _hideIncoming();

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: callType === 'video'
      });
    } catch (e) {
      _toast('Não foi possível acessar o dispositivo de mídia.');
      await rejectCall();
      return;
    }

    _showActive(partnerName, callType);
    _setupPC(partnerId);
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await _subscribeSignal(partnerId);
    await _sendSignal(partnerId, 'call-answer', { from: myId, sdp: pc.localDescription });
  }

  // ===== REJEITAR =====
  async function rejectCall() {
    _hideIncoming();
    await _sendSignal(partnerId, 'call-reject', { from: myId });
    _cleanup();
  }

  // ===== ENCERRAR =====
  async function endCall() {
    _hideOutgoing();
    _hideActive();
    if (partnerId) await _sendSignal(partnerId, 'call-end', { from: myId });
    _cleanup();
  }

  // ===== PC SETUP =====
  function _setupPC(toId) {
    pc = new RTCPeerConnection(STUN_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        _sendSignal(toId, 'ice-candidate', { from: myId, candidate: e.candidate });
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      remoteStream.addTrack(e.track);
      const vid = document.getElementById('callRemoteVideo');
      const aud = document.getElementById('callRemoteAudio');
      if (vid && callType === 'video') { vid.srcObject = remoteStream; vid.play().catch(() => {}); }
      if (aud) { aud.srcObject = remoteStream; aud.play().catch(() => {}); }
      document.getElementById('callConnecting')?.classList.add('hidden');
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        _hideActive(); _cleanup(); _toast('Chamada encerrada');
      }
    };

    const lv = document.getElementById('callLocalVideo');
    if (lv && callType === 'video') { lv.srcObject = localStream; lv.play().catch(() => {}); }
  }

  // ===== SINALIZAÇÃO =====
  async function _subscribeSignal(toId) {
    const name = `call_signal_${[myId, toId].sort().join('_')}`;
    await new Promise(resolve => {
      signalChannel = window.supabase.channel(name)
        .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
          if (pc && pc.signalingState !== 'closed') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            _showActive(partnerName, callType);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== myId && pc?.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (_) {}
          }
        })
        .on('broadcast', { event: 'call-reject' }, () => {
          _hideOutgoing(); _cleanup(); _toast('Chamada recusada');
        })
        .on('broadcast', { event: 'call-end' }, () => {
          _hideActive(); _cleanup(); _toast('Chamada encerrada');
        })
        .subscribe(status => { if (status === 'SUBSCRIBED') resolve(); });
    });
  }

  async function _sendSignal(toId, event, payload) {
    if (event === 'call-invite') {
      // Convite vai pro inbox pessoal do destinatário
      const ch = window.supabase.channel(`call_inbox_${toId}`);
      await new Promise(resolve => ch.subscribe(s => s === 'SUBSCRIBED' && resolve()));
      await ch.send({ type: 'broadcast', event, payload });
      setTimeout(() => ch.unsubscribe(), 2000);
    } else if (signalChannel) {
      // Usa o canal compartilhado já subscrito — evita conflito de canais
      await signalChannel.send({ type: 'broadcast', event, payload });
    }
  }

  // ===== CONTROLES =====
  function toggleMute() {
    if (!localStream) return;
    muted = !muted;
    localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    const btn = document.getElementById('callMuteBtn');
    if (btn) { btn.classList.toggle('on', muted); btn.title = muted ? 'Ativar mic' : 'Mudo'; }
  }

  function toggleCamera() {
    if (!localStream) return;
    cameraOff = !cameraOff;
    localStream.getVideoTracks().forEach(t => t.enabled = !cameraOff);
    const btn = document.getElementById('callCameraBtn');
    if (btn) btn.classList.toggle('on', cameraOff);
  }

  // ===== TIMER =====
  function _startTimer() {
    timerSeconds = 0;
    const el = document.getElementById('callTimer');
    timerInterval = setInterval(() => {
      timerSeconds++;
      const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
      const s = String(timerSeconds % 60).padStart(2, '0');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
  }
  function _stopTimer() {
    clearInterval(timerInterval);
    const el = document.getElementById('callTimer');
    if (el) el.textContent = '00:00';
  }

  // ===== UI =====
  function _showOutgoing(name, type) {
    const el = document.getElementById('callOutgoing');
    if (!el) return;
    document.getElementById('callOutgoingName').textContent = name;
    document.getElementById('callOutgoingType').textContent = type === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio';
    el.classList.remove('hidden');
  }
  function _hideOutgoing() { document.getElementById('callOutgoing')?.classList.add('hidden'); }

  function _showIncoming(name, type) {
    const el = document.getElementById('callIncoming');
    if (!el) return;
    document.getElementById('callIncomingName').textContent = name;
    document.getElementById('callIncomingType').textContent = type === 'video' ? '📹 Chamada de vídeo' : '🎙️ Chamada de áudio';
    el.classList.remove('hidden');
  }
  function _hideIncoming() { document.getElementById('callIncoming')?.classList.add('hidden'); }

  function _showActive(name, type) {
    _hideOutgoing();
    const el = document.getElementById('callActive');
    if (!el) return;
    document.getElementById('callActiveName').textContent = name;
    document.getElementById('callConnecting').classList.remove('hidden');
    if (type === 'video') document.getElementById('callVideoArea')?.classList.remove('hidden');
    else document.getElementById('callVideoArea')?.classList.add('hidden');
    el.classList.remove('hidden');
    _startTimer();
  }
  function _hideActive() {
    document.getElementById('callActive')?.classList.add('hidden');
    document.getElementById('callVideoArea')?.classList.add('hidden');
    _stopTimer();
    ['callLocalVideo', 'callRemoteVideo', 'callRemoteAudio'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.srcObject = null;
    });
  }

  function _cleanup() {
    if (pc) { pc.close(); pc = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (signalChannel) { signalChannel.unsubscribe(); signalChannel = null; }
    partnerId = partnerName = callType = pendingOffer = null;
    muted = false; cameraOff = false;
    const muteBtn = document.getElementById('callMuteBtn');
    const camBtn  = document.getElementById('callCameraBtn');
    if (muteBtn) muteBtn.classList.remove('on');
    if (camBtn)  camBtn.classList.remove('on');
  }

  function _toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 20px;border-radius:20px;font-size:0.9rem;z-index:9999;pointer-events:none';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return { init, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera };
})();
