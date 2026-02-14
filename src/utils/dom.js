/**
 * @fileoverview DOM utility functions for mapping between the document model and DOM.
 */

import { NODE_ID_ATTR, EDITOR_CLASS } from './constants.js'

/**
 * Get the node ID from a DOM element.
 * @param {Element} el
 * @returns {string|null}
 */
export function getNodeIdFromElement(el) {
  if (!el || !el.getAttribute) return null
  return el.getAttribute(NODE_ID_ATTR)
}

/**
 * Find the closest ancestor element with a node ID.
 * @param {Node} domNode
 * @returns {Element|null}
 */
export function getClosestNodeElement(domNode) {
  if (!domNode) return null
  let current = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode
  while (current) {
    if (current.getAttribute && current.getAttribute(NODE_ID_ATTR)) {
      return current
    }
    if (current.classList && current.classList.contains(EDITOR_CLASS)) {
      return null
    }
    current = current.parentElement
  }
  return null
}

/**
 * Find a DOM element by its node ID within a container.
 * @param {Element} container
 * @param {string} nodeId
 * @returns {Element|null}
 */
export function getElementByNodeId(container, nodeId) {
  return container.querySelector(`[${NODE_ID_ATTR}="${nodeId}"]`)
}

/**
 * Check if a DOM element is a block-level element.
 * @param {string} tagName
 * @returns {boolean}
 */
export function isDomBlockElement(tagName) {
  const blocks = new Set([
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'ul', 'ol', 'li',
    'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'hr', 'figure', 'figcaption', 'section', 'article',
  ])
  return blocks.has(tagName.toLowerCase())
}

/**
 * Get the text offset within a parent element for a given DOM text node and offset.
 * @param {Element} parentEl
 * @param {Node} textNode
 * @param {number} offset
 * @returns {number}
 */
export function getTextOffsetInElement(parentEl, textNode, offset) {
  let totalOffset = 0
  const walker = document.createTreeWalker(parentEl, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (node === textNode) {
      return totalOffset + offset
    }
    totalOffset += node.textContent.length
  }
  return totalOffset + offset
}

/**
 * Find the DOM text node and offset from a logical text offset within an element.
 * @param {Element} parentEl
 * @param {number} targetOffset
 * @returns {{ node: Node, offset: number }|null}
 */
export function getTextNodeAtOffset(parentEl, targetOffset) {
  const walker = document.createTreeWalker(parentEl, NodeFilter.SHOW_TEXT)
  let remaining = targetOffset
  let node
  while ((node = walker.nextNode())) {
    if (remaining <= node.textContent.length) {
      return { node, offset: remaining }
    }
    remaining -= node.textContent.length
  }
  // If offset exceeds content, return end of last text node
  const lastNode = walker.currentNode || parentEl
  if (lastNode.nodeType === Node.TEXT_NODE) {
    return { node: lastNode, offset: lastNode.textContent.length }
  }
  return null
}
