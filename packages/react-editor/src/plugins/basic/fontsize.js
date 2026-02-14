import { applyMarkToSelection } from './bold.js'

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
        type: 'dropdown',
        label: 'Font Size',
        tooltip: 'Font Size',
        options: [
          { label: '8pt', value: '8pt' },
          { label: '10pt', value: '10pt' },
          { label: '12pt', value: '12pt' },
          { label: '14pt', value: '14pt' },
          { label: '18pt', value: '18pt' },
          { label: '24pt', value: '24pt' },
          { label: '36pt', value: '36pt' },
          { label: '48pt', value: '48pt' },
          { label: '72pt', value: '72pt' },
        ],
        command: 'fontSize',
      },
    },
    menuItems: { format: [{ label: 'Font Size', submenu: 'fontsize' }] },
  }
}
