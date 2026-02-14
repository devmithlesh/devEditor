/**
 * @fileoverview Whitelist-based HTML sanitizer to prevent XSS.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li', 'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'span', 'div', 'sup', 'sub',
])

const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'target', 'rel',
  'colspan', 'rowspan', 'start', 'type',
  'width', 'height', 'style', 'class',
])

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const ALLOWED_CSS_PROPS = new Set([
  'text-align', 'color', 'background-color', 'font-size',
  'font-weight', 'font-style', 'text-decoration', 'margin-left',
])

/**
 * Sanitize an HTML string.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  const template = document.createElement('template')
  template.innerHTML = html
  sanitizeNode(template.content)
  return template.innerHTML
}

function sanitizeNode(node) {
  const toRemove = []

  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) {
          node.insertBefore(child.firstChild, child)
        }
        toRemove.push(child)
        continue
      }

      const attrs = [...child.attributes]
      for (const attr of attrs) {
        if (!ALLOWED_ATTRS.has(attr.name)) {
          child.removeAttribute(attr.name)
          continue
        }
        if (['href', 'src'].includes(attr.name)) {
          try {
            const url = new URL(attr.value, window.location.origin)
            if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
              child.removeAttribute(attr.name)
            }
          } catch {
            child.removeAttribute(attr.name)
          }
        }
        if (attr.name === 'style') {
          child.setAttribute('style', sanitizeStyle(attr.value))
        }
      }

      sanitizeNode(child)
    } else if (child.nodeType === Node.COMMENT_NODE) {
      toRemove.push(child)
    }
  }

  for (const el of toRemove) el.remove()
}

function sanitizeStyle(style) {
  return style
    .split(';')
    .filter((decl) => {
      const prop = decl.split(':')[0]?.trim().toLowerCase()
      return ALLOWED_CSS_PROPS.has(prop)
    })
    .join(';')
}
