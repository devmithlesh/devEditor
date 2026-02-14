/**
 * @fileoverview Serialize document model to clean, semantic HTML.
 * Produces output suitable for storage or display outside the editor.
 */

/**
 * @param {import('../types/node.types.js').EditorDoc} doc
 * @returns {string}
 */
export function serializeToHtml(doc) {
  if (!doc || !doc.content) return ''
  return doc.content.map(serializeNode).join('')
}

function serializeNode(node) {
  switch (node.type) {
    case 'text': return serializeTextNode(node)
    case 'paragraph': return wrapBlock('p', node)
    case 'heading': return wrapBlock(`h${node.attrs?.level || 1}`, node)
    case 'blockquote': return wrapBlock('blockquote', node)
    case 'codeBlock': return `<pre><code>${serializeChildren(node)}</code></pre>`
    case 'bulletList': {
      const style = node.attrs?.listStyleType
      const styleAttr = style ? ` style="list-style-type: ${style}"` : ''
      return `<ul${styleAttr}>${serializeChildren(node)}</ul>`
    }
    case 'orderedList': {
      const style = node.attrs?.listStyleType
      const styleAttr = style ? ` style="list-style-type: ${style}"` : ''
      return `<ol${styleAttr}>${serializeChildren(node)}</ol>`
    }
    case 'listItem': return wrapBlock('li', node)
    case 'horizontalRule': return '<hr/>'
    case 'image': return `<img src="${esc(node.attrs?.src || '')}" alt="${esc(node.attrs?.alt || '')}"/>`
    case 'table': return wrapBlock('table', node)
    case 'tableRow': return wrapBlock('tr', node)
    case 'tableCell': return wrapBlock(node.attrs?.header ? 'th' : 'td', node)
    case 'hardBreak': return '<br/>'
    case 'pageBreak': return '<div style="page-break-after: always;"></div>'
    default: return serializeChildren(node)
  }
}

function serializeTextNode(node) {
  let html = escHtml(node.text || '')
  if (!html) return ''
  if (node.marks) {
    for (const mark of node.marks) {
      html = wrapMark(html, mark)
    }
  }
  return html
}

function wrapMark(html, mark) {
  switch (mark.type) {
    case 'bold': return `<strong>${html}</strong>`
    case 'italic': return `<em>${html}</em>`
    case 'underline': return `<u>${html}</u>`
    case 'strikethrough': return `<s>${html}</s>`
    case 'code': return `<code>${html}</code>`
    case 'link':
      return `<a href="${esc(mark.attrs?.href || '#')}" target="_blank" rel="noopener noreferrer">${html}</a>`
    case 'fontFamily':
      return `<span style="font-family: ${esc(mark.attrs?.family || 'inherit')}">${html}</span>`
    case 'fontSize':
      return `<span style="font-size: ${esc(mark.attrs?.size || 'inherit')}">${html}</span>`
    case 'foreColor':
      return `<span style="color: ${esc(mark.attrs?.color || 'inherit')}">${html}</span>`
    case 'backColor':
      return `<span style="background-color: ${esc(mark.attrs?.color || 'transparent')}">${html}</span>`
    case 'anchor':
      return `<a id="${esc(mark.attrs?.name || '')}">${html}</a>`
    default: return html
  }
}

function wrapBlock(tag, node) {
  const styles = []
  if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`)
  if (node.attrs?.indent && node.attrs.indent > 0) styles.push(`margin-left: ${node.attrs.indent * 2}em`)
  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
  const dirAttr = node.attrs?.dir ? ` dir="${node.attrs.dir}"` : ''
  return `<${tag}${styleAttr}${dirAttr}>${serializeChildren(node)}</${tag}>`
}

function serializeChildren(node) {
  if (!node.content) return ''
  return node.content.map(serializeNode).join('')
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
