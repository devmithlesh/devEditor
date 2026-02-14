/**
 * Word count plugin — displays word and character count.
 */

import { walkTree } from '../../utils/helpers.js'

export function wordCountPlugin() {
  return {
    name: 'wordcount',

    commands: [
      {
        name: 'wordCount',
        execute: (engine) => {
          const doc = engine._model.doc
          let text = ''
          walkTree(doc, (node) => {
            if (node.type === 'text' && node.text) {
              text += node.text + ' '
            }
          })
          const words = text.trim().split(/\s+/).filter(Boolean).length
          const chars = text.replace(/\s/g, '').length
          const charsWithSpaces = text.trim().length
          alert(`Words: ${words}\nCharacters (no spaces): ${chars}\nCharacters (with spaces): ${charsWithSpaces}`)
        },
      },
    ],

    menuItems: [
      { menu: 'tools', label: 'Word count', command: 'wordCount' },
    ],
  }
}
