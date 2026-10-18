// Background service worker for Spacing Inspector
chrome.runtime.onInstalled.addListener(() => {
  console.log('Spacing Inspector extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    inspectorEnabled: false,
    showValues: true,
    colorHighlights: true,
    stickyMode: false,
    marginColor: '#3b82f6',
    paddingColor: '#10b981',
    opacity: 0.3
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleInspector') {
    // Get current active tab and inject content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Update tab's URL to trigger content script injection
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleInspector',
          enabled: message.enabled
        }).catch(() => {
          // If content script isn't loaded yet, we'll handle it in the popup
          console.log('Content script not ready, will be loaded on next activation');
        });
      }
    });
  }
  
  if (message.action === 'updateSettings') {
    // Update settings and notify all tabs
    chrome.storage.sync.set(message.settings, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: message.settings
          }).catch(() => {
            // Tab might not have content script loaded
          });
        });
      });
    });
  }
  
  return true;
});

// Background service worker for Spacing Inspector
chrome.runtime.onInstalled.addListener(() => {
  console.log('Spacing Inspector extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    inspectorEnabled: false,
    showValues: true,
    colorHighlights: true,
    stickyMode: false,
    marginColor: '#3b82f6',
    paddingColor: '#10b981',
    opacity: 0.3
  });
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages between popup and content scripts if needed
  if (message.action === 'forwardToTabs') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message.data).catch(() => {
          // Tab might not have content script loaded
        });
      });
    });
  }
  
  return true;
});