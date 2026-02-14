/**
 * @fileoverview ToolbarStepper — numeric input with -/+ buttons (e.g. font size).
 */

import { useState, useRef, useCallback, memo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

/** Ordered size steps for increment/decrement */
const DEFAULT_STEPS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]

/** Parse a size string like "14pt" or "16px" to a number */
function parseSize(str) {
  if (!str || typeof str !== 'string') return null
  const n = parseInt(str)
  return isNaN(n) ? null : n
}

/** Get the unit from a size string, default to "px" */
function getUnit(str) {
  if (!str || typeof str !== 'string') return 'px'
  const match = str.match(/(pt|px|em|rem)$/i)
  return match ? match[1] : 'px'
}

/**
 * @param {{ button: import('../types/plugin.types.js').ToolbarButtonDef }} props
 */
export const ToolbarStepper = memo(function ToolbarStepper({ button }) {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const inputRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [editValue, setEditValue] = useState('')

  const steps = button.steps || DEFAULT_STEPS
  const defaultSize = button.defaultSize || 16
  const unit = button.unit || 'px'

  // Get current size from engine
  const currentLabel = button.getLabel ? button.getLabel(engine) : null
  const currentNum = parseSize(currentLabel) || defaultSize
  const currentUnit = currentLabel ? getUnit(currentLabel) : unit
  const displayValue = isFocused ? editValue : `${currentNum}${currentUnit}`

  const applySize = useCallback((size) => {
    if (button.command) {
      try {
        engine._selection?.restoreSelection()
        engine.executeCommand(button.command, `${size}${currentUnit}`)
      } catch (err) {
        console.warn(`ToolbarStepper: command "${button.command}" failed:`, err)
      }
    }
  }, [engine, button.command, currentUnit])

  const handleDecrement = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    engine._selection?.captureSelection()
    // Find previous step
    const idx = steps.findIndex((s) => s >= currentNum)
    const prevIdx = idx <= 0 ? 0 : idx - 1
    applySize(steps[prevIdx])
  }, [engine, steps, currentNum, applySize])

  const handleIncrement = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    engine._selection?.captureSelection()
    // Find next step
    const idx = steps.findIndex((s) => s > currentNum)
    const nextIdx = idx === -1 ? steps.length - 1 : idx
    applySize(steps[nextIdx])
  }, [engine, steps, currentNum, applySize])

  const handleInputFocus = useCallback(() => {
    engine._selection?.captureSelection()
    setEditValue(`${currentNum}`)
    setIsFocused(true)
  }, [engine, currentNum])

  const handleInputBlur = useCallback(() => {
    setIsFocused(false)
    const num = parseInt(editValue)
    if (!isNaN(num) && num > 0 && num <= 999) {
      applySize(num)
    }
  }, [editValue, applySize])

  const handleInputChange = useCallback((e) => {
    setEditValue(e.target.value.replace(/[^0-9]/g, ''))
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsFocused(false)
      setEditValue('')
      engine._container?.focus()
    }
  }, [engine])

  return (
    <div className="de-toolbar-stepper">
      <button
        type="button"
        className="de-toolbar-stepper-btn"
        onMouseDown={handleDecrement}
        aria-label="Decrease font size"
      >
        &#8722;
      </button>
      <input
        ref={inputRef}
        type="text"
        className="de-toolbar-stepper-input"
        value={displayValue}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        aria-label="Font size"
      />
      <button
        type="button"
        className="de-toolbar-stepper-btn"
        onMouseDown={handleIncrement}
        aria-label="Increase font size"
      >
        +
      </button>
    </div>
  )
})
