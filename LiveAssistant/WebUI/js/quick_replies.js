/** 智播助聊 - 快捷回复面板 (第6层) */
class QuickRepliesController {
  constructor() {
    this.panel = document.getElementById('quickReplyPanel');
    this.grid = document.getElementById('qrGrid');
    this.replies = [
      '谢谢大哥的礼物', '欢迎新来的宝', '点个关注不迷路',
      '今天就这个价', '已经是最低价了', '马上讲解', '安排！'
    ];
    this.expanded = true;
    this._init();
  }

  _init() {
    const toggle = document.getElementById('btnQrToggle');
    toggle.addEventListener('click', () => this._toggle());
    document.getElementById('qrAddBtn').addEventListener('click', () => this._addReply());
    this._renderButtons();
  }

  _toggle() {
    this.expanded = !this.expanded;
    this.panel.classList.toggle('collapsed', !this.expanded);
    document.getElementById('btnQrToggle').classList.toggle('collapsed', !this.expanded);
  }

  _renderButtons() {
    const existing = this.grid.querySelectorAll('.qr-btn:not(.qr-add)');
    existing.forEach(el => el.remove());
    this.replies.forEach((text, idx) => {
      const btn = document.createElement('button');
      btn.className = 'qr-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        LABridge.send('quickreply:send', { text });
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showContextMenu(e.clientX, e.clientY, idx);
      });
      this.grid.insertBefore(btn, document.getElementById('qrAddBtn'));
    });
  }

  _addReply() {
    const text = prompt('输入快捷回复文本：');
    if (!text || !text.trim()) return;
    this.replies.push(text.trim());
    this._renderButtons();
    LABridge.send('quickreply:save', { replies: this.replies });
  }

  _editReply(idx) {
    const text = prompt('编辑快捷回复：', this.replies[idx]);
    if (text === null) return;
    if (!text.trim()) {
      this.replies.splice(idx, 1);
    } else {
      this.replies[idx] = text.trim();
    }
    this._renderButtons();
    LABridge.send('quickreply:save', { replies: this.replies });
  }

  _deleteReply(idx) {
    this.replies.splice(idx, 1);
    this._renderButtons();
    LABridge.send('quickreply:save', { replies: this.replies });
  }

  _showContextMenu(x, y, idx) {
    this._removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'qr-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML =
      '<div class="qr-context-item edit-item">编辑</div>' +
      '<div class="qr-context-item delete-item">删除</div>';
    menu.querySelector('.edit-item').addEventListener('click', () => {
      this._editReply(idx);
      this._removeContextMenu();
    });
    menu.querySelector('.delete-item').addEventListener('click', () => {
      this._deleteReply(idx);
      this._removeContextMenu();
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => this._removeContextMenu(), { once: true }), 0);
  }

  _removeContextMenu() {
    const existing = document.querySelector('.qr-context-menu');
    if (existing) existing.remove();
  }
}
