/**
 * @fileoverview EditorContent — the contentEditable surface.
 * Attaches the EditorEngine to a real DOM element.
 */

import { useRef, useEffect, useCallback } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'

/**
 * @param {{ style?: Object, onBlur?: function, placeholder?: string, spellCheck?: boolean }} props
 */
export function EditorContent({ style, onBlur, placeholder, spellCheck = true }) {
  const engine = useEditorEngine()
  const contentRef = useRef(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    engine.attach(el)

    // Render initial content
    const doc = engine.getDoc()
    if (doc && doc.content) {
      engine._reconcile()
    }

    return () => {
      engine.detach()
    }
  }, [engine])

  const handleBlur = useCallback((e) => {
    if (onBlur) onBlur(e)
  }, [onBlur])

  return (
    <div
      ref={contentRef}
      className="de-content"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Rich text editor"
      data-placeholder={placeholder || 'Start typing...'}
      style={style}
      onBlur={handleBlur}
      spellCheck={spellCheck}
    />
  )
}
