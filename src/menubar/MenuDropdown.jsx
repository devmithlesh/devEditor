/**
 * @fileoverview MenuDropdown — a dropdown panel for a menu.
 */

import { useRef, useEffect } from 'react'
import { MenuItem } from './MenuItem.jsx'

/**
 * @param {{ items: Array, isOpen: boolean, onClose: function }} props
 */
export function MenuDropdown({ items, isOpen, onClose }) {
  const dropdownRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Close on outside click (including submenus)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // Check if click is in any submenu
        const submenu = e.target.closest('.de-menu-submenu')
        if (!submenu) {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [isOpen, onClose])

  if (!isOpen || !items || items.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="de-menu-dropdown"
      role="menu"
    >
      {items.map((item, i) => (
        <MenuItem key={item.label || item.type || i} item={item} onClose={onClose} />
      ))}
    </div>
  )
}
