/**
 * @fileoverview EditorContent — the contentEditable surface.
 * Attaches the EditorEngine to a real DOM element.
 */

import { useRef, useEffect, useCallback, useState, forwardRef } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

/**
 * @param {{ style?: Object, onBlur?: function, placeholder?: string, spellCheck?: boolean }} props
 */
export const EditorContent = forwardRef(function EditorContent({ style, onBlur, placeholder, spellCheck = true }, externalRef) {
  const engine = useEditorEngine()
  const version = useEditorVersion() // Re-render when content changes
  const internalRef = useRef(null)
  const contentRef = externalRef || internalRef
  const [isFocused, setIsFocused] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const el = contentRef.current
    if (!el || !engine) return

    engine.attach(el)

    // Render initial content after attachment
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const doc = engine.getDoc()
      if (doc && doc.content && doc.content.length > 0) {
        engine._reconcile()
        // Restore cursor position if needed
        if (engine._selection) {
          engine._selection.restoreSelection()
        }
      }
    })

    return () => {
      engine.detach()
    }
  }, [engine])

  // Check if editor is empty
  useEffect(() => {
    if (!engine) return
    
    const checkEmpty = () => {
      const doc = engine.getDoc()
      if (!doc || !doc.content || doc.content.length === 0) {
        setIsEmpty(true)
        return
      }
      
      // Check if all content is empty (only empty paragraphs with empty text nodes)
      const hasContent = doc.content.some(block => {
        if (!block.content || block.content.length === 0) return false
        return block.content.some(node => {
          if (node.type === 'text') {
            return node.text && node.text.trim().length > 0
          }
          return true // Non-text nodes count as content
        })
      })
      
      setIsEmpty(!hasContent)
    }
    
    checkEmpty()
  }, [engine, version])

  const handleBlur = useCallback((e) => {
    setIsFocused(false)
    if (onBlur) onBlur(e)
  }, [onBlur])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  return (
    <div
      ref={contentRef}
      className={`de-content ${isEmpty && !isFocused ? 'de-content--empty' : ''}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Rich text editor"
      data-placeholder={placeholder || 'Start typing...'}
      style={style}
      onBlur={handleBlur}
      onFocus={handleFocus}
      spellCheck={spellCheck}
    />
  )
})
