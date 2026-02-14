/**
 * @fileoverview ToolbarButton — a single button in the toolbar.
 * Shows icon, active state, disabled state, tooltip on hover.
 * Uses onMouseDown (not onClick) to prevent stealing focus from the editor.
 */

import { memo, useCallback } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { Tooltip } from './Tooltip.jsx'

/**
 * @param {{ button: import('../types/plugin.types.js').ToolbarButtonDef }} props
 */
export const ToolbarButton = memo(function ToolbarButton({ button }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()

  let isActive = false
  let isDisabled = false
  try {
    isActive = button.isActive ? button.isActive(engine) : false
    isDisabled = button.isDisabled ? button.isDisabled(engine) : false
  } catch { /* ignore state check errors */ }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault() // Prevent focus loss from editor
    e.stopPropagation()

    if (button.command) {
      try {
        engine._selection?.captureSelection()
        engine.executeCommand(button.command)
      } catch (err) {
        console.warn(`ToolbarButton: command "${button.command}" failed:`, err)
      }
    }
  }, [engine, button.command])

  return (
    <Tooltip label={button.tooltip} shortcut={button.shortcutLabel}>
      <button
        type="button"
        className={`de-toolbar-btn${isActive ? ' de-toolbar-btn--active' : ''}`}
        onMouseDown={handleMouseDown}
        disabled={isDisabled}
        aria-label={button.tooltip}
        aria-pressed={isActive}
        dangerouslySetInnerHTML={{ __html: button.icon }}
      />
    </Tooltip>
  )
})
