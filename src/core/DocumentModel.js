/**
 * @fileoverview DocumentModel — the JSON tree that serves as the editor's source of truth.
 * All mutations happen through transaction steps applied to this model.
 * The DOM is then reconciled from this model.
 */

import { generateId, deepClone, findNodeById, findParent, walkTree, getTextNodes } from '../utils/helpers.js'

export class DocumentModel {
  constructor() {
    /** @type {import('../types/node.types.js').EditorDoc} */
    this.doc = this._createEmptyDoc()
  }

  /** Get a deep clone of the current document. */
  getDoc() {
    return deepClone(this.doc)
  }

  /** Replace the entire document. */
  setDoc(doc) {
    this.doc = deepClone(doc)
    this._ensureMinimumContent()
  }

  /** Apply a transaction (array of steps) to the document. Returns the updated doc. */
  applyTransaction(transaction) {
    for (const step of transaction.steps) {
      this._applyStep(step)
    }
    this._ensureMinimumContent()
    return this.doc
  }

  /** @private */
  _applyStep(step) {
    switch (step.type) {
      case 'insertText': return this._insertText(step.data)
      case 'deleteText': return this._deleteText(step.data)
      case 'splitNode': return this._splitNode(step.data)
      case 'mergeNodes': return this._mergeNodes(step.data)
      case 'addMark': return this._addMark(step.data)
      case 'removeMark': return this._removeMark(step.data)
      case 'setNodeAttr': return this._setNodeAttr(step.data)
      case 'insertNode': return this._insertNode(step.data)
      case 'deleteNode': return this._deleteNode(step.data)
      case 'replaceContent': return this._replaceContent(step.data)
      case 'wrapInBlock': return this._wrapInBlock(step.data)
      case 'changeBlockType': return this._changeBlockType(step.data)
      default:
        console.warn(`Unknown step type: ${step.type}`)
    }
  }

  /**
   * Insert text at a position within a text node.
   * @param {{ nodeId: string, offset: number, text: string }} data
   */
  _insertText({ nodeId, offset, text }) {
    const node = findNodeById(this.doc, nodeId)
    if (!node || node.type !== 'text') return
    node.text = node.text.slice(0, offset) + text + node.text.slice(offset)
  }

  /**
   * Delete text from a text node.
   * @param {{ nodeId: string, offset: number, count: number }} data
   */
  _deleteText({ nodeId, offset, count }) {
    const node = findNodeById(this.doc, nodeId)
    if (!node || node.type !== 'text') return
    node.text = node.text.slice(0, offset) + node.text.slice(offset + count)
  }

  /**
   * Split a block node at the given text position (for Enter key).
   * Creates a new block after the current one, moving content after the split point.
   * @param {{ blockId: string, textNodeId: string, offset: number }} data
   */
  _splitNode({ blockId, textNodeId, offset }) {
    const parentInfo = findParent(this.doc, blockId)
    if (!parentInfo) return

    const block = findNodeById(this.doc, blockId)
    if (!block || !block.content) return

    // Find the text node index within the block
    const textIdx = block.content.findIndex((n) => n.id === textNodeId)
    if (textIdx === -1) return

    const textNode = block.content[textIdx]

    // Content before split stays in current block
    const beforeContent = [
      ...block.content.slice(0, textIdx),
      { ...deepClone(textNode), id: textNode.id, text: textNode.text.slice(0, offset) },
    ]

    // Content after split goes into new block
    const afterContent = [
      { id: generateId(), type: 'text', text: textNode.text.slice(offset), marks: textNode.marks ? deepClone(textNode.marks) : undefined },
      ...block.content.slice(textIdx + 1).map((n) => deepClone(n)),
    ]

    // Update current block
    block.content = beforeContent

    // Create new block (same type, reset heading to paragraph for Enter)
    const newBlockType = block.type === 'heading' ? 'paragraph' : block.type
    const newBlock = {
      id: generateId(),
      type: newBlockType,
      content: afterContent.length > 0 ? afterContent : [{ id: generateId(), type: 'text', text: '' }],
    }
    if (block.attrs?.textAlign) {
      newBlock.attrs = { textAlign: block.attrs.textAlign }
    }

    // Insert new block after current
    const { parent, index } = parentInfo
    parent.content.splice(index + 1, 0, newBlock)

    return newBlock.content[0].id
  }

