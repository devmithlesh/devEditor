/**
 * @fileoverview EditorEngine — the central orchestrator.
 * Manages the document model, selection, event handling, and DOM reconciliation.
 * This is NOT a React component — it's a plain class used by React components via context.
 */

import { DocumentModel } from './DocumentModel.js'
import { SelectionManager } from './SelectionManager.js'
import { generateId, deepClone, findNodeById, findParent, getTextNodes, walkTree, getAbsoluteTextOffset, resolveAbsoluteTextOffset } from '../utils/helpers.js'
import { NODE_ID_ATTR } from '../utils/constants.js'

export class EditorEngine {
  constructor() {
    this._model = new DocumentModel()
    this._selection = null // Set when container mounts
    this._container = null
    this._isComposing = false
    this._isReconciling = false
    this._isExecutingCommand = false
    this._version = 0
    this._listeners = new Set()
    this._contentStyleEl = null

    // These are initialized in Phase 2 (will be set externally)
    this._commandRegistry = null
    this._pluginManager = null
    this._historyManager = null

    // Pending marks for type-ahead formatting (e.g., press Ctrl+B then type bold text)
    this._pendingMarks = []

    // Event handler references (for cleanup)
    this._handleBeforeInput = this._onBeforeInput.bind(this)
    this._handleKeyDown = this._onKeyDown.bind(this)
    this._handleCompositionStart = this._onCompositionStart.bind(this)
    this._handleCompositionEnd = this._onCompositionEnd.bind(this)
    this._handleInput = this._onInput.bind(this)
    this._handlePaste = this._onPaste.bind(this)
    this._handleSelectionChange = this._onSelectionChange.bind(this)
  }

  // ─── Lifecycle ───

  /**
   * Attach the engine to a contentEditable DOM element.
   * @param {HTMLElement} containerEl
   */
  attach(containerEl) {
    if (this._container) this.detach()
    this._container = containerEl
    this._selection = new SelectionManager(containerEl)

    containerEl.addEventListener('beforeinput', this._handleBeforeInput)
    containerEl.addEventListener('keydown', this._handleKeyDown)
    containerEl.addEventListener('compositionstart', this._handleCompositionStart)
    containerEl.addEventListener('compositionend', this._handleCompositionEnd)
    containerEl.addEventListener('input', this._handleInput)
    containerEl.addEventListener('paste', this._handlePaste)
    document.addEventListener('selectionchange', this._handleSelectionChange)
  }

  /** Detach from the contentEditable element. */
  detach() {
    if (!this._container) return
    this._container.removeEventListener('beforeinput', this._handleBeforeInput)
    this._container.removeEventListener('keydown', this._handleKeyDown)
    this._container.removeEventListener('compositionstart', this._handleCompositionStart)
    this._container.removeEventListener('compositionend', this._handleCompositionEnd)
    this._container.removeEventListener('input', this._handleInput)
    this._container.removeEventListener('paste', this._handlePaste)
    document.removeEventListener('selectionchange', this._handleSelectionChange)
    this._container = null
  }

  // ─── Public Accessors ───

  getDoc() { return this._model.getDoc() }
  getContainer() { return this._container }
  getVersion() { return this._version }

  /** Focus the editor. */
  focus() {
    if (this._container) {
      this._container.focus()
      if (this._selection) {
        this._selection.restoreSelection()
      }
    }
  }

  /** Blur the editor. */
  blur() {
    if (this._container) this._container.blur()
  }

  /**
   * Execute a command with selection change suppression.
   * Prevents _onSelectionChange from interfering during DOM reconciliation.
   */
  executeCommand(command, ...args) {
    if (!this._commandRegistry) return
    this._isExecutingCommand = true
    try {
      this._commandRegistry.execute(command, ...args)
    } finally {
      this._isExecutingCommand = false
    }
  }

  // ─── Pending Marks (Type-Ahead Formatting) ───

