/**
 * Table plugin — insert tables, manage rows/columns.
 */

import { generateId, findParent, findNodeById, walkTree } from '../../utils/helpers.js'

export function tablePlugin() {
  return {
    name: 'table',

    commands: [
      {
        name: 'insertTable',
        execute: (engine, rows = 3, cols = 3) => {
          const sel = engine._selection?.captureSelection()
          if (!sel) return

          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return
          const parentInfo = findParent(engine._model.doc, block.id)
          if (!parentInfo) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          const tableNode = { id: generateId(), type: 'table', content: [] }
          for (let r = 0; r < rows; r++) {
            const row = { id: generateId(), type: 'tableRow', content: [] }
            for (let c = 0; c < cols; c++) {
              row.content.push({
                id: generateId(),
                type: 'tableCell',
                attrs: { header: r === 0 },
                content: [{
                  id: generateId(),
                  type: 'paragraph',
                  content: [{ id: generateId(), type: 'text', text: '' }],
                }],
              })
            }
            tableNode.content.push(row)
          }

          parentInfo.parent.content.splice(parentInfo.index + 1, 0, tableNode)

          engine._reconcile()
          // Focus first cell
          const firstCellText = tableNode.content[0].content[0].content[0].content[0]
          if (firstCellText) {
            engine._selection.setCursorToNode(firstCellText.id)
          }
          engine._bumpVersion()
        },
      },
      {
        name: 'deleteTable',
        execute: (engine) => {
          const tableNode = findCurrentTable(engine)
          if (!tableNode) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
          }

          engine._model.applyTransaction({
            steps: [{ type: 'deleteNode', data: { nodeId: tableNode.id } }],
          })
          engine._model._ensureMinimumContent()
          engine._reconcile()
          engine._bumpVersion()
        },
      },
    ],

    toolbarButtons: [],

    menuItems: [
      { menu: 'table', label: 'Insert table...', command: 'insertTable' },
      { menu: 'table', type: 'separator' },
      { menu: 'table', label: 'Delete table', command: 'deleteTable' },
    ],
  }
}

function findCurrentTable(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null

  let found = null
  walkTree(engine._model.doc, (node) => {
    if (node.type === 'table') {
      walkTree(node, (child) => {
        if (child.id === sel.anchorNodeId) {
          found = node
          return false
        }
      })
      if (found) return false
    }
  })
  return found
}
