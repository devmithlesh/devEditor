export function sourceViewPlugin() {
  return {
    name: 'sourceview',
    commands: {
      sourceView: (engine) => {
        const container = engine.getContainer()
        if (!container) return
        const editorContainer = container.closest('.de-editor-container')
        if (!editorContainer) return

        const existing = editorContainer.querySelector('.de-source-textarea')
        if (existing) {
          // Switching back to rich text mode
          const newHtml = existing.value
          engine.setContent(newHtml)
          existing.remove()
          container.style.display = ''
        } else {
          // Switching to source view
          const html = engine.getContent()
          const textarea = document.createElement('textarea')
          textarea.className = 'de-source-textarea'
          textarea.value = html
          textarea.spellcheck = false
          container.style.display = 'none'
          container.parentNode.insertBefore(textarea, container.nextSibling)
        }
      },
    },
    toolbarButtons: {
      sourceview: {
        label: 'Source Code',
        tooltip: 'Source Code View',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>',
        command: 'sourceView',
        isActive: (engine) => {
          const container = engine.getContainer()?.closest('.de-editor-container')
          return !!container?.querySelector('.de-source-textarea')
        },
      },
    },
    menuItems: { view: [{ label: 'Source Code', command: 'sourceView' }] },
    css: `.de-source-textarea { width: 100%; min-height: 300px; padding: 16px; font-family: 'Fira Code', Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; border: none; outline: none; resize: vertical; background: #1e1e2e; color: #cdd6f4; box-sizing: border-box; }`,
  }
}
