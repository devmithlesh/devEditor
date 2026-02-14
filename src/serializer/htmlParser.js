/**
 * @fileoverview Parse HTML string into document model.
 * Used for: initialValue, setContent(), paste handling.
 */

import { generateId } from '../utils/helpers.js'

/**
 * @param {string} html
 * @returns {import('../types/node.types.js').EditorDoc}
 */
export function parseHtml(html) {
  if (!html || !html.trim()) {
    return emptyDoc()
  }

  const template = document.createElement('template')
  template.innerHTML = html.trim()
  const fragment = template.content

  const content = []
  for (const child of fragment.childNodes) {
    const parsed = parseDomNode(child)
    if (parsed) {
      if (Array.isArray(parsed)) content.push(...parsed)
      else content.push(parsed)
    }
  }

  if (content.length > 0 && content.every((n) => n.type === 'text')) {
    return { type: 'doc', content: [{ id: generateId(), type: 'paragraph', content }] }
  }

  return { type: 'doc', content: content.length > 0 ? content : emptyDoc().content }
}

function parseDomNode(domNode) {
  if (domNode.nodeType === Node.TEXT_NODE) {
    const text = domNode.textContent
    if (!text) return null
    return { id: generateId(), type: 'text', text }
  }
  if (domNode.nodeType !== Node.ELEMENT_NODE) return null

  const tag = domNode.tagName.toLowerCase()

  const markMap = { strong: 'bold', b: 'bold', em: 'italic', i: 'italic', u: 'underline', s: 'strikethrough', del: 'strikethrough', code: 'code' }
  if (markMap[tag]) {
    const children = parseChildren(domNode)
    for (const child of children) {
      if (child.type === 'text') {
        if (!child.marks) child.marks = []
        child.marks.push({ type: markMap[tag] })
      }
    }
    return children.length === 1 ? children[0] : children
  }

  if (tag === 'a') {
    const children = parseChildren(domNode)
    for (const child of children) {
      if (child.type === 'text') {
        if (!child.marks) child.marks = []
        child.marks.push({ type: 'link', attrs: { href: domNode.getAttribute('href') || '#' } })
      }
    }
    return children.length === 1 ? children[0] : children
  }

  if (tag === 'span') {
    const children = parseChildren(domNode)
    return children.length === 1 ? children[0] : children
  }

  if (/^h[1-6]$/.test(tag)) {
    return { id: generateId(), type: 'heading', attrs: { level: parseInt(tag[1]) }, content: parseChildren(domNode) }
  }

  const blockMap = { p: 'paragraph', blockquote: 'blockquote', ul: 'bulletList', ol: 'orderedList', li: 'listItem', pre: 'codeBlock', table: 'table', tr: 'tableRow', td: 'tableCell', th: 'tableCell', div: 'paragraph' }
  if (blockMap[tag]) {
    const node = { id: generateId(), type: blockMap[tag], content: parseChildren(domNode) }
    if (tag === 'th') node.attrs = { header: true }
    return node
  }

  if (tag === 'br') return { id: generateId(), type: 'hardBreak' }
  if (tag === 'hr') return { id: generateId(), type: 'horizontalRule' }
  if (tag === 'img') return { id: generateId(), type: 'image', attrs: { src: domNode.getAttribute('src') || '', alt: domNode.getAttribute('alt') || '' } }

  return parseChildren(domNode)
}

function parseChildren(domNode) {
  const children = []
  for (const child of domNode.childNodes) {
    const parsed = parseDomNode(child)
    if (parsed) {
      if (Array.isArray(parsed)) children.push(...parsed)
      else children.push(parsed)
    }
  }
  return children.length > 0 ? children : [{ id: generateId(), type: 'text', text: '' }]
}

function emptyDoc() {
  return { type: 'doc', content: [{ id: generateId(), type: 'paragraph', content: [{ id: generateId(), type: 'text', text: '' }] }] }
}
