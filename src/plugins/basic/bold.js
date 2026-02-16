/**
 * Bold plugin — toggles <strong> mark on selected text.
 */

import { findNodeById, walkTree, hasMark, deepClone, getAbsoluteTextOffset, resolveAbsoluteTextOffset } from '../../utils/helpers.js'

export function boldPlugin() {
  return {
    name: 'bold',

    commands: [
      {
        name: 'bold',
        execute: (engine) => {
          toggleMark(engine, 'bold')
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'bold',
        tooltip: 'Bold',
        icon: '<svg viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="currentColor"/></svg>',
        command: 'bold',
        type: 'button',
        shortcutLabel: 'Ctrl+B',
        isActive: (engine) => isMarkActive(engine, 'bold'),
      },
    ],

    shortcuts: [
      { combo: 'ctrl+b', command: 'bold' },
    ],
  }
}

/**
 * Compute ordered selection range and absolute offsets for a non-collapsed selection.
 * Returns null if selection is invalid. Used by toggleMark and applyMarkToSelection.
 * @private
 */
function _getOrderedRange(engine, sel) {
  const doc = engine._model.doc
  const allTextNodes = []
  walkTree(doc, (node) => {
    if (node.type === 'text') allTextNodes.push(node)
  })

  const anchorIdx = allTextNodes.findIndex((n) => n.id === sel.anchorNodeId)
  const focusIdx = allTextNodes.findIndex((n) => n.id === sel.focusNodeId)
  if (anchorIdx === -1 || focusIdx === -1) return null

  const isForward = anchorIdx < focusIdx || (anchorIdx === focusIdx && sel.anchorOffset <= sel.focusOffset)
  const startNodeId = isForward ? sel.anchorNodeId : sel.focusNodeId
  const startOffset = isForward ? sel.anchorOffset : sel.focusOffset
  const endNodeId = isForward ? sel.focusNodeId : sel.anchorNodeId
  const endOffset = isForward ? sel.focusOffset : sel.anchorOffset

  // Compute absolute offsets before any splitting occurs
  const absStart = getAbsoluteTextOffset(doc, startNodeId, startOffset)
  const absEnd = getAbsoluteTextOffset(doc, endNodeId, endOffset)
  if (absStart === -1 || absEnd === -1) return null

  const startIdx = Math.min(anchorIdx, focusIdx)
  const endIdx = Math.max(anchorIdx, focusIdx)
  const selectedTextNodes = allTextNodes.slice(startIdx, endIdx + 1)

  return { startNodeId, startOffset, endNodeId, endOffset, absStart, absEnd, selectedTextNodes }
}

/**
 * After a mark operation that may split text nodes, resolve the absolute
 * offsets back to the new node IDs and restore the selection.
 * @private
 */
function _restoreSelectionFromAbsOffsets(engine, absStart, absEnd) {
  const doc = engine._model.doc
  const newStart = resolveAbsoluteTextOffset(doc, absStart)
  const newEnd = resolveAbsoluteTextOffset(doc, absEnd)
  if (newStart && newEnd) {
    engine._selection.setSavedSelection({
      anchorNodeId: newStart.nodeId,
      anchorOffset: newStart.offset,
      focusNodeId: newEnd.nodeId,
      focusOffset: newEnd.offset,
      isCollapsed: false,
    })
  }
  engine._reconcile()
  engine._selection.restoreSelection()
}

/**
 * Toggle a mark on the current selection.
 * Supports partial selection within text nodes via text node splitting.
 */
export function toggleMark(engine, markType, markAttrs) {
  const sel = engine._selection?.captureSelection()
  if (!sel || sel.isCollapsed) return

  const range = _getOrderedRange(engine, sel)
  if (!range) return

  const { startNodeId, startOffset, endNodeId, endOffset, absStart, absEnd, selectedTextNodes } = range

  // Check if all text in range already has this mark (for toggle)
  const allHaveMark = selectedTextNodes.every((n) => hasMark(n, markType))

  // Save history
  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  if (allHaveMark) {
    engine._model.applyTransaction({
      steps: [{
        type: 'removeMark',
        data: { startNodeId, startOffset, endNodeId, endOffset, markType },
      }],
    })
  } else {
    const mark = markAttrs ? { type: markType, attrs: markAttrs } : { type: markType }
    engine._model.applyTransaction({
      steps: [{
        type: 'addMark',
        data: { startNodeId, startOffset, endNodeId, endOffset, mark },
      }],
    })
  }

  // Restore selection using absolute offsets (survives text node splits)
  _restoreSelectionFromAbsOffsets(engine, absStart, absEnd)
  engine._bumpVersion()
}

/**
 * Apply a mark to the current selection (always adds, never toggles/removes).
 * Used by forecolor, backcolor, and other mark types that replace rather than toggle.
 */
export function applyMarkToSelection(engine, markType, markAttrs) {
  const sel = engine._selection?.getSavedSelection() || engine._selection?.captureSelection()
  if (!sel || sel.isCollapsed) return

  const range = _getOrderedRange(engine, sel)
  if (!range) return

  const { startNodeId, startOffset, endNodeId, endOffset, absStart, absEnd } = range

  // Save history
  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  const mark = markAttrs ? { type: markType, attrs: markAttrs } : { type: markType }
  engine._model.applyTransaction({
    steps: [{
      type: 'addMark',
      data: { startNodeId, startOffset, endNodeId, endOffset, mark },
    }],
  })

  // Restore selection using absolute offsets (survives text node splits)
  _restoreSelectionFromAbsOffsets(engine, absStart, absEnd)
  engine._bumpVersion()
}

/**
 * Remove a mark from the current selection (always removes, never toggles).
 * Used by unlink and similar operations.
 */
export function removeMarkFromSelection(engine, markType) {
  const sel = engine._selection?.getSavedSelection() || engine._selection?.captureSelection()
  if (!sel || sel.isCollapsed) return

  const range = _getOrderedRange(engine, sel)
  if (!range) return

  const { startNodeId, startOffset, endNodeId, endOffset, absStart, absEnd } = range

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  engine._model.applyTransaction({
    steps: [{
      type: 'removeMark',
      data: { startNodeId, startOffset, endNodeId, endOffset, markType },
    }],
  })

  _restoreSelectionFromAbsOffsets(engine, absStart, absEnd)
  engine._bumpVersion()
}

/**
 * Check if a mark is active at the current cursor position.
 * Also checks pending marks for collapsed selections.
 */
export function isMarkActive(engine, markType) {
  // Check pending marks first (for type-ahead formatting)
  if (engine.hasPendingMark && engine.hasPendingMark(markType)) return true

  const sel = engine._selection?.getSavedSelection()
  if (!sel) return false
  const node = findNodeById(engine._model.doc, sel.anchorNodeId)
  if (!node || node.type !== 'text') return false
  return hasMark(node, markType)
}
