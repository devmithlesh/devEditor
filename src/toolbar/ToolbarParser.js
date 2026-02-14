/**
 * @fileoverview ToolbarParser — parses toolbar config strings into structured groups.
 *
 * Input:  "undo redo | bold italic | alignleft aligncenter"
 * Output: [['undo', 'redo'], ['bold', 'italic'], ['alignleft', 'aligncenter']]
 */

/**
 * Parse a toolbar string into arrays of groups.
 * @param {string} toolbarStr
 * @returns {string[][]}
 */
export function parseToolbarString(toolbarStr) {
  if (!toolbarStr || typeof toolbarStr !== 'string') return []

  return toolbarStr
    .split('|')
    .map((group) => group.trim().split(/\s+/).filter(Boolean))
    .filter((group) => group.length > 0)
}

/**
 * Resolve parsed groups against the registered toolbar buttons.
 * Returns arrays of button definitions.
 * @param {string[][]} groups
 * @param {Map<string, import('../types/plugin.types.js').ToolbarButtonDef>} allButtons
 * @returns {Array<Array<import('../types/plugin.types.js').ToolbarButtonDef>>}
 */
export function resolveToolbarGroups(groups, allButtons) {
  return groups
    .map((group) =>
      group.map((name) => allButtons.get(name)).filter(Boolean)
    )
    .filter((group) => group.length > 0)
}
