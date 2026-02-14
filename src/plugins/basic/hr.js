/**
 * Horizontal Rule plugin.
 */

import { generateId, findParent } from '../../utils/helpers.js'

export function horizontalRulePlugin() {
  return {
    name: 'hr',

    commands: [
      {
        name: 'insertHorizontalRule',
        execute: (engine) => {
          const sel = engine._selection?.captureSelection()
          if (!sel) return

          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return

          const parentInfo = findParent(engine._model.doc, block.id)
          if (!parentInfo) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          const hrNode = { id: generateId(), type: 'horizontalRule' }
          const newParagraph = {
            id: generateId(),
            type: 'paragraph',
            content: [{ id: generateId(), type: 'text', text: '' }],
          }

          // Insert HR and new paragraph after current block
          parentInfo.parent.content.splice(parentInfo.index + 1, 0, hrNode, newParagraph)

          engine._reconcile()
          engine._selection.setCursorToNode(newParagraph.content[0].id)
          engine._bumpVersion()
        },
      },
    ],

    menuItems: [
      { menu: 'insert', label: 'Horizontal rule', command: 'insertHorizontalRule' },
    ],
  }
}
