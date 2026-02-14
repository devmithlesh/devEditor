/**
 * @fileoverview MenuItem — a single item in a menu dropdown.
 */

import { memo, useCallback } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'

export const MenuItem = memo(function MenuItem({ item, onClose }) {
  const engine = useEditorEngine()

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
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

  if (item.type === 'separator') {
    return <div className="de-menu-separator" role="separator" />
  }

  const isDisabled = item.isDisabled ? item.isDisabled(engine) : false
  const isChecked = item.isChecked ? item.isChecked(engine) : false

  return (
    <button
      type="button"
      className={`de-menu-item${isChecked ? ' de-menu-item--checked' : ''}`}
      onMouseDown={handleMouseDown}
      disabled={isDisabled}
      role="menuitem"
    >
      <span className="de-menu-item-icon">
        {isChecked && <span className="de-menu-check">&#10003;</span>}
      </span>
      <span className="de-menu-item-label">{item.label}</span>
      {item.shortcutLabel && (
        <span className="de-menu-item-shortcut">{item.shortcutLabel}</span>
      )}
    </button>
  )
})
