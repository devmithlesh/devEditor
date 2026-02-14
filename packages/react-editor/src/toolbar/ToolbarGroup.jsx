/**
 * @fileoverview ToolbarGroup — renders a group of toolbar buttons with separators.
 */

import { ToolbarButton } from './ToolbarButton.jsx'
import { ToolbarDropdown } from './ToolbarDropdown.jsx'
import { ToolbarColorPicker } from './ToolbarColorPicker.jsx'
import { ToolbarPopupButton } from './ToolbarPopupButton.jsx'

/**
 * @param {{ buttons: Array<import('../types/plugin.types.js').ToolbarButtonDef> }} props
 */
export function ToolbarGroup({ buttons }) {
  return (
    <div className="de-toolbar-group">
      {buttons.map((button) => {
        if (button.type === 'popup') {
          return <ToolbarPopupButton key={button.name} button={button} />
        }
        if (button.type === 'colorpicker') {
          return <ToolbarPopupButton key={button.name} button={{ ...button, popupType: 'colorpicker' }} />
        }
        if (button.type === 'dropdown') {
          return <ToolbarDropdown key={button.name} button={button} />
        }
        return <ToolbarButton key={button.name} button={button} />
      })}
    </div>
  )
}
