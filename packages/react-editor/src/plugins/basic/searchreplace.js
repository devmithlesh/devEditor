export function searchReplacePlugin() {
  return {
    name: 'searchreplace',
    commands: {
      searchReplace: (engine) => {
        const container = engine.getContainer()
        if (!container) return
        const editorContainer = container.closest('.de-editor-container')
        if (!editorContainer) return

        const existing = editorContainer.querySelector('.de-search-bar')
        if (existing) {
          existing.remove()
          return
        }

        const bar = document.createElement('div')
        bar.className = 'de-search-bar'
        bar.innerHTML = `
          <div class="de-search-row">
            <input type="text" class="de-search-input" placeholder="Find..." />
            <input type="text" class="de-replace-input" placeholder="Replace..." />
            <button type="button" class="de-search-btn" data-action="replace" title="Replace">Replace</button>
            <button type="button" class="de-search-btn" data-action="replaceAll" title="Replace All">All</button>
            <button type="button" class="de-search-close" title="Close">&times;</button>
          </div>
        `
        editorContainer.insertBefore(bar, container)

        const findInput = bar.querySelector('.de-search-input')
        const replaceInput = bar.querySelector('.de-replace-input')

        bar.querySelector('.de-search-close').addEventListener('click', () => bar.remove())

        bar.querySelector('[data-action="replace"]').addEventListener('click', () => {
          const find = findInput.value
          const replace = replaceInput.value
          if (!find) return
          const html = engine.getContent()
          engine.setContent(html.split(find).join(replace))
        })

        bar.querySelector('[data-action="replaceAll"]').addEventListener('click', () => {
          const find = findInput.value
          const replace = replaceInput.value
          if (!find) return
          const html = engine.getContent()
          engine.setContent(html.split(find).join(replace))
        })

        findInput.focus()
      },
    },
    toolbarButtons: {
      searchreplace: {
        label: 'Search & Replace',
        tooltip: 'Find and Replace (Ctrl+H)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>',
        command: 'searchReplace',
      },
    },
    menuItems: { edit: [{ type: 'separator' }, { label: 'Find and Replace...', command: 'searchReplace', shortcut: 'Ctrl+H' }] },
    shortcuts: { 'ctrl+h': 'searchReplace' },
    css: `.de-search-bar { display: flex; padding: 6px 8px; background: #f9fafb; border-bottom: 1px solid #e0e0e0; gap: 6px; }
.de-search-row { display: flex; align-items: center; gap: 6px; width: 100%; }
.de-search-input, .de-replace-input { padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; outline: none; flex: 1; }
.de-search-input:focus, .de-replace-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.de-search-btn { padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; font-size: 12px; cursor: pointer; white-space: nowrap; }
.de-search-btn:hover { background: #e5e7eb; }
.de-search-close { background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 6px; color: #6b7280; }
.de-search-close:hover { color: #111; }`,
  }
}
