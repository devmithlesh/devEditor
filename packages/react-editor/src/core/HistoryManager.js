/**
 * @fileoverview HistoryManager — undo/redo stack with debounced snapshots.
 * Stores deep-cloned document snapshots + selection states.
 */

import { deepClone, debounce } from '../utils/helpers.js'

const MAX_HISTORY = 100

export class HistoryManager {
  constructor() {
    /** @type {Array<{ doc: Object, selection: Object|null }>} */
    this._undoStack = []
    /** @type {Array<{ doc: Object, selection: Object|null }>} */
    this._redoStack = []

    this._debouncedPush = debounce((doc, selection) => {
      this._pushImmediate(doc, selection)
    }, 300)
  }

  /**
   * Push a snapshot immediately (for major operations like Enter, Backspace, format).
   * @param {Object} doc
   * @param {Object|null} selection
   */
  push(doc, selection) {
    this._debouncedPush.cancel()
    this._pushImmediate(doc, selection)
  }

  /**
   * Push with debounce (for text input — groups rapid keystrokes).
   * @param {Object} doc
   * @param {Object|null} selection
   */
  pushDebounced(doc, selection) {
    this._debouncedPush(doc, selection)
  }

  /**
   * Undo: pop from undo stack, push current state to redo stack.
   * @param {Object} currentDoc
   * @param {Object|null} currentSelection
   * @returns {{ doc: Object, selection: Object|null }|null}
   */
  undo(currentDoc, currentSelection) {
    this._debouncedPush.cancel()
    if (this._undoStack.length === 0) return null

    // Save current state to redo
    this._redoStack.push({
      doc: deepClone(currentDoc),
      selection: currentSelection ? deepClone(currentSelection) : null,
    })

    return this._undoStack.pop()
  }

  /**
   * Redo: pop from redo stack, push current state to undo stack.
   * @param {Object} currentDoc
   * @param {Object|null} currentSelection
   * @returns {{ doc: Object, selection: Object|null }|null}
   */
  redo(currentDoc, currentSelection) {
    this._debouncedPush.cancel()
    if (this._redoStack.length === 0) return null

    this._undoStack.push({
      doc: deepClone(currentDoc),
      selection: currentSelection ? deepClone(currentSelection) : null,
    })

    return this._redoStack.pop()
  }

  /** @returns {boolean} */
  canUndo() {
    return this._undoStack.length > 0
  }

  /** @returns {boolean} */
  canRedo() {
    return this._redoStack.length > 0
  }

  /** Clear all history. */
  clear() {
    this._undoStack = []
    this._redoStack = []
    this._debouncedPush.cancel()
  }

  /** @private */
  _pushImmediate(doc, selection) {
    this._undoStack.push({
      doc: deepClone(doc),
      selection: selection ? deepClone(selection) : null,
    })

    // Cap the stack
    if (this._undoStack.length > MAX_HISTORY) {
      this._undoStack.shift()
    }

    // Clear redo on new action
    this._redoStack = []
  }
}
