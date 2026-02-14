/**
 * @fileoverview MenuItem — a single item in a menu dropdown.
 * Supports submenus, icons (SVG strings), and custom render components.
 */

import { memo, useCallback, useState, useRef } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'

export const MenuItem = memo(function MenuItem({ item, onClose }) {
  const engine = useEditorEngine()
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const itemRef = useRef(null)
  const hoverTimer = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // Don't execute command if item has submenu
    if (item.submenuItems) return
    if (item.command) {
      try {
        engine._selection?.captureSelection()
        if (item.commandArgs) {
          engine.executeCommand(item.command, ...item.commandArgs)
        } else {
          engine.executeCommand(item.command)
        }
      } catch (err) {
        console.warn(`MenuItem: command "${item.command}" failed:`, err)
      }
    }
    onClose()
  }, [engine, item, onClose])

  const hasSubmenuOrRender = !!item.submenuItems || !!item.render

  const handleMouseEnter = useCallback(() => {
    if (hasSubmenuOrRender) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => setSubmenuOpen(true), 50)
    }
  }, [hasSubmenuOrRender])

  const handleMouseLeave = useCallback(() => {
    if (hasSubmenuOrRender) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => setSubmenuOpen(false), 150)
    }
  }, [hasSubmenuOrRender])

  if (item.type === 'separator') {
    return <div className="de-menu-separator" role="separator" />
  }

  // Custom render component (e.g., grid picker)
  if (item.render) {
    return (
      <div
        ref={itemRef}
        className="de-menu-item-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          className={`de-menu-item${submenuOpen ? ' de-menu-item--hover' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          role="menuitem"
        >
          {item.icon ? (
            <span className="de-menu-item-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
          ) : (
            <span className="de-menu-item-icon" />
          )}
          <span className="de-menu-item-label">{item.label}</span>
          <span className="de-menu-item-arrow">&#9656;</span>
        </button>
        {submenuOpen && (
          <div className="de-menu-submenu">
            {item.render({ engine, onClose })}
          </div>
        )}
      </div>
    )
  }

  const isDisabled = item.isDisabled ? item.isDisabled(engine) : false
  const isChecked = item.isChecked ? item.isChecked(engine) : false
  const hasSubmenu = !!item.submenuItems

  return (
    <div
      ref={itemRef}
      className="de-menu-item-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`de-menu-item${isChecked ? ' de-menu-item--checked' : ''}${submenuOpen ? ' de-menu-item--hover' : ''}`}
        onMouseDown={handleMouseDown}
        disabled={isDisabled}
        role="menuitem"
      >
        {item.icon ? (
          <span className="de-menu-item-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
        ) : (
          <span className="de-menu-item-icon">
            {isChecked && <span className="de-menu-check">&#10003;</span>}
          </span>
        )}
        <span className="de-menu-item-label">{item.label}</span>
        {item.shortcutLabel && (
          <span className="de-menu-item-shortcut">{item.shortcutLabel}</span>
        )}
        {hasSubmenu && <span className="de-menu-item-arrow">&#9656;</span>}
      </button>

      {hasSubmenu && submenuOpen && (
        <div className="de-menu-submenu" role="menu">
          {item.submenuItems.map((sub, i) => (
            <MenuItem key={sub.label || sub.type || i} item={sub} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
})
