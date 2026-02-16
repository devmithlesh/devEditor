/**
 * Lists plugin — ordered and unordered list toggle with style options.
 */

import { findNodeById, findParent, generateId, deepClone, walkTree } from '../../utils/helpers.js'

export function listsPlugin() {
  return {
    name: 'lists',

    commands: [
      {
        name: 'insertUnorderedList',
        execute: (engine, style) => toggleList(engine, 'bulletList', style),
      },
      {
        name: 'insertOrderedList',
        execute: (engine, style) => toggleList(engine, 'orderedList', style),
      },
    ],

    toolbarButtons: [
      {
        name: 'bullist',
        tooltip: 'Bullet list',
        icon: '<svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" fill="currentColor"/></svg>',
        command: 'insertUnorderedList',
        type: 'dropdown',
        getLabel: (engine) => {
          const style = getCurrentListStyle(engine, 'bulletList')
          if (style === 'circle') return '○'
          if (style === 'square') return '■'
          return '•'
        },
        dropdownItems: [
          { label: '• Bullet list', value: 'disc', preview: 'disc' },
          { label: '○ Bullet list', value: 'circle', preview: 'circle' },
          { label: '■ Bullet list', value: 'square', preview: 'square' },
        ],
        isActive: (engine) => isInList(engine, 'bulletList'),
      },
      {
        name: 'numlist',
        tooltip: 'Numbered list',
        icon: '<svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" fill="currentColor"/></svg>',
        command: 'insertOrderedList',
        type: 'dropdown',
        getLabel: (engine) => {
          const style = getCurrentListStyle(engine, 'orderedList')
          const labels = {
            'decimal': '1.',
            'lower-alpha': 'a.',
            'upper-alpha': 'A.',
            'lower-roman': 'i.',
            'upper-roman': 'I.',
            'lower-greek': 'α.',
          }
          return labels[style] || '1.'
        },
        dropdownItems: [
          { label: '1. Numbered list', value: 'decimal', preview: 'decimal' },
          { label: 'a. Numbered list', value: 'lower-alpha', preview: 'lower-alpha' },
          { label: 'A. Numbered list', value: 'upper-alpha', preview: 'upper-alpha' },
          { label: 'i. Numbered list', value: 'lower-roman', preview: 'lower-roman' },
          { label: 'I. Numbered list', value: 'upper-roman', preview: 'upper-roman' },
          { label: 'α. Numbered list', value: 'lower-greek', preview: 'lower-greek' },
        ],
        isActive: (engine) => isInList(engine, 'orderedList'),
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

/**
 * Get list information for selected blocks
 * @returns {{ allInSameList: boolean, listNode: Object|null, listType: string|null, style: string|null }}
 */
function getListInfo(blocks, doc) {
  let listNode = null
  let listType = null
  let style = null
  let allInSameList = true

  for (const block of blocks) {
    const parentInfo = findParent(doc, block.id)
    if (!parentInfo || parentInfo.parent.type !== 'listItem') {
      allInSameList = false
      break
    }
    
    const listItemInfo = findParent(doc, parentInfo.parent.id)
    if (!listItemInfo) {
      allInSameList = false
      break
    }
    
    const currentList = listItemInfo.parent
    if (!listNode) {
      listNode = currentList
      listType = currentList.type
      style = currentList.attrs?.listStyleType || (listType === 'bulletList' ? 'disc' : 'decimal')
    } else if (currentList.id !== listNode.id) {
      allInSameList = false
      break
    }
  }

  return { allInSameList, listNode, listType, style }
}

/**
 * Unwrap blocks from their current list items
 * @returns {Object[]} Array of unwrapped blocks
 */
function unwrapBlocksFromLists(blocks, doc) {
  const blocksToWrap = []
  const processedBlockIds = new Set()

  for (const block of blocks) {
    if (processedBlockIds.has(block.id)) continue
    
    const parentInfo = findParent(doc, block.id)
    if (!parentInfo) continue
    
    if (parentInfo.parent.type === 'listItem') {
      const listItemInfo = findParent(doc, parentInfo.parent.id)
      if (listItemInfo) {
        const listNode = listItemInfo.parent
        const listParent = findParent(doc, listNode.id)
        if (listParent) {
          const listItem = listNode.content.find(item => 
            item.content && item.content.some(b => b.id === block.id)
          )
          if (listItem && listItem.content) {
            // Extract blocks from this list item
            for (const b of listItem.content) {
              if (!processedBlockIds.has(b.id)) {
                blocksToWrap.push(b)
                processedBlockIds.add(b.id)
              }
            }
            // Remove the list item
            const itemIndex = listNode.content.indexOf(listItem)
            listNode.content.splice(itemIndex, 1)
            
            // If list is now empty, remove it
            if (listNode.content.length === 0) {
              listParent.parent.content.splice(listParent.index, 1)
            }
          }
        }
      }
    } else {
      blocksToWrap.push(block)
      processedBlockIds.add(block.id)
    }
  }

  return blocksToWrap
}

/**
 * Create a new list node with blocks as list items
 */
function createListNode(listType, style, blocks) {
  const defaultStyle = listType === 'bulletList' ? 'disc' : 'decimal'
  return {
    id: generateId(),
    type: listType,
    attrs: style ? { listStyleType: style } : {},
    content: blocks.map(block => ({
      id: generateId(),
      type: 'listItem',
      content: [deepClone(block)],
    })),
  }
}

/**
 * Insert list at the correct position and remove original blocks
 */
function insertListAtPosition(listNode, blocks, doc) {
  if (blocks.length === 0) return

  const firstBlock = blocks[0]
  const firstBlockParent = findParent(doc, firstBlock.id)
  if (!firstBlockParent) return

  const parent = firstBlockParent.parent
  const firstBlockIndex = firstBlockParent.index

  // Get indices of blocks to remove (they might be in different parents after unwrapping)
  const indicesToRemove = blocks
    .map(b => {
      const info = findParent(doc, b.id)
      return info && info.parent === parent ? info.index : -1
    })
    .filter(idx => idx !== -1)
    .sort((a, b) => b - a) // Sort descending for safe removal

  // Remove blocks (from end to start to maintain indices)
  for (const idx of indicesToRemove) {
    parent.content.splice(idx, 1)
  }

  // Calculate adjusted insertion index
  let adjustedIndex = firstBlockIndex
  for (const idx of indicesToRemove) {
    if (idx < firstBlockIndex) adjustedIndex--
  }

  // Insert list at the adjusted position
  parent.content.splice(adjustedIndex, 0, listNode)
}

/**
 * Restore cursor position after list operation
 */
function restoreCursorAfterListOperation(engine, listType, originalSel) {
  const container = engine.getContainer()
  if (!container) return

  container.focus({ preventScroll: true })

  // Find the first list item of the target list type
  let targetTextNode = null
  let targetOffset = 0

  walkTree(engine._model.doc, (node) => {
    if (node.type === listType && node.content && node.content.length > 0) {
      const firstListItem = node.content[0]
      if (firstListItem.content && firstListItem.content.length > 0) {
        const firstBlock = firstListItem.content[0]
        walkTree(firstBlock, (n) => {
          if (n.type === 'text') {
            targetTextNode = n
            targetOffset = n.text.length
          }
        })
      }
      return false
    }
  })

  if (targetTextNode) {
    engine._selection.setSavedSelection({
      anchorNodeId: targetTextNode.id,
      anchorOffset: targetOffset,
      focusNodeId: targetTextNode.id,
      focusOffset: targetOffset,
      isCollapsed: true,
    })
    engine._selection.restoreSelection()
  } else {
    engine._selection.restoreSelection(originalSel)
  }
}

function toggleList(engine, listType, style) {
  const sel = engine._selection?.getSavedSelection() || engine._selection?.captureSelection()
  if (!sel) return

  const blocks = getBlocksInSelection(engine, sel)
  if (blocks.length === 0) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  const { allInSameList, listNode, listType: currentListType, style: currentStyle } = getListInfo(blocks, engine._model.doc)

  // Case 1: All blocks in same list, same type and style - toggle off
  if (allInSameList && currentListType === listType && currentStyle === style) {
    const listParent = findParent(engine._model.doc, listNode.id)
    if (listParent) {
      const unwrappedBlocks = []
      for (const item of listNode.content) {
        if (item.content) {
          unwrappedBlocks.push(...item.content)
        }
      }
      listParent.parent.content.splice(listParent.index, 1, ...unwrappedBlocks)
    }
  }
  // Case 2: All blocks in same list, same type, different style - update style
  else if (allInSameList && currentListType === listType) {
    if (!listNode.attrs) listNode.attrs = {}
    listNode.attrs.listStyleType = style
  }
  // Case 3: All blocks in same list, different type - convert list type
  else if (allInSameList && currentListType !== listType) {
    listNode.type = listType
    if (!listNode.attrs) listNode.attrs = {}
    listNode.attrs.listStyleType = style || (listType === 'bulletList' ? 'disc' : 'decimal')
  }
  // Case 4: Blocks in different lists or not in lists - unwrap and create new list
  else {
    const blocksToWrap = unwrapBlocksFromLists(blocks, engine._model.doc)
    if (blocksToWrap.length > 0) {
      const listNode = createListNode(listType, style, blocksToWrap)
      insertListAtPosition(listNode, blocksToWrap, engine._model.doc)
    }
  }

  engine._model._ensureMinimumContent()
  engine._reconcile()
  restoreCursorAfterListOperation(engine, listType, sel)
  engine._bumpVersion()
}

function getCurrentListStyle(engine, listType) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return listType === 'bulletList' ? 'disc' : 'decimal'

  const block = engine.findBlockForTextNode(sel.anchorNodeId)
  if (!block) return listType === 'bulletList' ? 'disc' : 'decimal'

  const parentInfo = findParent(engine._model.doc, block.id)
  if (!parentInfo) return listType === 'bulletList' ? 'disc' : 'decimal'

  if (parentInfo.parent.type === 'listItem') {
    const listItemInfo = findParent(engine._model.doc, parentInfo.parent.id)
    if (listItemInfo && listItemInfo.parent.type === listType) {
      return listItemInfo.parent.attrs?.listStyleType || (listType === 'bulletList' ? 'disc' : 'decimal')
    }
  }

  return listType === 'bulletList' ? 'disc' : 'decimal'
}

function isInList(engine, listType) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return false

  const block = engine.findBlockForTextNode(sel.anchorNodeId)
  if (!block) return false

  const parentInfo = findParent(engine._model.doc, block.id)
  if (!parentInfo) return false

  if (parentInfo.parent.type === 'listItem') {
    const listItemParent = findParent(engine._model.doc, parentInfo.parent.id)
    return listItemParent?.parent.type === listType
  }

  return false
}
