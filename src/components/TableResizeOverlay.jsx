/**
 * @fileoverview TableResizeOverlay — handles table column width, row height,
 * and overall table width resizing via drag handles.
 * Also shows a table selection gripper at the top-left corner.
 *
 * Architecture:
 * - Listens for mousemove on the content area to detect hover near column/row borders
 * - Shows a resize indicator line when hovering near a border
 * - On drag, adjusts column widths or row heights with live preview
 * - Commits changes to the document model on mouseup
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

const BORDER_DETECT_THRESHOLD = 5 // px threshold for detecting border hover
const MIN_COL_WIDTH = 5 // minimum column width in percentage
const MIN_ROW_HEIGHT = 24 // minimum row height in px

export function TableResizeOverlay({ contentRef }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const [resizeIndicator, setResizeIndicator] = useState(null)
  const [tableGrippers, setTableGrippers] = useState([])
  const isDragging = useRef(false)
  const dragInfo = useRef(null)

  // Compute gripper positions for all tables
  const updateGrippers = useCallback(() => {
    if (!engine || !contentRef?.current) { setTableGrippers([]); return }
    const container = engine.getContainer()
    if (!container) { setTableGrippers([]); return }

    const tables = container.querySelectorAll('table[data-node-id]')
    const contentEl = contentRef.current
    const contentRect = contentEl.getBoundingClientRect()
    const grippers = []

    tables.forEach(tableEl => {
      const tableRect = tableEl.getBoundingClientRect()
      grippers.push({
        nodeId: tableEl.getAttribute('data-node-id'),
        top: tableRect.top - contentRect.top + contentEl.scrollTop - 14,
        left: tableRect.left - contentRect.left + contentEl.scrollLeft - 14,
      })
    })
    setTableGrippers(grippers)
  }, [engine, contentRef])

  useEffect(() => {
    updateGrippers()
  }, [version, updateGrippers])

  useEffect(() => {
    const el = contentRef?.current
    if (!el) return
    el.addEventListener('scroll', updateGrippers)
    const observer = new ResizeObserver(updateGrippers)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', updateGrippers)
      observer.disconnect()
    }
  }, [contentRef, updateGrippers])

  // Handle table gripper click — select the table
  const handleGripperClick = useCallback((e, nodeId) => {
    e.preventDefault()
    e.stopPropagation()
    engine.setSelectedElement(nodeId, 'table')
  }, [engine])

  // Detect column/row border hover on the content area
  useEffect(() => {
    const contentEl = contentRef?.current
    if (!contentEl || !engine) return
    const container = engine.getContainer()
    if (!container) return

    const onMouseMove = (e) => {
      if (isDragging.current) return

      const tables = container.querySelectorAll('table[data-node-id]')
      let found = null

      for (const tableEl of tables) {
        const firstRow = tableEl.querySelector('tr')
        if (!firstRow) continue
        const cells = firstRow.querySelectorAll('td[data-node-id], th[data-node-id]')

        // Check column borders (right edge of each cell except last)
        for (let i = 0; i < cells.length - 1; i++) {
          const cellRect = cells[i].getBoundingClientRect()
          const borderX = cellRect.right
          if (Math.abs(e.clientX - borderX) <= BORDER_DETECT_THRESHOLD) {
            const tableRect = tableEl.getBoundingClientRect()
            const cRect = contentEl.getBoundingClientRect()
            found = {
              type: 'col',
              tableEl,
              colIndex: i,
              x: borderX - cRect.left + contentEl.scrollLeft,
              top: tableRect.top - cRect.top + contentEl.scrollTop,
              height: tableRect.height,
            }
            break
          }
        }
        if (found) break

        // Check row borders (bottom edge of each row except last)
        const rows = tableEl.querySelectorAll('tr')
        for (let i = 0; i < rows.length - 1; i++) {
          const rowRect = rows[i].getBoundingClientRect()
          const borderY = rowRect.bottom
          if (Math.abs(e.clientY - borderY) <= BORDER_DETECT_THRESHOLD) {
            const tableRect = tableEl.getBoundingClientRect()
            const cRect = contentEl.getBoundingClientRect()
            found = {
              type: 'row',
              tableEl,
              rowIndex: i,
              y: borderY - cRect.top + contentEl.scrollTop,
              left: tableRect.left - cRect.left + contentEl.scrollLeft,
              width: tableRect.width,
            }
            break
          }
        }
        if (found) break

        // Check table right edge for table width resize
        const tableRect = tableEl.getBoundingClientRect()
        if (Math.abs(e.clientX - tableRect.right) <= BORDER_DETECT_THRESHOLD &&
            e.clientY >= tableRect.top && e.clientY <= tableRect.bottom) {
          const cRect = contentEl.getBoundingClientRect()
          found = {
            type: 'tableWidth',
            tableEl,
            x: tableRect.right - cRect.left + contentEl.scrollLeft,
            top: tableRect.top - cRect.top + contentEl.scrollTop,
            height: tableRect.height,
          }
          break
        }
      }

      setResizeIndicator(found)
    }

    container.addEventListener('mousemove', onMouseMove)
    return () => container.removeEventListener('mousemove', onMouseMove)
  }, [engine, contentRef, version])

  // Handle resize drag start
  const handleResizeMouseDown = useCallback((e) => {
    if (!resizeIndicator || !engine) return
    e.preventDefault()
    e.stopPropagation()

    isDragging.current = true
    engine._isResizing = true
    const { type, tableEl, colIndex, rowIndex } = resizeIndicator
    const tableNodeId = tableEl.getAttribute('data-node-id')
    const startX = e.clientX
    const startY = e.clientY

    if (type === 'col') {
      // Get current column widths from cell widths
      const firstRow = tableEl.querySelector('tr')
      const cells = firstRow.querySelectorAll('td, th')
      const tableWidth = tableEl.offsetWidth
      const colWidths = Array.from(cells).map(c => (c.offsetWidth / tableWidth) * 100)

      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX
        const dxPercent = (dx / tableWidth) * 100

        const newLeft = Math.max(MIN_COL_WIDTH, colWidths[colIndex] + dxPercent)
        const newRight = Math.max(MIN_COL_WIDTH, colWidths[colIndex + 1] - dxPercent)

        // Live preview: update <col> elements if they exist
        const cols = tableEl.querySelectorAll('colgroup col')
        if (cols.length > 0) {
          cols[colIndex].style.width = `${newLeft}%`
          cols[colIndex + 1].style.width = `${newRight}%`
        } else {
          // Fallback: set widths on first row cells
          cells[colIndex].style.width = `${newLeft}%`
          cells[colIndex + 1].style.width = `${newRight}%`
        }

        // Update indicator position
        const contentEl = contentRef.current
        if (contentEl) {
          const cellRect = cells[colIndex].getBoundingClientRect()
          const cRect = contentEl.getBoundingClientRect()
          setResizeIndicator(prev => prev ? {
            ...prev,
            x: cellRect.right - cRect.left + contentEl.scrollLeft,
          } : null)
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        isDragging.current = false
        engine._isResizing = false

        // Compute final widths
        const finalCells = firstRow.querySelectorAll('td, th')
        const finalWidths = Array.from(finalCells).map(c =>
          Math.round((c.offsetWidth / tableEl.offsetWidth) * 10000) / 100
        )

        // Commit to model
        if (engine._historyManager) {
          engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
        }
        const tableNode = findNodeInDoc(engine._model.doc, tableNodeId)
        if (tableNode) {
          if (!tableNode.attrs) tableNode.attrs = {}
          tableNode.attrs.colWidths = finalWidths
        }
        engine._reconcile()
        engine._bumpVersion()
        setResizeIndicator(null)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

    } else if (type === 'row') {
      const rows = tableEl.querySelectorAll('tr')
      const startHeight = rows[rowIndex].offsetHeight

      const onMouseMove = (ev) => {
        const dy = ev.clientY - startY
        const newHeight = Math.max(MIN_ROW_HEIGHT, startHeight + dy)
        rows[rowIndex].style.height = `${newHeight}px`

        // Update indicator position
        const contentEl = contentRef.current
        if (contentEl) {
          const rowRect = rows[rowIndex].getBoundingClientRect()
          const cRect = contentEl.getBoundingClientRect()
          setResizeIndicator(prev => prev ? {
            ...prev,
            y: rowRect.bottom - cRect.top + contentEl.scrollTop,
          } : null)
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        isDragging.current = false
        engine._isResizing = false

        const finalHeight = rows[rowIndex].offsetHeight

        if (engine._historyManager) {
          engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
        }
        const tableNode = findNodeInDoc(engine._model.doc, tableNodeId)
        if (tableNode && tableNode.content && tableNode.content[rowIndex]) {
          if (!tableNode.content[rowIndex].attrs) tableNode.content[rowIndex].attrs = {}
          tableNode.content[rowIndex].attrs.height = Math.round(finalHeight)
        }
        engine._reconcile()
        engine._bumpVersion()
        setResizeIndicator(null)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

    } else if (type === 'tableWidth') {
      const startWidth = tableEl.offsetWidth
      const contentEl = contentRef.current
      const contentWidth = contentEl?.offsetWidth || startWidth

      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX
        const newWidth = Math.max(200, startWidth + dx)
        const widthPercent = Math.min(100, Math.round((newWidth / contentWidth) * 100))
        tableEl.style.width = `${widthPercent}%`

        if (contentEl) {
          const tableRect = tableEl.getBoundingClientRect()
          const cRect = contentEl.getBoundingClientRect()
          setResizeIndicator(prev => prev ? {
            ...prev,
            x: tableRect.right - cRect.left + contentEl.scrollLeft,
          } : null)
        }
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        isDragging.current = false
        engine._isResizing = false

        const finalWidth = Math.min(100, Math.round((tableEl.offsetWidth / contentWidth) * 100))

        if (engine._historyManager) {
          engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
        }
        const tableNode = findNodeInDoc(engine._model.doc, tableNodeId)
        if (tableNode) {
          if (!tableNode.attrs) tableNode.attrs = {}
          tableNode.attrs.width = `${finalWidth}%`
        }
        engine._reconcile()
        engine._bumpVersion()
        setResizeIndicator(null)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
  }, [resizeIndicator, engine, contentRef])

  // Determine cursor for the indicator
  const getCursor = () => {
    if (!resizeIndicator) return 'default'
    if (resizeIndicator.type === 'col' || resizeIndicator.type === 'tableWidth') return 'col-resize'
    if (resizeIndicator.type === 'row') return 'row-resize'
    return 'default'
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 4 }}>
      {/* Table selection grippers */}
      {tableGrippers.map(g => (
        <div
          key={g.nodeId}
          title="Select table"
          style={{
            position: 'absolute',
            top: g.top,
            left: g.left,
            width: 14,
            height: 14,
            background: '#2563eb',
            borderRadius: '2px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 'bold',
            lineHeight: 1,
            opacity: 0.8,
          }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          onClick={(e) => handleGripperClick(e, g.nodeId)}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect x="0" y="0" width="3" height="3" fill="white"/>
            <rect x="5" y="0" width="3" height="3" fill="white"/>
            <rect x="0" y="5" width="3" height="3" fill="white"/>
            <rect x="5" y="5" width="3" height="3" fill="white"/>
          </svg>
        </div>
      ))}

      {/* Column resize indicator line */}
      {resizeIndicator && resizeIndicator.type === 'col' && (
        <div
          style={{
            position: 'absolute',
            top: resizeIndicator.top,
            left: resizeIndicator.x - 1,
            width: 3,
            height: resizeIndicator.height,
            background: '#2563eb',
            cursor: 'col-resize',
            pointerEvents: 'auto',
            opacity: 0.6,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Row resize indicator line */}
      {resizeIndicator && resizeIndicator.type === 'row' && (
        <div
          style={{
            position: 'absolute',
            top: resizeIndicator.y - 1,
            left: resizeIndicator.left,
            width: resizeIndicator.width,
            height: 3,
            background: '#2563eb',
            cursor: 'row-resize',
            pointerEvents: 'auto',
            opacity: 0.6,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}

      {/* Table width resize indicator */}
      {resizeIndicator && resizeIndicator.type === 'tableWidth' && (
        <div
          style={{
            position: 'absolute',
            top: resizeIndicator.top,
            left: resizeIndicator.x - 2,
            width: 5,
            height: resizeIndicator.height,
            background: '#2563eb',
            cursor: 'col-resize',
            pointerEvents: 'auto',
            opacity: 0.6,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  )
}

function findNodeInDoc(doc, id) {
  if (!doc) return null
  function walk(node) {
    if (node.id === id) return node
    if (node.content) {
      for (const child of node.content) {
        const found = walk(child)
        if (found) return found
      }
    }
    return null
  }
  return walk(doc)
}
