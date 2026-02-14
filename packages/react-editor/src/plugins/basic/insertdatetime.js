export function insertDateTimePlugin() {
  return {
    name: 'insertdatetime',
    commands: {
      insertDateTime: (engine, format) => {
        const now = new Date()
        let text
        switch (format || 'date') {
          case 'date': text = now.toLocaleDateString(); break
          case 'time': text = now.toLocaleTimeString(); break
          case 'datetime': text = now.toLocaleString(); break
          case 'iso': text = now.toISOString(); break
          default: text = now.toLocaleDateString()
        }
        engine._handleInsertText(text)
      },
    },
    toolbarButtons: {
      insertdatetime: {
        label: 'Insert Date/Time',
        tooltip: 'Insert Date/Time',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor"/></svg>',
        command: 'insertDateTime',
      },
    },
    menuItems: { insert: [{ label: 'Date/Time', command: 'insertDateTime' }] },
  }
}
