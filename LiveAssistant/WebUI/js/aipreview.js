/** 智播助聊 - AI回复展示区 (第4层) */
class AiReplyController {
  constructor() {
    this.textEl = document.getElementById('aiReplyText');
    this.cursorEl = document.getElementById('aiCursor');
    this.statusVoice = document.getElementById('aiStatusVoice');
    this.statusText = document.getElementById('aiStatusText');
    this.isTyping = false;
    this.isSynthesizing = false;
  }

  startTyping(data) {
    this.isTyping = true;
    this.isSynthesizing = false;
    this.textEl.textContent = '';
    this.cursorEl.style.display = 'inline';
    this.statusText.style.display = 'none';
    this.statusVoice.classList.remove('inactive');
  }

  appendChar(data) {
    if (!this.isTyping) return;
    this.textEl.textContent = data.partial || '';
  }

  complete(data) {
    this.isTyping = false;
    this.cursorEl.style.display = 'none';
    this.textEl.textContent = data.fullText || '';
  }

  /** SPEC: 语音模式 - 不确定动画, 不显百分比 */
  startSynthesis(data) {
    this.isSynthesizing = true;
    this.statusVoice.classList.remove('inactive');
    this.statusText.style.display = 'none';
    const label = document.getElementById('aiStatusLabel');
    if (label) label.textContent = '正在合成语音...';
  }

  completeSynthesis() {
    this.isSynthesizing = false;
    this.statusVoice.classList.add('inactive');
  }

  /** SPEC: 文字模式 - 已推送绿色勾号 */
  showTextPushed() {
    this.isTyping = false;
    this.isSynthesizing = false;
    this.cursorEl.style.display = 'none';
    this.statusVoice.classList.add('inactive');
    this.statusText.style.display = 'flex';
  }
}
