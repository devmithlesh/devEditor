import { applyMarkToSelection } from './bold.js'

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
        options: [
          { label: 'Arial', value: 'Arial' },
          { label: 'Helvetica', value: 'Helvetica' },
          { label: 'Times New Roman', value: 'Times New Roman' },
          { label: 'Georgia', value: 'Georgia' },
          { label: 'Courier New', value: 'Courier New' },
          { label: 'Verdana', value: 'Verdana' },
          { label: 'Trebuchet MS', value: 'Trebuchet MS' },
        ],
        command: 'fontFamily',
      },
    },
    menuItems: { format: [{ label: 'Font Family', submenu: 'fontfamily' }] },
  }
}
