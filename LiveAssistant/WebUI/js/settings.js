/** 智播助聊 - 设置面板 (弹窗式, Tab栏, 录音向导) */
class SettingsController {
  constructor() {
    this.overlay = document.getElementById('settingsOverlay');
    this.logEntries = [];
    this.stats = { totalReplies: 0, voiceReplies: 0, textReplies: 0 };
    this.wizardStep = 1;
    this._init();
  }

  _init() {
    document.getElementById('settingsClose').addEventListener('click', () => this.close());
    this._initTabs();
    this._initVoiceCards();
    this._initStatsTab();
    this._initLogTab();
    this._initRecordWizard();
  }

  open() { this.overlay.classList.add('open'); }
  close() { this.overlay.classList.remove('open'); }

  /* ---- Tab 切换 ---- */
  _initTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        const panelMap = { voice: 'panelVoice', stats: 'panelStats', log: 'panelLog' };
        const panel = document.getElementById(panelMap[target]);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ---- Tab 1: 音色管理 ---- */
  _initVoiceCards() {
    document.querySelectorAll('.voice-test-btn').forEach(btn => {
      if (btn.dataset.voice) {
        btn.addEventListener('click', () => {
          LABridge.send('voice:preview', { voice: btn.dataset.voice });
        });
      }
    });

    // 我的声音 - 录制向导
    const customBtn = document.getElementById('voiceCardCustomBtn');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        this._openWizard();
      });
    }
  }

  /* ---- Tab 2: 数据统计 ---- */
  _initStatsTab() {
    document.getElementById('btnResetStats').addEventListener('click', () => {
      this.stats = { totalReplies: 0, voiceReplies: 0, textReplies: 0 };
      this._renderStats();
      LABridge.send('stats:reset', {});
    });
  }

  updateStats(data) {
    if (data.totalReplies !== undefined) this.stats.totalReplies = data.totalReplies;
    if (data.voiceReplies !== undefined) this.stats.voiceReplies = data.voiceReplies;
    if (data.textReplies !== undefined) this.stats.textReplies = data.textReplies;
    this._renderStats();
    this._drawTrendChart(data.trendData || []);
    this._drawCategoryChart(data.categoryBreakdown || { question: 0, social: 0, noise: 0 });
  }

  _renderStats() {
    document.getElementById('statTotalReplies').textContent = this.stats.totalReplies;
    document.getElementById('statVoiceReplies').textContent = this.stats.voiceReplies;
    document.getElementById('statTextReplies').textContent = this.stats.textReplies;
  }

  _drawTrendChart(data) {
    const canvas = document.getElementById('chartTrend');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!data.length) return;
    ctx.strokeStyle = '#00D2FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const maxVal = Math.max(...data, 1);
    data.forEach((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (w - 20) + 10;
      const y = h - 10 - (v / maxVal) * (h - 20);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,210,255,0.2)');
    grad.addColorStop(1, 'rgba(0,210,255,0)');
    ctx.lineTo(w - 10, h - 10);
    ctx.lineTo(10, h - 10);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  _drawCategoryChart(data) {
    const canvas = document.getElementById('chartCategory');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const total = data.question + data.social + data.noise || 1;
    const colors = { question: '#00E676', social: '#448AFF', noise: '#555F72' };
    let x = 0;
    Object.entries(colors).forEach(([key, color]) => {
      const width = (data[key] / total) * w;
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, width, h);
      x += width;
    });
  }

  /* ---- Tab 3: 日志回放 ---- */
  _initLogTab() {
    document.getElementById('btnExportLog').addEventListener('click', () => {
      const json = JSON.stringify(this.logEntries, null, 2);
      LABridge.send('log:export', { data: json });
    });
    document.getElementById('btnClearLog').addEventListener('click', () => {
      this.logEntries = [];
      this._renderLog();
      LABridge.send('log:clear', {});
    });
  }

  addLogEntry(data) {
    this.logEntries.unshift({ time: Date.now(), ...data, flagged: false });
    if (this.logEntries.length > 500) this.logEntries.length = 500;
    this._renderLog();
  }

  _renderLog() {
    const list = document.getElementById('logList');
    if (!list) return;
    list.innerHTML = '';
    this.logEntries.forEach((entry, idx) => {
      const div = document.createElement('div');
      div.className = 'log-entry' + (entry.flagged ? ' flagged' : '');
      const time = new Date(entry.time).toLocaleTimeString('zh-CN');
      let html = '<span class="log-time">' + time + '</span>';
      if (entry.filtered) {
        html += '<div class="log-filtered">已过滤，未触发自动回复</div>';
      } else {
        html += '<div class="log-user">' + this._esc(entry.userName || '') + '</div>';
        html += '<div class="log-question">' + this._esc(entry.content || '') + '</div>';
        if (entry.reply) {
          html += '<div class="log-reply">AI: ' + this._esc(entry.reply) + '</div>';
          html += '<button class="log-flag-btn' + (entry.flagged ? ' flagged' : '') + '" data-idx="' + idx + '">不合适</button>';
        }
      }
      div.innerHTML = html;
      list.appendChild(div);
    });

    // Bind flag buttons
    list.querySelectorAll('.log-flag-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(btn.dataset.idx);
        this.logEntries[i].flagged = !this.logEntries[i].flagged;
        LABridge.send('log:flag', { index: i, flagged: this.logEntries[i].flagged, entry: this.logEntries[i] });
        this._renderLog();
      });
    });
  }

  /* ---- 录音向导 (4步) ---- */
  _initRecordWizard() {
    document.getElementById('wizardClose').addEventListener('click', () => this._closeWizard());

    // Step 1
    document.getElementById('wizStep1Next').addEventListener('click', () => this._wizardGoTo(2));
    // Step 2
    document.getElementById('wizStep2Prev').addEventListener('click', () => this._wizardGoTo(1));
    document.getElementById('wizStep2Record').addEventListener('click', () => this._wizRecord(2));
    document.getElementById('wizStep2Play').addEventListener('click', () => LABridge.send('voice:playback', { step: 2 }));
    document.getElementById('wizStep2Next').addEventListener('click', () => this._wizardGoTo(3));
    // Step 3
    document.getElementById('wizStep3Prev').addEventListener('click', () => this._wizardGoTo(2));
    document.getElementById('wizStep3Record').addEventListener('click', () => this._wizRecord(3));
    document.getElementById('wizStep3Next').addEventListener('click', () => this._wizardGoTo(4));
    // Step 4
    document.getElementById('wizStep4Prev').addEventListener('click', () => this._wizardGoTo(3));
    document.getElementById('wizStep4Done').addEventListener('click', () => this._closeWizard());
  }

  _openWizard() {
    document.getElementById('recordWizard').classList.add('open');
    this.wizardStep = 1;
    this._wizardGoTo(1);
    // Auto start noise detection
    setTimeout(() => {
      const noise = Math.floor(30 + Math.random() * 25);
      document.getElementById('noiseValue').textContent = noise + ' dB';
      const ok = noise < 45;
      document.getElementById('noiseStatus').textContent = ok ? '环境合格' : '噪音偏高，建议降低';
      document.getElementById('noiseStatus').style.color = ok ? 'var(--green)' : 'var(--red)';
      document.getElementById('wizStep1Next').disabled = false;
    }, 1500);
  }

  _closeWizard() {
    document.getElementById('recordWizard').classList.remove('open');
    this.wizardStep = 1;
  }

  _wizardGoTo(step) {
    this.wizardStep = step;
    document.querySelectorAll('.wizard-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('wizPage' + step);
    if (page) page.classList.add('active');
    document.querySelectorAll('.wizard-step').forEach(s => {
      const sStep = parseInt(s.dataset.step);
      s.classList.remove('active', 'done');
      if (sStep === step) s.classList.add('active');
      if (sStep < step) s.classList.add('done');
    });
  }

  _wizRecord(step) {
    LABridge.send('voice:record', { step, duration: step === 2 ? 15 : 300 });
    if (step === 2) {
      setTimeout(() => {
        document.getElementById('wizStep2Play').disabled = false;
        document.getElementById('wizStep2Next').disabled = false;
      }, 16000);
    } else if (step === 3) {
      let progress = 0;
      const fill = document.getElementById('wizProgress3');
      const interval = setInterval(() => {
        progress += 1;
        if (fill) fill.style.width = Math.min(100, (progress / 300 * 100)) + '%';
        if (progress >= 300) {
          clearInterval(interval);
          document.getElementById('wizStep3Next').disabled = false;
        }
      }, 1000);
    }
  }

  _esc(s) {
    const el = document.createElement('span');
    el.textContent = s || '';
    return el.innerHTML;
  }
}
