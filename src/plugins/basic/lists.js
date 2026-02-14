/**
 * Lists plugin — ordered and unordered list toggle.
 */

import { findNodeById, findParent, generateId, deepClone } from '../../utils/helpers.js'

export function listsPlugin() {
  return {
    name: 'lists',

    commands: [
      {
        name: 'insertUnorderedList',
        execute: (engine) => toggleList(engine, 'bulletList'),
      },
      {
        name: 'insertOrderedList',
        execute: (engine) => toggleList(engine, 'orderedList'),
      },
    ],

    toolbarButtons: [
      {
        name: 'bullist',
        tooltip: 'Bullet list',
        icon: '<svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" fill="currentColor"/></svg>',
        command: 'insertUnorderedList',
        type: 'button',
        isActive: (engine) => isInList(engine, 'bulletList'),
      },
      {
        name: 'numlist',
        tooltip: 'Numbered list',
        icon: '<svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" fill="currentColor"/></svg>',
        command: 'insertOrderedList',
        type: 'button',
        isActive: (engine) => isInList(engine, 'orderedList'),
      },
    ],

    menuItems: [
      { menu: 'format', label: 'Bullet list', command: 'insertUnorderedList' },
      { menu: 'format', label: 'Numbered list', command: 'insertOrderedList' },
    ],
  }
}

function toggleList(engine, listType) {
  const sel = engine._selection?.captureSelection()
  if (!sel || sel.isCollapsed) return

  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  if (!block) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  const parentInfo = findParent(engine._model.doc, block.id)
  if (!parentInfo) return

  // Check if we're already in a list
  if (parentInfo.parent.type === 'listItem') {
    // Already in a list — unwrap from list
    const listItemInfo = findParent(engine._model.doc, parentInfo.parent.id)
    if (!listItemInfo) return
    const listInfo = findParent(engine._model.doc, listItemInfo.parent.id)
    if (!listInfo) {
      // List is at doc level
      const listNode = listItemInfo.parent
      const listParent = findParent(engine._model.doc, listNode.id)
      if (listParent) {
        // Replace list with unwrapped paragraphs
        const blocks = []
        for (const item of listNode.content) {
          if (item.content) {
            blocks.push(...item.content)
          }
        }
        const idx = listParent.index
        listParent.parent.content.splice(idx, 1, ...blocks)
      }
    }
  } else if (parentInfo.parent.type === 'doc' || parentInfo.parent.type === 'blockquote') {
    // Not in a list — wrap in list
    engine._model._wrapInBlock({ blockId: block.id, wrapperType: listType })
  }

  engine._model._ensureMinimumContent()
  engine._reconcile()
  engine._selection.restoreSelection(sel)
  engine._bumpVersion()
}

function isInList(engine, listType) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return false

  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  if (!block) return false

  const parentInfo = findParent(engine._model.doc, block.id)
  if (!parentInfo) return false

  if (parentInfo.parent.type === 'listItem') {
    const listItemParent = findParent(engine._model.doc, parentInfo.parent.id)
    return listItemParent?.parent.type === listType
  }

  return false
}
