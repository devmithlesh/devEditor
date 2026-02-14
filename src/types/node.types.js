/**
 * @fileoverview Document model node type definitions.
 * The editor uses a JSON tree as its source of truth.
 */

/**
 * @typedef {'paragraph'|'heading'|'blockquote'|'codeBlock'|'bulletList'|'orderedList'|'listItem'|'table'|'tableRow'|'tableCell'|'horizontalRule'|'image'} BlockType
 */

/**
 * @typedef {'bold'|'italic'|'underline'|'strikethrough'|'code'|'link'} MarkType
 */

/**
 * @typedef {Object} Mark
 * @property {MarkType} type
 * @property {Object} [attrs] - e.g. { href: '...' } for links
 */

/**
 * @typedef {Object} TextNode
 * @property {string} id
 * @property {'text'} type
 * @property {string} text
 * @property {Mark[]} [marks]
 */

/**
 * @typedef {Object} BlockNode
 * @property {string} id
 * @property {BlockType} type
 * @property {Object} [attrs] - e.g. { level: 2 } for headings, { textAlign: 'center' }
 * @property {Array<BlockNode|TextNode>} [content]
 */

/**
 * @typedef {Object} EditorDoc
 * @property {'doc'} type
 * @property {BlockNode[]} content
 */

export default {}
