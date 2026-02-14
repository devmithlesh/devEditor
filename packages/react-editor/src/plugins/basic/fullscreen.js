export function fullscreenPlugin() {
  return {
    name: 'fullscreen',
    commands: {
      fullscreen: (engine) => {
        const container = engine.getContainer()?.closest('.de-editor-container')
        if (!container) return
        container.classList.toggle('de-fullscreen')
      },
    },
    toolbarButtons: {
      fullscreen: {
        label: 'Fullscreen',
        tooltip: 'Fullscreen',
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
    css: `.de-fullscreen { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; border-radius: 0 !important; border: none !important; }
.de-fullscreen .de-content { max-height: calc(100vh - 80px); }`,
  }
}
