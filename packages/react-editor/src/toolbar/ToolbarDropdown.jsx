/**
 * @fileoverview ToolbarDropdown — format select dropdown (Paragraph, Heading 1, etc.).
 * Also supports generic option dropdowns (font family, font size, etc.).
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

/**
 * @param {{ button: import('../types/plugin.types.js').ToolbarButtonDef }} props
 */
export const ToolbarDropdown = memo(function ToolbarDropdown({ button }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const label = button.getLabel ? button.getLabel(engine) : button.label || button.tooltip

  // Resolve items: support both `dropdownItems` and `options` formats
  const items = button.dropdownItems || (button.options || []).map((opt) => ({
    label: opt.label,
    value: opt.value,
  }))

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleTriggerMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture selection when opening dropdown so it's preserved for the command
    engine._selection?.captureSelection()
    setIsOpen((prev) => !prev)
  }, [engine])

  const handleItemMouseDown = useCallback((e, value) => {
    e.preventDefault()
    e.stopPropagation()
    if (button.command) {
      try {
        engine._selection?.restoreSelection()
        engine.executeCommand(button.command, value)
      } catch (err) {
        console.warn(`ToolbarDropdown: command "${button.command}" failed:`, err)
      }
    }
    setIsOpen(false)
  }, [engine, button.command])

  return (
    <div className="de-toolbar-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="de-toolbar-dropdown-trigger"
        onMouseDown={handleTriggerMouseDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="de-toolbar-dropdown-label">{label}</span>
        <span className="de-toolbar-dropdown-arrow">&#9662;</span>
      </button>

      {isOpen && items.length > 0 && (
        <div className="de-toolbar-dropdown-menu" role="listbox">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`de-toolbar-dropdown-item${label === item.label ? ' de-toolbar-dropdown-item--active' : ''}`}
              onMouseDown={(e) => handleItemMouseDown(e, item.value)}
              role="option"
              aria-selected={label === item.label}
              style={button.name === 'fontfamily' ? { fontFamily: item.value } : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
