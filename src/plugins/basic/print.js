export function printPlugin() {
  return {
    name: 'print',
    commands: {
      print: (engine) => {
        const html = engine.getContent()
        const frame = document.createElement('iframe')
        frame.style.position = 'fixed'
        frame.style.left = '-9999px'
        frame.style.top = '-9999px'
        document.body.appendChild(frame)
        const doc = frame.contentDocument || frame.contentWindow.document
        doc.open()
        doc.write(`<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;padding:20px;color:#333}
img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}
</style></head><body>${html}</body></html>`)
        doc.close()
        frame.contentWindow.focus()
        frame.contentWindow.print()
        setTimeout(() => document.body.removeChild(frame), 1000)
      },
    },
    toolbarButtons: {
      print: {
        label: 'Print',
        tooltip: 'Print (Ctrl+P)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" fill="currentColor"/></svg>',
        command: 'print',
      },
    },
    menuItems: { file: [{ label: 'Print', command: 'print', shortcut: 'Ctrl+P' }] },
    shortcuts: { 'ctrl+p': 'print' },
  }
}
