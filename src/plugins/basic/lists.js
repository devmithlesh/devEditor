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

    menuItems: [
      { menu: 'format', label: 'Bullet list', command: 'insertUnorderedList' },
      { menu: 'format', label: 'Numbered list', command: 'insertOrderedList' },
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

function toggleList(engine, listType, style) {
  // Use saved selection first (captured when dropdown opened), fallback to current selection
  const sel = engine._selection?.getSavedSelection() || engine._selection?.captureSelection()
  if (!sel) return

  // Get all blocks in the selection
  const blocks = getBlocksInSelection(engine, sel)
  if (blocks.length === 0) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  // Check if all blocks are already in the same list
  let allInSameList = true
  let currentListNode = null
  let currentListType = null
  let currentStyle = null

  for (const block of blocks) {
    const parentInfo = findParent(engine._model.doc, block.id)
    if (!parentInfo || parentInfo.parent.type !== 'listItem') {
      allInSameList = false
      break
    }
    
    const listItemInfo = findParent(engine._model.doc, parentInfo.parent.id)
    if (!listItemInfo) {
      allInSameList = false
      break
    }
    
    const listNode = listItemInfo.parent
    if (!currentListNode) {
      currentListNode = listNode
      currentListType = listNode.type
      currentStyle = listNode.attrs?.listStyleType || (currentListType === 'bulletList' ? 'disc' : 'decimal')
    } else if (listNode.id !== currentListNode.id) {
      allInSameList = false
      break
    }
  }

  // If all blocks are in the same list with same type and style, toggle off
  if (allInSameList && currentListType === listType && currentStyle === style) {
    const listParent = findParent(engine._model.doc, currentListNode.id)
    if (listParent) {
      const unwrappedBlocks = []
      for (const item of currentListNode.content) {
        if (item.content) {
          unwrappedBlocks.push(...item.content)
        }
      }
      listParent.parent.content.splice(listParent.index, 1, ...unwrappedBlocks)
    }
  } else if (allInSameList && currentListType === listType) {
    // Same list type, different style - just update style
    if (!currentListNode.attrs) currentListNode.attrs = {}
    currentListNode.attrs.listStyleType = style
  } else {
    // Need to convert blocks to list - first unwrap any blocks that are in lists
    const blocksToWrap = []
    const processedBlockIds = new Set()
    
    for (const block of blocks) {
      if (processedBlockIds.has(block.id)) continue
      
      const parentInfo = findParent(engine._model.doc, block.id)
      if (!parentInfo) continue
      
      if (parentInfo.parent.type === 'listItem') {
        // Unwrap from existing list
        const listItemInfo = findParent(engine._model.doc, parentInfo.parent.id)
        if (listItemInfo) {
          const listNode = listItemInfo.parent
          const listParent = findParent(engine._model.doc, listNode.id)
          if (listParent) {
            // Find the list item containing this block
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
        // Not in a list, add directly
        blocksToWrap.push(block)
        processedBlockIds.add(block.id)
      }
    }
    
    // Now wrap all blocks in a single list
    if (blocksToWrap.length > 0) {
      // Find the parent of the first block to insert the list there
      const firstBlock = blocksToWrap[0]
      const firstBlockParent = findParent(engine._model.doc, firstBlock.id)
      if (firstBlockParent) {
        const firstBlockIndex = firstBlockParent.index
        
        // Create list with first block
        const listNode = {
          id: generateId(),
          type: listType,
          attrs: style ? { listStyleType: style } : {},
          content: [{
            id: generateId(),
            type: 'listItem',
            content: [deepClone(firstBlock)],
          }],
        }
        
        // Add remaining blocks as list items
        for (let i = 1; i < blocksToWrap.length; i++) {
          listNode.content.push({
            id: generateId(),
            type: 'listItem',
            content: [deepClone(blocksToWrap[i])],
          })
        }
        
        // Remove original blocks and insert list
        const parent = firstBlockParent.parent
        const indicesToRemove = blocksToWrap.map(b => {
          const info = findParent(engine._model.doc, b.id)
          return info ? info.index : -1
        }).filter(idx => idx !== -1).sort((a, b) => b - a) // Sort descending for safe removal
        
        // Remove blocks (from end to start to maintain indices)
        for (const idx of indicesToRemove) {
          parent.content.splice(idx, 1)
        }
        
        // Insert list at the position of the first block
        parent.content.splice(firstBlockIndex, 0, listNode)
      }
    }
  }

  engine._model._ensureMinimumContent()
  engine._reconcile()
  
  // After reconciliation, focus the container and restore selection
  const container = engine.getContainer()
  if (container) {
    // Focus the container first to ensure typing works
    container.focus({ preventScroll: true })
    
    // After cloning blocks and wrapping in list items, old selection coordinates are invalid
    // Find the first list item of the target list type and set cursor at the end of its text
    let targetTextNode = null
    let targetOffset = 0
    
    walkTree(engine._model.doc, (node) => {
      if (node.type === listType && node.content && node.content.length > 0) {
        const firstListItem = node.content[0]
        if (firstListItem.content && firstListItem.content.length > 0) {
          const firstBlock = firstListItem.content[0]
          // Find last text node in this block
          walkTree(firstBlock, (n) => {
            if (n.type === 'text') {
              targetTextNode = n
              targetOffset = n.text.length
            }
          })
        }
        return false // Stop after finding first matching list
      }
    })
    
    if (targetTextNode) {
      // Set cursor at the end of the first list item's text
      engine._selection.setSavedSelection({
        anchorNodeId: targetTextNode.id,
        anchorOffset: targetOffset,
        focusNodeId: targetTextNode.id,
        focusOffset: targetOffset,
        isCollapsed: true,
      })
      engine._selection.restoreSelection()
    } else {
      // Fallback: try to restore original selection (might work for style changes)
      engine._selection.restoreSelection(sel)
    }
  }
  
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
