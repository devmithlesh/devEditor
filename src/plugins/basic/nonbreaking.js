export function nonBreakingPlugin() {
  return {
    name: 'nonbreaking',
    commands: {
      nonBreaking: (engine) => {
        engine._handleInsertText('\u00A0')
      },
    },
    toolbarButtons: {
      nonbreaking: {
        label: 'Non-breaking Space',
        tooltip: 'Insert Non-breaking Space',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z" fill="currentColor"/></svg>',
        command: 'nonBreaking',
      },
    },
    menuItems: { insert: [{ label: 'Non-breaking Space', command: 'nonBreaking' }] },
  }
}
