// Add this function to handle content script injection
function ensureContentScriptInjected(tabId) {
  return new Promise((resolve) => {
    // Try to send a message to check if content script is loaded
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Content script not loaded, we need to inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          // Also inject CSS
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['assets/styles.css']
          }, () => {
            resolve(true);
          });
        });
      } else {
        resolve(true);
      }
    });
  });
}

// Popup JavaScript for Spacing Inspector
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const toggleInspector = document.getElementById('toggleInspector');
    const showValues = document.getElementById('showValues');
    const colorHighlights = document.getElementById('colorHighlights');
    const stickyMode = document.getElementById('stickyMode');
    const marginColor = document.getElementById('marginColor');
    const paddingColor = document.getElementById('paddingColor');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const resetButton = document.getElementById('resetButton');
    const statusMessage = document.getElementById('statusMessage');

    // Load saved settings
    chrome.storage.sync.get([
        'inspectorEnabled',
        'showValues',
        'colorHighlights',
        'stickyMode',
        'marginColor',
        'paddingColor',
        'opacity'
    ], (data) => {
        toggleInspector.checked = data.inspectorEnabled || false;
        showValues.checked = data.showValues !== undefined ? data.showValues : true;
        colorHighlights.checked = data.colorHighlights !== undefined ? data.colorHighlights : true;
        stickyMode.checked = data.stickyMode || false;
        marginColor.value = data.marginColor || '#3b82f6';
        paddingColor.value = data.paddingColor || '#10b981';
        opacitySlider.value = data.opacity !== undefined ? data.opacity * 100 : 30;
        opacityValue.textContent = `${opacitySlider.value}%`;
        
        updateStatus();
    });

    // Event Listeners
    toggleInspector.addEventListener('change', () => {
        const enabled = toggleInspector.checked;
        
        chrome.storage.sync.set({ inspectorEnabled: enabled }, () => {
            // Send message to content script in current tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleInspector',
                        enabled: enabled
                    }).catch((error) => {
                        console.log('Content script may not be loaded yet:', error);
                        // Content script will pick up the state when it loads
                    });
                }
            });
            
            updateStatus();
            
            if (enabled) {
                showNotification('Inspector enabled! Hover over elements to inspect.');
            } else {
                showNotification('Inspector disabled.');
            }
        });
    });

    showValues.addEventListener('change', updateSettings);
    colorHighlights.addEventListener('change', updateSettings);
    stickyMode.addEventListener('change', updateSettings);
    marginColor.addEventListener('change', updateSettings);
    paddingColor.addEventListener('change', updateSettings);
    
    opacitySlider.addEventListener('input', () => {
        opacityValue.textContent = `${opacitySlider.value}%`;
    });
    
    opacitySlider.addEventListener('change', updateSettings);

    resetButton.addEventListener('click', () => {
        // Reset to defaults
        toggleInspector.checked = false;
        showValues.checked = true;
        colorHighlights.checked = true;
        stickyMode.checked = false;
        marginColor.value = '#3b82f6';
        paddingColor.value = '#10b981';
        opacitySlider.value = 30;
        opacityValue.textContent = '30%';
        
        const defaultSettings = {
            inspectorEnabled: false,
            showValues: true,
            colorHighlights: true,
            stickyMode: false,
            marginColor: '#3b82f6',
            paddingColor: '#10b981',
            opacity: 0.3
        };
        
        chrome.storage.sync.set(defaultSettings, () => {
            // Notify all tabs of settings change
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings',
                        settings: defaultSettings
                    }).catch(() => {
                        // Tab might not have content script loaded
                    });
                });
            });
            
            showNotification('Settings reset to defaults');
            updateStatus();
        });
    });

    // Functions
    function updateSettings() {
        const settings = {
            showValues: showValues.checked,
            colorHighlights: colorHighlights.checked,
            stickyMode: stickyMode.checked,
            marginColor: marginColor.value,
            paddingColor: paddingColor.value,
            opacity: parseInt(opacitySlider.value) / 100
        };
        
        chrome.storage.sync.set(settings, () => {
            // Notify all tabs of settings change
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings',
                        settings: settings
                    }).catch(() => {
                        // Tab might not have content script loaded
                    });
                });
            });
            
            showNotification('Settings updated');
        });
    }

    function updateStatus() {
        if (toggleInspector.checked) {
            statusMessage.innerHTML = `
                <span style="color: #10b981; font-weight: 600;">●</span> 
                Inspector Active
                ${stickyMode.checked ? '<span style="color: #8b5cf6; margin-left: 8px;">(Sticky Mode)</span>' : ''}
            `;
        } else {
            statusMessage.textContent = 'Click toggle to activate inspector';
        }
    }

    function showNotification(message) {
        statusMessage.textContent = message;
        
        // Reset status after 2 seconds
        setTimeout(() => {
            updateStatus();
        }, 2000);
    }

    // Check current tab state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getState' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Content script might not be ready yet
                    console.log('Content script may not be loaded yet');
                } else if (response) {
                    // Update toggle based on content script state
                    toggleInspector.checked = response.enabled;
                    updateStatus();
                }
            });
        }
    });
});

// Update the toggleInspector event listener
toggleInspector.addEventListener('change', async () => {
  const enabled = toggleInspector.checked;
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) return;
  
  // Ensure content script is injected
  await ensureContentScriptInjected(tab.id);
  
  // Send toggle message
  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleInspector',
    enabled: enabled
  });
  
  // Save state
  chrome.storage.sync.set({ inspectorEnabled: enabled }, () => {
    updateStatus();
    
    if (enabled) {
      showNotification('Inspector enabled! Hover over elements to inspect.');
    } else {
      showNotification('Inspector disabled.');
    }
  });
});