/**
 * @fileoverview PluginManager — registers and manages editor plugins.
 * Each plugin can register commands, toolbar buttons, menu items, shortcuts, and CSS.
 *
 * Supports two plugin formats:
 *   Array format (original):  commands: [{ name, execute }], toolbarButtons: [{ name, ... }], etc.
 *   Object format (shorthand): commands: { name: fn }, toolbarButtons: { name: {...} }, etc.
 */

export class PluginManager {
  /**
   * @param {import('./EditorEngine.js').EditorEngine} engine
   * @param {import('./CommandRegistry.js').CommandRegistry} commandRegistry
   */
  constructor(engine, commandRegistry) {
    this._engine = engine
    this._commandRegistry = commandRegistry
    /** @type {Map<string, import('../types/plugin.types.js').PluginDef>} */
    this._plugins = new Map()
    /** @type {Map<string, import('../types/plugin.types.js').ToolbarButtonDef>} */
    this._toolbarButtons = new Map()
    /** @type {Map<string, Array<import('../types/plugin.types.js').MenuItemDef>>} */
    this._menuItems = new Map()
    /** @type {HTMLStyleElement[]} */
    this._styleElements = []
  }

  /**
   * Register a plugin.
   * @param {import('../types/plugin.types.js').PluginDef} plugin
   */
  register(plugin) {
    if (this._plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Skipping.`)
      return
    }

    this._plugins.set(plugin.name, plugin)

    // Register commands — supports both array and object format
    if (plugin.commands) {
      if (Array.isArray(plugin.commands)) {
        for (const cmd of plugin.commands) {
          this._commandRegistry.register(cmd.name, cmd.execute)
        }
      } else {
        for (const [name, fn] of Object.entries(plugin.commands)) {
          this._commandRegistry.register(name, fn)
        }
      }
    }

    // Register toolbar buttons — supports both array and object format
    if (plugin.toolbarButtons) {
      if (Array.isArray(plugin.toolbarButtons)) {
        for (const btn of plugin.toolbarButtons) {
          this._toolbarButtons.set(btn.name, btn)
        }
      } else {
        for (const [name, btn] of Object.entries(plugin.toolbarButtons)) {
          this._toolbarButtons.set(name, { ...btn, name })
        }
      }
    }

    // Register menu items — supports both array and object format
    if (plugin.menuItems) {
      if (Array.isArray(plugin.menuItems)) {
        for (const item of plugin.menuItems) {
          const menu = item.menu || 'format'
          if (!this._menuItems.has(menu)) {
            this._menuItems.set(menu, [])
          }
          this._menuItems.get(menu).push(item)
        }
      } else {
        for (const [menu, items] of Object.entries(plugin.menuItems)) {
          if (!this._menuItems.has(menu)) {
            this._menuItems.set(menu, [])
          }
          const list = this._menuItems.get(menu)
          if (Array.isArray(items)) {
            list.push(...items)
          } else {
            list.push(items)
          }
        }
      }
    }

    // Register shortcuts — supports both array and object format
    if (plugin.shortcuts) {
      if (Array.isArray(plugin.shortcuts)) {
        for (const shortcut of plugin.shortcuts) {
          this._commandRegistry.registerShortcut(shortcut.combo, shortcut.command)
        }
      } else {
        for (const [combo, command] of Object.entries(plugin.shortcuts)) {
          this._commandRegistry.registerShortcut(combo, command)
        }
      }
    }

    // Inject CSS
    if (plugin.css) {
      this._injectCss(plugin.css, plugin.name)
    }

    // Call plugin init function if provided
    if (plugin.init && typeof plugin.init === 'function') {
      plugin.init(this._engine)
    }
  }

  /**
   * Unregister a plugin.
   * @param {string} name
   */
  unregister(name) {
    const plugin = this._plugins.get(name)
    if (!plugin) return

    if (plugin.commands) {
      if (Array.isArray(plugin.commands)) {
        for (const cmd of plugin.commands) {
          this._commandRegistry.unregister(cmd.name)
        }
      } else {
        for (const cmdName of Object.keys(plugin.commands)) {
          this._commandRegistry.unregister(cmdName)
        }
      }
    }

    if (plugin.toolbarButtons) {
      if (Array.isArray(plugin.toolbarButtons)) {
        for (const btn of plugin.toolbarButtons) {
          this._toolbarButtons.delete(btn.name)
        }
      } else {
        for (const btnName of Object.keys(plugin.toolbarButtons)) {
          this._toolbarButtons.delete(btnName)
        }
      }
    }

    if (plugin.menuItems) {
      if (Array.isArray(plugin.menuItems)) {
        for (const item of plugin.menuItems) {
          const menu = item.menu || 'format'
          const list = this._menuItems.get(menu)
          if (list) {
            const idx = list.indexOf(item)
            if (idx !== -1) list.splice(idx, 1)
          }
        }
      }
    }

    if (plugin.shortcuts) {
      if (Array.isArray(plugin.shortcuts)) {
        for (const shortcut of plugin.shortcuts) {
          this._commandRegistry.unregisterShortcut(shortcut.combo)
        }
      } else {
        for (const combo of Object.keys(plugin.shortcuts)) {
          this._commandRegistry.unregisterShortcut(combo)
        }
      }
    }

    this._removeCss(name)
    this._plugins.delete(name)
  }

  /**
   * Get all registered toolbar buttons.
   * @returns {Map<string, import('../types/plugin.types.js').ToolbarButtonDef>}
   */
  getAllToolbarButtons() {
    return this._toolbarButtons
  }

  /**
   * Get a toolbar button by name.
   * @param {string} name
   * @returns {import('../types/plugin.types.js').ToolbarButtonDef|undefined}
   */
  getToolbarButton(name) {
    return this._toolbarButtons.get(name)
  }

  /**
   * Get menu items for a specific menu.
   * @param {string} menuName
   * @returns {Array<import('../types/plugin.types.js').MenuItemDef>}
   */
  getMenuItems(menuName) {
    return this._menuItems.get(menuName) || []
  }

  /**
   * Get all registered plugins.
   * @returns {Array<import('../types/plugin.types.js').PluginDef>}
   */
  getAllPlugins() {
    return [...this._plugins.values()]
  }

  /** @private */
  _injectCss(css, pluginName) {
    const style = document.createElement('style')
    style.setAttribute('data-deveditor-plugin', pluginName)
    style.textContent = css
    document.head.appendChild(style)
    this._styleElements.push(style)
  }

  /** @private */
  _removeCss(pluginName) {
    this._styleElements = this._styleElements.filter((el) => {
      if (el.getAttribute('data-deveditor-plugin') === pluginName) {
        el.remove()
        return false
      }
      return true
    })
  }

  /** Remove all injected styles (cleanup on unmount). */
  removeAllStyles() {
    for (const el of this._styleElements) {
      el.remove()
    }
    this._styleElements = []
  }
}
