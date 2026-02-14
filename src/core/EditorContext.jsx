/**
 * @fileoverview React context for the editor engine.
 * Components consume the engine via useEditorEngine().
 * useEditorVersion() triggers re-renders when the engine state changes.
 */

import { createContext, useContext, useSyncExternalStore } from 'react'

const EditorEngineContext = createContext(null)

/**
 * Provider wrapping the editor components.
 * @param {{ engine: import('./EditorEngine.js').EditorEngine, children: React.ReactNode }} props
 */
export function EditorProvider({ engine, children }) {
  return (
    <EditorEngineContext.Provider value={engine}>
      {children}
    </EditorEngineContext.Provider>
  )
}

/**
 * Hook to access the editor engine instance.
 * @returns {import('./EditorEngine.js').EditorEngine}
 */
export function useEditorEngine() {
  const engine = useContext(EditorEngineContext)
  if (!engine) {
    throw new Error('useEditorEngine must be used within an EditorProvider')
  }
  return engine
}

/**
 * Hook that returns the engine version counter.
 * This triggers a React re-render whenever the editor state changes
 * (text input, formatting, selection change, etc.).
 * @returns {number}
 */
export function useEditorVersion() {
  const engine = useEditorEngine()

  return useSyncExternalStore(
    (callback) => engine.subscribe(callback),
    () => engine.getVersion(),
  )
}
