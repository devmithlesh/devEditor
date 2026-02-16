/**
 * @fileoverview LinkPopup — floating panel for inserting/editing links.
 */

import { useState, useEffect, useRef } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'
import { findNodeById } from '../../utils/helpers.js'

export function LinkPopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [url, setUrl] = useState('https://')
  const [text, setText] = useState('')
  const [hasExistingLink, setHasExistingLink] = useState(false)
  const urlInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    // Pre-fill from existing link
    const sel = engine._selection?.getSavedSelection()
    if (sel) {
      const node = findNodeById(engine._model.doc, sel.anchorNodeId)
      const linkMark = node?.marks?.find((m) => m.type === 'link')
      if (linkMark) {
        setUrl(linkMark.attrs?.href || 'https://')
        setHasExistingLink(true)
      } else {
        setUrl('https://')
        setHasExistingLink(false)
      }
      // Get selected text
      if (!sel.isCollapsed) {
        const selText = window.getSelection()?.toString() || ''
        setText(selText)
      } else {
        setText('')
      }
    }
    // Focus URL input
    setTimeout(() => urlInputRef.current?.focus(), 50)
  }, [isOpen, engine])

  const handleInsert = () => {
    if (!url || url === 'https://') return
    try {
      engine.executeCommand('insertLink', url, text || undefined)
    } catch (err) {
      console.warn('LinkPopup: insertLink failed:', err)
    }
    onClose()
  }

  const handleRemove = () => {
    try {
      engine.executeCommand('unlink')
    } catch (err) {
      console.warn('LinkPopup: unlink failed:', err)
    }
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleInsert()
    }
  }

  return (
    <ToolbarPopup anchorRef={anchorRef} isOpen={isOpen} onClose={onClose} width={320}>
      <div className="de-popup-header">
        <span>{hasExistingLink ? 'Edit Link' : 'Insert Link'}</span>
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
        <label>URL</label>
        <input
          ref={urlInputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
        />
      </div>
      <div className="de-popup-field">
        <label>Text (optional)</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Link text"
        />
      </div>
      <div className="de-popup-actions">
        {hasExistingLink && (
          <button 
            className="de-popup-btn de-popup-btn--danger" 
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
          >
            Remove
          </button>
        )}
        <button 
          className="de-popup-btn" 
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          Cancel
        </button>
        <button 
          className="de-popup-btn de-popup-btn--primary" 
          onClick={(e) => {
            e.stopPropagation()
            handleInsert()
          }}
        >
          {hasExistingLink ? 'Update' : 'Insert'}
        </button>
      </div>
    </ToolbarPopup>
  )
}
