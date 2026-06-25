/** 智播助聊 - JS Bridge (WebView2 ↔ C#) */
window.LABridge = (() => {
  let counter = 0;
  const pending = new Map();
  const listeners = new Map();

  function send(type, data) {
    const msg = JSON.stringify({ type, data });
    window.chrome.webview.postMessage(msg);
  }

  function request(type, data) {
    return new Promise((resolve) => {
      const id = ++counter;
      const key = type + ':' + id;
      pending.set(key, resolve);
      send(type, { ...data, _requestId: id });
      setTimeout(() => { pending.delete(key); resolve(null); }, 5000);
    });
  }

  function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
  }

  function off(type, fn) {
    if (!listeners.has(type)) return;
    const fns = listeners.get(type);
    const idx = fns.indexOf(fn);
    if (idx >= 0) fns.splice(idx, 1);
  }

  window.onCSharpMessage = (json) => {
    try {
      const msg = JSON.parse(json);
      const { type, data } = msg;
      if (listeners.has(type)) {
        listeners.get(type).forEach(fn => fn(data));
      }
    } catch (e) { console.error('onCSharpMessage parse error', e); }
  };

  return { send, request, on, off };
})();
