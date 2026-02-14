import { generateId } from '../../utils/helpers.js'

export function codeSamplePlugin() {
  return {
    name: 'codesample',
    commands: {
      codeSample: (engine) => {
        const language = prompt('Language (e.g., javascript, python, html):') || 'javascript'
        const code = prompt('Enter code:')
        if (!code) return

        const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
        if (!sel) return
        const block = engine._findBlockForTextNode(sel.anchorNodeId)
        if (!block) return

        const parentContent = engine._model.doc.content
        const idx = parentContent.findIndex(n => n.id === block.id)
        if (idx === -1) return

        parentContent.splice(idx + 1, 0, {
          id: generateId(),
          type: 'codeBlock',
          attrs: { language },
          content: [{ id: generateId(), type: 'text', text: code }],
        })
        engine._reconcile()
        engine._bumpVersion()
      },
    },
    toolbarButtons: {
      codesample: {
        label: 'Code Sample',
        tooltip: 'Insert Code Sample',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>',
        command: 'codeSample',
      },
    },
    menuItems: { insert: [{ label: 'Code Sample...', command: 'codeSample' }] },
  }
}
