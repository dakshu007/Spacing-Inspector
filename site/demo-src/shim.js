// Lets the real Spacing Inspector content script run on this website.
// vendor/inspector.js is wrapped so its `chrome` is this object, not the
// browser's; settings live in localStorage instead of Chrome sync.
(() => {
  'use strict';

  // Its own takeover event, so an installed copy of the extension and this
  // demo never shut each other down.
  window.SPACING_INSPECTOR_TAKEOVER = 'spacing-inspector-demo:takeover';

  const KEY = 'spacing-inspector-demo';
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  };
  const write = (data) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* private mode: settings just won't persist */
    }
  };

  const messageListeners = [];
  const storageListeners = [];
  const stateListeners = [];
  let store = { settingsVersion: 2, theme: 'dark', ...read() };

  const remove = (list) => (fn) => {
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };

  const chromeLike = {
    runtime: {
      id: 'spacing-inspector-demo',
      lastError: undefined,
      getURL: (path) => new URL(path, document.baseURI).href,
      sendMessage(msg) {
        if (msg && msg.type === 'hello') return Promise.resolve({ enabled: false, mode: 'inspect' });
        if (msg && msg.type === 'tabState') stateListeners.forEach((fn) => fn({ enabled: msg.enabled, mode: msg.mode }));
        return Promise.resolve({ ok: true });
      },
      onMessage: { addListener: (fn) => messageListeners.push(fn), removeListener: remove(messageListeners) }
    },
    storage: {
      sync: {
        get(keys, cb) {
          const data = { ...store };
          if (cb) setTimeout(() => cb(data));
          return Promise.resolve(data);
        },
        set(patch, cb) {
          const changes = {};
          Object.keys(patch).forEach((k) => (changes[k] = { oldValue: store[k], newValue: patch[k] }));
          store = { ...store, ...patch };
          write(store);
          setTimeout(() => {
            storageListeners.forEach((fn) => fn(changes, 'sync'));
            if (cb) cb();
          });
          return Promise.resolve();
        },
        remove: () => Promise.resolve()
      },
      local: {
        get: (keys, cb) => {
          if (cb) cb({});
          return Promise.resolve({});
        },
        set: (patch, cb) => {
          if (cb) cb();
          return Promise.resolve();
        }
      },
      onChanged: { addListener: (fn) => storageListeners.push(fn), removeListener: remove(storageListeners) }
    }
  };

  window.SpacingDemoChrome = chromeLike;

  // What the website's own UI uses to drive the inspector.
  window.SpacingDemo = {
    send(msg) {
      let result = null;
      messageListeners.forEach((fn) => fn(msg, {}, (res) => (result = res)));
      return result;
    },
    onState(fn) {
      stateListeners.push(fn);
    }
  };
})();
