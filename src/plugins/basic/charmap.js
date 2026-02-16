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
        // Trigger popup by finding the toolbar button and clicking it
        const container = engine.getContainer()?.closest('.de-editor-container')
        if (!container) return
        
        // Find the charmap button in toolbar (check both main toolbar and overflow)
        const toolbar = container.querySelector('.de-toolbar')
        if (!toolbar) return
        
        // Try to find button by data attribute or aria-label
        let charmapBtn = toolbar.querySelector('button[data-button-name="charmap"]')
        if (!charmapBtn) {
          charmapBtn = Array.from(toolbar.querySelectorAll('button')).find(btn => 
            btn.getAttribute('aria-label')?.toLowerCase().includes('special character') ||
            btn.getAttribute('aria-label')?.toLowerCase().includes('charmap')
          )
        }
        
        if (charmapBtn) {
          charmapBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
        }
      },
    },
    toolbarButtons: {
      charmap: {
        type: 'popup',
        label: 'Special Characters',
        tooltip: 'Special Characters',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z" fill="currentColor"/></svg>',
        popupType: 'charmap',
      },
    },
    menuItems: { insert: [{ label: 'Special Character...', command: 'charmap' }] },
    css: `.de-charmap-popup .de-charmap-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; padding: 12px; max-height: 300px; overflow-y: auto; }
.de-charmap-popup .de-charmap-char { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 4px; background: none; font-size: 18px; cursor: pointer; padding: 0; }
.de-charmap-popup .de-charmap-char:hover { background: #dbeafe; border-color: #93c5fd; }`,
  }
}