  /**
   * Merge a block with the previous block (Backspace at start of block).
   * @param {{ blockId: string }} data
   */
  _mergeNodes({ blockId }) {
    const parentInfo = findParent(this.doc, blockId)
    if (!parentInfo || parentInfo.index === 0) return null

    const { parent, index } = parentInfo
    const currentBlock = parent.content[index]
    const prevBlock = parent.content[index - 1]

    if (!prevBlock.content || !currentBlock.content) return null

    // Record the merge point (end of previous block's text) for cursor positioning
    const prevTextNodes = getTextNodes(prevBlock)
    const lastPrevText = prevTextNodes[prevTextNodes.length - 1]
    const mergeOffset = lastPrevText ? lastPrevText.text.length : 0

    // Append current block's content to previous block
    prevBlock.content.push(...currentBlock.content)

    // Remove current block
    parent.content.splice(index, 1)

    return { nodeId: lastPrevText?.id, offset: mergeOffset }
  }

  /**
   * Add a mark to text nodes within a range, splitting at boundaries.
   * @param {{ startNodeId: string, startOffset: number, endNodeId: string, endOffset: number, mark: Object }} data
   */
  _addMark({ startNodeId, startOffset, endNodeId, endOffset, mark }) {
    const textNodes = this._getTextNodesInRange(startNodeId, startOffset, endNodeId, endOffset)
    for (const textNode of textNodes) {
      if (!textNode.marks) textNode.marks = []
      const existingIdx = textNode.marks.findIndex((m) => m.type === mark.type)
      if (existingIdx !== -1) {
        textNode.marks[existingIdx] = deepClone(mark)
      } else {
        textNode.marks.push(deepClone(mark))
      }
    }
  }

  /**
   * Remove a mark from text nodes within a range, splitting at boundaries.
   * @param {{ startNodeId: string, startOffset: number, endNodeId: string, endOffset: number, markType: string }} data
   */
  _removeMark({ startNodeId, startOffset, endNodeId, endOffset, markType }) {
    const textNodes = this._getTextNodesInRange(startNodeId, startOffset, endNodeId, endOffset)
    for (const textNode of textNodes) {
      if (textNode.marks) {
        textNode.marks = textNode.marks.filter((m) => m.type !== markType)
        if (textNode.marks.length === 0) delete textNode.marks
      }
    }
  }

  /**
   * Set an attribute on a node.
   * @param {{ nodeId: string, attr: string, value: * }} data
   */
  _setNodeAttr({ nodeId, attr, value }) {
    const node = findNodeById(this.doc, nodeId)
    if (!node) return
    if (!node.attrs) node.attrs = {}
    node.attrs[attr] = value
  }

  /**
   * Insert a new node as a child of a parent.
   * @param {{ parentId: string, index: number, node: Object }} data
   */
  _insertNode({ parentId, index, node }) {
    const parent = findNodeById(this.doc, parentId)
    if (!parent) {
      // parentId might be 'doc'
      if (this.doc.type === 'doc') {
        this.doc.content.splice(index, 0, deepClone(node))
      }
      return
    }
    if (!parent.content) parent.content = []
    parent.content.splice(index, 0, deepClone(node))
  }

  /**
   * Delete a node by ID.
   * @param {{ nodeId: string }} data
   */
  _deleteNode({ nodeId }) {
    const parentInfo = findParent(this.doc, nodeId)
    if (!parentInfo) return
    parentInfo.parent.content.splice(parentInfo.index, 1)
  }

  /**
   * Replace the entire content.
   * @param {{ content: Array }} data
   */
  _replaceContent({ content }) {
    this.doc.content = deepClone(content)
  }

  /**
   * Wrap a block node in a new parent block (e.g., wrap paragraph in list).
   * @param {{ blockId: string, wrapperType: string }} data
   */
  _wrapInBlock({ blockId, wrapperType }) {
    const parentInfo = findParent(this.doc, blockId)
    if (!parentInfo) return

    const block = parentInfo.parent.content[parentInfo.index]
    const listItem = {
      id: generateId(),
      type: 'listItem',
      content: [deepClone(block)],
    }
    const wrapper = {
      id: generateId(),
      type: wrapperType,
      content: [listItem],
    }
    parentInfo.parent.content[parentInfo.index] = wrapper
  }

  /**
   * Change a block node's type.
   * @param {{ blockId: string, newType: string, attrs: Object }} data
   */
  _changeBlockType({ blockId, newType, attrs }) {
    const node = findNodeById(this.doc, blockId)
    if (!node) return
    node.type = newType
    if (attrs) {
      node.attrs = { ...node.attrs, ...attrs }
    } else if (newType === 'paragraph') {
      // Remove heading-specific attrs
      if (node.attrs) delete node.attrs.level
    }
  }

