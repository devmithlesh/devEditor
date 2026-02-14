/**
 * @fileoverview TableGridPopup — popup with NxN grid for inserting tables from toolbar.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'

const GRID_SIZE = 10

export function TableGridPopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)
  const popupRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose, anchorRef])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleCellMouseDown = useCallback((e, r, c) => {
    e.preventDefault()
    e.stopPropagation()
    // Focus the editor container first so selection restoration works
    engine.getContainer()?.focus({ preventScroll: true })
    engine._selection?.restoreSelection()
    engine.executeCommand('insertTable', r + 1, c + 1)
    onClose()
  }, [engine, onClose])

  if (!isOpen) return null

  const cells = []
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isActive = r <= hoverRow && c <= hoverCol
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={`de-table-grid-cell${isActive ? ' de-table-grid-cell--active' : ''}`}
          onMouseEnter={() => { setHoverRow(r); setHoverCol(c) }}
          onMouseDown={(e) => handleCellMouseDown(e, r, c)}
        />
      )
    }
  }

  return (
    <div ref={popupRef} className="de-toolbar-popup" style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 1000, padding: '8px' }}>
      <div className="de-table-grid">
        {cells}
      </div>
      <div className="de-table-grid-label">
        {hoverRow + 1} x {hoverCol + 1}
      </div>
    </div>
  )
}
