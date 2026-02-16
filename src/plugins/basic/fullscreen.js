export function fullscreenPlugin() {
  return {
    name: 'fullscreen',
    commands: {
      fullscreen: (engine) => {
        const container = engine.getContainer()?.closest('.de-editor-container')
        if (!container) return
        
        const isFullscreen = container.classList.contains('de-fullscreen')
        if (isFullscreen) {
          container.classList.remove('de-fullscreen')
          document.body.style.overflow = ''
        } else {
          container.classList.add('de-fullscreen')
          document.body.style.overflow = 'hidden'
        }
      },
    },
    toolbarButtons: {
      fullscreen: {
        label: 'Fullscreen',
        tooltip: 'Fullscreen (F11)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>',
        command: 'fullscreen',
        isActive: (engine) => {
          const container = engine.getContainer()?.closest('.de-editor-container')
          return container?.classList.contains('de-fullscreen') || false
        },
      },
    },
    menuItems: { view: [{ label: 'Fullscreen', command: 'fullscreen', shortcut: 'F11' }] },
    shortcuts: { 'F11': 'fullscreen' },
    css: `.de-fullscreen { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 9999 !important; border-radius: 0 !important; border: none !important; margin: 0 !important; width: 100vw !important; height: 100vh !important; }
.de-fullscreen .de-content { max-height: calc(100vh - var(--de-toolbar-height) - var(--de-menubar-height) - var(--de-statusbar-height)) !important; }`,
  }
}
