/**
 * @fileoverview Tooltip — appears on hover, shows label + shortcut.
 * Uses a portal to render above all other content.
 */

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Wraps a child element and shows a tooltip on hover.
 * @param {{ label: string, shortcut?: string, children: React.ReactNode }} props
 */
export function Tooltip({ label, shortcut, children }) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timerRef = useRef(null)
  const triggerRef = useRef(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 6,
          left: rect.left + rect.width / 2,
        })
        setVisible(true)
      }
    }, 400)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseDown={hide}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
      {visible && createPortal(
        <div
          className="de-tooltip"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
          }}
        >
          <span>{label}</span>
          {shortcut && <span className="de-tooltip-shortcut">{shortcut}</span>}
        </div>,
        document.body
      )}
    </>
  )
}
