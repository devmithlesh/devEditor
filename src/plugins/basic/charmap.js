const SPECIAL_CHARS = [
  { char: '\u00A9', name: 'Copyright' }, { char: '\u00AE', name: 'Registered' },
  { char: '\u2122', name: 'Trademark' }, { char: '\u2026', name: 'Ellipsis' },
  { char: '\u2013', name: 'En Dash' }, { char: '\u2014', name: 'Em Dash' },
  { char: '\u2018', name: 'Left Quote' }, { char: '\u2019', name: 'Right Quote' },
  { char: '\u201C', name: 'Left DblQuote' }, { char: '\u201D', name: 'Right DblQuote' },
  { char: '\u2190', name: 'Left Arrow' }, { char: '\u2191', name: 'Up Arrow' },
  { char: '\u2192', name: 'Right Arrow' }, { char: '\u2193', name: 'Down Arrow' },
  { char: '\u00B1', name: 'Plus Minus' }, { char: '\u00D7', name: 'Multiply' },
  { char: '\u00F7', name: 'Divide' }, { char: '\u2260', name: 'Not Equal' },
  { char: '\u2264', name: 'Less Equal' }, { char: '\u2265', name: 'Greater Equal' },
  { char: '\u00B0', name: 'Degree' }, { char: '\u00B5', name: 'Micro' },
  { char: '\u20AC', name: 'Euro' }, { char: '\u00A3', name: 'Pound' },
  { char: '\u00A5', name: 'Yen' }, { char: '\u00A2', name: 'Cent' },
  { char: '\u221A', name: 'Square Root' }, { char: '\u221E', name: 'Infinity' },
  { char: '\u2211', name: 'Summation' }, { char: '\u0394', name: 'Delta' },
  { char: '\u03C0', name: 'Pi' }, { char: '\u03A9', name: 'Omega' },
  { char: '\u2665', name: 'Heart' }, { char: '\u2605', name: 'Star' },
  { char: '\u2714', name: 'Check Mark' }, { char: '\u2718', name: 'Cross Mark' },
]

export function charmapPlugin() {
  return {
    name: 'charmap',
    commands: {
      charmap: (engine) => {
        const container = engine.getContainer()?.closest('.de-editor-container')
        if (!container) return

        const existing = container.querySelector('.de-charmap-dialog')
        if (existing) { existing.remove(); return }

        const dialog = document.createElement('div')
        dialog.className = 'de-charmap-dialog'
        dialog.innerHTML = `<div class="de-charmap-header"><span>Special Characters</span><button class="de-charmap-close">&times;</button></div>
          <div class="de-charmap-grid">${SPECIAL_CHARS.map(c => `<button class="de-charmap-char" title="${c.name}" data-char="${c.char}">${c.char}</button>`).join('')}</div>`
        container.appendChild(dialog)

        dialog.querySelector('.de-charmap-close').addEventListener('click', () => dialog.remove())
        dialog.querySelector('.de-charmap-grid').addEventListener('click', (e) => {
          const char = e.target.dataset?.char
          if (char) {
            engine._handleInsertText(char)
            dialog.remove()
          }
        })
      },
    },
    toolbarButtons: {
      charmap: {
        label: 'Special Characters',
        tooltip: 'Special Characters',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z" fill="currentColor"/></svg>',
        command: 'charmap',
      },
    },
    menuItems: { insert: [{ label: 'Special Character...', command: 'charmap' }] },
    css: `.de-charmap-dialog { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 1000; width: 360px; }
.de-charmap-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; font-weight: 600; font-size: 14px; }
.de-charmap-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; padding: 0; }
.de-charmap-close:hover { color: #111; }
.de-charmap-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; padding: 12px; max-height: 250px; overflow-y: auto; }
.de-charmap-char { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 4px; background: none; font-size: 18px; cursor: pointer; }
.de-charmap-char:hover { background: #dbeafe; border-color: #93c5fd; }`,
  }
}
