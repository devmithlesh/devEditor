/**
 * @fileoverview ImagePopup — floating panel for inserting images.
 */

import { useState, useRef, useEffect } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

export function ImagePopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const srcInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSrc('')
      setAlt('')
      setTimeout(() => srcInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleInsert = () => {
    if (!src) return
    engine._selection?.restoreSelection()
    engine.executeCommand('insertImage', src, alt)
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
        <span>Insert Image</span>
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
        <label>Image URL</label>
        <input
          ref={srcInputRef}
          type="url"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/image.png"
        />
      </div>
      <div className="de-popup-field">
        <label>Alt text (optional)</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Image description"
        />
      </div>
      <div className="de-popup-actions">
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
          Insert
        </button>
      </div>
    </ToolbarPopup>
  )
}
