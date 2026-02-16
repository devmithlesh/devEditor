import { applyMarkToSelection, isMarkActive } from './bold.js'

const DEFAULT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
]

export function backColorPlugin() {
  return {
    name: 'backcolor',
    commands: {
      backColor: (engine, color) => {
        applyMarkToSelection(engine, 'backColor', { color })
      },
    },
    toolbarButtons: {
      backcolor: {
        type: 'colorpicker',
        label: 'Background Color',
        tooltip: 'Background Color',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 000 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21z" fill="currentColor"/><rect x="3" y="18" width="18" height="4" rx="1" fill="#ffff00"/></svg>',
        colors: DEFAULT_COLORS,
        command: 'backColor',
        isActive: (engine) => isMarkActive(engine, 'backColor'),
      },
    },
  }
}
