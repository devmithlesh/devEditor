/**
 * @fileoverview MenuBar — the top menu bar (File, Edit, View, Insert, Format, Tools, Table, Help).
 * Click to open dropdown, hover to switch while open, outside click or Escape to close.
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'
import { parseMenubarString, getDefaultMenuItems, mergeMenuItems } from './MenuParser.js'
import { MenuDropdown } from './MenuDropdown.jsx'

/**
 * @param {{ config: string }} props
 */
export function MenuBar({ config }) {
  const engine = useEditorEngine()
  const [activeMenu, setActiveMenu] = useState(null)
  const barRef = useRef(null)
  const isAnyOpen = activeMenu !== null

  const menuNames = useMemo(() => parseMenubarString(config), [config])

  const allMenuItems = useMemo(() => {
    const defaults = getDefaultMenuItems()
    const pluginItems = new Map()
    for (const name of menuNames) {
      const items = engine._pluginManager.getMenuItems(name)
      if (items.length > 0) {
        pluginItems.set(name, items)
      }
    }
    return mergeMenuItems(defaults, pluginItems)
  }, [menuNames, engine])

  // Close on outside click
  useEffect(() => {
    if (!isAnyOpen) return
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isAnyOpen])

  const handleMenuMouseDown = useCallback((e, menuName) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture selection when opening menu so commands know what's selected
    engine._selection?.captureSelection()
    setActiveMenu((prev) => (prev === menuName ? null : menuName))
  }, [engine])

  const handleMenuHover = useCallback((menuName) => {
    if (isAnyOpen && menuName !== activeMenu) {
      setActiveMenu(menuName)
    }
  }, [isAnyOpen, activeMenu])

  const handleClose = useCallback(() => {
    setActiveMenu(null)
  }, [])

  if (menuNames.length === 0) return null

  return (
    <div className="de-menubar" ref={barRef} role="menubar" aria-label="Editor menu bar">
      {menuNames.map((name) => (
        <div key={name} className="de-menubar-item-wrapper">
          <button
            type="button"
            className={`de-menubar-item${activeMenu === name ? ' de-menubar-item--active' : ''}`}
            onMouseDown={(e) => handleMenuMouseDown(e, name)}
            onMouseEnter={() => handleMenuHover(name)}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={activeMenu === name}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>

          <MenuDropdown
            items={allMenuItems[name]}
            isOpen={activeMenu === name}
            onClose={handleClose}
          />
        </div>
      ))}
    </div>
  )
}
