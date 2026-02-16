/**
 * Heading plugin — provides format select dropdown for block types.
 * Commands: formatBlock (sets heading level or paragraph)
 */

import { findNodeById, walkTree, findParent } from '../../utils/helpers.js'

/**
 * Get all blocks in the current selection
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
 * Unwrap blocks from list items if they are inside lists and re-insert them at the correct position
 */
function unwrapBlocksFromLists(blocks, doc) {
  const unwrappedBlocks = []
  const processedBlockIds = new Set()
  const blocksToInsert = [] // { blocks: [], insertAfter: blockId }

  for (const block of blocks) {
    if (processedBlockIds.has(block.id)) continue
    
    const parentInfo = findParent(doc, block.id)
    if (!parentInfo) {
      unwrappedBlocks.push(block)
      processedBlockIds.add(block.id)
      continue
    }
    
    // Check if block is inside a list item
    if (parentInfo.parent.type === 'listItem') {
      const listItemInfo = findParent(doc, parentInfo.parent.id)
      if (listItemInfo && (listItemInfo.parent.type === 'bulletList' || listItemInfo.parent.type === 'orderedList')) {
        const listNode = listItemInfo.parent
        const listParent = findParent(doc, listNode.id)
        if (listParent) {
          const listItem = listNode.content.find(item => 
            item.content && item.content.some(b => b.id === block.id)
          )
          if (listItem && listItem.content) {
            // Extract all blocks from this list item
            const extractedBlocks = []
            for (const b of listItem.content) {
              if (!processedBlockIds.has(b.id)) {
                extractedBlocks.push(b)
                processedBlockIds.add(b.id)
              }
            }
            
            // Store blocks to insert at list position
            blocksToInsert.push({
              blocks: extractedBlocks,
              listParent: listParent.parent,
              listIndex: listParent.index,
              itemIndex: listNode.content.indexOf(listItem)
            })
            
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
      unwrappedBlocks.push(block)
      processedBlockIds.add(block.id)
    }
  }

  // Re-insert unwrapped blocks at the correct positions
  // Process in reverse order to maintain indices
  blocksToInsert.sort((a, b) => {
    if (a.listIndex !== b.listIndex) return b.listIndex - a.listIndex
    return b.itemIndex - a.itemIndex
  })

  for (const { blocks: extractedBlocks, listParent, listIndex } of blocksToInsert) {
    // Insert blocks at the position where the list was
    listParent.content.splice(listIndex, 0, ...extractedBlocks)
    unwrappedBlocks.push(...extractedBlocks)
  }

  return unwrappedBlocks
}

export function headingPlugin() {
  return {
    name: 'heading',

    commands: [
      {
        name: 'formatBlock',
        /**
         * @param {Object} engine
         * @param {string} blockType - 'paragraph', 'heading1', 'heading2', etc.
         */
        execute: (engine, blockType) => {
          const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
          if (!sel) return

          // Get all blocks in the selection
          const blocks = getBlocksInSelection(engine, sel)
          if (blocks.length === 0) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          // Unwrap blocks from lists if needed
          const blocksToFormat = unwrapBlocksFromLists(blocks, engine._model.doc)

          // Apply format to all blocks
          for (const block of blocksToFormat) {
            if (blockType === 'paragraph') {
              engine._model._changeBlockType({ blockId: block.id, newType: 'paragraph' })
            } else if (blockType.startsWith('heading')) {
              const level = parseInt(blockType.replace('heading', '')) || 1
              engine._model._changeBlockType({
                blockId: block.id,
                newType: 'heading',
                attrs: { level },
              })
            } else if (blockType === 'blockquote') {
              engine._model._changeBlockType({ blockId: block.id, newType: 'blockquote' })
            } else if (blockType === 'codeBlock') {
              engine._model._changeBlockType({ blockId: block.id, newType: 'codeBlock' })
            }
          }

          engine._model._ensureMinimumContent()
          engine._reconcile()
          engine._selection.restoreSelection(sel)
          engine._bumpVersion()
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'formatselect',
        tooltip: 'Block format',
        icon: '',
        command: 'formatBlock',
        type: 'dropdown',
        getLabel: (engine) => {
          const sel = engine._selection?.getSavedSelection()
          if (!sel) return 'Paragraph'
          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return 'Paragraph'
          if (block.type === 'heading') return `Heading ${block.attrs?.level || 1}`
          if (block.type === 'blockquote') return 'Blockquote'
          if (block.type === 'codeBlock') return 'Code Block'
          return 'Paragraph'
        },
        dropdownItems: [
          { label: 'Paragraph', value: 'paragraph' },
          { label: 'Heading 1', value: 'heading1' },
          { label: 'Heading 2', value: 'heading2' },
          { label: 'Heading 3', value: 'heading3' },
          { label: 'Heading 4', value: 'heading4' },
          { label: 'Heading 5', value: 'heading5' },
          { label: 'Heading 6', value: 'heading6' },
          { label: 'Blockquote', value: 'blockquote' },
        ],
      },
    ],

  }
}
