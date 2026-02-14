/**
 * @fileoverview EmojiPopup — floating panel with emoji grid and search.
 */

import { useState, useRef, useEffect } from 'react'
import { useEditorEngine } from '../../core/EditorContext.jsx'
import { ToolbarPopup } from '../ToolbarPopup.jsx'

const EMOJI_LIST = [
  { emoji: '\u{1F600}', name: 'grinning' }, { emoji: '\u{1F603}', name: 'smiley' },
  { emoji: '\u{1F604}', name: 'smile' }, { emoji: '\u{1F601}', name: 'grin' },
  { emoji: '\u{1F606}', name: 'laughing' }, { emoji: '\u{1F605}', name: 'sweat smile' },
  { emoji: '\u{1F923}', name: 'rofl' }, { emoji: '\u{1F602}', name: 'joy' },
  { emoji: '\u{1F642}', name: 'slightly smiling' }, { emoji: '\u{1F643}', name: 'upside down' },
  { emoji: '\u{1F609}', name: 'wink' }, { emoji: '\u{1F60A}', name: 'blush' },
  { emoji: '\u{1F607}', name: 'innocent' }, { emoji: '\u{1F970}', name: 'smiling hearts' },
  { emoji: '\u{1F60D}', name: 'heart eyes' }, { emoji: '\u{1F929}', name: 'star struck' },
  { emoji: '\u{1F618}', name: 'kissing heart' }, { emoji: '\u{1F617}', name: 'kissing' },
  { emoji: '\u{1F61A}', name: 'kissing closed eyes' }, { emoji: '\u{1F619}', name: 'kissing smiling' },
  { emoji: '\u{1F60B}', name: 'yum' }, { emoji: '\u{1F61B}', name: 'tongue' },
  { emoji: '\u{1F61C}', name: 'wink tongue' }, { emoji: '\u{1F92A}', name: 'zany' },
  { emoji: '\u{1F61D}', name: 'squinting tongue' }, { emoji: '\u{1F911}', name: 'money mouth' },
  { emoji: '\u{1F917}', name: 'hugging' }, { emoji: '\u{1F92D}', name: 'hand over mouth' },
  { emoji: '\u{1F92B}', name: 'shushing' }, { emoji: '\u{1F914}', name: 'thinking' },
  { emoji: '\u{1F910}', name: 'zipper mouth' }, { emoji: '\u{1F928}', name: 'raised eyebrow' },
  { emoji: '\u{1F610}', name: 'neutral' }, { emoji: '\u{1F611}', name: 'expressionless' },
  { emoji: '\u{1F636}', name: 'no mouth' }, { emoji: '\u{1F60F}', name: 'smirk' },
  { emoji: '\u{1F612}', name: 'unamused' }, { emoji: '\u{1F644}', name: 'eye roll' },
  { emoji: '\u{1F62C}', name: 'grimacing' }, { emoji: '\u{1F925}', name: 'lying' },
  { emoji: '\u{1F44D}', name: 'thumbs up' }, { emoji: '\u{1F44E}', name: 'thumbs down' },
  { emoji: '\u{1F44F}', name: 'clapping' }, { emoji: '\u{1F64C}', name: 'raised hands' },
  { emoji: '\u{1F91D}', name: 'handshake' }, { emoji: '\u{1F44B}', name: 'wave' },
  { emoji: '\u270C\uFE0F', name: 'victory' }, { emoji: '\u{1F91E}', name: 'crossed fingers' },
  { emoji: '\u{1F91F}', name: 'love you' }, { emoji: '\u{1F918}', name: 'rock on' },
  { emoji: '\u2764\uFE0F', name: 'red heart' }, { emoji: '\u{1F9E1}', name: 'orange heart' },
  { emoji: '\u{1F49B}', name: 'yellow heart' }, { emoji: '\u{1F49A}', name: 'green heart' },
  { emoji: '\u{1F499}', name: 'blue heart' }, { emoji: '\u{1F49C}', name: 'purple heart' },
  { emoji: '\u{1F5A4}', name: 'black heart' }, { emoji: '\u{1F90D}', name: 'white heart' },
  { emoji: '\u{1F4AF}', name: 'hundred' }, { emoji: '\u{1F4A2}', name: 'anger' },
  { emoji: '\u2B50', name: 'star' }, { emoji: '\u{1F31F}', name: 'glowing star' },
  { emoji: '\u2728', name: 'sparkles' }, { emoji: '\u{1F4AB}', name: 'dizzy' },
  { emoji: '\u{1F525}', name: 'fire' }, { emoji: '\u{1F4A5}', name: 'boom' },
  { emoji: '\u{1F389}', name: 'party' }, { emoji: '\u{1F38A}', name: 'confetti' },
  { emoji: '\u{1F3C6}', name: 'trophy' }, { emoji: '\u{1F3AF}', name: 'dart' },
  { emoji: '\u{1F4DD}', name: 'memo' }, { emoji: '\u{1F4E7}', name: 'email' },
  { emoji: '\u2705', name: 'check' }, { emoji: '\u274C', name: 'cross mark' },
  { emoji: '\u{1F6A8}', name: 'alert' }, { emoji: '\u{1F4A1}', name: 'lightbulb' },
  { emoji: '\u{1F50D}', name: 'search' }, { emoji: '\u{1F680}', name: 'rocket' },
  { emoji: '\u{1F308}', name: 'rainbow' }, { emoji: '\u2600\uFE0F', name: 'sun' },
  { emoji: '\u{1F319}', name: 'moon' }, { emoji: '\u{1F30E}', name: 'globe' },
]

export function EmojiPopup({ anchorRef, isOpen, onClose }) {
  const engine = useEditorEngine()
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filtered = search
    ? EMOJI_LIST.filter((e) => e.name.includes(search.toLowerCase()))
    : EMOJI_LIST

  const handleSelect = (emoji) => {
    engine._selection?.restoreSelection()
    engine._isExecutingCommand = true
    try {
      engine._handleInsertText(emoji)
    } finally {
      engine._isExecutingCommand = false
    }
  }

  return (
    <ToolbarPopup anchorRef={anchorRef} isOpen={isOpen} onClose={onClose} width={320}>
      <div className="de-popup-header">
        <span>Emoticons</span>
        <button className="de-popup-close" onClick={onClose}>&times;</button>
      </div>
      <div className="de-popup-field">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
        />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: '2px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {filtered.map((e) => (
          <button
            key={e.emoji}
            type="button"
            title={e.name}
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: 'none', borderRadius: '4px',
              background: 'none', fontSize: '18px', cursor: 'pointer', padding: 0,
            }}
            onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation() }}
            onClick={() => handleSelect(e.emoji)}
          >
            {e.emoji}
          </button>
        ))}
      </div>
    </ToolbarPopup>
  )
}
