/**
 * @fileoverview ToolbarDropdown — format select dropdown (Paragraph, Heading 1, etc.).
 * Also supports generic option dropdowns (font family, font size, etc.).
 * Features: dynamic label, checkmark on active item, font preview styling.
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

/** Map font size pt values to scaled preview sizes for the dropdown */
const FONT_SIZE_PREVIEW = {
  '8pt': '10px', '10pt': '12px', '12pt': '13px', '14pt': '14px',
  '18pt': '16px', '24pt': '18px', '36pt': '22px', '48pt': '26px', '72pt': '32px',
}

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

  // Compute per-item inline styles for preview
  const getItemStyle = (item) => {
    if (button.name === 'fontfamily') {
      return { fontFamily: item.value }
    }
    if (button.name === 'fontsize') {
      return { fontSize: FONT_SIZE_PREVIEW[item.value] || '13px' }
    }
    if (button.name === 'formatselect') {
      if (item.value?.startsWith('heading')) {
        const level = parseInt(item.value.replace('heading', '')) || 1
        const sizes = { 1: '22px', 2: '18px', 3: '16px', 4: '14px', 5: '13px', 6: '12px' }
        return { fontSize: sizes[level] || '13px', fontWeight: '600' }
      }
      if (item.value === 'blockquote') return { fontStyle: 'italic', color: '#6b7280' }
      if (item.value === 'codeBlock') return { fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px' }
    }
    return undefined
  }

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
          {items.map((item) => {
            const isActive = label === item.label
            return (
              <button
                key={item.value}
                type="button"
                className={`de-toolbar-dropdown-item${isActive ? ' de-toolbar-dropdown-item--active' : ''}`}
                onMouseDown={(e) => handleItemMouseDown(e, item.value)}
                role="option"
                aria-selected={isActive}
                style={getItemStyle(item)}
              >
                <span className="de-toolbar-dropdown-check">
                  {isActive ? '\u2713' : ''}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})
