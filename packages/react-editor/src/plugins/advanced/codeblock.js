/**
 * Code Block plugin — toggle code block formatting.
 */

export function codeBlockPlugin() {
  return {
    name: 'codeblock',

    commands: [
      {
        name: 'insertCodeBlock',
        execute: (engine) => {
          const sel = engine._selection?.captureSelection()
          if (!sel) return

          const block = engine._findBlockForTextNode(sel.anchorNodeId)
          if (!block) return

          if (engine._historyManager) {
            engine._historyManager.push(engine._model.getDoc(), sel)
          }

          const newType = block.type === 'codeBlock' ? 'paragraph' : 'codeBlock'
          engine._model._changeBlockType({ blockId: block.id, newType })

          engine._reconcile()
          engine._selection.restoreSelection(sel)
          engine._bumpVersion()
        },
      },
    ],

    menuItems: [
      { menu: 'insert', label: 'Code block', command: 'insertCodeBlock' },
    ],

    css: `
      .de-content pre[data-node-id] {
        position: relative;
        tab-size: 2;
      }
    `,
  }
}
