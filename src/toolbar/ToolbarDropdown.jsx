/**
 * @fileoverview ToolbarDropdown — format select dropdown (Paragraph, Heading 1, etc.).
 * Also supports generic option dropdowns (font family, font size, etc.).
 * Features: dynamic label, checkmark on active item, font preview styling.
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { findParent } from '../utils/helpers.js'

// Helper functions for active state detection
function getAlignment(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null
  const block = engine.findBlockForTextNode(sel.anchorNodeId)
  if (!block) return null
  
  // Check if block is inside a listItem - alignment should be on the paragraph block, not listItem
  const parentInfo = findParent(engine._model.doc, block.id)
  if (parentInfo && parentInfo.parent.type === 'listItem') {
    // Alignment is on the paragraph block inside listItem
    return block.attrs?.textAlign || null
  }
  
  return block.attrs?.textAlign || null
}

function getCurrentListStyle(engine, listType) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return listType === 'bulletList' ? 'disc' : 'decimal'
  const block = engine.findBlockForTextNode(sel.anchorNodeId)
  if (!block) return listType === 'bulletList' ? 'disc' : 'decimal'
  const parentInfo = findParent(engine._model.doc, block.id)
  if (!parentInfo) return listType === 'bulletList' ? 'disc' : 'decimal'
  if (parentInfo.parent.type === 'listItem') {
    const listItemInfo = findParent(engine._model.doc, parentInfo.parent.id)
    if (listItemInfo && listItemInfo.parent.type === listType) {
      return listItemInfo.parent.attrs?.listStyleType || (listType === 'bulletList' ? 'disc' : 'decimal')
    }
  }
  return listType === 'bulletList' ? 'disc' : 'decimal'
}

/** Map font size pt values to scaled preview sizes for the dropdown */
const FONT_SIZE_PREVIEW = {
  '8pt': '10px', '10pt': '12px', '12pt': '13px', '14pt': '14px',
  '18pt': '16px', '24pt': '18px', '36pt': '22px', '48pt': '26px', '72pt': '32px',
}

/**
 * @param {{ 
 *   button: import('../types/plugin.types.js').ToolbarButtonDef,
 *   openDropdownId: string | null,
 *   onDropdownToggle: (id: string | null) => void
 * }} props
 */
