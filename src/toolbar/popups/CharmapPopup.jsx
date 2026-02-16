/**
 * @fileoverview CharmapPopup — popup for inserting special characters.
 */

import { useCallback } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

const SPECIAL_CHARS = [
  { char: '\u00A9', name: 'Copyright' }, { char: '\u00AE', name: 'Registered' },
  { char: '\u2122', name: 'Trademark' }, { char: '\u2026', name: 'Ellipsis' },
  { char: '\u2013', name: 'En Dash' }, { char: '\u2014', name: 'Em Dash' },
  { char: '\u2018', name: 'Left Quote' }, { char: '\u2019', name: 'Right Quote' },
  { char: '\u201C', name: 'Left DblQuote' }, { char: '\u201D', name: 'Right DblQuote' },
  { char: '\u2190', name: 'Left Arrow' }, { char: '\u2191', name: 'Up Arrow' },
  { char: '\u2192', name: 'Right Arrow' }, { char: '\u2193', name: 'Down Arrow' },
  { char: '\u00B1', name: 'Plus Minus' }, { char: '\u00D7', name: 'Multiply' },
  { char: '\u00F7', name: 'Divide' }, { char: '\u2260', name: 'Not Equal' },
  { char: '\u2264', name: 'Less Equal' }, { char: '\u2265', name: 'Greater Equal' },
  { char: '\u00B0', name: 'Degree' }, { char: '\u00B5', name: 'Micro' },
  { char: '\u20AC', name: 'Euro' }, { char: '\u00A3', name: 'Pound' },
  { char: '\u00A5', name: 'Yen' }, { char: '\u00A2', name: 'Cent' },
  { char: '\u221A', name: 'Square Root' }, { char: '\u221E', name: 'Infinity' },
  { char: '\u2211', name: 'Summation' }, { char: '\u0394', name: 'Delta' },
  { char: '\u03C0', name: 'Pi' }, { char: '\u03A9', name: 'Omega' },
  { char: '\u2665', name: 'Heart' }, { char: '\u2605', name: 'Star' },
  { char: '\u2714', name: 'Check Mark' }, { char: '\u2718', name: 'Cross Mark' },
]

export function CharmapPopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()

  const handleSelect = useCallback((char) => {
    engine._selection?.restoreSelection()
    engine._isExecutingCommand = true
    try {
      engine._handleInsertText(char)
    } finally {
      engine._isExecutingCommand = false
    }
    onClose()
  }, [engine, onClose])

  return (
    <ToolbarPopup
      anchorRef={anchorRef}
      isOpen={isOpen}
      onClose={onClose}
      className="de-charmap-popup"
      width={360}
    >
      <div className="de-popup-header">
        <span>Special Characters</span>
        <button 
          className="de-popup-close" 
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          &times;
        </button>
      </div>
      <div className="de-charmap-grid">
        {SPECIAL_CHARS.map((c, i) => (
          <button
            key={i}
            type="button"
            className="de-charmap-char"
            title={c.name}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSelect(c.char)
            }}
          >
            {c.char}
          </button>
        ))}
      </div>
    </ToolbarPopup>
  )
}
