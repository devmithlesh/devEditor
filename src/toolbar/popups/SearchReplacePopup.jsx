/**
 * @fileoverview SearchReplacePopup — popup for find and replace functionality.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

export function SearchReplacePopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const findInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setFindText('')
      setReplaceText('')
      setTimeout(() => findInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleReplace = useCallback(() => {
    if (!findText) return
    const html = engine.getContent()
    const newHtml = html.replace(findText, replaceText)
    engine.setContent(newHtml)
  }, [engine, findText, replaceText])

  const handleReplaceAll = useCallback(() => {
    if (!findText) return
    const html = engine.getContent()
    const newHtml = html.split(findText).join(replaceText)
    engine.setContent(newHtml)
  }, [engine, findText, replaceText])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleReplace()
    } else if (e.key === 'Enter' && e.ctrlKey && e.shiftKey) {
      e.preventDefault()
      handleReplaceAll()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [handleReplace, handleReplaceAll, onClose])

  return (
    <ToolbarPopup
      anchorRef={anchorRef}
      isOpen={isOpen}
      onClose={onClose}
      className="de-search-replace-popup"
      width={400}
    >
      <div className="de-popup-header">
        <span>Find and Replace</span>
        <button 
          className="de-popup-close" 
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          &times;
        </button>
      </div>
      <div className="de-popup-field">
        <label>Find:</label>
        <input
          ref={findInputRef}
          type="text"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find..."
        />
      </div>
      <div className="de-popup-field">
        <label>Replace:</label>
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Replace..."
        />
      </div>
      <div className="de-popup-actions">
        <button
          type="button"
          className="de-popup-btn de-popup-btn--primary"
          onClick={(e) => {
            e.stopPropagation()
            handleReplace()
          }}
          disabled={!findText}
        >
          Replace
        </button>
        <button
          type="button"
          className="de-popup-btn de-popup-btn--primary"
          onClick={(e) => {
            e.stopPropagation()
            handleReplaceAll()
          }}
          disabled={!findText}
        >
          Replace All
        </button>
        <button
          type="button"
          className="de-popup-btn"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          Close
        </button>
      </div>
    </ToolbarPopup>
  )
}
