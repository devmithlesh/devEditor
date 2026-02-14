/**
 * Video plugin — placeholder for video embedding.
 */

export function videoPlugin() {
  return {
    name: 'video',

    commands: [
      {
        name: 'insertVideo',
        execute: (engine) => {
          const url = prompt('Enter video URL (YouTube, Vimeo, etc.):')
          if (!url) return
          // For now, insert as a link
          engine._handleInsertText(url)
        },
      },
    ],

    menuItems: [
      { menu: 'insert', label: 'Video...', command: 'insertVideo' },
    ],
  }
}
