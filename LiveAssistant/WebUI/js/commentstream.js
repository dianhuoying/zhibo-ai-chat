/** 智播助聊 - 实时评论流控制器 (第3层) */
class CommentStreamController {
  constructor() {
    this.listEl = document.getElementById('commentList');
    this.maxItems = 80;
    this.items = [];
    this._initStreamInput();
  }

  addComment(data) {
    const item = this._buildElement(data);
    this.listEl.prepend(item);
    this.items.unshift(item);

    while (this.items.length > this.maxItems) {
      const old = this.items.pop();
      if (old) old.remove();
    }
  }

  _buildElement(data) {
    const div = document.createElement('div');
    div.className = 'comment-item ' + this._categoryClass(data);
    div.setAttribute('data-id', data.id || '');

    const userPriority = data.priority > 60 ? 'priority-high' : (data.priority > 30 ? 'priority-mid' : 'priority-low');
    const userName = this._esc(data.userName || data.user || '观众');

    div.innerHTML = '<span class="comment-user ' + userPriority + '">' + userName + '</span>' +
                    '<span class="comment-content">' + this._esc(data.content || data.text || '') + '</span>';

    div.addEventListener('click', () => {
      LABridge.send('ai:generate', { commentId: data.id, content: data.content, userName: data.userName });
    });

    if (data.visitCount > 0) {
      div.title = '第 ' + data.visitCount + ' 次来访 · ' + (data.interactionSummary || '新观众');
    }

    return div;
  }

  /** SPEC: 绿色=提问类, 蓝色=互动类, 灰色=无意义 */
  _categoryClass(data) {
    if (data.category === 'question') return 'cat-question';
    if (data.category === 'social') return 'cat-social';
    if (data.category === 'noise') return 'cat-noise';
    // Auto-detect from content
    const text = (data.content || data.text || '');
    if (/[？?]|什么|怎么|为什么|多少|请问/.test(text)) return 'cat-question';
    if (data.priority >= 50) return 'cat-question';
    if (data.priority >= 25) return 'cat-social';
    if (data.priority <= 10) return 'cat-noise';
    return '';
  }

  _initStreamInput() {
    const input = document.getElementById('streamInput');
    const sendBtn = document.getElementById('streamSendBtn');
    sendBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (!val) return;
      LABridge.send('stream:send', { text: val });
      input.value = '';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
  }

  _esc(s) {
    const el = document.createElement('span');
    el.textContent = s || '';
    return el.innerHTML;
  }
}
