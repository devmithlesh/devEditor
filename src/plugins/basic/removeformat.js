/**
 * Remove Format plugin — strips all marks from the selection.
 */

import { walkTree } from '../../utils/helpers.js'

export function removeFormatPlugin() {
  return {
    name: 'removeformat',

    commands: [
      {
        name: 'removeFormat',
        execute: (engine) => {
          const sel = engine._selection?.captureSelection()
          if (!sel || sel.isCollapsed) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          // Get all text nodes in selection range
          const allTextNodes = []
          walkTree(engine._model.doc, (node) => {
            if (node.type === 'text') allTextNodes.push(node)
          })

          const anchorIdx = allTextNodes.findIndex((n) => n.id === sel.anchorNodeId)
          const focusIdx = allTextNodes.findIndex((n) => n.id === sel.focusNodeId)
          if (anchorIdx === -1 || focusIdx === -1) return

          const startIdx = Math.min(anchorIdx, focusIdx)
          const endIdx = Math.max(anchorIdx, focusIdx)

          for (let i = startIdx; i <= endIdx; i++) {
            delete allTextNodes[i].marks
          }

          engine._reconcile()
          engine._selection.restoreSelection(sel)
          engine._bumpVersion()
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'removeformat',
        tooltip: 'Clear formatting',
        icon: '<svg viewBox="0 0 24 24"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z" fill="currentColor"/></svg>',
        command: 'removeFormat',
        type: 'button',
      },
    ],
  }
}
