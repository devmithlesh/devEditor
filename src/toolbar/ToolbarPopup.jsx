/**
 * @fileoverview ToolbarPopup — reusable portal-based floating panel.
 * Positions itself below an anchor element, closes on outside click/Escape.
 * Preserves editor selection while open.
 *
 * Closing behavior:
 * - Clicks INSIDE the popup do NOT close it
 * - Clicks OUTSIDE the popup (and outside the anchor) close it
 * - Pressing Escape closes it
 * - Clicking the trigger button again toggles it closed
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * @param {{
 *   anchorRef: React.RefObject<HTMLElement>,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   children: React.ReactNode,
 *   className?: string,
 *   width?: number
 * }} props
 */
export function ToolbarPopup({ anchorRef, isOpen, onClose, children, className = '', width }) {
  const popupRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'below' })

  // Calculate position based on anchor element and editor container boundaries
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      // Find the editor container
      const editorContainer = anchor.closest('.de-editor-container')
      if (!editorContainer) {
        // Fallback to viewport if editor container not found
        const rect = anchor.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const popupWidth = width || 280
        const spaceBelow = viewportHeight - rect.bottom
        const spaceAbove = rect.top

        let top, left, placement
        if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
          top = rect.bottom + 4
          placement = 'below'
        } else {
          top = rect.top - 4
          placement = 'above'
        }

        left = rect.left
        if (left + popupWidth > viewportWidth - 8) {
          left = viewportWidth - popupWidth - 8
        }
        if (left < 8) left = 8

        setPosition({ top, left, placement })
        return
      }

      const anchorRect = anchor.getBoundingClientRect()
      const containerRect = editorContainer.getBoundingClientRect()
      const popupWidth = width || 280
      
      // Calculate available space within editor container
      const containerTop = containerRect.top
      const containerBottom = containerRect.bottom
      const containerLeft = containerRect.left
      const containerRight = containerRect.right
      const containerHeight = containerRect.height
      const containerWidth = containerRect.width

      // Calculate space below and above anchor within container
      const spaceBelow = containerBottom - anchorRect.bottom
      const spaceAbove = anchorRect.top - containerTop

      let top, left, placement
      
      // Determine vertical placement (prefer below, but use above if not enough space)
      // Use actual popup height if available, otherwise estimate
      const estimatedPopupHeight = popupRef.current?.offsetHeight || 300
      
      if (spaceBelow >= estimatedPopupHeight + 8 || spaceBelow >= spaceAbove) {
        // Place below anchor
        top = anchorRect.bottom + 4
        placement = 'below'
        // Ensure popup doesn't extend beyond container bottom
        if (top + estimatedPopupHeight > containerBottom - 8) {
          top = Math.max(containerTop + 8, containerBottom - estimatedPopupHeight - 8)
        }
      } else {
        // Place above anchor
        top = anchorRect.top - 4
        placement = 'above'
        // Ensure popup doesn't extend beyond container top
        if (top - estimatedPopupHeight < containerTop + 8) {
          top = Math.min(containerBottom - estimatedPopupHeight - 8, containerTop + 8)
          placement = 'below'
        }
      }

      // Horizontal positioning - keep within container bounds
      left = anchorRect.left
      
      // If popup extends beyond right edge of container, align to right
      if (left + popupWidth > containerRight - 8) {
        left = containerRight - popupWidth - 8
      }
      
      // If popup extends beyond left edge of container, align to left
      if (left < containerLeft + 8) {
        left = containerLeft + 8
      }

      setPosition({ top, left, placement })
    }

    updatePosition()
    // Use requestAnimationFrame to ensure popup height is calculated
    const rafId = requestAnimationFrame(() => {
      updatePosition()
    })
    
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, anchorRef, width])

  // Close on outside click — use capture phase so stopPropagation inside
  // the popup doesn't prevent this handler from firing.
  useEffect(() => {
    if (!isOpen) return

    const handler = (e) => {
      const popup = popupRef.current
      const anchor = anchorRef?.current

      // Click is inside the popup → do nothing
      if (popup && popup.contains(e.target)) return
      // Click is on the anchor (trigger button) → let the toggle handle it
      if (anchor && anchor.contains(e.target)) return
      
      // Check if click is inside editor container - don't close if user is selecting text
      const editorContainer = anchor?.closest('.de-editor-container')
      if (editorContainer && editorContainer.contains(e.target)) {
        // Check if it's a text selection (mousedown on content area)
        const contentArea = editorContainer.querySelector('.de-content')
        if (contentArea && contentArea.contains(e.target)) {
          // User is selecting text in editor - don't close popup
          return
        }
      }
      
      // Click is outside both → close
      onClose()
    }

    // Delay to avoid closing from the same click that opened the popup
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler, true) // capture phase
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler, true)
    }
  }, [isOpen, onClose, anchorRef])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const style = {
    position: 'fixed',
    top: position.placement === 'below' ? `${position.top}px` : undefined,
    bottom: position.placement === 'above' ? `${window.innerHeight - position.top}px` : undefined,
    left: `${position.left}px`,
    zIndex: 10001,
    maxHeight: 'calc(100vh - 16px)',
    overflowY: 'auto',
    ...(width ? { width: `${width}px` } : {}),
  }

  return createPortal(
    <div
      ref={popupRef}
      className={`de-toolbar-popup ${className}`}
      style={style}
      onMouseDown={(e) => {
        // Stop propagation to prevent closing popup when clicking inside
        e.stopPropagation()
        // Prevent default to preserve editor selection, but allow inputs to receive focus
        const tag = e.target.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && tag !== 'button') {
          e.preventDefault()
        }
      }}
      onClick={(e) => {
        // Stop propagation to prevent closing popup when clicking inside
        e.stopPropagation()
      }}
    >
      {children}
    </div>,
    document.body
  )
}
