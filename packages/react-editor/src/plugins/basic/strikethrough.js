/**
 * Strikethrough plugin — toggles <s> mark on selected text.
 */

import { toggleMark, isMarkActive } from './bold.js'

export function strikethroughPlugin() {
  return {
    name: 'strikethrough',

    commands: [
      {
        name: 'strikethrough',
        execute: (engine) => toggleMark(engine, 'strikethrough'),
      },
    ],

    toolbarButtons: [
      {
        name: 'strikethrough',
        tooltip: 'Strikethrough',
        icon: '<svg viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" fill="currentColor"/></svg>',
        command: 'strikethrough',
        type: 'button',
        isActive: (engine) => isMarkActive(engine, 'strikethrough'),
      },
    ],

    menuItems: [
      { menu: 'format', label: 'Strikethrough', command: 'strikethrough' },
    ],
  }
}
