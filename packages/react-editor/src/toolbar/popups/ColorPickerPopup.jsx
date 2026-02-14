/**
 * @fileoverview ColorPickerPopup — floating panel with color grid and custom input.
 * Used by both forecolor and backcolor toolbar buttons.
 *
 * The popup stays open after selecting a color. It only closes when:
 * - User clicks outside the popup
 * - User clicks the trigger button again
 * - User presses Escape
 * - User clicks the × close button
 */

import { useState, useRef, useCallback } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

const DEFAULT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
]

export function ColorPickerPopup({ anchorRef, isOpen, onClose, command, title }) {
  const engine = useEditorEngine()
  const [customColor, setCustomColor] = useState('#000000')

  const applyColor = useCallback((color) => {
    if (!command) return
    engine._selection?.restoreSelection()
    engine.executeCommand(command, color)
  }, [command, engine])

  const handleSwatchClick = useCallback((color) => {
    setCustomColor(color)
    applyColor(color)
  }, [applyColor])

  const handleCustomApply = useCallback(() => {
    if (customColor) {
      applyColor(customColor)
    }
  }, [customColor, applyColor])

  return (
    <ToolbarPopup anchorRef={anchorRef} isOpen={isOpen} onClose={onClose} width={240}>
      <div className="de-popup-header">
        <span>{title || 'Pick a Color'}</span>
        <button className="de-popup-close" onClick={onClose}>&times;</button>
      </div>
      <div className="de-colorpicker-grid">
        {DEFAULT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="de-colorpicker-swatch"
            style={{ backgroundColor: color }}
            title={color}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onClick={() => handleSwatchClick(color)}
            aria-label={color}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
        <input
          type="color"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          style={{ width: '32px', height: '28px', border: 'none', padding: 0, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          style={{
            flex: 1, padding: '4px 6px', border: '1px solid #d1d5db',
            borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace',
          }}
        />
        <button className="de-popup-btn de-popup-btn--primary" onClick={handleCustomApply}
          style={{ padding: '4px 10px', fontSize: '12px' }}>
          Apply
        </button>
      </div>
    </ToolbarPopup>
  )
}
