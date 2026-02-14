/**
 * @fileoverview EditorInstance — public API wrapper exposed via ref and onInit callback.
 * This is the "editor" object that users interact with.
 * Matches TinyMCE React Editor API as closely as possible.
 */

import { findNodeById } from '../utils/helpers.js'

export class EditorInstance {
  /**
   * @param {import('../core/EditorEngine.js').EditorEngine} engine
   */
  constructor(engine) {
    this._engine = engine
    this.id = `editor-${Date.now()}`
    this.mode = 'design' // 'design' | 'code' | 'readonly'
  }

  /**
   * Get the current content.
   * @param {Object} [options]
   * @param {string} [options.format='html'] - 'html' or 'text'
   * @returns {string}
   */
  getContent(options = {}) {
    const { format = 'html' } = options
    if (format === 'text') {
      const container = this._engine.getContainer()
      return container ? container.textContent || '' : ''
    }
    return this._engine.getContent()
  }

  /** Set content from HTML string. */
  setContent(html) {
    this._engine.setContent(html)
    return this
  }

  /** Get the document as a JSON object. */
  getJSON() {
    return this._engine.getJSON()
  }

  /** Focus the editor. */
  focus() {
    this._engine.focus()
    return this
  }

  /** Blur the editor. */
  blur() {
    this._engine.blur()
    return this
  }

  /** Undo the last action. */
  undo() {
    this._engine.undo()
    return this
  }

  /** Redo the last undone action. */
  redo() {
    this._engine.redo()
    return this
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
    return this
  }

  /**
   * Execute a command.
   * @param {string} command
   * @param {...any} args
   */
  execCommand(command, ...args) {
    if (this._engine._commandRegistry) {
      this._engine._commandRegistry.execute(command, ...args)
    }
    return this
  }

  /**
   * Query if a command is supported.
   * @param {string} command
   * @returns {boolean}
   */
  queryCommandState(command) {
    // Check if command exists
    if (this._engine._commandRegistry) {
      return this._engine._commandRegistry.has(command)
    }
    return false
  }

  /**
   * Register a custom command.
   * @param {string} name
   * @param {function} fn
   */
  addCommand(name, fn) {
    if (this._engine._commandRegistry) {
      this._engine._commandRegistry.register(name, fn)
    }
    return this
  }

  /**
   * Register a custom command (alias for addCommand).
   * @param {string} name
   * @param {function} fn
   */
  registerCommand(name, fn) {
    return this.addCommand(name, fn)
  }

  /**
   * Register a plugin dynamically.
   * @param {import('../types/plugin.types.js').PluginDef} plugin
   */
  addPlugin(plugin) {
    if (this._engine._pluginManager) {
      this._engine._pluginManager.register(plugin)
    }
    return this
  }

  /**
   * Register a plugin dynamically (alias for addPlugin).
   * @param {import('../types/plugin.types.js').PluginDef} plugin
   */
  registerPlugin(plugin) {
    return this.addPlugin(plugin)
  }

  /** Get the current selection state. */
  getSelection() {
    return this._engine._selection?.getSavedSelection() || null
  }

  /** Get the underlying DOM container. */
  getContainer() {
    return this._engine.getContainer()
  }

  /** Get the editor's body element. */
  getBody() {
    return this._engine.getContainer()
  }

  /** Check if editor is dirty (has unsaved changes). */
  isDirty() {
    // For now, always return false - can be enhanced with change tracking
    return false
  }

  /** Check if editor is not dirty. */
  isNotDirty() {
    return !this.isDirty()
  }

  /** Save the editor content (placeholder for autosave). */
  save() {
    // Can be enhanced with autosave functionality
    return this
  }

  /** Formatter utilities (TinyMCE-like API). */
  formatter = {
    /**
     * Toggle a mark (bold, italic, etc.) on the current selection.
     * @param {string} markType
     */
    toggle: (markType) => {
      if (this._engine._commandRegistry) {
        this._engine._commandRegistry.execute(markType)
      }
      return this
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

    /**
     * Apply a format to the current selection.
     * @param {string} format
     * @param {Object} [value]
     */
    apply: (format, value) => {
      if (this._engine._commandRegistry) {
        this._engine._commandRegistry.execute(format, value)
      }
      return this
    },

    /**
     * Remove a format from the current selection.
     * @param {string} format
     */
    remove: (format) => {
      if (this._engine._commandRegistry) {
        this._engine._commandRegistry.execute('removeFormat')
      }
      return this
    },
  }

  /** Selection utilities. */
  selection = {
    /** Get the current selection. */
    getContent: () => {
      const sel = window.getSelection()
      return sel ? sel.toString() : ''
    },

    /** Set the selection. */
    setContent: (content) => {
      // Replace selected content
      this.insertContent(content)
      return this
    },
  }

  /** Notification utilities (placeholder for future). */
  notificationManager = {
    open: (spec) => {
      console.log('Notification:', spec)
      return { close: () => {} }
    },
  }
}
