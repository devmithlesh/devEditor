/**
 * @fileoverview EditorInstance — public API wrapper exposed via ref and onInit callback.
 * This is the "editor" object that users interact with.
 */

import { findNodeById } from '../utils/helpers.js'

export class EditorInstance {
  /**
   * @param {import('../core/EditorEngine.js').EditorEngine} engine
   */
  constructor(engine) {
    this._engine = engine
  }

  /** Get the current content as HTML. */
  getContent() {
    return this._engine.getContent()
  }

  /** Set content from HTML string. */
  setContent(html) {
    this._engine.setContent(html)
  }

  /** Get the document as a JSON object. */
  getJSON() {
    return this._engine.getJSON()
  }

  /** Focus the editor. */
  focus() {
    this._engine.focus()
  }

  /** Blur the editor. */
  blur() {
    this._engine.blur()
  }

  /** Undo the last action. */
  undo() {
    this._engine.undo()
  }

  /** Redo the last undone action. */
  redo() {
    this._engine.redo()
  }

  /**
   * Insert HTML content at the current cursor position.
   * @param {string} html
   */
  insertContent(html) {
    // Parse the HTML and insert as text for now
    const temp = document.createElement('div')
    temp.innerHTML = html
    const text = temp.textContent || ''
    if (text) {
      this._engine._handleInsertText(text)
    }
  }

  /**
   * Register a custom command.
   * @param {string} name
   * @param {function} fn
   */
  registerCommand(name, fn) {
    if (this._engine._commandRegistry) {
      this._engine._commandRegistry.register(name, fn)
    }
  }

  /**
   * Register a plugin dynamically.
   * @param {import('../types/plugin.types.js').PluginDef} plugin
   */
  registerPlugin(plugin) {
    if (this._engine._pluginManager) {
      this._engine._pluginManager.register(plugin)
    }
  }

  /** Get the current selection state. */
  getSelection() {
    return this._engine._selection?.getSavedSelection() || null
  }

  /** Get the underlying DOM container. */
  getContainer() {
    return this._engine.getContainer()
  }

  /** Formatter utilities. */
  formatter = {
    /**
     * Toggle a mark (bold, italic, etc.) on the current selection.
     * @param {string} markType
     */
    toggle: (markType) => {
      if (this._engine._commandRegistry) {
        this._engine._commandRegistry.execute(markType)
      }
    },

    /**
     * Check if a mark is active on the current selection.
     * @param {string} markType
     * @returns {boolean}
     */
    match: (markType) => {
      const sel = this._engine._selection?.getSavedSelection()
      if (!sel) return false

      const doc = this._engine._model.doc
      const node = findNodeById(doc, sel.anchorNodeId)
      if (!node || node.type !== 'text') return false
      return node.marks?.some((m) => m.type === markType) ?? false
    },
  }
}
