/**
 * @fileoverview JSON serialization — strips internal IDs for clean export.
 */

import { generateId } from '../utils/helpers.js'

/**
 * Serialize document model to clean JSON (no internal IDs).
 * @param {Object} doc
 * @returns {Object}
 */
export function serializeToJson(doc) {
  return cleanNode(doc)
}

function cleanNode(node) {
  const clean = { type: node.type }
  if (node.attrs && Object.keys(node.attrs).length > 0) clean.attrs = { ...node.attrs }
  if (node.marks && node.marks.length > 0) clean.marks = node.marks.map((m) => ({ ...m }))
  if (node.text !== undefined) clean.text = node.text
  if (node.content) clean.content = node.content.map(cleanNode)
  return clean
}

/**
 * Parse clean JSON back into a model (re-adding IDs).
 * @param {Object} json
 * @returns {Object}
 */
export function parseJson(json) {
  return addIds(json)
}

function addIds(node) {
  const withId = { ...node, id: generateId() }
  if (withId.content) withId.content = withId.content.map(addIds)
  return withId
}
