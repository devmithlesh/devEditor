import { applyMarkToSelection } from './bold.js'
import { findNodeById } from '../../utils/helpers.js'

export function fontSizePlugin() {
  return {
    name: 'fontsize',
    commands: {
      fontSize: (engine, size) => {
        applyMarkToSelection(engine, 'fontSize', { size })
      },
    },
    toolbarButtons: {
      fontsize: {
        type: 'stepper',
        label: 'Font Size',
        tooltip: 'Font Size',
        command: 'fontSize',
        defaultSize: 16,
        unit: 'px',
        steps: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96],
        getLabel: (engine) => {
          const sel = engine._selection?.getSavedSelection()
          if (!sel) return null
          const node = findNodeById(engine._model.doc, sel.anchorNodeId)
          if (!node || node.type !== 'text') return null
          const mark = node.marks?.find((m) => m.type === 'fontSize')
          return mark?.attrs?.size || null
        },
      },
    },
  }
}
