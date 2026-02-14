/**
 * @fileoverview MentionDropdown — floating autocomplete list for @mentions.
 * Positioned at cursor location, supports keyboard navigation.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { getAbsoluteTextOffset, resolveAbsoluteTextOffset } from '../utils/helpers.js'

const DEFAULT_USERS = [
  { id: 'alice', name: 'Alice Johnson', avatar: '' },
  { id: 'bob', name: 'Bob Smith', avatar: '' },
  { id: 'charlie', name: 'Charlie Brown', avatar: '' },
  { id: 'diana', name: 'Diana Prince', avatar: '' },
  { id: 'eve', name: 'Eve Davis', avatar: '' },
  { id: 'frank', name: 'Frank Wilson', avatar: '' },
  { id: 'grace', name: 'Grace Lee', avatar: '' },
  { id: 'henry', name: 'Henry Miller', avatar: '' },
]

export function MentionDropdown() {
  const engine = useEditorEngine()
  const version = useEditorVersion()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const dropdownRef = useRef(null)

  // Get users from engine config or use defaults
  const users = engine._mentionUsers || DEFAULT_USERS

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.id.toLowerCase().includes(query.toLowerCase()))
    : users

  const selectMention = useCallback((user) => {
    if (!engine._mentionState) return

    const { startNodeId, startOffset } = engine._mentionState
    const queryLen = (engine._mentionState.query || '').length + 1 // +1 for @

    // Save history
    if (engine._historyManager) {
      engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
    }

    // Delete the @query text
    engine._model.applyTransaction({
      steps: [{
        type: 'deleteText',
        data: { nodeId: startNodeId, offset: startOffset, count: queryLen },
      }],
    })

    // Insert mention text as @name with a mention mark
    const mentionText = `@${user.name}`

    // Compute absolute cursor offset BEFORE the insert+mark transaction
    // Cursor should end up after the mention text + trailing space
    const absCursorOffset = getAbsoluteTextOffset(
      engine._model.doc, startNodeId, startOffset + mentionText.length + 1
    )

    engine._model.applyTransaction({
      steps: [
        { type: 'insertText', data: { nodeId: startNodeId, offset: startOffset, text: mentionText + ' ' } },
        {
          type: 'addMark',
          data: {
            startNodeId,
            startOffset,
            endNodeId: startNodeId,
            endOffset: startOffset + mentionText.length,
            mark: { type: 'mention', attrs: { userId: user.id, userName: user.name } },
          },
        },
      ],
    })

    // Resolve cursor position after text node splitting
    let cursorNodeId = startNodeId
    let cursorOffset = startOffset + mentionText.length + 1
    if (absCursorOffset !== -1) {
      const resolved = resolveAbsoluteTextOffset(engine._model.doc, absCursorOffset)
      if (resolved) {
        cursorNodeId = resolved.nodeId
        cursorOffset = resolved.offset
      }
    }

    engine._selection.setSavedSelection({
      anchorNodeId: cursorNodeId,
      anchorOffset: cursorOffset,
      focusNodeId: cursorNodeId,
      focusOffset: cursorOffset,
      isCollapsed: true,
    })

    engine._mentionState = null
    engine._reconcile()
    engine._selection.restoreSelection()
    engine._bumpVersion()
    setIsOpen(false)
  }, [engine])

  // Listen for mention state changes on the engine
  useEffect(() => {
    const checkMentionState = () => {
      const state = engine._mentionState
      if (state && state.isActive) {
        setIsOpen(true)
        setQuery(state.query)
        setSelectedIndex(0)

        // Position near cursor
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
          })
        }
      } else {
        setIsOpen(false)
        setQuery('')
      }
    }

    checkMentionState()
  }, [engine, version])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          const newIndex = Math.min(prev + 1, filtered.length - 1)
          // Scroll selected item into view
          setTimeout(() => {
            const dropdown = dropdownRef.current
            if (dropdown) {
              const selectedItem = dropdown.children[newIndex]
              if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }
            }
          }, 0)
          return newIndex
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          const newIndex = Math.max(prev - 1, 0)
          // Scroll selected item into view
          setTimeout(() => {
            const dropdown = dropdownRef.current
            if (dropdown) {
              const selectedItem = dropdown.children[newIndex]
              if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }
            }
          }, 0)
          return newIndex
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          selectMention(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        engine._mentionState = null
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [isOpen, filtered, selectedIndex, engine, selectMention])

  if (!isOpen || filtered.length === 0) return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="de-mention-dropdown"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 10002,
        maxHeight: '160px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {filtered.map((user, i) => {
        // Get initials from name (first letter of first and last name)
        const nameParts = user.name.split(' ')
        const initials = nameParts.length >= 2
          ? (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
          : user.name.charAt(0).toUpperCase()
        
        return (
          <button
            key={user.id}
            type="button"
            className={`de-mention-item${i === selectedIndex ? ' de-mention-item--selected' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onClick={() => selectMention(user)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="de-mention-avatar">
              {user.avatar || initials}
            </span>
            <div className="de-mention-content">
              <span className="de-mention-name">{user.name}</span>
              <span className="de-mention-id">@{user.id}</span>
            </div>
          </button>
        )
      })}
    </div>,
    document.body
  )
}
