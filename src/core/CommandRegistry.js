/**
 * @fileoverview CommandRegistry — central command dispatch and keyboard shortcut routing.
 * Plugins register commands here. The toolbar and menu systems execute commands by name.
 */

export class CommandRegistry {
  constructor(engine) {
    /** @type {import('./EditorEngine.js').EditorEngine} */
    this._engine = engine
    /** @type {Map<string, function>} */
    this._commands = new Map()
    /** @type {Map<string, string>} - combo → commandName */
    this._shortcuts = new Map()
  }

  /**
   * Register a named command.
   * @param {string} name
   * @param {function} fn - (engine, ...args) => void
   */
  register(name, fn) {
    this._commands.set(name, fn)
  }

  /**
   * Unregister a command.
   * @param {string} name
   */
  unregister(name) {
    this._commands.delete(name)
  }

  /**
   * Execute a command by name.
   * @param {string} name
   * @param {...*} args
   * @returns {boolean} true if command was found and executed
   */
  execute(name, ...args) {
    const fn = this._commands.get(name)
    if (!fn) {
      console.warn(`Command not found: ${name}`)
      return false
    }
    fn(this._engine, ...args)
    return true
  }

  /**
   * Check if a command exists.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._commands.has(name)
  }

  /**
   * Register a keyboard shortcut.
   * @param {string} combo - e.g. 'ctrl+b', 'ctrl+shift+k'
   * @param {string} commandName
   */
  registerShortcut(combo, commandName) {
    this._shortcuts.set(this._normalizeCombo(combo), commandName)
  }

  /**
   * Unregister a keyboard shortcut.
   * @param {string} combo
   */
  unregisterShortcut(combo) {
    this._shortcuts.delete(this._normalizeCombo(combo))
  }

  /**
   * Handle a keydown event. Returns true if a shortcut was matched and executed.
   * @param {KeyboardEvent} e
   * @returns {boolean}
   */
  handleKeyDown(e) {
    const combo = this._eventToCombo(e)
    const commandName = this._shortcuts.get(combo)

    if (commandName) {
      // For paste command, don't prevent default - let native paste event fire
      // The paste event handler will process it
      if (commandName === 'paste') {
        // Don't prevent default, let the native paste event fire
        // The _onPaste handler will catch it
        return false
      }
      
      e.preventDefault()
      e.stopPropagation()
      this.execute(commandName)
      return true
    }

    return false
  }

  /**
   * Get all registered shortcuts as [combo, commandName] pairs.
   * @returns {Array<[string, string]>}
   */
  getShortcuts() {
    return [...this._shortcuts.entries()]
  }

  /**
   * Normalize a combo string: lowercase, sorted modifiers.
   * @private
   */
  _normalizeCombo(combo) {
    const parts = combo.toLowerCase().split('+').map((s) => s.trim())
    const modifiers = []
    let key = ''
    for (const part of parts) {
      if (['ctrl', 'control', 'meta', 'cmd', 'alt', 'shift'].includes(part)) {
        modifiers.push(part === 'control' || part === 'cmd' ? 'ctrl' : part)
      } else {
        key = part
      }
    }
    modifiers.sort()
    return [...modifiers, key].join('+')
  }

  /**
   * Convert a KeyboardEvent to a combo string.
   * @private
   */
  _eventToCombo(e) {
    const modifiers = []
    if (e.ctrlKey || e.metaKey) modifiers.push('ctrl')
    if (e.altKey) modifiers.push('alt')
    if (e.shiftKey) modifiers.push('shift')
    modifiers.sort()

    const key = e.key.toLowerCase()
    return [...modifiers, key].join('+')
  }
}
