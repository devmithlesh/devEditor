/**
 * Heading plugin — provides format select dropdown for block types.
 * Commands: formatBlock (sets heading level or paragraph)
 */

import { findNodeById } from '../../utils/helpers.js'

export function headingPlugin() {
  return {
    name: 'heading',

    commands: [
      {
        name: 'formatBlock',
        /**
         * @param {Object} engine
         * @param {string} blockType - 'paragraph', 'heading1', 'heading2', etc.
         */
        execute: (engine, blockType) => {
          const sel = engine._selection?.captureSelection()
          if (!sel || sel.isCollapsed) return

          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          if (blockType === 'paragraph') {
            engine._model._changeBlockType({ blockId: block.id, newType: 'paragraph' })
          } else if (blockType.startsWith('heading')) {
            const level = parseInt(blockType.replace('heading', '')) || 1
            engine._model._changeBlockType({
              blockId: block.id,
              newType: 'heading',
              attrs: { level },
            })
          } else if (blockType === 'blockquote') {
            engine._model._changeBlockType({ blockId: block.id, newType: 'blockquote' })
          } else if (blockType === 'codeBlock') {
            engine._model._changeBlockType({ blockId: block.id, newType: 'codeBlock' })
          }

          engine._reconcile()
          engine._selection.restoreSelection(sel)
          engine._bumpVersion()
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'formatselect',
        tooltip: 'Block format',
        icon: '',
        command: 'formatBlock',
        type: 'dropdown',
        getLabel: (engine) => {
          const sel = engine._selection?.getSavedSelection()
          if (!sel) return 'Paragraph'
          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return 'Paragraph'
          if (block.type === 'heading') return `Heading ${block.attrs?.level || 1}`
          if (block.type === 'blockquote') return 'Blockquote'
          if (block.type === 'codeBlock') return 'Code Block'
          return 'Paragraph'
        },
        dropdownItems: [
          { label: 'Paragraph', value: 'paragraph' },
          { label: 'Heading 1', value: 'heading1' },
          { label: 'Heading 2', value: 'heading2' },
          { label: 'Heading 3', value: 'heading3' },
          { label: 'Heading 4', value: 'heading4' },
          { label: 'Heading 5', value: 'heading5' },
          { label: 'Heading 6', value: 'heading6' },
          { label: 'Blockquote', value: 'blockquote' },
          { label: 'Code Block', value: 'codeBlock' },
        ],
      },
    ],

    menuItems: [
      { menu: 'format', label: 'Heading 1', command: 'formatBlock', commandArgs: ['heading1'] },
      { menu: 'format', label: 'Heading 2', command: 'formatBlock', commandArgs: ['heading2'] },
      { menu: 'format', label: 'Heading 3', command: 'formatBlock', commandArgs: ['heading3'] },
      { menu: 'format', type: 'separator' },
      { menu: 'format', label: 'Paragraph', command: 'formatBlock', commandArgs: ['paragraph'] },
      { menu: 'format', label: 'Blockquote', command: 'formatBlock', commandArgs: ['blockquote'] },
    ],
  }
}
