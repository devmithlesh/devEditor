import { findNodeById } from '../../utils/helpers.js'

function getDir(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null
  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  return block?.attrs?.dir || null
}

export function directionalityPlugin() {
  return {
    name: 'directionality',
    commands: {
      ltr: (engine) => {
        const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
        if (!sel) return
        const block = engine._findBlockForTextNode(sel.anchorNodeId)
        if (!block) return
        engine.applyTransaction({
          steps: [{ type: 'setNodeAttr', data: { nodeId: block.id, attr: 'dir', value: 'ltr' } }],
        })
      },
      rtl: (engine) => {
        const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
        if (!sel) return
        const block = engine._findBlockForTextNode(sel.anchorNodeId)
        if (!block) return
        engine.applyTransaction({
          steps: [{ type: 'setNodeAttr', data: { nodeId: block.id, attr: 'dir', value: 'rtl' } }],
        })
      },
    },
    toolbarButtons: {
      ltr: {
        label: 'Left to Right',
        tooltip: 'Left to Right',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M10 10v5h2V4h2v11h2V4h2V2h-8C7.79 2 6 3.79 6 6s1.79 4 4 4zm-2 7v-3l-4 4 4 4v-3h12v-2H8z" fill="currentColor"/></svg>',
        command: 'ltr',
        isActive: (engine) => getDir(engine) === 'ltr',
      },
      rtl: {
        label: 'Right to Left',
        tooltip: 'Right to Left',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M10 10v5h2V4h2v11h2V4h2V2h-8C7.79 2 6 3.79 6 6s1.79 4 4 4zm10 4l-4-4v3H4v2h12v3l4-4z" fill="currentColor"/></svg>',
        command: 'rtl',
        isActive: (engine) => getDir(engine) === 'rtl',
      },
    },
    menuItems: { format: [{ label: 'Left to Right', command: 'ltr' }, { label: 'Right to Left', command: 'rtl' }] },
  }
}
