import { applyMarkToSelection } from './bold.js'
import { findNodeById } from '../../utils/helpers.js'

export function fontFamilyPlugin() {
  return {
    name: 'fontfamily',
    commands: {
      fontFamily: (engine, family) => {
        applyMarkToSelection(engine, 'fontFamily', { family })
      },
    },
    toolbarButtons: {
      fontfamily: {
        type: 'dropdown',
        label: 'Font Family',
        tooltip: 'Font Family',
        command: 'fontFamily',
        getLabel: (engine) => {
          const sel = engine._selection?.getSavedSelection()
          if (!sel) return 'Font Family'
          const node = findNodeById(engine._model.doc, sel.anchorNodeId)
          if (!node || node.type !== 'text') return 'Font Family'
          const mark = node.marks?.find((m) => m.type === 'fontFamily')
          return mark?.attrs?.family || 'Font Family'
        },
        options: [
          { label: 'Arial', value: 'Arial' },
          { label: 'Helvetica', value: 'Helvetica' },
          { label: 'Times New Roman', value: 'Times New Roman' },
          { label: 'Georgia', value: 'Georgia' },
          { label: 'Courier New', value: 'Courier New' },
          { label: 'Verdana', value: 'Verdana' },
          { label: 'Trebuchet MS', value: 'Trebuchet MS' },
        ],
      },
    },
    menuItems: { format: [{ label: 'Font Family', submenu: 'fontfamily' }] },
  }
}
