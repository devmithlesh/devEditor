/**
 * @fileoverview Utility functions for the editor.
 */

let idCounter = 0

/**
 * Generate a unique ID for document nodes.
 * @returns {string}
 */
export function generateId() {
  return `n${Date.now().toString(36)}${(idCounter++).toString(36)}`
}

/**
 * Deep clone a plain object/array (JSON-safe).
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepClone)
  const clone = {}
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key])
  }
  return clone
}

/**
 * Walk a document tree depth-first, calling fn(node, parent, index) for each node.
 * @param {Object} node
 * @param {function} fn - Return false to stop walking children
 * @param {Object} [parent]
 * @param {number} [index]
 */
export function walkTree(node, fn, parent = null, index = 0) {
  const result = fn(node, parent, index)
  if (result === false) return
  if (node.content) {
    for (let i = 0; i < node.content.length; i++) {
      walkTree(node.content[i], fn, node, i)
    }
  }
}

/**
 * Find a node by its ID in the document tree.
 * @param {Object} doc
 * @param {string} id
 * @returns {Object|null}
 */
export function findNodeById(doc, id) {
  let found = null
  walkTree(doc, (node) => {
    if (node.id === id) {
      found = node
      return false
    }
  })
  return found
}

/**
 * Find the parent of a node by ID.
 * @param {Object} doc
 * @param {string} id
 * @returns {{ parent: Object, index: number }|null}
 */
export function findParent(doc, id) {
  let result = null
  walkTree(doc, (node, parent, index) => {
    if (node.id === id && parent) {
      result = { parent, index }
      return false
    }
  })
  return result
}

/**
 * Collect all text nodes within a subtree.
 * @param {Object} node
 * @returns {Object[]}
 */
export function getTextNodes(node) {
  const texts = []
  walkTree(node, (n) => {
    if (n.type === 'text') texts.push(n)
  })
  return texts
}

/**
 * Check if a node has a specific mark.
 * @param {Object} node
 * @param {string} markType
 * @returns {boolean}
 */
export function hasMark(node, markType) {
  return node.marks?.some((m) => m.type === markType) ?? false
}

/**
 * Get the closest block ancestor of a node.
 * @param {Object} doc
 * @param {string} nodeId
 * @returns {Object|null}
 */
export function getBlockParent(doc, nodeId) {
  const result = findParent(doc, nodeId)
  if (!result) return null
  if (result.parent.type === 'doc') return null
  if (result.parent.type !== 'text') return result.parent
  return getBlockParent(doc, result.parent.id)
}

/**
 * Compute the absolute character offset from the start of the document
 * to a given (nodeId, offset) position. This survives text node splitting
 * because splitting redistributes characters across nodes but doesn't
 * change the total character count.
 * @param {Object} doc
 * @param {string} nodeId
 * @param {number} offset
 * @returns {number} Absolute offset, or -1 if nodeId not found
 */
export function getAbsoluteTextOffset(doc, nodeId, offset) {
  let absOffset = 0
  let found = false
  walkTree(doc, (node) => {
    if (found) return false
    if (node.type === 'text') {
      if (node.id === nodeId) {
        absOffset += offset
        found = true
        return false
      }
      absOffset += node.text.length
    }
  })
  return found ? absOffset : -1
}

/**
 * Resolve an absolute character offset back to a (nodeId, offset) pair.
 * Inverse of getAbsoluteTextOffset — works after text node splits.
 * @param {Object} doc
 * @param {number} absOffset
 * @returns {{ nodeId: string, offset: number }|null}
 */
export function resolveAbsoluteTextOffset(doc, absOffset) {
  let remaining = absOffset
  let result = null
  walkTree(doc, (node) => {
    if (result) return false
    if (node.type === 'text') {
      if (remaining <= node.text.length) {
        result = { nodeId: node.id, offset: remaining }
        return false
      }
      remaining -= node.text.length
    }
  })
  return result
}

/**
 * Debounce a function.
 * @param {function} fn
 * @param {number} ms
 * @returns {function}
 */
export function debounce(fn, ms) {
  let timer
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timer)
  debounced.flush = () => {
    clearTimeout(timer)
    fn()
  }
  return debounced
}
