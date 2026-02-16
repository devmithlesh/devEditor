/**
 * @fileoverview SelectionManager — saves and restores cursor position
 * by mapping between DOM Selection/Range and document model node IDs + offsets.
 */

import { getClosestNodeElement, getNodeIdFromElement, getTextOffsetInElement, getTextNodeAtOffset, getElementByNodeId } from '../utils/dom.js'

export class SelectionManager {
  /**
   * @param {HTMLElement} containerEl - The contentEditable container
   */
  constructor(containerEl) {
    this._container = containerEl
    this._savedSelection = null
  }

  /** Update the container reference (after re-mount). */
  setContainer(containerEl) {
    this._container = containerEl
  }

  /**
   * Capture the current DOM selection as model-relative coordinates.
   * @returns {import('../types/editor.types.js').SelectionState|null}
   */
  captureSelection() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return this._savedSelection

    const range = sel.getRangeAt(0)

    const anchorInfo = this._domPointToModel(range.startContainer, range.startOffset)
    const focusInfo = sel.isCollapsed
      ? anchorInfo
      : this._domPointToModel(range.endContainer, range.endOffset)

    if (!anchorInfo || !focusInfo) return this._savedSelection

    this._savedSelection = {
      anchorNodeId: anchorInfo.nodeId,
      anchorOffset: anchorInfo.offset,
      focusNodeId: focusInfo.nodeId,
      focusOffset: focusInfo.offset,
      isCollapsed: sel.isCollapsed,
    }

    return this._savedSelection
  }

  /**
   * Restore the selection from saved model coordinates back to the DOM.
   * @param {import('../types/editor.types.js').SelectionState} [selState]
   */
  restoreSelection(selState) {
    const state = selState || this._savedSelection
    if (!state || !this._container) return

    const anchorPoint = this._modelPointToDom(state.anchorNodeId, state.anchorOffset)
    if (!anchorPoint) return

    const sel = window.getSelection()
    if (!sel) return

    const range = document.createRange()

    try {
      range.setStart(anchorPoint.node, anchorPoint.offset)

      if (state.isCollapsed) {
        range.collapse(true)
      } else {
        const focusPoint = this._modelPointToDom(state.focusNodeId, state.focusOffset)
        if (focusPoint) {
          range.setEnd(focusPoint.node, focusPoint.offset)
        } else {
          range.collapse(true)
        }
      }

      sel.removeAllRanges()
      sel.addRange(range)
    } catch (e) {
      // Range may be invalid if DOM changed significantly
      console.warn('SelectionManager: Failed to restore selection', e)
    }
  }

  /** Get the last saved selection state. */
  getSavedSelection() {
    return this._savedSelection
  }

  /** Set saved selection directly (for programmatic cursor positioning). */
  setSavedSelection(state) {
    this._savedSelection = state
  }

  /**
   * Place cursor at the start of a specific node.
   * @param {string} nodeId
   */
  setCursorToNode(nodeId, offset = 0) {
    this._savedSelection = {
      anchorNodeId: nodeId,
      anchorOffset: offset,
      focusNodeId: nodeId,
      focusOffset: offset,
      isCollapsed: true,
    }
    this.restoreSelection()
  }

  /**
   * Place cursor at the end of the document.
   */
  setCursorToEnd() {
    if (!this._container) return
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    range.selectNodeContents(this._container)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  /**
   * Convert a DOM point (node + offset) to model coordinates (nodeId + text offset).
   * @private
   */
  _domPointToModel(domNode, domOffset) {
    if (!this._container || !this._container.contains(domNode)) return null

    // Find the closest ancestor with a data-node-id
    const nodeEl = getClosestNodeElement(domNode)
    if (!nodeEl) {
      // Handle container-level selection (e.g. Ctrl+A selects the whole contentEditable)
      if (domNode === this._container || this._container.contains(domNode)) {
        // Find only leaf-level nodes (text nodes in the model — no nested data-node-id children)
        const allNodeEls = Array.from(this._container.querySelectorAll('[data-node-id]'))
        const leafEls = allNodeEls.filter(el => !el.querySelector('[data-node-id]'))
        if (leafEls.length === 0) return null
        if (domOffset === 0) {
          return { nodeId: leafEls[0].getAttribute('data-node-id'), offset: 0 }
        } else {
          const lastEl = leafEls[leafEls.length - 1]
          return { nodeId: lastEl.getAttribute('data-node-id'), offset: lastEl.textContent?.length || 0 }
        }
      }
      return null
    }

    const nodeId = getNodeIdFromElement(nodeEl)
    if (!nodeId) return null

    // Calculate text offset within this element
    let offset
    if (domNode.nodeType === Node.TEXT_NODE) {
      offset = getTextOffsetInElement(nodeEl, domNode, domOffset)
    } else {
      // Element node — offset is the child index
      // Convert to text offset
      if (domOffset === 0) {
        offset = 0
      } else {
        // Count text content up to the offset-th child
        let textLen = 0
        for (let i = 0; i < domOffset && i < domNode.childNodes.length; i++) {
          textLen += domNode.childNodes[i].textContent?.length || 0
        }
        offset = textLen
      }
    }

    return { nodeId, offset }
  }

  /**
   * Convert model coordinates (nodeId + offset) to a DOM point (node + offset).
   * @private
   */
  _modelPointToDom(nodeId, offset) {
    if (!this._container) return null

    const el = getElementByNodeId(this._container, nodeId)
    if (!el) return null

    const result = getTextNodeAtOffset(el, offset)
    if (result) return result

    // If no text nodes, create a position at the element itself
    if (el.childNodes.length === 0) {
      return { node: el, offset: 0 }
    }

    return { node: el, offset: 0 }
  }
}
