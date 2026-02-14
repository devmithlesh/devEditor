/**
 * Mention plugin — @mention system with autocomplete dropdown.
 * Detects @ typed in the editor and shows a filtered user list.
 * Inserts mention as styled inline text with a 'mention' mark.
 */

export function mentionPlugin() {
  return {
    name: 'mention',

    commands: [
      {
        name: 'insertMention',
        execute: (engine, name = '') => {
          if (!name) return
          engine._handleInsertText(`@${name} `)
        },
      },
    ],

    menuItems: [
      { menu: 'insert', label: 'Mention...', command: 'insertMention' },
    ],

    // The mention system hooks into the engine via _mentionState
    // The MentionDropdown component reads this state and renders the autocomplete
    init: (engine) => {
      engine._mentionState = null
      engine._mentionUsers = null // Can be set by user config

      // Hook into text insertion to detect @
      const origInsertText = engine._handleInsertText.bind(engine)
      engine._handleInsertText = function(text) {
        origInsertText(text)

        // After inserting, check if we just typed @ or are continuing a mention query
        if (text === '@') {
          const sel = engine._selection?.getSavedSelection()
          if (sel) {
            engine._mentionState = {
              isActive: true,
              startNodeId: sel.anchorNodeId,
              startOffset: sel.anchorOffset - 1, // The @ character position
              query: '',
            }
            engine._bumpVersion()
          }
        } else if (engine._mentionState?.isActive) {
          // User is typing after @, update query
          if (text === ' ' || text === '\n') {
            // Space/enter cancels mention
            engine._mentionState = null
            engine._bumpVersion()
          } else {
            engine._mentionState = {
              ...engine._mentionState,
              query: engine._mentionState.query + text,
            }
            engine._bumpVersion()
          }
        }
      }

      // Cancel mention on selection change (clicking elsewhere)
      const origSelChange = engine._onSelectionChange.bind(engine)
      engine._onSelectionChange = function() {
        origSelChange()
        // Only cancel if the user moved cursor significantly
        if (engine._mentionState?.isActive) {
          const sel = engine._selection?.getSavedSelection()
          if (sel && sel.anchorNodeId !== engine._mentionState.startNodeId) {
            engine._mentionState = null
          }
        }
      }

      // Cancel mention on backspace that removes the @
      const origBackspace = engine._handleBackspace.bind(engine)
      engine._handleBackspace = function() {
        if (engine._mentionState?.isActive) {
          const sel = engine._selection?.getSavedSelection()
          if (sel && sel.anchorOffset <= engine._mentionState.startOffset) {
            // Cursor moved before @, cancel
            engine._mentionState = null
          } else if (engine._mentionState.query.length > 0) {
            engine._mentionState = {
              ...engine._mentionState,
              query: engine._mentionState.query.slice(0, -1),
            }
          } else {
            // No query left, will delete the @
            engine._mentionState = null
          }
        }
        origBackspace()
      }
    },

    css: `.de-mention-dropdown { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 4px 0; min-width: 240px; max-width: 320px; }
.de-mention-dropdown::-webkit-scrollbar { width: 6px; }
.de-mention-dropdown::-webkit-scrollbar-track { background: #f9fafb; border-radius: 3px; }
.de-mention-dropdown::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.de-mention-dropdown::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
.de-mention-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border: none; background: transparent; cursor: pointer; font-size: 14px; text-align: left; transition: background-color 0.15s ease; border-bottom: 1px solid #f3f4f6; }
.de-mention-item:last-child { border-bottom: none; }
.de-mention-item:hover, .de-mention-item--selected { background: #f9fafb; }
.de-mention-avatar { width: 32px; height: 32px; border-radius: 6px; background: #3b82f6; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0; border: 1px solid #e5e7eb; }
.de-mention-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.de-mention-name { font-weight: 500; color: #111827; font-size: 14px; line-height: 1.4; }
.de-mention-id { color: #6b7280; font-size: 12px; line-height: 1.3; }
[data-node-id] span[style*="mention"] { background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 500; }`,
  }
}
