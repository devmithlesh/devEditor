/**
 * @fileoverview useHistory hook — exposes canUndo/canRedo state.
 */

import { useMemo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

export function useHistory() {
  const engine = useEditorEngine()
  const version = useEditorVersion()

  return useMemo(() => ({
    canUndo: engine._historyManager?.canUndo() ?? false,
    canRedo: engine._historyManager?.canRedo() ?? false,
    undo: () => engine.undo(),
    redo: () => engine.redo(),
  }), [engine, version])
}
