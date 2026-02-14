/**
 * @fileoverview useSelection hook — exposes current selection state.
 */

import { useMemo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { findNodeById } from '../utils/helpers.js'

/**
 * Returns the current selection state and helper methods.
 */
export function useSelection() {
  const engine = useEditorEngine()
  const version = useEditorVersion() // triggers re-render on change

  return useMemo(() => {
    const sel = engine._selection?.getSavedSelection()

    if (!sel) {
      return {
        isCollapsed: true,
        anchorNodeId: null,
        focusNodeId: null,
        hasSelection: false,
        activeMarks: [],
        activeBlockType: 'paragraph',
      }
    }

    // Determine active marks at cursor position
    const doc = engine._model.doc
    const anchorNode = findNodeById(doc, sel.anchorNodeId)
    const activeMarks = anchorNode?.marks?.map((m) => m.type) || []

    // Determine the block type of the current selection
    let activeBlockType = 'paragraph'
    let activeBlockAttrs = {}
    const block = engine._findBlockForTextNode(sel.anchorNodeId)
    if (block) {
      activeBlockType = block.type
      activeBlockAttrs = block.attrs || {}
    }

    return {
      ...sel,
      hasSelection: !sel.isCollapsed,
      activeMarks,
      activeBlockType,
      activeBlockAttrs,
    }
  }, [engine, version])
}