export const ToolbarDropdown = memo(function ToolbarDropdown({ button, openDropdownId, onDropdownToggle }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const dropdownRef = useRef(null)
  
  // Use shared state to ensure only one dropdown is open at a time
  const isOpen = openDropdownId === button.name

  // For compact buttons (lists, alignment), show only icon + arrow, no label
  const isCompactButton = button.name === 'bullist' || button.name === 'numlist' || button.name === 'alignment'
  const label = isCompactButton ? '' : (button.getLabel ? button.getLabel(engine) : button.label || button.tooltip)

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
        onDropdownToggle(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onDropdownToggle])

  // Capture selection when mouse enters the button (before click)
  const handleTriggerMouseEnter = useCallback(() => {
    // Capture selection early to preserve it before click
    engine._selection?.captureSelection()
  }, [engine])

  const handleTriggerMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture selection again in case it changed
    engine._selection?.captureSelection()
    // Toggle: if already open, close; otherwise, open this one (closing any other)
    onDropdownToggle(isOpen ? null : button.name)
  }, [engine, isOpen, button.name, onDropdownToggle])

  const handleItemMouseDown = useCallback((e, value) => {
    e.preventDefault()
    e.stopPropagation()
    if (button.command) {
      try {
        // Restore the saved selection first
        engine._selection?.restoreSelection()
        // Execute command immediately - it will use the saved selection
        engine.executeCommand(button.command, value)
      } catch (err) {
        console.warn(`ToolbarDropdown: command "${button.command}" failed:`, err)
      }
    }
    onDropdownToggle(null) // Close dropdown after selection
  }, [engine, button.command, onDropdownToggle])

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
    // List style previews
    if (button.name === 'bullist' && item.preview) {
      return { listStyleType: item.preview }
    }
    if (button.name === 'numlist' && item.preview) {
      return { listStyleType: item.preview }
    }
    return undefined
  }

  // Render list preview for list dropdowns
  const renderListPreview = (item) => {
    if ((button.name === 'bullist' || button.name === 'numlist') && item.preview) {
      const listStyle = item.preview
      const isOrdered = button.name === 'numlist'
      
      if (isOrdered) {
        // Numbered list preview
        const markers = {
          'decimal': ['1.', '2.', '3.'],
          'lower-alpha': ['a.', 'b.', 'c.'],
          'upper-alpha': ['A.', 'B.', 'C.'],
          'lower-roman': ['i.', 'ii.', 'iii.'],
          'upper-roman': ['I.', 'II.', 'III.'],
          'lower-greek': ['α.', 'β.', 'γ.'],
        }
        const previewMarkers = markers[listStyle] || markers['decimal']
        
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '2px',
            fontSize: '11px',
            color: '#6b7280',
            fontFamily: 'inherit',
            marginRight: '4px'
          }}>
            {previewMarkers.map((marker, i) => (
              <span key={i} style={{ marginRight: i < previewMarkers.length - 1 ? '8px' : '0' }}>
                {marker}
              </span>
            ))}
          </span>
        )
      } else {
        // Bullet list preview
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '12px',
            color: '#6b7280',
            marginRight: '4px'
          }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ 
                display: 'inline-block',
                width: listStyle === 'circle' ? '6px' : listStyle === 'square' ? '6px' : '4px',
                height: listStyle === 'circle' ? '6px' : listStyle === 'square' ? '6px' : '4px',
                borderRadius: listStyle === 'circle' ? '50%' : listStyle === 'square' ? '0' : '50%',
                border: listStyle === 'circle' ? '1.5px solid currentColor' : 'none',
                backgroundColor: listStyle === 'circle' ? 'transparent' : 'currentColor',
              }} />
            ))}
          </span>
        )
      }
    }
    return null
  }

  return (
    <div className="de-toolbar-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`de-toolbar-dropdown-trigger${isCompactButton ? ' de-toolbar-dropdown-trigger--compact' : ''}${button.isActive && button.isActive(engine) ? ' de-toolbar-dropdown-trigger--active' : ''}`}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseDown={handleTriggerMouseDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={button.tooltip || button.label}
      >
        {button.icon && (
          <span className="de-toolbar-dropdown-icon" dangerouslySetInnerHTML={{ __html: button.icon }} />
        )}
        {!isCompactButton && label && (
          <span className="de-toolbar-dropdown-label">{label}</span>
        )}
        <span className="de-toolbar-dropdown-arrow">&#9662;</span>
      </button>

      {isOpen && items.length > 0 && (
        <div className={`de-toolbar-dropdown-menu${button.name === 'bullist' || button.name === 'numlist' ? ' de-toolbar-dropdown-menu--list' : ''}`} role="listbox">
          {items.map((item) => {
            // Check if item is active
            let isActive = false
            if (button.name === 'alignment') {
              // For alignment, compare current alignment value with item value
              const currentAlign = getAlignment(engine)
              isActive = currentAlign === item.value
            } else if (button.name === 'bullist') {
              // For bullet list, compare current style with item value
              const currentStyle = getCurrentListStyle(engine, 'bulletList')
              isActive = currentStyle === item.value
            } else if (button.name === 'numlist') {
              // For numbered list, compare current style with item value
              const currentStyle = getCurrentListStyle(engine, 'orderedList')
              isActive = currentStyle === item.value
            } else {
              isActive = label === item.label || (button.getLabel && button.getLabel(engine) === item.label)
            }
            const preview = renderListPreview(item)
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
                {item.icon && (
                  <span className="de-toolbar-dropdown-item-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                )}
                {preview ? (
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'flex-start' }}>
                    {preview}
                    <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {item.label}
                    </span>
                  </span>
                ) : (
                  <span>{item.label}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})
