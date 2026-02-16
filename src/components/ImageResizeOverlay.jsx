/**
 * @fileoverview ImageResizeOverlay — renders corner resize handles over a selected image.
 * Positioned absolutely on top of the contentEditable area.
 * Handles drag-to-resize with aspect ratio preservation and live preview.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

const HANDLE_SIZE = 10

/**
 * @param {{ contentRef: React.RefObject<HTMLElement> }} props
 */
export function ImageResizeOverlay({ contentRef }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const [rect, setRect] = useState(null)
  const dragRef = useRef(null)
  const overlayRef = useRef(null)

  // Compute the selected image's bounding rect relative to the overlay container
  const updateRect = useCallback(() => {
    if (!engine || !contentRef?.current) {
      setRect(null)
      return
    }
    const { id, type } = engine.getSelectedElement()
    if (type !== 'image' || !id) {
      setRect(null)
      return
    }
    const container = engine.getContainer()
    if (!container) { setRect(null); return }
    const imgEl = container.querySelector(`[data-node-id="${id}"]`)
    if (!imgEl) { setRect(null); return }

    const contentEl = contentRef.current
    const contentRect = contentEl.getBoundingClientRect()
    const imgRect = imgEl.getBoundingClientRect()

    setRect({
      top: imgRect.top - contentRect.top + contentEl.scrollTop,
      left: imgRect.left - contentRect.left + contentEl.scrollLeft,
      width: imgRect.width,
      height: imgRect.height,
    })
  }, [engine, contentRef])

  // Re-position handles when version changes (after reconcile) or on scroll/resize
  useEffect(() => {
    updateRect()
  }, [version, updateRect])

  useEffect(() => {
    const el = contentRef?.current
    if (!el) return
    el.addEventListener('scroll', updateRect)
    const observer = new ResizeObserver(updateRect)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', updateRect)
      observer.disconnect()
    }
  }, [contentRef, updateRect])

  const handleMouseDown = useCallback((e, corner) => {
    e.preventDefault()
    e.stopPropagation()

    const { id } = engine.getSelectedElement()
    if (!id) return
    const container = engine.getContainer()
    const imgEl = container?.querySelector(`[data-node-id="${id}"]`)
    if (!imgEl) return

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = imgEl.offsetWidth
    const startHeight = imgEl.offsetHeight
    const aspectRatio = startWidth / startHeight

    engine._isResizing = true

    const onMouseMove = (ev) => {
      let dx = ev.clientX - startX
      let dy = ev.clientY - startY

      // Determine direction multipliers based on corner
      const xMul = corner.includes('w') ? -1 : 1
      const yMul = corner.includes('n') ? -1 : 1

      // Use the dominant axis change, lock aspect ratio
      let newWidth = startWidth + dx * xMul
      newWidth = Math.max(30, newWidth)
      let newHeight = newWidth / aspectRatio

      // Live preview by directly setting style on the DOM element
      imgEl.style.width = `${Math.round(newWidth)}px`
      imgEl.style.height = `${Math.round(newHeight)}px`

      // Update overlay rect for handles
      const contentEl = contentRef.current
      if (contentEl) {
        const contentRect = contentEl.getBoundingClientRect()
        const imgRect = imgEl.getBoundingClientRect()
        setRect({
          top: imgRect.top - contentRect.top + contentEl.scrollTop,
          left: imgRect.left - contentRect.left + contentEl.scrollLeft,
          width: imgRect.width,
          height: imgRect.height,
        })
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      engine._isResizing = false

      // Commit final dimensions to the model
      const finalWidth = Math.round(imgEl.offsetWidth)
      const finalHeight = Math.round(imgEl.offsetHeight)

      if (engine._historyManager) {
        engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
      }

      const node = findNodeInDoc(engine._model.doc, id)
      if (node) {
        if (!node.attrs) node.attrs = {}
        node.attrs.width = finalWidth
        node.attrs.height = finalHeight
      }

      engine._reconcile()
      engine._bumpVersion()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [engine, contentRef])

  if (!rect) return null

  const corners = ['nw', 'ne', 'sw', 'se']
  const cursorMap = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
      }}
    >
      {/* Dimension label */}
      <div
        style={{
          position: 'absolute',
          top: rect.top + rect.height + 4,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {Math.round(rect.width)} x {Math.round(rect.height)}
      </div>

      {/* Corner resize handles */}
      {corners.map((corner) => {
        const isTop = corner.includes('n')
        const isLeft = corner.includes('w')
        return (
          <div
            key={corner}
            style={{
              position: 'absolute',
              top: isTop ? rect.top - HANDLE_SIZE / 2 : rect.top + rect.height - HANDLE_SIZE / 2,
              left: isLeft ? rect.left - HANDLE_SIZE / 2 : rect.left + rect.width - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: '#2563eb',
              border: '1px solid #fff',
              borderRadius: '2px',
              cursor: cursorMap[corner],
              pointerEvents: 'auto',
              zIndex: 10,
            }}
            onMouseDown={(e) => handleMouseDown(e, corner)}
          />
        )
      })}
    </div>
  )
}

/** Find a node in the document tree by ID */
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
