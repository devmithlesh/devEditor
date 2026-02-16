/**
 * @fileoverview MenuParser — parses menubar config strings and provides default menu items.
 */

/**
 * Parse a menubar string into an array of menu names.
 * @param {string} menubarStr - e.g. "file edit view insert format tools table help"
 * @returns {string[]}
 */
export function parseMenubarString(menubarStr) {
  if (!menubarStr || typeof menubarStr !== 'string') return []
  return menubarStr.trim().split(/\s+/).filter(Boolean)
}

/**
 * Get default menu items for all standard menus.
 * @returns {Object<string, Array>}
 */
export function getDefaultMenuItems() {
  return {
    file: [
      { label: 'New document', command: 'newDocument' },
    ],
    edit: [
      { label: 'Cut', command: 'cut', shortcutLabel: 'Ctrl+X' },
      { label: 'Copy', command: 'copy', shortcutLabel: 'Ctrl+C' },
      { label: 'Paste', command: 'paste', shortcutLabel: 'Ctrl+V' },
      { type: 'separator' },
      { label: 'Select all', command: 'selectAll', shortcutLabel: 'Ctrl+A' },
    ],
    view: [
      { label: 'Word count', command: 'wordCount' },
    ],
    insert: [
      { label: 'Horizontal rule', command: 'insertHorizontalRule' },
    ],
    format: [],  // Populated by plugins
    tools: [
      { label: 'Word count', command: 'wordCount' },
    ],
    table: [],  // Populated by table plugin
    help: [
      { label: 'Keyboard shortcuts', command: 'showShortcuts' },
      { label: 'About', command: 'showAbout' },
    ],
  }
}

/**
 * Merge default menu items with plugin-registered items.
 * @param {Object} defaults
 * @param {Map<string, Array>} pluginItems
 * @returns {Object}
 */
export function mergeMenuItems(defaults, pluginItems) {
  const merged = {}
  for (const key of Object.keys(defaults)) {
    merged[key] = [...defaults[key]]
  }
  for (const [menu, items] of pluginItems) {
    if (!merged[menu]) {
      merged[menu] = []
    }
    if (merged[menu].length > 0 && items.length > 0) {
      merged[menu].push({ type: 'separator' })
    }
    merged[menu].push(...items)
  }
  return merged
}