  /**
   * Toggle a pending mark for type-ahead formatting.
   * When cursor is collapsed and user presses Ctrl+B, the next typed text will be bold.
   */
  togglePendingMark(markType, markAttrs) {
    const idx = this._pendingMarks.findIndex((m) => m.type === markType)
    if (idx !== -1) {
      this._pendingMarks.splice(idx, 1)
    } else {
      const mark = markAttrs ? { type: markType, attrs: markAttrs } : { type: markType }
      this._pendingMarks.push(mark)
    }
  }

  /** Check if a pending mark is set. */
  hasPendingMark(markType) {
    return this._pendingMarks.some((m) => m.type === markType)
  }

  /** Clear all pending marks. */
  clearPendingMarks() {
    this._pendingMarks = []
  }

  // ─── Content API ───

  /**
   * Get the current content as an HTML string.
   * @returns {string}
   */
  getContent() {
    if (!this._container) return ''
    return this._serializeToHtml(this._model.doc)
  }

  /**
   * Set content from an HTML string.
   * @param {string} html
   */
  setContent(html) {
    const doc = this._parseHtml(html)
    this._model.setDoc(doc)
    this._reconcile()
    this._bumpVersion()
  }

  /**
   * Get the document as a JSON object.
   * @returns {Object}
   */
  getJSON() {
    return this._model.getDoc()
  }

  // ─── Transaction System ───

  /**
   * Apply a transaction to the document model.
   * @param {import('../types/editor.types.js').Transaction} transaction
   */
  applyTransaction(transaction) {
    // Save pre-transaction state for history
    const shouldAddToHistory = transaction.meta?.addToHistory !== false

    if (shouldAddToHistory && this._historyManager) {
      this._historyManager.push(this._model.getDoc(), this._selection?.getSavedSelection())
    }

    this._model.applyTransaction(transaction)
    this._reconcile()

    // Restore selection after DOM rebuild so cursor doesn't vanish
    if (this._selection) {
      this._selection.restoreSelection()
    }

    this._bumpVersion()
  }

  // ─── Event Handlers ───

  /** @private */
  _onBeforeInput(e) {
    if (this._isComposing) return

    const inputType = e.inputType

    switch (inputType) {
      case 'insertText': {
        e.preventDefault()
        this._handleInsertText(e.data || '')
        break
      }
      case 'insertParagraph':
      case 'insertLineBreak': {
        e.preventDefault()
        this._handleEnter()
        break
      }
      case 'deleteContentBackward': {
        e.preventDefault()
        this._handleBackspace()
        break
      }
      case 'deleteContentForward': {
        e.preventDefault()
        this._handleDelete()
        break
      }
      case 'deleteByCut': {
        e.preventDefault()
        this._handleCut()
        break
      }
      case 'deleteWordBackward': {
        e.preventDefault()
        this._handleDeleteWord('backward')
        break
      }
      case 'deleteWordForward': {
        e.preventDefault()
        this._handleDeleteWord('forward')
        break
      }
      case 'formatBold': {
        e.preventDefault()
        if (this._commandRegistry) this._commandRegistry.execute('bold')
        break
      }
      case 'formatItalic': {
        e.preventDefault()
        if (this._commandRegistry) this._commandRegistry.execute('italic')
        break
      }
      case 'formatUnderline': {
        e.preventDefault()
        if (this._commandRegistry) this._commandRegistry.execute('underline')
        break
      }
      case 'historyUndo': {
        e.preventDefault()
        this.undo()
        break
      }
      case 'historyRedo': {
        e.preventDefault()
        this.redo()
        break
      }
      default:
        // Let other input types pass through or handle them in _onInput
        break
    }
  }

