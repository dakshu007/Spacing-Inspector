// Spacing Inspector Content Script
class SpacingInspector {
  constructor() {
    this.enabled = false;
    this.settings = {
      showValues: true,
      colorHighlights: true,
      stickyMode: false,
      marginColor: '#3b82f6',
      paddingColor: '#10b981',
      opacity: 0.3
    };
    this.currentElement = null;
    this.overlay = null;
    this.measurements = null;
    this.highlightTimeout = null;
    
    this.init();
  }
  
  init() {
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
      if (data.inspectorEnabled !== undefined) {
        this.enabled = data.inspectorEnabled;
      }
      
      this.settings = {
        ...this.settings,
        ...data
      };
      
      if (this.enabled) {
        this.enableInspector();
      }
    });
    
    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'toggleInspector':
          this.toggleInspector(message.enabled);
          break;
          
        case 'updateSettings':
          this.updateSettings(message.settings);
          break;
      }
      return true;
    });
  }
  
  toggleInspector(enabled) {
    this.enabled = enabled;
    
    // Save state
    chrome.storage.sync.set({ inspectorEnabled: enabled });
    
    if (enabled) {
      this.enableInspector();
    } else {
      this.disableInspector();
    }
  }
  
  enableInspector() {
    // Add event listeners
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    // Create overlay container
    this.createOverlay();
    
    console.log('Spacing Inspector enabled');
  }
  
  disableInspector() {
    // Remove event listeners
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this), true);
    
    // Remove overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    this.currentElement = null;
    
    console.log('Spacing Inspector disabled');
  }
  
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    
    // If inspector is enabled, re-render with new settings
    if (this.enabled && this.currentElement) {
      this.highlightElement(this.currentElement);
    }
  }
  
  createOverlay() {
    // Remove existing overlay if any
    if (this.overlay) {
      this.overlay.remove();
    }
    
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'spacing-inspector-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    document.body.appendChild(this.overlay);
  }
  
  handleMouseOver(event) {
    // Skip if we're already highlighting this element
    if (this.currentElement === event.target) return;
    
    // Clear any existing timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    
    // Small delay to prevent flickering
    this.highlightTimeout = setTimeout(() => {
      this.highlightElement(event.target);
    }, 50);
  }
  
  handleMouseOut(event) {
    if (!this.settings.stickyMode) {
      // Clear existing timeout
      if (this.highlightTimeout) {
        clearTimeout(this.highlightTimeout);
      }
      
      // Delay removing highlight for smoother experience
      this.highlightTimeout = setTimeout(() => {
        if (this.overlay) {
          this.overlay.innerHTML = '';
        }
        this.currentElement = null;
      }, 100);
    }
  }
  
  handleMouseMove(event) {
    if (this.settings.stickyMode && this.currentElement) {
      // Update position info in sticky mode
      this.updatePositionInfo(event);
    }
  }
  
  handleClick(event) {
    if (this.settings.stickyMode) {
      // In sticky mode, clicking locks the current element
      event.preventDefault();
      event.stopPropagation();
      this.highlightElement(event.target);
      return false;
    }
  }
  
  highlightElement(element) {
    if (!element || !this.overlay) return;
    
    this.currentElement = element;
    this.measurements = this.getElementMeasurements(element);
    
    // Clear overlay
    this.overlay.innerHTML = '';
    
    // Create visualizations
    this.createMarginVisualization(element);
    this.createPaddingVisualization(element);
    this.createDimensionsInfo(element);
    
    // If in sticky mode, show position tracker
    if (this.settings.stickyMode) {
      this.createPositionTracker();
    }
  }
  
  getElementMeasurements(element) {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return {
      marginTop: parseFloat(computedStyle.marginTop),
      marginRight: parseFloat(computedStyle.marginRight),
      marginBottom: parseFloat(computedStyle.marginBottom),
      marginLeft: parseFloat(computedStyle.marginLeft),
      paddingTop: parseFloat(computedStyle.paddingTop),
      paddingRight: parseFloat(computedStyle.paddingRight),
      paddingBottom: parseFloat(computedStyle.paddingBottom),
      paddingLeft: parseFloat(computedStyle.paddingLeft),
      borderTop: parseFloat(computedStyle.borderTopWidth),
      borderRight: parseFloat(computedStyle.borderRightWidth),
      borderBottom: parseFloat(computedStyle.borderBottomWidth),
      borderLeft: parseFloat(computedStyle.borderLeftWidth),
      width: rect.width,
      height: rect.height,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX
    };
  }
  
  createMarginVisualization(element) {
    const rect = element.getBoundingClientRect();
    const m = this.measurements;
    
    // Create margin visualization
    const marginDiv = document.createElement('div');
    marginDiv.className = 'spacing-margin';
    
    const marginTop = Math.max(0, m.marginTop);
    const marginRight = Math.max(0, m.marginRight);
    const marginBottom = Math.max(0, m.marginBottom);
    const marginLeft = Math.max(0, m.marginLeft);
    
    marginDiv.style.cssText = `
      position: absolute;
      top: ${rect.top - marginTop}px;
      left: ${rect.left - marginLeft}px;
      width: ${rect.width + marginLeft + marginRight}px;
      height: ${rect.height + marginTop + marginBottom}px;
      background-color: ${this.settings.colorHighlights ? 
        `${this.settings.marginColor}${Math.round(this.settings.opacity * 255).toString(16).padStart(2, '0')}` : 
        'rgba(59, 130, 246, 0.1)'};
      border: 2px dashed ${this.settings.colorHighlights ? 
        `${this.settings.marginColor}aa` : 
        'rgba(59, 130, 246, 0.7)'};
      pointer-events: none;
      box-sizing: border-box;
      border-radius: 4px;
    `;
    
    // Add margin labels
    if (this.settings.showValues && m.marginTop > 0) {
      this.createLabel('margin-top', rect.left + rect.width/2, rect.top - m.marginTop/2, `${m.marginTop}px`, 'top');
    }
    if (this.settings.showValues && m.marginRight > 0) {
      this.createLabel('margin-right', rect.right + m.marginRight/2, rect.top + rect.height/2, `${m.marginRight}px`, 'right');
    }
    if (this.settings.showValues && m.marginBottom > 0) {
      this.createLabel('margin-bottom', rect.left + rect.width/2, rect.bottom + m.marginBottom/2, `${m.marginBottom}px`, 'bottom');
    }
    if (this.settings.showValues && m.marginLeft > 0) {
      this.createLabel('margin-left', rect.left - m.marginLeft/2, rect.top + rect.height/2, `${m.marginLeft}px`, 'left');
    }
    
    this.overlay.appendChild(marginDiv);
  }
  
  createPaddingVisualization(element) {
    const rect = element.getBoundingClientRect();
    const m = this.measurements;
    
    // Create padding visualization
    const paddingDiv = document.createElement('div');
    paddingDiv.className = 'spacing-padding';
    
    const paddingTop = Math.max(0, m.paddingTop);
    const paddingRight = Math.max(0, m.paddingRight);
    const paddingBottom = Math.max(0, m.paddingBottom);
    const paddingLeft = Math.max(0, m.paddingLeft);
    
    paddingDiv.style.cssText = `
      position: absolute;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background-color: ${this.settings.colorHighlights ? 
        `${this.settings.paddingColor}${Math.round(this.settings.opacity * 255).toString(16).padStart(2, '0')}` : 
        'rgba(16, 185, 129, 0.15)'};
      border: 2px solid ${this.settings.colorHighlights ? 
        `${this.settings.paddingColor}aa` : 
        'rgba(16, 185, 129, 0.7)'};
      pointer-events: none;
      box-sizing: border-box;
      border-radius: 2px;
    `;
    
    // Add padding labels
    if (this.settings.showValues && m.paddingTop > 0) {
      this.createLabel('padding-top', rect.left + rect.width/2, rect.top + m.paddingTop/2, `${m.paddingTop}px`, 'top');
    }
    if (this.settings.showValues && m.paddingRight > 0) {
      this.createLabel('padding-right', rect.right - m.paddingRight/2, rect.top + rect.height/2, `${m.paddingRight}px`, 'right');
    }
    if (this.settings.showValues && m.paddingBottom > 0) {
      this.createLabel('padding-bottom', rect.left + rect.width/2, rect.bottom - m.paddingBottom/2, `${m.paddingBottom}px`, 'bottom');
    }
    if (this.settings.showValues && m.paddingLeft > 0) {
      this.createLabel('padding-left', rect.left + m.paddingLeft/2, rect.top + rect.height/2, `${m.paddingLeft}px`, 'left');
    }
    
    this.overlay.appendChild(paddingDiv);
  }
  
  createLabel(type, x, y, text, position) {
    const label = document.createElement('div');
    label.className = `spacing-label spacing-label-${type}`;
    
    const isVertical = position === 'left' || position === 'right';
    const transform = isVertical ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)';
    
    label.style.cssText = `
      position: absolute;
      top: ${y}px;
      left: ${x}px;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      transform: ${transform};
      z-index: 1000000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    label.textContent = text;
    this.overlay.appendChild(label);
  }
  
  createDimensionsInfo(element) {
    if (!this.settings.showValues) return;
    
    const rect = element.getBoundingClientRect();
    const m = this.measurements;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'spacing-dimensions';
    
    infoDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      pointer-events: none;
      z-index: 1000000;
      min-width: 250px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    
    infoDiv.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 600; color: #60a5fa;">
        <span style="color: #8b5cf6;">&lt;${tagName}${id}${classes}&gt;</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
        <div>
          <div style="color: #94a3b8; margin-bottom: 4px;">Dimensions</div>
          <div>${Math.round(m.width)} × ${Math.round(m.height)}px</div>
        </div>
        <div>
          <div style="color: #94a3b8; margin-bottom: 4px;">Position</div>
          <div>${Math.round(rect.left)}, ${Math.round(rect.top)}</div>
        </div>
        <div>
          <div style="color: #3b82f6; margin-bottom: 4px;">Margin</div>
          <div>${m.marginTop} ${m.marginRight} ${m.marginBottom} ${m.marginLeft}px</div>
        </div>
        <div>
          <div style="color: #10b981; margin-bottom: 4px;">Padding</div>
          <div>${m.paddingTop} ${m.paddingRight} ${m.paddingBottom} ${m.paddingLeft}px</div>
        </div>
      </div>
    `;
    
    this.overlay.appendChild(infoDiv);
  }
  
  createPositionTracker() {
    const tracker = document.createElement('div');
    tracker.id = 'spacing-position-tracker';
    tracker.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(15, 23, 42, 0.95);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000000;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    `;
    
    tracker.innerHTML = `
      <div style="color: #94a3b8; margin-bottom: 4px;">Cursor Position</div>
      <div id="spacing-cursor-position">0, 0</div>
      <div style="margin-top: 8px; color: #8b5cf6; font-size: 11px;">
        <i>Click to lock element • ESC to exit</i>
      </div>
    `;
    
    this.overlay.appendChild(tracker);
  }
  
  updatePositionInfo(event) {
    const tracker = document.getElementById('spacing-position-tracker');
    if (tracker) {
      const positionText = document.getElementById('spacing-cursor-position');
      if (positionText) {
        positionText.textContent = `${Math.round(event.clientX)}, ${Math.round(event.clientY)}`;
      }
    }
  }
}

// Initialize the inspector
let inspector = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    inspector = new SpacingInspector();
  });
} else {
  inspector = new SpacingInspector();
}

// Handle escape key to exit sticky mode
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && inspector && inspector.settings.stickyMode) {
    inspector.updateSettings({ stickyMode: false });
    
    // Send message to popup to update toggle
    chrome.runtime.sendMessage({
      action: 'updateStickyMode',
      enabled: false
    });
  }
});