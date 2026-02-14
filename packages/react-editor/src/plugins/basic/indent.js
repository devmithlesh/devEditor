/**
 * Indent/Outdent plugin.
 */

export function indentPlugin() {
  return {
    name: 'indent',

    commands: [
      {
        name: 'indent',
        execute: (engine) => adjustIndent(engine, 1),
      },
      {
        name: 'outdent',
        execute: (engine) => adjustIndent(engine, -1),
      },
    ],

    toolbarButtons: [
      {
        name: 'outdent',
        tooltip: 'Decrease indent',
        icon: '<svg viewBox="0 0 24 24"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 4h10V5H11v2zm0 4h10v-2H11v2z" fill="currentColor"/></svg>',
        command: 'outdent',
        type: 'button',
      },
      {
        name: 'indent',
        tooltip: 'Increase indent',
        icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 4h10V5H11v2zm0 4h10v-2H11v2z" fill="currentColor"/></svg>',
        command: 'indent',
        type: 'button',
      },
    ],
  }
}

function adjustIndent(engine, direction) {
  const sel = engine._selection?.captureSelection()
  if (!sel) return

  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  if (!block) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  const currentIndent = parseInt(block.attrs?.indent || '0')
  const newIndent = Math.max(0, Math.min(10, currentIndent + direction))

  engine._model.applyTransaction({
    steps: [{
      type: 'setNodeAttr',
      data: { nodeId: block.id, attr: 'indent', value: newIndent },
    }],
  })

  engine._reconcile()
  engine._selection.restoreSelection(sel)
  engine._bumpVersion()
}
