/**
 * Italic plugin — toggles <em> mark on selected text.
 */

import { toggleMark, isMarkActive } from './bold.js'

export function italicPlugin() {
  return {
    name: 'italic',

    commands: [
      {
        name: 'italic',
        execute: (engine) => toggleMark(engine, 'italic'),
      },
    ],

    toolbarButtons: [
      {
        name: 'italic',
        tooltip: 'Italic',
        icon: '<svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" fill="currentColor"/></svg>',
        command: 'italic',
        type: 'button',
        shortcutLabel: 'Ctrl+I',
        isActive: (engine) => isMarkActive(engine, 'italic'),
      },
    ],

    shortcuts: [
      { combo: 'ctrl+i', command: 'italic' },
    ],
  }
}
