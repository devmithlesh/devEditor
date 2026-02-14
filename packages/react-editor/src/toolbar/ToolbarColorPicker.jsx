/**
 * @fileoverview ToolbarColorPicker — a color picker button for the toolbar.
 * Shows a grid of colors in a dropdown popup.
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'
import { Tooltip } from './Tooltip.jsx'

export const ToolbarColorPicker = memo(function ToolbarColorPicker({ button }) {
  const engine = useEditorEngine()
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleTriggerMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture selection when opening picker so it's preserved for the command
    engine._selection?.captureSelection()
    setIsOpen((prev) => !prev)
  }, [engine])

  const handleColorSelect = useCallback((e, color) => {
    e.preventDefault()
    e.stopPropagation()
    if (button.command && engine._commandRegistry) {
      engine._selection?.captureSelection()
      engine._commandRegistry.execute(button.command, color)
      engine.focus()
    }
    setIsOpen(false)
  }, [engine, button.command])

  const colors = button.colors || []

  return (
    <div className="de-toolbar-colorpicker" ref={pickerRef}>
      <Tooltip label={button.tooltip}>
        <button
          type="button"
          className="de-toolbar-btn"
          onMouseDown={handleTriggerMouseDown}
          aria-label={button.tooltip}
          aria-haspopup="true"
          aria-expanded={isOpen}
          dangerouslySetInnerHTML={{ __html: button.icon }}
        />
      </Tooltip>

      {isOpen && (
        <div className="de-colorpicker-dropdown">
          <div className="de-colorpicker-grid">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="de-colorpicker-swatch"
                style={{ backgroundColor: color }}
                title={color}
                onMouseDown={(e) => handleColorSelect(e, color)}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
