/**
 * Image plugin — insert images via URL.
 */

import { generateId, findParent } from '../../utils/helpers.js'

export function imagePlugin() {
  return {
    name: 'image',

    commands: [
      {
        name: 'insertImage',
        execute: (engine, src, alt = '') => {
          if (!src) {
            src = prompt('Enter image URL:')
            if (!src) return
            alt = prompt('Enter alt text (optional):', '') || ''
          }

          const sel = engine._selection?.captureSelection()
          if (!sel) return

          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return
          const parentInfo = findParent(engine._model.doc, block.id)
          if (!parentInfo) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          const imageNode = { id: generateId(), type: 'image', attrs: { src, alt } }
          const newParagraph = {
            id: generateId(),
            type: 'paragraph',
            content: [{ id: generateId(), type: 'text', text: '' }],
          }

          parentInfo.parent.content.splice(parentInfo.index + 1, 0, imageNode, newParagraph)

          engine._reconcile()
          engine._selection.setCursorToNode(newParagraph.content[0].id)
          engine._bumpVersion()
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'image',
        tooltip: 'Insert image',
        icon: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>',
        command: 'insertImage',
        type: 'popup',
        popupType: 'image',
      },
    ],

    menuItems: [
      { menu: 'insert', label: 'Image...', command: 'insertImage' },
    ],
  }
}
