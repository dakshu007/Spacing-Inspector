// Spacing Inspector 2.0 service worker: settings migration, per-tab state,
// the keyboard command and the toolbar badge.
importScripts('lib/core.js');

const Core = self.SpacingCore;
const CONTENT_FILES = ['lib/core.js', 'content/inspector.js'];

chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  const raw = await chrome.storage.sync.get(null);
  // Never overwrite what users chose: migrate v1 keys or fill in missing defaults.
  const settings = raw.settingsVersion === 2 ? Core.normalizeSettings(raw) : Core.migrateV1(raw);
  await chrome.storage.sync.remove(['inspectorEnabled', 'showValues', 'colorHighlights', 'stickyMode', 'marginColor', 'paddingColor']);
  await chrome.storage.sync.set(settings);

  if (reason === 'update' && previousVersion && previousVersion.startsWith('1.')) {
    await chrome.storage.local.set({ showWhatsNew: true });
  }
});

function tabKey(tabId) {
  return `tab:${tabId}`;
}

async function getTabState(tabId) {
  const key = tabKey(tabId);
  const data = await chrome.storage.session.get(key);
  return data[key] || { enabled: false, mode: 'inspect' };
}

async function setTabState(tabId, state) {
  await chrome.storage.session.set({ [tabKey(tabId)]: { enabled: !!state.enabled, mode: state.mode || 'inspect' } });
  await updateBadge(tabId, state.enabled);
}

async function updateBadge(tabId, enabled) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#6E5CF6' });
    await chrome.action.setBadgeText({ tabId, text: enabled ? 'ON' : '' });
  } catch (e) {
    // The tab may have closed in the meantime.
  }
}

// Send a message to the page, injecting the content script first if this tab
// was open before the extension was installed or updated.
async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  if (message.type === 'hello' && tabId !== undefined) {
    getTabState(tabId).then((state) => {
      updateBadge(tabId, state.enabled);
      sendResponse(state);
    });
    return true;
  }
  if (message.type === 'tabState' && tabId !== undefined) {
    setTabState(tabId, message).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-inspector') return;
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id === undefined) return;
  try {
    await sendToTab(tab.id, { type: 'toggle' });
  } catch (e) {
    // Restricted page (chrome://, Web Store, PDF viewer): nothing we can do.
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId));
});