  /**
   * Split a text node at the given offset. Returns the ID of the new (second) node.
   * The original node keeps text before the offset; the new node gets text after.
   * @param {string} nodeId
   * @param {number} offset
   * @returns {string|null} ID of the new node, or null if split not needed
   */
  _splitTextNode(nodeId, offset) {
    const node = findNodeById(this.doc, nodeId)
    if (!node || node.type !== 'text') return null
    if (offset <= 0 || offset >= node.text.length) return null

    const parentInfo = findParent(this.doc, nodeId)
    if (!parentInfo) return null

    const newNode = {
      id: generateId(),
      type: 'text',
      text: node.text.slice(offset),
    }
    if (node.marks && node.marks.length > 0) {
      newNode.marks = deepClone(node.marks)
    }

    // Trim original node
    node.text = node.text.slice(0, offset)

    // Insert new node after original in parent's content
    const idx = parentInfo.parent.content.indexOf(node)
    parentInfo.parent.content.splice(idx + 1, 0, newNode)

    return newNode.id
  }

  /**
   * Get all text nodes in a selection range, splitting at boundaries so marks
   * apply only to the selected portion of text.
   * @param {string} startId - Start text node ID
   * @param {number} startOffset - Character offset within start node
   * @param {string} endId - End text node ID
   * @param {number} endOffset - Character offset within end node
   * @returns {Object[]} Array of text nodes that should receive the mark
   * @private
   */
  _getTextNodesInRange(startId, startOffset, endId, endOffset) {
    // Collect all text nodes in document order
    const allTextNodes = []
    walkTree(this.doc, (node) => {
      if (node.type === 'text') allTextNodes.push(node)
    })

    let startIdx = allTextNodes.findIndex((n) => n.id === startId)
    let endIdx = allTextNodes.findIndex((n) => n.id === endId)
    if (startIdx === -1 || endIdx === -1) return []

    // Normalize direction (anchor may be after focus if user selected backwards)
    if (startIdx > endIdx) {
      ;[startIdx, endIdx] = [endIdx, startIdx]
      ;[startId, endId] = [endId, startId]
      ;[startOffset, endOffset] = [endOffset, startOffset]
    }

    // Handle same-node selection
    if (startId === endId) {
      const node = allTextNodes[startIdx]
      const so = Math.min(startOffset, endOffset)
      const eo = Math.max(startOffset, endOffset)

      // Split end first (so offsets stay valid), then start
      if (eo < node.text.length) {
        this._splitTextNode(node.id, eo)
      }
      if (so > 0) {
        const newId = this._splitTextNode(node.id, so)
        if (newId) {
          return [findNodeById(this.doc, newId)]
        }
      }
      return [node]
    }

    // Multi-node selection: split end node first, then start node
    const endNode = allTextNodes[endIdx]
    if (endOffset < endNode.text.length && endOffset > 0) {
      this._splitTextNode(endNode.id, endOffset)
    } else if (endOffset === 0) {
      // Selection ends at start of end node — exclude it entirely
      endIdx--
      if (endIdx < startIdx) return []
    }

    const startNode = allTextNodes[startIdx]
    let actualStartId = startId
    if (startOffset > 0 && startOffset < startNode.text.length) {
      const newId = this._splitTextNode(startNode.id, startOffset)
      if (newId) {
        actualStartId = newId
      }
    } else if (startOffset >= startNode.text.length) {
      // Selection starts at end of start node — exclude it, move to next
      startIdx++
      if (startIdx > endIdx) return []
      actualStartId = allTextNodes[startIdx]?.id
    }

    // Re-collect text nodes after splits (IDs may have changed)
    const updatedTextNodes = []
    walkTree(this.doc, (node) => {
      if (node.type === 'text') updatedTextNodes.push(node)
    })

    const newStartIdx = updatedTextNodes.findIndex((n) => n.id === actualStartId)
    const newEndIdx = updatedTextNodes.findIndex((n) => n.id === endNode.id)
    if (newStartIdx === -1 || newEndIdx === -1) return []

    return updatedTextNodes.slice(newStartIdx, newEndIdx + 1)
  }

  /** Ensure the document always has at least one paragraph with a text node. */
  _ensureMinimumContent() {
    if (!this.doc.content || this.doc.content.length === 0) {
      this.doc.content = [this._createEmptyParagraph()]
    }
    // Ensure each block has at least one text node
    for (const block of this.doc.content) {
      if (block.content && block.content.length === 0) {
        block.content.push({ id: generateId(), type: 'text', text: '' })
      }
    }
    // Ensure the document always ends with a paragraph so the user can type after tables/images/HR
    const last = this.doc.content[this.doc.content.length - 1]
    if (last && last.type !== 'paragraph' && last.type !== 'heading') {
      this.doc.content.push(this._createEmptyParagraph())
    }
  }

  /** @private */
  _createEmptyDoc() {
    return {
      type: 'doc',
      content: [this._createEmptyParagraph()],
    }
  }

  /** @private */
  _createEmptyParagraph() {
    return {
      id: generateId(),
      type: 'paragraph',
      content: [{ id: generateId(), type: 'text', text: '' }],
    }
  }
}
