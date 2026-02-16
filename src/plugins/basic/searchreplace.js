export function searchReplacePlugin() {
  return {
    name: 'searchreplace',
    commands: {
      searchReplace: (engine) => {
        // Trigger popup by finding the toolbar button and clicking it
        const container = engine.getContainer()?.closest('.de-editor-container')
        if (!container) return
        
        // Find the searchreplace button in toolbar (check both main toolbar and overflow)
        const toolbar = container.querySelector('.de-toolbar')
        if (!toolbar) return
        
        // Try to find button by data attribute or aria-label
        let searchBtn = toolbar.querySelector('button[data-button-name="searchreplace"]')
        if (!searchBtn) {
          searchBtn = Array.from(toolbar.querySelectorAll('button')).find(btn => 
            btn.getAttribute('aria-label')?.toLowerCase().includes('find') ||
            btn.getAttribute('aria-label')?.toLowerCase().includes('search') ||
            btn.getAttribute('aria-label')?.toLowerCase().includes('replace')
          )
        }
        
        if (searchBtn) {
          searchBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
        }
      },
    },
    toolbarButtons: {
      searchreplace: {
        type: 'popup',
        label: 'Search & Replace',
        tooltip: 'Find and Replace (Ctrl+H)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>',
        popupType: 'searchreplace',
      },
    },
    shortcuts: { 'ctrl+h': 'searchReplace' },
    css: `.de-search-replace-popup .de-popup-field { margin-bottom: 12px; }
.de-search-replace-popup .de-popup-field label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; color: #374151; }
.de-search-replace-popup .de-popup-field input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; outline: none; }
.de-search-replace-popup .de-popup-field input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }`,
  }
}
