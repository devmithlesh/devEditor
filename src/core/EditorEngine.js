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

    // Element selection (for images, tables — distinct from text cursor selection)
    this._selectedElementId = null
    this._selectedElementType = null // 'image' | 'table' | null
    this._isResizing = false

    // Event handler references (for cleanup)
    this._handleBeforeInput = this._onBeforeInput.bind(this)
    this._handleKeyDown = this._onKeyDown.bind(this)
    this._handleCompositionStart = this._onCompositionStart.bind(this)
    this._handleCompositionEnd = this._onCompositionEnd.bind(this)
    this._handleInput = this._onInput.bind(this)
    this._handlePaste = this._onPaste.bind(this)
    this._handleSelectionChange = this._onSelectionChange.bind(this)
    this._handleClick = this._onClick.bind(this)
    this._handleDragOver = this._onDragOver.bind(this)
    this._handleDragLeave = this._onDragLeave.bind(this)
    this._handleDrop = this._onDrop.bind(this)
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
    containerEl.addEventListener('click', this._handleClick, true) // Use capture phase
    containerEl.addEventListener('dragover', this._handleDragOver)
    containerEl.addEventListener('dragleave', this._handleDragLeave)
    containerEl.addEventListener('drop', this._handleDrop)
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
    this._container.removeEventListener('click', this._handleClick, true)
    this._container.removeEventListener('dragover', this._handleDragOver)
    this._container.removeEventListener('dragleave', this._handleDragLeave)
    this._container.removeEventListener('drop', this._handleDrop)
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

  // ─── Element Selection (images, tables) ───

  getSelectedElement() {
    return { id: this._selectedElementId, type: this._selectedElementType }
  }

  setSelectedElement(nodeId, type) {
    this._selectedElementId = nodeId
    this._selectedElementType = type
    this._applyElementSelection()
    this._bumpVersion()
  }

  clearSelectedElement() {
    if (!this._selectedElementId) return
    this._selectedElementId = null
    this._selectedElementType = null
    this._applyElementSelection()
    this._bumpVersion()
  }

  /** @private — apply/remove selection CSS class after reconcile */
  _applyElementSelection() {
    if (!this._container) return
    this._container.querySelectorAll('.de-element--selected').forEach(el => {
      el.classList.remove('de-element--selected')
    })
    if (this._selectedElementId) {
      const el = this._container.querySelector(`[${NODE_ID_ATTR}="${this._selectedElementId}"]`)
      if (el) el.classList.add('de-element--selected')
    }
  }

  /** @private — delete the currently selected element (image/table) */
  _deleteSelectedElement() {
    const nodeId = this._selectedElementId
    if (!nodeId) return false

    const parentInfo = findParent(this._model.doc, nodeId)
    if (!parentInfo) return false

    if (this._historyManager) {
      this._historyManager.push(this._model.getDoc(), this._selection?.getSavedSelection())
    }

    // Remove the node from its parent
    parentInfo.parent.content.splice(parentInfo.index, 1)

    this._selectedElementId = null
    this._selectedElementType = null
    this._model._ensureMinimumContent()
    this._reconcile()

    // Place cursor in nearest text node
    const allText = getTextNodes(this._model.doc)
    if (allText.length > 0) {
      const target = allText[Math.min(parentInfo.index, allText.length - 1)]
      this._selection.setCursorToNode(target.id, 0)
    }
    this._bumpVersion()
    return true
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
    // Escape clears element selection
    if (e.key === 'Escape' && this._selectedElementId) {
      e.preventDefault()
      this.clearSelectedElement()
      return
    }

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
  _onClick(e) {
    const target = e.target

    // Check if clicked on an image
    if (target.tagName === 'IMG' && target.getAttribute(NODE_ID_ATTR)) {
      e.preventDefault()
      e.stopPropagation()
      const nodeId = target.getAttribute(NODE_ID_ATTR)
      this.setSelectedElement(nodeId, 'image')
      return
    }

    // Check if clicked on a table element (on the table itself, not inside a cell)
    const tableEl = target.closest('table[' + NODE_ID_ATTR + ']')
    const cellEl = target.closest('td[' + NODE_ID_ATTR + '], th[' + NODE_ID_ATTR + ']')
    if (tableEl && !cellEl) {
      // Clicked on table border/padding, not inside a cell
      e.preventDefault()
      e.stopPropagation()
      const nodeId = tableEl.getAttribute(NODE_ID_ATTR)
      this.setSelectedElement(nodeId, 'table')
      return
    }

    // Clear element selection when clicking elsewhere
    if (this._selectedElementId) {
      this.clearSelectedElement()
    }

    // Handle link clicks - allow navigation
    const link = target.tagName === 'A' ? target : target.closest('a')

    if (link && link.tagName === 'A') {
      const href = link.getAttribute('href')

      // Only allow navigation if href is valid and not just '#'
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        // For Ctrl/Cmd+Click or middle mouse button, allow default (opens in new tab)
        if (e.ctrlKey || e.metaKey || e.button === 1) {
          return // Let browser handle it
        }

        // For regular click, navigate to the link
        e.preventDefault()
        e.stopPropagation()

        if (link.target === '_blank') {
          window.open(href, '_blank', 'noopener,noreferrer')
        } else {
          window.location.href = href
        }

        return
      }
    }
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
    e.stopPropagation()
    
    // Capture selection before paste
    this._selection?.captureSelection()
    
    // Check for files first (images, videos, etc.)
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            this._handleFileInsert(file)
            return
          }
        }
      }
    }
    
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

  /**
   * Insert text at the current cursor position.
   * Public method for plugins and external use.
   * @param {string} text
   */
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
    const blockInfo = this.findBlockForTextNode(currentSel.anchorNodeId)
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
    // If an element (image/table) is selected, delete it
    if (this._selectedElementId) {
      this._deleteSelectedElement()
      return
    }

    const sel = this._selection.captureSelection()
    if (!sel) return

    if (!sel.isCollapsed) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      this._deleteSelection(sel)
      // Clean up empty lists and nodes after deletion
      this._cleanupEmptyLists()
      this._cleanupEmptyNodes()
      this._model._ensureMinimumContent()
      this._reconcile()
      // Restore cursor after deletion
      const firstText = getTextNodes(this._model.doc)[0]
      if (firstText) {
        this._selection.setCursorToNode(firstText.id, 0)
      }
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

      // Delete character before cursor
      this._model.applyTransaction({
        steps: [{ type: 'deleteText', data: { nodeId, offset: offset - 1, count: 1 } }],
      })
      
      // Check if text node became empty and clean up
      const textNode = findNodeById(this._model.doc, nodeId)
      if (textNode && textNode.type === 'text' && (!textNode.text || textNode.text.trim().length === 0)) {
        // Remove all marks from empty text node
        if (textNode.marks) {
          delete textNode.marks
        }
        // Set to empty string for consistency
        textNode.text = ''
      }

      this._selection.setSavedSelection({
        anchorNodeId: nodeId,
        anchorOffset: offset - 1,
        focusNodeId: nodeId,
        focusOffset: offset - 1,
        isCollapsed: true,
      })

      // Clean up empty nodes after text deletion
      this._cleanupEmptyNodes()
      this._model._ensureMinimumContent()
      this._reconcile()
      this._selection.restoreSelection()
      this._bumpVersion()
    } else {
      // At the start of a text node (offset === 0)
      const blockInfo = this.findBlockForTextNode(nodeId)
      if (!blockInfo) return

      // Check if this is the first text node in the block
      const blockNode = findNodeById(this._model.doc, blockInfo.id)
      const textNodes = getTextNodes(blockNode)
      if (textNodes[0]?.id !== nodeId) return // Not at start of block

      // Find the block's parent to check what's before it
      const parentInfo = findParent(this._model.doc, blockInfo.id)
      if (!parentInfo) return

      // Check if the current block is empty
      const isBlockEmpty = !blockNode.content || blockNode.content.every(n => {
        if (n.type === 'text') {
          return !n.text || n.text.trim().length === 0
        }
        return false
      })

      // If block is empty and not the only block, remove it
      if (isBlockEmpty && parentInfo.parent.content.length > 1) {
        if (this._historyManager) {
          this._historyManager.push(this._model.getDoc(), sel)
        }
        parentInfo.parent.content.splice(parentInfo.index, 1)
        this._model._ensureMinimumContent()
        this._reconcile()
        // Place cursor in the previous block or first block
        const remainingBlocks = parentInfo.parent.content
        if (remainingBlocks.length > 0) {
          const targetBlock = remainingBlocks[Math.min(parentInfo.index, remainingBlocks.length - 1)]
          const targetTextNodes = getTextNodes(targetBlock)
          if (targetTextNodes.length > 0) {
            const lastText = targetTextNodes[targetTextNodes.length - 1]
            this._selection.setCursorToNode(lastText.id, lastText.text.length)
          }
        }
        this._bumpVersion()
        return
      }

      // Check if we're inside a list item
      if (parentInfo.parent.type === 'listItem') {
        const listItemInfo = findParent(this._model.doc, parentInfo.parent.id)
        if (listItemInfo) {
          const listNode = listItemInfo.parent
          const listParent = findParent(this._model.doc, listNode.id)
          
          if (this._historyManager) {
            this._historyManager.push(this._model.getDoc(), sel)
          }

          // If this is the first block in the first list item
          if (parentInfo.index === 0 && listNode.content[0].id === parentInfo.parent.id) {
            // Check if list item is empty or only has this empty block
            const listItem = listNode.content[0]
            const hasContent = listItem.content && listItem.content.some(b => {
              const textNodes = getTextNodes(b)
              return textNodes.some(tn => tn.text.trim().length > 0)
            })

            if (!hasContent) {
              // Empty list item - remove it from the list
              listNode.content.splice(0, 1)
              
              // If list is now empty, remove the list entirely
              if (listNode.content.length === 0 && listParent) {
                listParent.parent.content.splice(listParent.index, 1)
                this._model._ensureMinimumContent()
              }
              
              this._reconcile()
              const firstText = getTextNodes(this._model.doc)[0]
              if (firstText) {
                this._selection.setCursorToNode(firstText.id, 0)
              }
              this._bumpVersion()
              return
            } else {
              // List item has content - convert to paragraph and remove from list
              const paragraph = {
                id: generateId(),
                type: 'paragraph',
                content: deepClone(listItem.content),
              }
              
              listNode.content.splice(0, 1)
              
              // If list is now empty, replace list with paragraph
              if (listNode.content.length === 0 && listParent) {
                listParent.parent.content.splice(listParent.index, 1, paragraph)
              } else if (listParent) {
                // Insert paragraph before the list
                listParent.parent.content.splice(listParent.index, 0, paragraph)
              }
              
              this._model._ensureMinimumContent()
              this._reconcile()
              const firstText = getTextNodes(paragraph)[0]
              if (firstText) {
                this._selection.setCursorToNode(firstText.id, 0)
              }
              this._bumpVersion()
              return
            }
          } else {
            // Not the first list item - merge with previous list item or convert to paragraph
            const itemIndex = listNode.content.findIndex(item => item.id === parentInfo.parent.id)
            if (itemIndex > 0) {
              // Merge with previous list item
              const prevItem = listNode.content[itemIndex - 1]
              const currentItem = listNode.content[itemIndex]
              
              if (prevItem.content && currentItem.content) {
                prevItem.content.push(...currentItem.content)
                listNode.content.splice(itemIndex, 1)
                
                // If list is now empty, remove it
                if (listNode.content.length === 0 && listParent) {
                  listParent.parent.content.splice(listParent.index, 1)
                }
                
                this._model._ensureMinimumContent()
                this._reconcile()
                const lastText = getTextNodes(prevItem)[getTextNodes(prevItem).length - 1]
                if (lastText) {
                  this._selection.setCursorToNode(lastText.id, lastText.text.length)
                }
                this._bumpVersion()
                return
              }
            }
          }
        }
      }

      // Check if we're inside a table cell
      if (parentInfo.parent.type === 'tableCell') {
        // At start of first paragraph in a table cell
        if (parentInfo.index === 0) {
          // Check if the entire table is empty — if so, delete the table
          const cellParent = findParent(this._model.doc, parentInfo.parent.id)
          if (!cellParent) return
          const rowParent = findParent(this._model.doc, cellParent.parent.id)
          if (!rowParent) return
          const table = rowParent.parent
          if (table && table.type === 'table') {
            // Check if ALL cells in the table are empty
            let allEmpty = true
            walkTree(table, (n) => {
              if (n.type === 'text' && n.text.trim()) { allEmpty = false; return false }
            })
            if (allEmpty) {
              if (this._historyManager) {
                this._historyManager.push(this._model.getDoc(), sel)
              }
              const tableParent = findParent(this._model.doc, table.id)
              if (tableParent) {
                tableParent.parent.content.splice(tableParent.index, 1)
              }
              this._model._ensureMinimumContent()
              this._reconcile()
              // Place cursor in the first available text node
              const firstText = getTextNodes(this._model.doc)[0]
              if (firstText) {
                this._selection.setCursorToNode(firstText.id, 0)
              }
              this._bumpVersion()
            }
          }
        }
        return
      }

      // Check if the previous sibling is a non-text block (table, HR, image, pageBreak)
      if (parentInfo.index > 0) {
        const prevBlock = parentInfo.parent.content[parentInfo.index - 1]
        const nonMergeableTypes = ['table', 'horizontalRule', 'image', 'pageBreak', 'codeBlock']
        if (nonMergeableTypes.includes(prevBlock.type)) {
          // Delete the previous block element
          if (this._historyManager) {
            this._historyManager.push(this._model.getDoc(), sel)
          }
          parentInfo.parent.content.splice(parentInfo.index - 1, 1)
          this._model._ensureMinimumContent()
          this._reconcile()
          this._selection.restoreSelection()
          this._bumpVersion()
          return
        }
      }

      // Normal merge with previous paragraph/heading block
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
    // If an element (image/table) is selected, delete it
    if (this._selectedElementId) {
      this._deleteSelectedElement()
      return
    }

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
    // Check for images in HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    const images = temp.querySelectorAll('img')
    
    if (images.length > 0) {
      // Handle images from HTML paste
      const sel = this._selection?.captureSelection()
      if (!sel) return
      
      const block = this.findBlockForTextNode(sel.anchorNodeId)
      if (!block) return
      const parentInfo = findParent(this._model.doc, block.id)
      if (!parentInfo) return
      
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      
      // Insert all images
      images.forEach((img, index) => {
        const imageNode = {
          id: generateId(),
          type: 'image',
          attrs: {
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
          }
        }
        const newParagraph = {
          id: generateId(),
          type: 'paragraph',
          content: [{ id: generateId(), type: 'text', text: '' }],
        }
        
        const insertIndex = parentInfo.index + 1 + (index * 2)
        parentInfo.parent.content.splice(insertIndex, 0, imageNode, newParagraph)
      })
      
      // Set cursor to last paragraph
      const lastParagraph = parentInfo.parent.content[parentInfo.index + (images.length * 2)]
      if (lastParagraph && lastParagraph.content && lastParagraph.content.length > 0) {
        this._selection.setCursorToNode(lastParagraph.content[0].id)
      }
      
      this._reconcile()
      this._bumpVersion()
    } else {
      // No images, paste as text
      const text = temp.textContent || ''
      this._handleInsertText(text)
    }
  }

  /** @private */
  _onDragOver(e) {
    // Allow drop by preventing default
    e.preventDefault()
    e.stopPropagation()
    // Add visual feedback
    if (this._container) {
      this._container.style.opacity = '0.8'
    }
  }

  /** @private */
  _onDragLeave(e) {
    // Only reset if we're leaving the container (not just a child element)
    if (this._container && !this._container.contains(e.relatedTarget)) {
      this._container.style.opacity = ''
    }
  }

  /** @private */
  _onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    
    // Remove visual feedback
    if (this._container) {
      this._container.style.opacity = ''
    }
    
    // Capture selection at drop position
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const nodeId = textNode.getAttribute?.(NODE_ID_ATTR)
        if (nodeId) {
          this._selection?.setSavedSelection({
            anchorNodeId: nodeId,
            anchorOffset: range.startOffset,
            focusNodeId: nodeId,
            focusOffset: range.startOffset,
            isCollapsed: true,
          })
        }
      }
    }
    
    this._selection?.captureSelection()
    
    // Handle dropped files
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      // Process all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        this._handleFileInsert(file)
      }
    }
  }

  /** @private */
  _handleFileInsert(file) {
    if (!file) return
    
    const sel = this._selection?.captureSelection()
    if (!sel) return

    const block = this.findBlockForTextNode(sel.anchorNodeId)
    if (!block) return
    const parentInfo = findParent(this._model.doc, block.id)
    if (!parentInfo) return

    if (this._historyManager) {
      this._historyManager.push(this._model.getDoc(), sel)
    }

    const fileType = file.type || ''
    const isImage = fileType.startsWith('image/')
    const isVideo = fileType.startsWith('video/')
    
    if (isImage) {
      // Create object URL for image
      const imageUrl = URL.createObjectURL(file)
      const imageNode = {
        id: generateId(),
        type: 'image',
        attrs: {
          src: imageUrl,
          alt: file.name || 'Image',
          // Store file reference for potential upload
          _file: file.name,
        }
      }
      
      const newParagraph = {
        id: generateId(),
        type: 'paragraph',
        content: [{ id: generateId(), type: 'text', text: '' }],
      }

      parentInfo.parent.content.splice(parentInfo.index + 1, 0, imageNode, newParagraph)
      
      this._reconcile()
      this._selection.setCursorToNode(newParagraph.content[0].id)
      this._bumpVersion()
    } else if (isVideo) {
      // For videos, insert as a link or placeholder
      // You can extend this to support video nodes if needed
      const videoUrl = URL.createObjectURL(file)
      const videoText = `[Video: ${file.name}](${videoUrl})`
      this._handleInsertText(videoText)
    } else {
      // For other files, insert as a link
      const fileUrl = URL.createObjectURL(file)
      const fileText = `[${file.name}](${fileUrl})`
      this._handleInsertText(fileText)
    }
  }

  // ─── Selection Helpers ───

  /**
   * Delete the currently selected range - handles ALL content types.
   * @private
   */
  _deleteSelection(sel) {
    if (!sel || sel.isCollapsed) return

    // Collect all text nodes in document order
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

    // Check if entire document is selected (select all case)
    const totalTextNodes = allTextNodes.length
    const selectedTextNodes = endIdx - startIdx + 1
    
    // Check if all top-level blocks are selected
    const docTopLevelBlocks = this._model.doc.content || []
    const blocksWithSelection = docTopLevelBlocks.filter(block => {
      const blockTextNodes = getTextNodes(block)
      return blockTextNodes.some(tn => {
        const idx = allTextNodes.findIndex(n => n.id === tn.id)
        return idx >= startIdx && idx <= endIdx
      })
    })
    const allTopBlocksSelected = blocksWithSelection.length === docTopLevelBlocks.length && docTopLevelBlocks.length > 0
    
    // Determine if this is a "select all" operation
    const isSelectAll = allTopBlocksSelected ||
                       (startIdx === 0 && endIdx === totalTextNodes - 1 && totalTextNodes > 0) ||
                       (selectedTextNodes === totalTextNodes && totalTextNodes > 0) ||
                       (selectedTextNodes >= totalTextNodes * 0.95 && totalTextNodes > 0) // 95% or more selected

    if (isSelectAll) {
      // Delete all content blocks from document
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      
      // Clear all content
      this._model.doc.content = []
      
      // Ensure minimum content
      this._model._ensureMinimumContent()
      
      // Set cursor to first text node
      const firstText = getTextNodes(this._model.doc)[0]
      if (firstText) {
        this._selection.setCursorToNode(firstText.id, 0)
      }
      
      this._reconcile()
      this._bumpVersion()
      return
    }

    // Find top-level blocks (direct children of doc) that contain selected text
    const topLevelBlocks = this._model.doc.content || []
    const topLevelBlocksWithSelection = []

    for (let i = 0; i < topLevelBlocks.length; i++) {
      const topBlock = topLevelBlocks[i]
      // Get all text nodes in this top-level block and its descendants
      const blockTextNodes = getTextNodes(topBlock)
      const hasSelectedText = blockTextNodes.some(tn => {
        const idx = allTextNodes.findIndex(n => n.id === tn.id)
        return idx >= startIdx && idx <= endIdx
      })
      
      if (hasSelectedText) {
        topLevelBlocksWithSelection.push({ block: topBlock, index: i })
      }
    }

    // If we found top-level blocks with selection, delete them
    if (topLevelBlocksWithSelection.length > 0) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }

      // Delete all top-level blocks that contain selected text
      // Delete from end to start to maintain indices
      const indicesToDelete = topLevelBlocksWithSelection.map(item => item.index).sort((a, b) => b - a)
      
      for (const index of indicesToDelete) {
        this._model.doc.content.splice(index, 1)
      }

      // Clean up empty lists
      this._cleanupEmptyLists()
      
      // Ensure minimum content
      this._model._ensureMinimumContent()

      // Set cursor position
      const remainingBlocks = this._model.doc.content
      if (remainingBlocks.length > 0) {
        const targetBlock = remainingBlocks[Math.min(topLevelBlocksWithSelection[0].index, remainingBlocks.length - 1)]
        const targetTextNodes = getTextNodes(targetBlock)
        if (targetTextNodes.length > 0) {
          this._selection.setCursorToNode(targetTextNodes[0].id, 0)
        }
      } else {
        const firstText = getTextNodes(this._model.doc)[0]
        if (firstText) {
          this._selection.setCursorToNode(firstText.id, 0)
        }
      }

      this._reconcile()
      this._bumpVersion()
      return
    }

    // Fallback: Delete text from selected nodes
    const steps = []
    
    // Delete text from last node
    if (startIdx !== endIdx) {
      steps.push({
        type: 'deleteText',
        data: { nodeId: allTextNodes[endIdx].id, offset: 0, count: endOffset },
      })
    }

    // Delete middle nodes entirely
    for (let i = endIdx - 1; i > startIdx; i--) {
      allTextNodes[i].text = ''
      if (allTextNodes[i].marks) delete allTextNodes[i].marks
    }

    // Delete text from first node
    steps.push({
      type: 'deleteText',
      data: { nodeId: allTextNodes[startIdx].id, offset: startOffset, count: allTextNodes[startIdx].text.length - startOffset },
    })

    if (steps.length > 0) {
      if (this._historyManager) {
        this._historyManager.push(this._model.getDoc(), sel)
      }
      this._model.applyTransaction({ steps })
    }

    // Clean up empty blocks
    this._cleanupEmptyNodes()
    this._cleanupEmptyLists()
    this._model._ensureMinimumContent()

    // Set cursor position
    const remainingTextNodes = allTextNodes.filter((tn, idx) => idx < startIdx || idx > endIdx)
    if (remainingTextNodes.length > 0) {
      const targetNode = remainingTextNodes[Math.min(startIdx, remainingTextNodes.length - 1)]
      this._selection.setSavedSelection({
        anchorNodeId: targetNode.id,
        anchorOffset: 0,
        focusNodeId: targetNode.id,
        focusOffset: 0,
        isCollapsed: true,
      })
    } else {
      const firstText = getTextNodes(this._model.doc)[0]
      if (firstText) {
        this._selection.setCursorToNode(firstText.id, 0)
      }
    }

    this._bumpVersion()
  }

  // ─── DOM Reconciliation ───

  /**
   * Reconcile the document model into the contentEditable DOM.
   * Public method for external reconciliation needs.
   */
  _reconcile() {
    if (!this._container) return
    if (this._isResizing) return // Don't reconcile during active resize drag
    this._isReconciling = true

    try {
      const html = this._renderDocToHtml(this._model.doc)
      this._container.innerHTML = html
    } finally {
      this._isReconciling = false
    }
    // Re-apply element selection visual after DOM rebuild
    this._applyElementSelection()
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
      case 'bulletList': {
        const style = node.attrs?.listStyleType
        const styleAttr = style ? ` style="list-style-type: ${style}"` : ''
        return `<ul ${NODE_ID_ATTR}="${node.id}"${styleAttr}>${this._renderChildren(node)}</ul>`
      }
      case 'orderedList': {
        const style = node.attrs?.listStyleType
        const styleAttr = style ? ` style="list-style-type: ${style}"` : ''
        return `<ol ${NODE_ID_ATTR}="${node.id}"${styleAttr}>${this._renderChildren(node)}</ol>`
      }
      case 'listItem':
        // Render listItem - alignment is handled by the paragraph block inside
        return this._renderBlock('li', node)
      case 'horizontalRule':
        return `<hr ${NODE_ID_ATTR}="${node.id}"/>`
      case 'image': {
        const imgStyles = []
        if (node.attrs?.width) imgStyles.push(`width: ${node.attrs.width}px`)
        if (node.attrs?.height) imgStyles.push(`height: ${node.attrs.height}px`)
        if (imgStyles.length > 0) imgStyles.push('max-width: 100%')
        const imgStyle = imgStyles.length > 0 ? ` style="${imgStyles.join('; ')}"` : ''
        return `<img ${NODE_ID_ATTR}="${node.id}" src="${this._escapeAttr(node.attrs?.src || '')}" alt="${this._escapeAttr(node.attrs?.alt || '')}"${imgStyle}/>`
      }
      case 'table': {
        const tStyles = []
        if (node.attrs?.width) tStyles.push(`width: ${node.attrs.width}`)
        else tStyles.push('width: 100%')
        if (node.attrs?.colWidths) tStyles.push('table-layout: fixed')
        const tStyleAttr = ` style="${tStyles.join('; ')}"`
        // Build colgroup if colWidths are set
        let colgroup = ''
        if (node.attrs?.colWidths && Array.isArray(node.attrs.colWidths)) {
          colgroup = '<colgroup>' + node.attrs.colWidths.map(w => `<col style="width: ${w}%">`).join('') + '</colgroup>'
        }
        return `<table ${NODE_ID_ATTR}="${node.id}"${tStyleAttr}>${colgroup}${this._renderChildren(node)}</table>`
      }
      case 'tableRow': {
        const rowStyles = []
        if (node.attrs?.height) rowStyles.push(`height: ${node.attrs.height}px`)
        const rowStyleAttr = rowStyles.length > 0 ? ` style="${rowStyles.join('; ')}"` : ''
        return `<tr ${NODE_ID_ATTR}="${node.id}"${rowStyleAttr}>${this._renderChildren(node)}</tr>`
      }
      case 'tableCell': {
        // Hidden cells are absorbed by a merged cell — skip rendering
        if (node.attrs?.hidden) return ''
        const tag = node.attrs?.header ? 'th' : 'td'
        return this._renderTableCell(tag, node)
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
        return `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 4px;border-radius:4px;font-weight:500" data-mention="${this._escapeAttr(mark.attrs?.userId || '')}">${html}</span>`
      case 'anchor':
        return `<a id="${this._escapeAttr(mark.attrs?.name || '')}">${html}</a>`
      default:
        return html
    }
  }

  /** @private */
  _renderBlock(tag, node) {
    const styles = []
    // For listItem, don't apply textAlign (alignment is on the paragraph block inside)
    // For other blocks, apply textAlign normally
    if (tag !== 'li' && node.attrs?.textAlign) {
      styles.push(`text-align: ${node.attrs.textAlign}`)
    }
    if (node.attrs?.indent && node.attrs.indent > 0) styles.push(`margin-left: ${node.attrs.indent * 2}em`)
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
    const dirAttr = node.attrs?.dir ? ` dir="${node.attrs.dir}"` : ''
    return `<${tag} ${NODE_ID_ATTR}="${node.id}"${styleAttr}${dirAttr}>${this._renderChildren(node)}</${tag}>`
  }

  /** @private — renders a table cell with colspan/rowspan support */
  _renderTableCell(tag, node) {
    const styles = []
    if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`)
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
    const cs = node.attrs?.colspan > 1 ? ` colspan="${node.attrs.colspan}"` : ''
    const rs = node.attrs?.rowspan > 1 ? ` rowspan="${node.attrs.rowspan}"` : ''
    return `<${tag} ${NODE_ID_ATTR}="${node.id}"${cs}${rs}${styleAttr}>${this._renderChildren(node)}</${tag}>`
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
    if (tag === 'img') {
      const imgAttrs = { src: domNode.getAttribute('src') || '', alt: domNode.getAttribute('alt') || '' }
      const imgW = domNode.getAttribute('width')
      const imgH = domNode.getAttribute('height')
      if (imgW) imgAttrs.width = parseInt(imgW, 10)
      if (imgH) imgAttrs.height = parseInt(imgH, 10)
      return { id: generateId(), type: 'image', attrs: imgAttrs }
    }

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
      case 'image': {
        const w = node.attrs?.width ? ` width="${node.attrs.width}"` : ''
        const h = node.attrs?.height ? ` height="${node.attrs.height}"` : ''
        return `<img src="${this._escapeAttr(node.attrs?.src || '')}" alt="${this._escapeAttr(node.attrs?.alt || '')}"${w}${h}/>`
      }
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
    this._selectedElementId = null
    this._selectedElementType = null
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
    this._selectedElementId = null
    this._selectedElementType = null
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

  /**
   * Find the block node containing a text node.
   * @param {string} textNodeId
   * @returns {Object|null}
   */
  findBlockForTextNode(textNodeId) {
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

  /**
   * @private
   * @deprecated Use findBlockForTextNode instead
   */
  _findBlockForTextNode(textNodeId) {
    return this.findBlockForTextNode(textNodeId)
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

  /** @private */
  _cleanupEmptyLists() {
    // Find and remove empty lists
    const emptyLists = []
    walkTree(this._model.doc, (node) => {
      if ((node.type === 'bulletList' || node.type === 'orderedList') && 
          (!node.content || node.content.length === 0)) {
        const listParent = findParent(this._model.doc, node.id)
        if (listParent) {
          emptyLists.push({ node, listParent })
        }
      }
    })

    for (const { node, listParent } of emptyLists) {
      listParent.parent.content.splice(listParent.index, 1)
    }
  }

  /** @private */
  _cleanupEmptyNodes() {
    let changed = true
    // Keep cleaning until no more changes (multiple passes may be needed)
    while (changed) {
      changed = false
      
      // Remove empty text nodes
      const nodesToRemove = []
      walkTree(this._model.doc, (node) => {
        if (node.type === 'text' && (!node.text || node.text.trim().length === 0)) {
          const parentInfo = findParent(this._model.doc, node.id)
          if (parentInfo && parentInfo.parent.content) {
            // Check if there are other non-empty nodes in the parent
            const hasNonEmptyContent = parentInfo.parent.content.some(n => 
              n.id !== node.id && (n.type !== 'text' || (n.text && n.text.trim().length > 0))
            )
            // Remove empty text node if there's other content, or if it's not the only node
            if (hasNonEmptyContent || parentInfo.parent.content.length > 1) {
              nodesToRemove.push({ node, parentInfo })
              changed = true
            }
          }
        }
      })

      // Remove empty text nodes
      for (const { node, parentInfo } of nodesToRemove) {
        const index = parentInfo.parent.content.findIndex(n => n.id === node.id)
        if (index !== -1) {
          parentInfo.parent.content.splice(index, 1)
        }
      }

      // Clean up blocks with no meaningful content
      const emptyBlocks = []
      walkTree(this._model.doc, (node) => {
        if ((node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') && 
            node.content) {
          // Check if block has only empty text nodes
          const hasContent = node.content.some(n => {
            if (n.type === 'text') {
              return n.text && n.text.trim().length > 0
            }
            return true // Non-text nodes count as content
          })
          
          if (!hasContent) {
            const blockParent = findParent(this._model.doc, node.id)
            if (blockParent && blockParent.parent.type !== 'listItem' && blockParent.parent.type !== 'doc') {
              emptyBlocks.push({ node, blockParent })
              changed = true
            }
          }
        }
      })

      // Remove empty blocks
      for (const { node, blockParent } of emptyBlocks) {
        const index = blockParent.parent.content.findIndex(n => n.id === node.id)
        if (index !== -1) {
          blockParent.parent.content.splice(index, 1)
        }
      }
    }
  }
}
