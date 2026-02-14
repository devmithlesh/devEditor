/**
 * @fileoverview Plugin system type definitions.
 */

/**
 * @typedef {Object} PluginCommand
 * @property {string} name
 * @property {function} execute - (engine, ...args) => void
 */

/**
 * @typedef {Object} ToolbarButtonDef
 * @property {string} name - Unique button identifier (matches toolbar string token)
 * @property {string} tooltip - Display label
 * @property {string} icon - Inline SVG string
 * @property {string} command - Command name to execute on click
 * @property {'button'|'dropdown'} [type='button']
 * @property {function} [isActive] - (engine) => boolean
 * @property {function} [isDisabled] - (engine) => boolean
 * @property {string} [shortcutLabel] - e.g. 'Ctrl+B'
 * @property {Array} [dropdownItems] - For dropdown type buttons
 */

/**
 * @typedef {Object} MenuItemDef
 * @property {string} menu - Which menu this belongs to (file, edit, etc.)
 * @property {string} [label]
 * @property {string} [command]
 * @property {string} [shortcutLabel]
 * @property {'separator'|'item'|'submenu'} [type='item']
 * @property {function} [isChecked] - (engine) => boolean
 * @property {function} [isDisabled] - (engine) => boolean
 */

/**
 * @typedef {Object} ShortcutDef
 * @property {string} combo - e.g. 'ctrl+b', 'ctrl+shift+k'
 * @property {string} command - Command name to execute
 */

/**
 * @typedef {Object} PluginDef
 * @property {string} name
 * @property {PluginCommand[]} [commands]
 * @property {ToolbarButtonDef[]} [toolbarButtons]
 * @property {MenuItemDef[]} [menuItems]
 * @property {ShortcutDef[]} [shortcuts]
 * @property {string} [css] - CSS to inject
 */

export default {}
