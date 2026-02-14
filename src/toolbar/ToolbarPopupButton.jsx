/**
 * @fileoverview ToolbarPopupButton — a toolbar button that opens a popup panel.
 * Used for link, image, emoji, and similar buttons that need popup UIs.
 */

import { useState, useRef, useCallback, memo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { Tooltip } from './Tooltip.jsx'
import { LinkPopup } from './popups/LinkPopup.jsx'
import { ImagePopup } from './popups/ImagePopup.jsx'
import { EmojiPopup } from './popups/EmojiPopup.jsx'
import { ColorPickerPopup } from './popups/ColorPickerPopup.jsx'
import { TableGridPopup } from './popups/TableGridPopup.jsx'

const POPUP_MAP = {
  link: LinkPopup,
  image: ImagePopup,
  emoticons: EmojiPopup,
  tablegrid: TableGridPopup,
}

export const ToolbarPopupButton = memo(function ToolbarPopupButton({ button }) {
  const engine = useEditorEngine()
  const version = useEditorVersion() // Re-render on editor state changes for isActive
  const [isOpen, setIsOpen] = useState(false)
  const btnRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    engine._selection?.captureSelection()
    setIsOpen((prev) => !prev)
  }, [engine])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  let isActive = false
  try {
    isActive = button.isActive ? button.isActive(engine) : false
  } catch { /* ignore state check errors */ }

  // Determine which popup to show
  if (button.popupType === 'colorpicker') {
    return (
      <div style={{ position: 'relative' }}>
        <Tooltip label={button.tooltip}>
          <button
            ref={btnRef}
            type="button"
            className={`de-toolbar-btn${isActive ? ' de-toolbar-btn--active' : ''}`}
            onMouseDown={handleMouseDown}
            aria-label={button.tooltip}
            dangerouslySetInnerHTML={{ __html: button.icon }}
          />
        </Tooltip>
        <ColorPickerPopup
          anchorRef={btnRef}
          isOpen={isOpen}
          onClose={handleClose}
          command={button.command}
          title={button.tooltip}
        />
      </div>
    )
  }

  const PopupComponent = POPUP_MAP[button.popupType || button.name]

  return (
    <div style={{ position: 'relative' }}>
      <Tooltip label={button.tooltip} shortcut={button.shortcutLabel}>
        <button
          ref={btnRef}
          type="button"
          className={`de-toolbar-btn${isActive ? ' de-toolbar-btn--active' : ''}`}
          onMouseDown={handleMouseDown}
          aria-label={button.tooltip}
          dangerouslySetInnerHTML={{ __html: button.icon }}
        />
      </Tooltip>
      {PopupComponent && (
        <PopupComponent
          anchorRef={btnRef}
          isOpen={isOpen}
          onClose={handleClose}
        />
      )}
    </div>
  )
})
