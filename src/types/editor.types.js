/**
 * @fileoverview Editor configuration and transaction type definitions.
 */

/**
 * @typedef {Object} EditorConfig
 * @property {number} [height=300]
 * @property {string|false} [menubar='file edit view insert format tools table help']
 * @property {Array} [plugins=[]]
 * @property {string|false} [toolbar]
 * @property {string} [content_style='']
 * @property {Object} [mobile={}]
 * @property {function} [setup]
 */

/**
 * @typedef {Object} TransactionStep
 * @property {'insertText'|'deleteText'|'splitNode'|'mergeNodes'|'addMark'|'removeMark'|'setNodeAttr'|'insertNode'|'deleteNode'|'replaceContent'} type
 * @property {Object} data - Step-specific data
 */

/**
 * @typedef {Object} Transaction
 * @property {TransactionStep[]} steps
 * @property {Object} [meta]
 * @property {boolean} [meta.addToHistory=true]
 */

/**
 * @typedef {Object} SelectionState
 * @property {string} anchorNodeId
 * @property {number} anchorOffset
 * @property {string} focusNodeId
 * @property {number} focusOffset
 * @property {boolean} isCollapsed
 */

export default {}
