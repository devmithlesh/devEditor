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

  // Calculate position based on anchor element
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

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
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
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
    ...(width ? { width: `${width}px` } : {}),
  }

  return createPortal(
    <div
      ref={popupRef}
      className={`de-toolbar-popup ${className}`}
      style={style}
      onMouseDown={(e) => {
        // Prevent default to preserve editor selection, but allow inputs to receive focus
        const tag = e.target.tagName.toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && tag !== 'button') {
          e.preventDefault()
        }
      }}
    >
      {children}
    </div>,
    document.body
  )
}
