import { generateId } from '../../utils/helpers.js'

export function pageBreakPlugin() {
  return {
    name: 'pagebreak',
    commands: {
      pageBreak: (engine) => {
        const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
        if (!sel) return
        const block = engine._findBlockForTextNode(sel.anchorNodeId)
        if (!block) return
        const parentInfo = engine._model.doc.content
        const idx = parentInfo.findIndex(n => n.id === block.id)
        if (idx === -1) return
        engine._model.doc.content.splice(idx + 1, 0, {
          id: generateId(),
          type: 'pageBreak',
          attrs: {},
        })
        engine._model._ensureMinimumContent()
        engine._reconcile()
        engine._bumpVersion()
      },
    },
    toolbarButtons: {
      pagebreak: {
        label: 'Page Break',
        tooltip: 'Insert Page Break',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9H2v2h8v5l4-4-4-4v1zm10-9h-7V2h7c1.1 0 2 .9 2 2v7h-2V4zM14 13h8v2h-8v5l-4-4 4-4v1z" fill="currentColor"/></svg>',
        command: 'pageBreak',
      },
    },
    menuItems: { insert: [{ label: 'Page Break', command: 'pageBreak' }] },
    css: `.de-content [data-node-id][data-type="pageBreak"] { page-break-after: always; display: block; border-top: 2px dashed #d1d5db; margin: 1.5em 0; position: relative; }
.de-content [data-node-id][data-type="pageBreak"]::after { content: 'Page Break'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 8px; font-size: 11px; color: #9ca3af; }`,
  }
}
