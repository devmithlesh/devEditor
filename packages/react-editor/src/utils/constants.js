/**
 * @fileoverview Shared constants for the editor.
 */

export const BLOCK_TYPES = [
  'paragraph', 'heading', 'blockquote', 'codeBlock',
  'bulletList', 'orderedList', 'listItem',
  'table', 'tableRow', 'tableCell',
  'horizontalRule', 'image',
]

export const MARK_TYPES = [
  'bold', 'italic', 'underline', 'strikethrough', 'code', 'link',
]

export const BLOCK_TAG_MAP = {
  p: 'paragraph',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  blockquote: 'blockquote',
  pre: 'codeBlock',
  ul: 'bulletList',
  ol: 'orderedList',
  li: 'listItem',
  table: 'table',
  tr: 'tableRow',
  td: 'tableCell',
  th: 'tableCell',
  hr: 'horizontalRule',
  img: 'image',
}

export const MARK_TAG_MAP = {
  strong: 'bold',
  b: 'bold',
  em: 'italic',
  i: 'italic',
  u: 'underline',
  s: 'strikethrough',
  del: 'strikethrough',
  strike: 'strikethrough',
  code: 'code',
  a: 'link',
}

export const NODE_ID_ATTR = 'data-node-id'

export const EDITOR_CLASS = 'de-content'

export const EMPTY_DOC = {
  type: 'doc',
  content: [],
}
