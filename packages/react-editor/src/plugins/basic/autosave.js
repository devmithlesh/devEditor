export function autosavePlugin(options = {}) {
  const {
    interval = 30000,
    prefix = 'deveditor-autosave',
    retention = 5,
  } = options

  let timerId = null

  return {
    name: 'autosave',
    commands: {
      restoreDraft: (engine) => {
        const key = `${prefix}-draft`
        const saved = localStorage.getItem(key)
        if (saved) {
          try {
            const data = JSON.parse(saved)
            engine.setContent(data.content)
          } catch (e) {
            console.warn('Failed to restore autosave draft:', e)
          }
        }
      },
      removeDraft: () => {
        const key = `${prefix}-draft`
        localStorage.removeItem(key)
      },
    },
    init: (engine) => {
      // Start autosaving
      timerId = setInterval(() => {
        try {
          const content = engine.getContent()
          const data = { content, timestamp: Date.now() }
          localStorage.setItem(`${prefix}-draft`, JSON.stringify(data))
        } catch (e) {
          // localStorage might be full
        }
      }, interval)
    },
    destroy: () => {
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
    },
    menuItems: { file: [{ type: 'separator' }, { label: 'Restore Draft', command: 'restoreDraft' }] },
  }
}
