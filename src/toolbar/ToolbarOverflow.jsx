/**
 * @fileoverview ToolbarOverflow — responsive overflow with "..." button.
 * Uses ResizeObserver to detect when buttons overflow the toolbar width.
 * Hidden buttons appear in a popup when the "..." button is clicked.
 *
 * Fix: group widths are measured once (on initial render when all groups are
 * visible) and cached. Subsequent overflow recalculations use the cached
 * widths, preventing the oscillation loop where items bounce between
 * visible ↔ overflow states.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolbarGroup } from './ToolbarGroup.jsx'

/**
 * @param {{ groups: Array<Array<import('../types/plugin.types.js').ToolbarButtonDef>> }} props
 */
export function ToolbarOverflow({ groups }) {
  const containerRef = useRef(null)
  const itemsRef = useRef(null)
  const [overflowIndex, setOverflowIndex] = useState(-1) // -1 = no overflow
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef(null)
  const overflowBtnRef = useRef(null)
  const [openDropdownId, setOpenDropdownId] = useState(null) // Track which dropdown is open
  
  // Close overflow popup when a dropdown opens
  const handleDropdownToggle = useCallback((id) => {
    setOpenDropdownId(id)
    if (id !== null) {
      setShowPopup(false) // Close overflow popup when dropdown opens
    }
  }, [])

  // Cache measured group widths so we don't oscillate.
  // Widths are measured once when all groups render (overflowIndex === -1).
  const groupWidthsRef = useRef(null)
  const lastContainerWidthRef = useRef(-1)

  // Compute cutoff from cached group widths
  const computeCutoff = useCallback((containerWidth) => {
    const widths = groupWidthsRef.current
    if (!widths || widths.length === 0) return -1

    const available = containerWidth - 40 // reserve space for "..." button
    let total = 0
    let cutoff = -1

    for (let i = 0; i < widths.length; i++) {
      total += widths[i]
      if (total > available && cutoff === -1) {
        cutoff = i === 0 ? 1 : i // always show at least one group
      }
    }

    return cutoff
  }, [])

  // Measure all group widths (only runs when all groups are visible)
  const measureAndCalc = useCallback(() => {
    const container = containerRef.current
    const items = itemsRef.current
    if (!container || !items) return

    const containerWidth = container.offsetWidth
    const children = items.children

    // Measure group widths only when ALL groups are visible (overflowIndex === -1)
    // This gives us accurate intrinsic widths before any overflow hiding.
    if (children.length === groups.length) {
      const widths = []
      for (let i = 0; i < children.length; i++) {
        // Include the gap (4px) between groups
        widths.push(children[i].offsetWidth + 4)
      }
      groupWidthsRef.current = widths
    }

    if (!groupWidthsRef.current) return

    lastContainerWidthRef.current = containerWidth
    const cutoff = computeCutoff(containerWidth)
    setOverflowIndex(cutoff)
  }, [groups.length, computeCutoff])

  // Set up ResizeObserver — only recompute on container width change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const newWidth = container.offsetWidth
      // Skip if container width hasn't actually changed (prevents oscillation)
      if (groupWidthsRef.current && newWidth === lastContainerWidthRef.current) return
      measureAndCalc()
    })
    observer.observe(container)

    // Initial measurement after first paint — all groups are visible here
    requestAnimationFrame(() => measureAndCalc())

    return () => observer.disconnect()
  }, [measureAndCalc])

  // Re-measure when groups structure changes (different plugins loaded, etc.)
  useEffect(() => {
    groupWidthsRef.current = null // clear cache so next render re-measures
    setOverflowIndex(-1) // show all groups so we can measure them
  }, [groups])

  // After resetting to -1 to re-measure, schedule the measurement
  useEffect(() => {
    if (overflowIndex === -1 && !groupWidthsRef.current) {
      requestAnimationFrame(() => measureAndCalc())
    }
  }, [overflowIndex, measureAndCalc])

  // Close popup on outside click
  useEffect(() => {
    if (!showPopup) return
    const handler = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return
      if (overflowBtnRef.current && overflowBtnRef.current.contains(e.target)) return
      // Don't close overflow if click is inside a portal-rendered toolbar popup
      // (e.g. emoji picker, color picker, link popup opened from an overflow button)
      if (e.target.closest && e.target.closest('.de-toolbar-popup')) return
      setShowPopup(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [showPopup])

  const handleOverflowMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPopup((prev) => {
      const newState = !prev
      // Close any open dropdowns when opening overflow popup
      if (newState) {
        setOpenDropdownId(null)
      }
      return newState
    })
  }, [])

  const visibleGroups = overflowIndex === -1 ? groups : groups.slice(0, Math.max(1, overflowIndex))
  const overflowGroups = overflowIndex === -1 ? [] : groups.slice(Math.max(1, overflowIndex))

  return (
    <div className="de-toolbar-overflow-container" ref={containerRef}>
      <div className="de-toolbar-items" ref={itemsRef}>
        {visibleGroups.map((group, i) => (
          <ToolbarGroup 
            key={i} 
            buttons={group} 
            openDropdownId={openDropdownId}
            onDropdownToggle={handleDropdownToggle}
          />
        ))}
      </div>

      {overflowGroups.length > 0 && (
        <div className="de-toolbar-overflow-wrapper">
          <button
            ref={overflowBtnRef}
            type="button"
            className="de-toolbar-btn de-toolbar-overflow-btn"
            onMouseDown={handleOverflowMouseDown}
            aria-label="More tools"
            aria-expanded={showPopup}
          >
            ···
          </button>

          {showPopup && (
            <div className="de-toolbar-overflow-popup" ref={popupRef}>
              {overflowGroups.map((group, i) => (
                <ToolbarGroup 
                  key={i} 
                  buttons={group}
                  openDropdownId={openDropdownId}
                  onDropdownToggle={handleDropdownToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
