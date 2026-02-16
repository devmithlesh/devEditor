/**
 * Alignment plugin — left, center, right, justify text alignment.
 */

import { walkTree, findParent } from '../../utils/helpers.js'

export function alignmentPlugin() {
  return {
    name: 'alignment',

    commands: [
      { name: 'alignLeft', execute: (engine) => setAlignment(engine, 'left') },
      { name: 'alignCenter', execute: (engine) => setAlignment(engine, 'center') },
      { name: 'alignRight', execute: (engine) => setAlignment(engine, 'right') },
      { name: 'alignJustify', execute: (engine) => setAlignment(engine, 'justify') },
      { name: 'setAlignment', execute: (engine, align) => setAlignment(engine, align) },
    ],

    toolbarButtons: [
      {
        name: 'alignment',
        tooltip: 'Text alignment',
        icon: '<svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>',
        command: 'setAlignment',
        type: 'dropdown',
        getLabel: (engine) => {
          const align = getAlignment(engine)
          const labels = {
            'left': 'Align left',
            'center': 'Align center',
            'right': 'Align right',
            'justify': 'Justify',
          }
          return labels[align] || 'Align left'
        },
        dropdownItems: [
          { label: 'Align left', value: 'left', icon: '<svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>' },
          { label: 'Align center', value: 'center', icon: '<svg viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" fill="currentColor"/></svg>' },
          { label: 'Align right', value: 'right', icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>' },
          { label: 'Justify', value: 'justify', icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>' },
        ],
        isActive: (engine) => {
          const align = getAlignment(engine)
          return align === 'left' || align === 'center' || align === 'right' || align === 'justify'
        },
      },
    ],

  }
}

/**
 * Get all blocks within a selection range.
 * @param {import('../../core/EditorEngine.js').EditorEngine} engine
 * @param {Object} sel - Selection object
 * @returns {Object[]} Array of block nodes
 */
function getBlocksInSelection(engine, sel) {
  if (!sel) return []
  
  if (sel.isCollapsed) {
    // Collapsed selection - return single block
    const block = engine.findBlockForTextNode(sel.anchorNodeId)
    return block ? [block] : []
  }

  // Non-collapsed selection - find all blocks
  const doc = engine._model.doc
  const allTextNodes = []
  walkTree(doc, (node) => {
    if (node.type === 'text') allTextNodes.push(node)
  })

  const anchorIdx = allTextNodes.findIndex((n) => n.id === sel.anchorNodeId)
  const focusIdx = allTextNodes.findIndex((n) => n.id === sel.focusNodeId)
  if (anchorIdx === -1 || focusIdx === -1) {
    // Fallback to single block
    const block = engine.findBlockForTextNode(sel.anchorNodeId)
    return block ? [block] : []
  }

  const startIdx = Math.min(anchorIdx, focusIdx)
  const endIdx = Math.max(anchorIdx, focusIdx)
  const selectedTextNodes = allTextNodes.slice(startIdx, endIdx + 1)

  // Collect unique blocks that contain these text nodes
  const blockSet = new Set()
  const blocks = []

  for (const textNode of selectedTextNodes) {
    const block = engine.findBlockForTextNode(textNode.id)
    if (block && !blockSet.has(block.id)) {
      blockSet.add(block.id)
      blocks.push(block)
    }
  }

  return blocks
}

function setAlignment(engine, align) {
  const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
  if (!sel) return

  // Get all blocks in the selection
  const blocks = getBlocksInSelection(engine, sel)
  if (blocks.length === 0) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  // Apply alignment to all blocks in the selection
  const steps = blocks.map((block) => ({
    type: 'setNodeAttr',
    data: { nodeId: block.id, attr: 'textAlign', value: align },
  }))

  engine._model.applyTransaction({ steps })

  engine._reconcile()
  engine._selection.restoreSelection(sel)
  engine._bumpVersion()
}

function getAlignment(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null

  const block = engine.findBlockForTextNode(sel.anchorNodeId)
  if (!block) return null

  // Check if block is inside a listItem - if so, get alignment from the block (paragraph),
  // not from the listItem. The listItem might have textAlign but we want the block's alignment.
  const parentInfo = findParent(engine._model.doc, block.id)
  if (parentInfo && parentInfo.parent.type === 'listItem') {
    // Alignment should be on the paragraph block inside listItem, not on listItem itself
    return block.attrs?.textAlign || null
  }

  return block.attrs?.textAlign || null
}
