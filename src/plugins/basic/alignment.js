/**
 * Alignment plugin — left, center, right, justify text alignment.
 */

export function alignmentPlugin() {
  return {
    name: 'alignment',

    commands: [
      { name: 'alignLeft', execute: (engine) => setAlignment(engine, 'left') },
      { name: 'alignCenter', execute: (engine) => setAlignment(engine, 'center') },
      { name: 'alignRight', execute: (engine) => setAlignment(engine, 'right') },
      { name: 'alignJustify', execute: (engine) => setAlignment(engine, 'justify') },
    ],

    toolbarButtons: [
      {
        name: 'alignleft',
        tooltip: 'Align left',
        icon: '<svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>',
        command: 'alignLeft',
        type: 'button',
        isActive: (engine) => getAlignment(engine) === 'left' || !getAlignment(engine),
      },
      {
        name: 'aligncenter',
        tooltip: 'Align center',
        icon: '<svg viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" fill="currentColor"/></svg>',
        command: 'alignCenter',
        type: 'button',
        isActive: (engine) => getAlignment(engine) === 'center',
      },
      {
        name: 'alignright',
        tooltip: 'Align right',
        icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>',
        command: 'alignRight',
        type: 'button',
        isActive: (engine) => getAlignment(engine) === 'right',
      },
      {
        name: 'alignjustify',
        tooltip: 'Justify',
        icon: '<svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zM3 3v2h18V3H3z" fill="currentColor"/></svg>',
        command: 'alignJustify',
        type: 'button',
        isActive: (engine) => getAlignment(engine) === 'justify',
      },
    ],

    menuItems: [
      { menu: 'format', label: 'Align left', command: 'alignLeft' },
      { menu: 'format', label: 'Align center', command: 'alignCenter' },
      { menu: 'format', label: 'Align right', command: 'alignRight' },
      { menu: 'format', label: 'Justify', command: 'alignJustify' },
    ],
  }
}

function setAlignment(engine, align) {
  const sel = engine._selection?.captureSelection()
  if (!sel || sel.isCollapsed) return

  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  if (!block) return

  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), sel)
  }

  engine._model.applyTransaction({
    steps: [{
      type: 'setNodeAttr',
      data: { nodeId: block.id, attr: 'textAlign', value: align },
    }],
  })

  engine._reconcile()
  engine._selection.restoreSelection(sel)
  engine._bumpVersion()
}

function getAlignment(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null

  const block = engine._findBlockForTextNode(sel.anchorNodeId)
  if (!block) return null

  return block.attrs?.textAlign || null
}
