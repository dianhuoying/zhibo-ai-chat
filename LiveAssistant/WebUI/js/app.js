/** �ǲ����� - ��Ӧ�����?*/
(function () {
  let statusBar, commentStream, aiReply, quickReplies, settings;
  let folded = false;
  let connected = false;

  function init() {
    commentStream = new CommentStreamController();
    aiReply = new AiReplyController();
    quickReplies = new QuickRepliesController();
    settings = new SettingsController();

    initTitleBar();
    initConnectionBar();
    initControlBar();
    initFoldMode();
    registerBridgeListeners();
    LABridge.send('get:initialState', {});
  }


  /* ---- ������ ---- */
  function initTitleBar() {

    document.getElementById('btnMinimize').addEventListener('click', () => LABridge.send('window:minimize', {}));
    document.getElementById('btnMaximize').addEventListener('click', () => LABridge.send('window:maximize', {}));
    document.getElementById('btnClose').addEventListener('click', () => LABridge.send('window:close', {}));
  }

  /* ---- �۵�/չ�� ---- */
  function initFoldMode() {
    document.getElementById('btnFold').addEventListener('click', () => doFold());
    document.getElementById('btnUnfold').addEventListener('click', () => doUnfold());
  }

  function doFold() {
    if (folded) return;
    folded = true;
    populateFoldedQuickReplies();
    document.getElementById('app').classList.add('folded');
    LABridge.send('window:fold', {});
  }

  function doUnfold() {
    if (!folded) return;
    folded = false;
    document.getElementById('app').classList.remove('folded');
    LABridge.send('window:unfold', {});
  }

  /** ����ݻظ���ť��䵽�۵�խ���м����� */
  function populateFoldedQuickReplies() {
    var container = document.getElementById('foldedQuickReplies');
    if (!container) return;
    container.innerHTML = '';
    var replies = (quickReplies && quickReplies.replies)
      ? quickReplies.replies.slice(0, 6)
      : ['лл��������', '��ӭ�����ı�', '�����ע�����?, '����������', '���Ͻ���', '���ţ�'];
    replies.forEach(function(text) {
      var btn = document.createElement('button');
      btn.className = 'folded-qr-btn';
      btn.textContent = text;
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        LABridge.send('quickreply:send', { text: text });
      });
      container.appendChild(btn);
    });
  }

  /* ---- ��2�㣺������ ---- */
  function initConnectionBar() {
    const btn = document.getElementById('btnConnect');
    const input = document.getElementById('connUrlInput');
    const dot = document.getElementById('connStatusDot');

    btn.addEventListener('click', () => {
      if (connected) {
        disconnect();
      } else {
        const url = input.value.trim();
        if (!url) { input.focus(); input.style.borderColor = 'var(--red)'; setTimeout(() => input.style.borderColor = '', 1500); return; }
        connect(url);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });

    function connect(url) {
      connected = true;
      btn.textContent = '�Ͽ�';
      btn.classList.add('disconnect');
      input.disabled = true;
      dot.classList.add('connected');
      document.getElementById('edgeLight').classList.add('connected');
      document.getElementById('foldedStatusDot').classList.add('connected');
      LABridge.send('state:connect', { url, platform: document.getElementById('platformSelect').value });
    }

    function disconnect() {
      connected = false;
      btn.textContent = '����';
      btn.classList.remove('disconnect');
      input.disabled = false;
      dot.classList.remove('connected');
      document.getElementById('edgeLight').classList.remove('connected');
      document.getElementById('foldedStatusDot').classList.remove('connected');
      LABridge.send('state:disconnect', {});
    }

    window._connectFn = connect;
    window._disconnectFn = disconnect;
    window._isConnected = () => connected;
  }

  /* ---- ��5�㣺������ ---- */
  function initControlBar() {
    initPersonaDropdown();
    initVoiceButtons();
    initTakeoverButton();
    initMuteHint();
    initPlatformSelect();
    initSettingsButton();
  }

  function initPersonaDropdown() {
    const btn = document.getElementById('personaBtn');
    const menu = document.getElementById('personaMenu');
    const personaMap = { gamer: '?? ��Ϸ����', seller: '?? ��������', companion: '?? �������? };

    btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', () => menu.classList.remove('open'));
    menu.addEventListener('click', e => e.stopPropagation());

    menu.querySelectorAll('.persona-item').forEach(item => {
      item.addEventListener('click', () => {
        const persona = item.dataset.persona;
        if (!persona) return;
        menu.querySelectorAll('.persona-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        btn.innerHTML = personaMap[persona] || item.textContent;
        menu.classList.remove('open');
        LABridge.send('persona:set', { persona });
      });
    });

    document.getElementById('personaAdd').addEventListener('click', () => {
      const name = prompt('�������������ƣ�');
      if (!name) return;
      const key = 'custom_' + Date.now();
      const div = document.createElement('div');
      div.className = 'persona-item';
      div.dataset.persona = key;
      div.textContent = '? ' + name;
      div.addEventListener('click', () => {
        menu.querySelectorAll('.persona-item').forEach(i => i.classList.remove('selected'));
        div.classList.add('selected');
        btn.innerHTML = '? ' + name;
        menu.classList.remove('open');
        LABridge.send('persona:set', { persona: key, customName: name });
      });
      menu.insertBefore(div, document.getElementById('personaAdd'));
    });
  }

  function initVoiceButtons() {
    document.querySelectorAll('.voice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const voice = btn.dataset.voice;
        document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        LABridge.send('voice:set', { voice });
        // Play voice sample
        LABridge.send('voice:preview', { voice });
      });
    });
  }

  let takeoverAuto = false;
  function initTakeoverButton() {
    const btn = document.getElementById('btnTakeover');
    btn.addEventListener('click', () => {
      takeoverAuto = !takeoverAuto;
      if (takeoverAuto) {
        btn.textContent = 'AI ȫ�Զ�';
        btn.classList.add('auto');
        // Show stream input bar when manual
        document.getElementById('streamInputBar').classList.remove('visible');
        disableStreamInputs();
      } else {
        btn.textContent = '�ӹ���˷�?;
        btn.classList.remove('auto');
      }
      LABridge.send('mode:takeover', { auto: takeoverAuto });
    });
  }

  function disableStreamInputs() {
    document.getElementById('streamInput').disabled = true;
    document.getElementById('streamSendBtn').disabled = true;
  }
  window._isTakeover = () => !takeoverAuto;
  window._setStreamEnabled = (enabled) => {
    if (!takeoverAuto) {
      document.getElementById('streamInput').disabled = !enabled;
      document.getElementById('streamSendBtn').disabled = !enabled;
      if (enabled) document.getElementById('streamInputBar').classList.add('visible');
    }
  };

  let muted = false;
  function initMuteHint() {
    const hint = document.getElementById('muteHint');
    hint.addEventListener('click', () => {
      muted = !muted;
      hint.classList.toggle('muted', muted);
      hint.textContent = muted ? '??' : '??';
      LABridge.send('audio:mute', { muted });
    });
  }

  function initPlatformSelect() {
    const sel = document.getElementById('platformSelect');
    const connPlatform = document.getElementById('connPlatform');
    connPlatform.textContent = sel.options[sel.selectedIndex].text;
    sel.addEventListener('change', () => {
      connPlatform.textContent = sel.options[sel.selectedIndex].text;
      LABridge.send('platform:set', { platform: sel.value });
    });
  }

  function initSettingsButton() {
    document.getElementById('btnSettings').addEventListener('click', () => settings.open());
  }

  /* ---- Bridge Listeners ---- */
  function registerBridgeListeners() {
    LABridge.on('state:update', (data) => {
      if (data.connected && !connected) window._connectFn();
      else if (!data.connected && connected) window._disconnectFn();
      const dot = document.getElementById('connStatusDot');
      if (data.connected) dot.classList.add('connected');
      else dot.classList.remove('connected');
    });

    LABridge.on('danmaku:new', (data) => commentStream.addComment(data));

    LABridge.on('ai:typing', (data) => aiReply.startTyping(data));
    LABridge.on('ai:char', (data) => aiReply.appendChar(data));
    LABridge.on('ai:complete', (data) => aiReply.complete(data));

    LABridge.on('tts:start', (data) => aiReply.startSynthesis(data));
    LABridge.on('tts:complete', () => aiReply.completeSynthesis());
    LABridge.on('ai:textPushed', () => aiReply.showTextPushed());

    LABridge.on('connection:status', (data) => {
      if (data.connected && !connected) window._connectFn();
      else if (!data.connected && connected) window._disconnectFn();
    });

    LABridge.on('log:entry', (data) => settings.addLogEntry(data));
    LABridge.on('stats:update', (data) => settings.updateStats(data));

    LABridge.on('window:folded', () => {
      folded = true;
      populateFoldedQuickReplies();
      document.getElementById('app').classList.add('folded');
    });
    LABridge.on('window:unfolded', () => {
      folded = false;
      document.getElementById('app').classList.remove('folded');
    });

    LABridge.on('mode:takeover', (data) => {
      takeoverAuto = data.auto;
      const btn = document.getElementById('btnTakeover');
      btn.textContent = takeoverAuto ? 'AI ȫ�Զ�' : '�ӹ���˷�?;
      btn.classList.toggle('auto', takeoverAuto);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