  /** @private */
  _onKeyDown(e) {
    // Delegate to command registry for keyboard shortcuts
    if (this._commandRegistry) {
      const handled = this._commandRegistry.handleKeyDown(e)
      if (handled) return
    }

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        if (this._commandRegistry) this._commandRegistry.execute('outdent')
      } else {
        if (this._commandRegistry) this._commandRegistry.execute('indent')
      }
    }
  }

  /** @private */
  _onCompositionStart() {
    this._isComposing = true
  }

  /** @private */
  _onCompositionEnd(e) {
    this._isComposing = false
    // The composition result is already in the DOM. Read it back into the model.
    this._syncDomToModel()
  }

  /** @private */
  _onInput(e) {
    // For cases not caught by beforeinput (e.g., mobile browsers, IME)
    if (this._isComposing || this._isReconciling) return

    // Fallback for browsers that don't fully support beforeinput
    // Read DOM back into model if the input wasn't already handled
    if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
      // These should have been handled in beforeinput; if we get here, sync DOM→model
      this._syncDomToModel()
    }
  }

  /** @private */
  _onPaste(e) {
    e.preventDefault()
    const html = e.clipboardData?.getData('text/html')
    const text = e.clipboardData?.getData('text/plain')

    if (html) {
      this._handlePasteHtml(html)
    } else if (text) {
      this._handleInsertText(text)
    }
  }

  /** @private */
  _onSelectionChange() {
    if (this._isReconciling || this._isExecutingCommand || !this._container) return
    // Only capture if the selection is within our editor
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && this._container.contains(sel.anchorNode)) {
      this._selection.captureSelection()
      // Clear pending marks when cursor moves via mouse/keyboard
      if (this._pendingMarks.length > 0) {
        this._pendingMarks = []
      }
      this._bumpVersion()
    }
  }

  // ─── Text Input Handling ───

  /** @private */
  _handleInsertText(text) {
    const sel = this._selection.captureSelection()
    if (!sel) return

    // If there's a selection range, delete it first
    if (!sel.isCollapsed) {
      this._deleteSelection(sel)
    }

    const currentSel = this._selection.getSavedSelection()
    if (!currentSel) return
    const nodeId = currentSel.anchorNodeId
    const offset = currentSel.anchorOffset
    if (!nodeId) return

    const hasPendingMarks = this._pendingMarks.length > 0

    // Compute the absolute cursor offset BEFORE the transaction
    // (after insert, cursor should be at offset + text.length in absolute terms)
    let absCursorOffset = -1
    if (hasPendingMarks) {
      absCursorOffset = getAbsoluteTextOffset(this._model.doc, nodeId, offset + text.length)
    }

    const steps = [{ type: 'insertText', data: { nodeId, offset, text } }]

    // Apply pending marks to the inserted text range
    if (hasPendingMarks) {
      for (const mark of this._pendingMarks) {
        steps.push({
          type: 'addMark',
          data: {
            startNodeId: nodeId,
            startOffset: offset,
            endNodeId: nodeId,
            endOffset: offset + text.length,
            mark: deepClone(mark),
          },
        })
      }
      this._pendingMarks = []
    }

    this._model.applyTransaction({ steps })

    // After transaction, resolve cursor position
    // If pending marks caused text node splits, the old nodeId/offset may be stale
    let cursorNodeId = nodeId
    let cursorOffset = offset + text.length

    if (hasPendingMarks && absCursorOffset !== -1) {
      const resolved = resolveAbsoluteTextOffset(this._model.doc, absCursorOffset)
      if (resolved) {
        cursorNodeId = resolved.nodeId
        cursorOffset = resolved.offset
      }
    }

    // Push to history
    if (this._historyManager) {
      this._historyManager.pushDebounced(this._model.getDoc(), {
        anchorNodeId: cursorNodeId,
        anchorOffset: cursorOffset,
        focusNodeId: cursorNodeId,
        focusOffset: cursorOffset,
        isCollapsed: true,
      })
    }

    // Update cursor position
    this._selection.setSavedSelection({
      anchorNodeId: cursorNodeId,
      anchorOffset: cursorOffset,
      focusNodeId: cursorNodeId,
      focusOffset: cursorOffset,
      isCollapsed: true,
    })

    this._reconcile()
    this._selection.restoreSelection()
    this._bumpVersion()
  }

  /** @private */
  _handleEnter() {
    const sel = this._selection.captureSelection()
    if (!sel) return

    if (!sel.isCollapsed) {
      this._deleteSelection(sel)
    }

    const currentSel = this._selection.getSavedSelection()

    // Find the block containing the cursor
    const blockInfo = this._findBlockForTextNode(currentSel.anchorNodeId)
    if (!blockInfo) return

    if (this._historyManager) {
      this._historyManager.push(this._model.getDoc(), currentSel)
    }

    const newFirstTextId = this._model._splitNode({
      blockId: blockInfo.id,
      textNodeId: currentSel.anchorNodeId,
      offset: currentSel.anchorOffset,
    })

    this._model._ensureMinimumContent()

    if (newFirstTextId) {
      this._selection.setSavedSelection({
        anchorNodeId: newFirstTextId,
        anchorOffset: 0,
        focusNodeId: newFirstTextId,
        focusOffset: 0,
        isCollapsed: true,
      })
    }

    this._reconcile()
    this._selection.restoreSelection()
    this._bumpVersion()
  }

  /** @private */
  _handleBackspace() {
    const sel = this._selection.captureSelection()
    if (!sel) return

    if (!sel.isCollapsed) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      this._deleteSelection(sel)
      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
      return
    }

    const nodeId = sel.anchorNodeId
    const offset = sel.anchorOffset

    if (offset > 0) {
      // Delete character before cursor
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }

      this._model.applyTransaction({
        steps: [{ type: 'deleteText', data: { nodeId, offset: offset - 1, count: 1 } }],
      })

      this._selection.setSavedSelection({
        anchorNodeId: nodeId,
        anchorOffset: offset - 1,
        focusNodeId: nodeId,
        focusOffset: offset - 1,
        isCollapsed: true,
      })

      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
    } else {
      // At the start of a text node — try to merge with previous block
      const blockInfo = this._findBlockForTextNode(nodeId)
      if (!blockInfo) return

      // Check if this is the first text node in the block
      const textNodes = getTextNodes(findNodeById(this._model.doc, blockInfo.id))
      if (textNodes[0]?.id !== nodeId) return // Not at start of block

      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }

      const mergeResult = this._model._mergeNodes({ blockId: blockInfo.id })
      this._model._ensureMinimumContent()

      if (mergeResult) {
        this._selection.setSavedSelection({
          anchorNodeId: mergeResult.nodeId,
          anchorOffset: mergeResult.offset,
          focusNodeId: mergeResult.nodeId,
          focusOffset: mergeResult.offset,
          isCollapsed: true,
        })
      }

      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
    }
  }

  /** @private */
  _handleDelete() {
    const sel = this._selection.captureSelection()
    if (!sel) return

    if (!sel.isCollapsed) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      this._deleteSelection(sel)
      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
      return
    }

    const nodeId = sel.anchorNodeId
    const offset = sel.anchorOffset
    const node = findNodeById(this._model.doc, nodeId)
    if (!node) return

    if (offset < node.text.length) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }

      this._model.applyTransaction({
        steps: [{ type: 'deleteText', data: { nodeId, offset, count: 1 } }],
      })

      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
    }
    // TODO: merge with next block if at end of block
  }

  /** @private */
  _handleDeleteWord(direction) {
    // Simplified: delete single character for now
    if (direction === 'backward') {
      this._handleBackspace()
    } else {
      this._handleDelete()
    }
  }

  /** @private */
  _handleCut() {
    const sel = this._selection.captureSelection()
    if (!sel || sel.isCollapsed) return

    // Copy selected text to clipboard
    const selectedText = window.getSelection()?.toString() || ''
    navigator.clipboard?.writeText(selectedText)

    if (this._historyManager) {
      this._historyManager.push(this._model.getDoc(), sel)
    }
    this._deleteSelection(sel)
    this._reconcile()
    this._selection.restoreSelection()
    this._bumpVersion()
  }

  /** @private */
  _handlePasteHtml(html) {
    // For now, strip HTML and paste as text
    const temp = document.createElement('div')
    temp.innerHTML = html
    const text = temp.textContent || ''
    this._handleInsertText(text)
  }

  // ─── Selection Helpers ───

  /**
   * Delete the currently selected range.
   * @private
   */
  _deleteSelection(sel) {
    if (!sel || sel.isCollapsed) return

    // Simple case: selection within same text node
    if (sel.anchorNodeId === sel.focusNodeId) {
      const start = Math.min(sel.anchorOffset, sel.focusOffset)
      const end = Math.max(sel.anchorOffset, sel.focusOffset)

      this._model.applyTransaction({
        steps: [{
          type: 'deleteText',
          data: { nodeId: sel.anchorNodeId, offset: start, count: end - start },
        }],
      })

      this._selection.setSavedSelection({
        anchorNodeId: sel.anchorNodeId,
        anchorOffset: start,
        focusNodeId: sel.anchorNodeId,
        focusOffset: start,
        isCollapsed: true,
      })
      return
    }

    // Cross-node selection: collect all text nodes in order
    const allTextNodes = []
    walkTree(this._model.doc, (node) => {
      if (node.type === 'text') allTextNodes.push(node)
    })

    const anchorIdx = allTextNodes.findIndex((n) => n.id === sel.anchorNodeId)
    const focusIdx = allTextNodes.findIndex((n) => n.id === sel.focusNodeId)
    if (anchorIdx === -1 || focusIdx === -1) return

    const startIdx = Math.min(anchorIdx, focusIdx)
    const endIdx = Math.max(anchorIdx, focusIdx)
    const startOffset = startIdx === anchorIdx ? sel.anchorOffset : sel.focusOffset
    const endOffset = endIdx === focusIdx ? sel.focusOffset : sel.anchorOffset

    const steps = []

    // Delete from end to start to preserve indices
    // Last node: delete from 0 to endOffset
    if (startIdx !== endIdx) {
      steps.push({
        type: 'deleteText',
        data: { nodeId: allTextNodes[endIdx].id, offset: 0, count: endOffset },
      })
    }

    // Middle nodes: delete entirely (set text to empty)
    for (let i = endIdx - 1; i > startIdx; i--) {
      allTextNodes[i].text = ''
    }

    // First node: delete from startOffset to end
    const startNode = allTextNodes[startIdx]
    steps.push({
      type: 'deleteText',
      data: { nodeId: startNode.id, offset: startOffset, count: startNode.text.length - startOffset },
    })

    this._model.applyTransaction({ steps })

    this._selection.setSavedSelection({
      anchorNodeId: startNode.id,
      anchorOffset: startOffset,
      focusNodeId: startNode.id,
      focusOffset: startOffset,
      isCollapsed: true,
    })
  }

  // ─── DOM Reconciliation ───

  /**
   * Reconcile the document model into the contentEditable DOM.
   * @private
   */
  _reconcile() {
    if (!this._container) return
    this._isReconciling = true

    try {
      const html = this._renderDocToHtml(this._model.doc)
      this._container.innerHTML = html
    } finally {
      this._isReconciling = false
    }
  }

  /**
   * Render the document model to HTML with data-node-id attributes.
   * @private
   */
  _renderDocToHtml(doc) {
    if (!doc.content || doc.content.length === 0) return ''
    return doc.content.map((node) => this._renderNode(node)).join('')
  }

  /** @private */
  _renderNode(node) {
    switch (node.type) {
      case 'text':
        return this._renderTextNode(node)
      case 'paragraph':
        return this._renderBlock('p', node)
      case 'heading':
        return this._renderBlock(`h${node.attrs?.level || 1}`, node)
      case 'blockquote':
        return this._renderBlock('blockquote', node)
      case 'codeBlock':
        return `<pre ${NODE_ID_ATTR}="${node.id}"><code>${this._renderChildren(node)}</code></pre>`
      case 'bulletList':
        return this._renderBlock('ul', node)
      case 'orderedList':
        return this._renderBlock('ol', node)
      case 'listItem':
        return this._renderBlock('li', node)
      case 'horizontalRule':
        return `<hr ${NODE_ID_ATTR}="${node.id}"/>`
      case 'image':
        return `<img ${NODE_ID_ATTR}="${node.id}" src="${this._escapeAttr(node.attrs?.src || '')}" alt="${this._escapeAttr(node.attrs?.alt || '')}"/>`
      case 'table':
        return this._renderBlock('table', node)
      case 'tableRow':
        return this._renderBlock('tr', node)
      case 'tableCell': {
        const tag = node.attrs?.header ? 'th' : 'td'
        return this._renderBlock(tag, node)
      }
      case 'hardBreak':
        return '<br/>'
      case 'pageBreak':
        return `<div ${NODE_ID_ATTR}="${node.id}" data-type="pageBreak" style="page-break-after: always; border-top: 2px dashed #d1d5db; margin: 1.5em 0; position: relative; text-align: center;"><span style="position: relative; top: -10px; background: #fff; padding: 0 8px; font-size: 11px; color: #9ca3af;">Page Break</span></div>`
      default:
        return this._renderChildren(node)
    }
  }

  /** @private */
  _renderTextNode(node) {
    let html = this._escapeHtml(node.text || '')

    // Empty text nodes need a <br> to be selectable
    if (html === '') html = '<br/>'

    if (node.marks) {
      for (const mark of node.marks) {
        html = this._wrapMark(html, mark)
      }
    }

    return `<span ${NODE_ID_ATTR}="${node.id}">${html}</span>`
  }

  /** @private */
  _wrapMark(html, mark) {
    switch (mark.type) {
      case 'bold': return `<strong>${html}</strong>`
      case 'italic': return `<em>${html}</em>`
      case 'underline': return `<u>${html}</u>`
      case 'strikethrough': return `<s>${html}</s>`
      case 'code': return `<code>${html}</code>`
      case 'link':
        return `<a href="${this._escapeAttr(mark.attrs?.href || '#')}" target="${this._escapeAttr(mark.attrs?.target || '_blank')}" rel="noopener noreferrer">${html}</a>`
      case 'fontFamily':
        return `<span style="font-family: ${this._escapeAttr(mark.attrs?.family || 'inherit')}">${html}</span>`
      case 'fontSize':
        return `<span style="font-size: ${this._escapeAttr(mark.attrs?.size || 'inherit')}">${html}</span>`
      case 'foreColor':
        return `<span style="color: ${this._escapeAttr(mark.attrs?.color || 'inherit')}">${html}</span>`
      case 'backColor':
        return `<span style="background-color: ${this._escapeAttr(mark.attrs?.color || 'transparent')}">${html}</span>`
      case 'mention':
        return `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 4px;border-radius:4px;font-weight:500" contenteditable="false" data-mention="${this._escapeAttr(mark.attrs?.userId || '')}">${html}</span>`
      case 'anchor':
        return `<a id="${this._escapeAttr(mark.attrs?.name || '')}">${html}</a>`
      default:
        return html
    }
  }

  /** @private */
  _renderBlock(tag, node) {
    const styles = []
    if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`)
    if (node.attrs?.indent && node.attrs.indent > 0) styles.push(`margin-left: ${node.attrs.indent * 2}em`)
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
    const dirAttr = node.attrs?.dir ? ` dir="${node.attrs.dir}"` : ''
    return `<${tag} ${NODE_ID_ATTR}="${node.id}"${styleAttr}${dirAttr}>${this._renderChildren(node)}</${tag}>`
  }

  /** @private */
  _renderChildren(node) {
    if (!node.content || node.content.length === 0) return ''
    return node.content.map((child) => this._renderNode(child)).join('')
  }

  // ─── HTML Parsing (basic, enhanced in Phase 5) ───

  /**
   * Parse HTML string into a document model.
   * @private
   */
  _parseHtml(html) {
    if (!html || !html.trim()) {
      return { type: 'doc', content: [{ id: generateId(), type: 'paragraph', content: [{ id: generateId(), type: 'text', text: '' }] }] }
    }

    const template = document.createElement('template')
    template.innerHTML = html.trim()

    const content = []
    for (const child of template.content.childNodes) {
      const parsed = this._parseDomNode(child)
      if (parsed) {
        if (Array.isArray(parsed)) content.push(...parsed)
        else content.push(parsed)
      }
    }

    // If result is only text nodes, wrap in paragraph
    if (content.length > 0 && content.every((n) => n.type === 'text')) {
      return { type: 'doc', content: [{ id: generateId(), type: 'paragraph', content }] }
    }

    if (content.length === 0) {
      return { type: 'doc', content: [{ id: generateId(), type: 'paragraph', content: [{ id: generateId(), type: 'text', text: '' }] }] }
    }

    return { type: 'doc', content }
  }

  /** @private */
  _parseDomNode(domNode) {
    if (domNode.nodeType === Node.TEXT_NODE) {
      const text = domNode.textContent
      if (!text) return null
      return { id: generateId(), type: 'text', text }
    }

    if (domNode.nodeType !== Node.ELEMENT_NODE) return null
    const tag = domNode.tagName.toLowerCase()

    // Inline marks
    const markMap = { strong: 'bold', b: 'bold', em: 'italic', i: 'italic', u: 'underline', s: 'strikethrough', del: 'strikethrough', code: 'code' }
    if (markMap[tag]) {
      const children = this._parseChildren(domNode)
      for (const child of children) {
        if (child.type === 'text') {
          if (!child.marks) child.marks = []
          child.marks.push({ type: markMap[tag] })
        }
      }
      return children.length === 1 ? children[0] : children
    }

    if (tag === 'a') {
      const children = this._parseChildren(domNode)
      for (const child of children) {
        if (child.type === 'text') {
          if (!child.marks) child.marks = []
          child.marks.push({ type: 'link', attrs: { href: domNode.getAttribute('href') || '#' } })
        }
      }
      return children.length === 1 ? children[0] : children
    }

    if (tag === 'span') {
      const children = this._parseChildren(domNode)
      return children.length === 1 ? children[0] : children
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const align = domNode.style?.textAlign || undefined
      return {
        id: generateId(), type: 'heading',
        attrs: { level: parseInt(tag[1]), ...(align ? { textAlign: align } : {}) },
        content: this._parseChildren(domNode),
      }
    }

    // Block elements
    const blockMap = { p: 'paragraph', blockquote: 'blockquote', ul: 'bulletList', ol: 'orderedList', li: 'listItem', pre: 'codeBlock', table: 'table', tr: 'tableRow', td: 'tableCell', th: 'tableCell' }
    if (blockMap[tag]) {
      const node = { id: generateId(), type: blockMap[tag], content: this._parseChildren(domNode) }
      if (tag === 'th') node.attrs = { header: true }
      const align = domNode.style?.textAlign
      if (align) {
        if (!node.attrs) node.attrs = {}
        node.attrs.textAlign = align
      }
      return node
    }

    if (tag === 'br') return { id: generateId(), type: 'hardBreak' }
    if (tag === 'hr') return { id: generateId(), type: 'horizontalRule' }
    if (tag === 'img') return { id: generateId(), type: 'image', attrs: { src: domNode.getAttribute('src') || '', alt: domNode.getAttribute('alt') || '' } }

    // Div or unknown block → treat as paragraph
    if (['div', 'section', 'article'].includes(tag)) {
      return { id: generateId(), type: 'paragraph', content: this._parseChildren(domNode) }
    }

    // Unknown → pass through children
    return this._parseChildren(domNode)
  }

  /** @private */
  _parseChildren(domNode) {
    const children = []
    for (const child of domNode.childNodes) {
      const parsed = this._parseDomNode(child)
      if (parsed) {
        if (Array.isArray(parsed)) children.push(...parsed)
        else children.push(parsed)
      }
    }
    return children.length > 0 ? children : [{ id: generateId(), type: 'text', text: '' }]
  }

  // ─── Clean HTML Serialization (for getContent) ───

  /** @private */
  _serializeToHtml(doc) {
    if (!doc.content) return ''
    return doc.content.map((node) => this._serializeNode(node)).join('')
  }

  /** @private */
  _serializeNode(node) {
    switch (node.type) {
      case 'text': return this._serializeText(node)
      case 'paragraph': return `<p${this._styleAttr(node)}>${this._serializeChildren(node)}</p>`
      case 'heading': return `<h${node.attrs?.level || 1}${this._styleAttr(node)}>${this._serializeChildren(node)}</h${node.attrs?.level || 1}>`
      case 'blockquote': return `<blockquote>${this._serializeChildren(node)}</blockquote>`
      case 'codeBlock': return `<pre><code>${this._serializeChildren(node)}</code></pre>`
      case 'bulletList': return `<ul>${this._serializeChildren(node)}</ul>`
      case 'orderedList': return `<ol>${this._serializeChildren(node)}</ol>`
      case 'listItem': return `<li>${this._serializeChildren(node)}</li>`
      case 'horizontalRule': return '<hr/>'
      case 'image': return `<img src="${this._escapeAttr(node.attrs?.src || '')}" alt="${this._escapeAttr(node.attrs?.alt || '')}"/>`
      case 'table': return `<table>${this._serializeChildren(node)}</table>`
      case 'tableRow': return `<tr>${this._serializeChildren(node)}</tr>`
      case 'tableCell': {
        const tag = node.attrs?.header ? 'th' : 'td'
        return `<${tag}>${this._serializeChildren(node)}</${tag}>`
      }
      case 'hardBreak': return '<br/>'
      default: return this._serializeChildren(node)
    }
  }

  /** @private */
  _serializeText(node) {
    let html = this._escapeHtml(node.text || '')
    if (!html) return ''
    if (node.marks) {
      for (const mark of node.marks) {
        html = this._wrapMark(html, mark)
      }
    }
    return html
  }

  /** @private */
  _serializeChildren(node) {
    if (!node.content) return ''
    return node.content.map((c) => this._serializeNode(c)).join('')
  }

  /** @private */
  _styleAttr(node) {
    if (node.attrs?.textAlign) return ` style="text-align: ${node.attrs.textAlign}"`
    return ''
  }

  // ─── Sync DOM → Model (fallback for IME) ───

  /** @private */
  _syncDomToModel() {
    if (!this._container) return
    const html = this._container.innerHTML
    const doc = this._parseHtml(html)
    this._model.setDoc(doc)
    this._bumpVersion()
  }

  // ─── Undo/Redo ───

  undo() {
    if (!this._historyManager) return
    const entry = this._historyManager.undo(this._model.getDoc(), this._selection?.getSavedSelection())
    if (entry) {
      this._model.setDoc(entry.doc)
      this._reconcile()
      if (entry.selection) {
        this._selection.setSavedSelection(entry.selection)
        this._selection.restoreSelection()
      }
      this._bumpVersion()
    }
  }

  redo() {
    if (!this._historyManager) return
    const entry = this._historyManager.redo(this._model.getDoc(), this._selection?.getSavedSelection())
    if (entry) {
      this._model.setDoc(entry.doc)
      this._reconcile()
      if (entry.selection) {
        this._selection.setSavedSelection(entry.selection)
        this._selection.restoreSelection()
      }
      this._bumpVersion()
    }
  }

  // ─── Content Style ───

  /**
   * Inject custom CSS into the editor.
   * @param {string} css
   */
  injectContentStyle(css) {
    if (!css) return
    if (!this._contentStyleEl) {
      this._contentStyleEl = document.createElement('style')
      this._contentStyleEl.setAttribute('data-deveditor-style', 'content')
      document.head.appendChild(this._contentStyleEl)
    }
    this._contentStyleEl.textContent = css
  }

  removeContentStyle() {
    if (this._contentStyleEl) {
      this._contentStyleEl.remove()
      this._contentStyleEl = null
    }
  }

  // ─── Helpers ───

  /** @private */
  _findBlockForTextNode(textNodeId) {
    let found = null
    walkTree(this._model.doc, (node, parent) => {
      if (node.type !== 'text' && node.content) {
        const hasText = node.content.some((c) => c.id === textNodeId)
        if (hasText) {
          found = node
          return false
        }
      }
    })
    return found
  }

  /** @private */
  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  /** @private */
  _escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // ─── Version & Listeners ───

  /** @private */
  _bumpVersion() {
    this._version++
    for (const listener of this._listeners) {
      listener(this._version)
    }
  }

  /** Subscribe to version changes (for React re-rendering). */
  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }
}
