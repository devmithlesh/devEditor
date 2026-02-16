export function previewPlugin() {
  return {
    name: 'preview',
    commands: {
      preview: (engine) => {
        const html = engine.getContent()
        const win = window.open('', '_blank', 'width=800,height=600')
        if (!win) return
        win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;color:#333}
img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}
blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1em;color:#666}
pre{background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto}</style>
</head><body>${html}</body></html>`)
        win.document.close()
      },
    },
    toolbarButtons: {
      preview: {
        label: 'Preview',
        tooltip: 'Preview',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>',
        command: 'preview',
      },
    },
  }
}
