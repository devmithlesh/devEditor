/**
 * @fileoverview StatusBar — bottom bar showing word count, element path, and resize handle.
 *
 * Props:
 *   showWordCount   {boolean} - Whether to display word/character counts
 *   showElementPath {boolean} - Whether to display the element breadcrumb trail
 *   resize          {boolean} - Whether to show the resize handle
 *   onResize        {(newHeight: number) => void} - Callback when user drags the resize handle
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'
import { walkTree, findNodeById } from '../utils/helpers.js'

/**
 * Map a document node type to a human-readable HTML tag name for the breadcrumb.
 * @param {Object} node
 * @returns {string}
 */
function nodeTypeToTag(node) {
  switch (node.type) {
    case 'doc':
      return 'body'
    case 'paragraph':
      return 'p'
    case 'heading':
      return `h${node.attrs?.level || 1}`
    case 'blockquote':
      return 'blockquote'
    case 'codeBlock':
      return 'pre'
    case 'bulletList':
      return 'ul'
    case 'orderedList':
      return 'ol'
    case 'listItem':
      return 'li'
    case 'table':
      return 'table'
    case 'tableRow':
      return 'tr'
    case 'tableCell':
      return node.attrs?.header ? 'th' : 'td'
    case 'image':
      return 'img'
    case 'horizontalRule':
      return 'hr'
    case 'hardBreak':
      return 'br'
    case 'text':
      return '#text'
    default:
      return node.type
  }
}

/**
 * Map a mark type to its HTML tag equivalent.
 * @param {string} markType
 * @returns {string}
 */
function markToTag(markType) {
  switch (markType) {
    case 'bold':
      return 'strong'
    case 'italic':
      return 'em'
    case 'underline':
      return 'u'
    case 'strikethrough':
      return 's'
    case 'code':
      return 'code'
    case 'link':
      return 'a'
    default:
      return markType
  }
}

/**
 * Build the ancestry path from the document root down to a specific node ID.
 * Returns an array of { node, tag } objects representing the path.
 * @param {Object} doc - The document root node
 * @param {string} nodeId - The target node ID
 * @returns {Array<{ node: Object, tag: string }>}
 */
function buildElementPath(doc, nodeId) {
  const path = []
  let found = false

  function walk(node, ancestors) {
    if (found) return
    const current = [...ancestors, node]

    if (node.id === nodeId) {
      found = true
      for (const ancestor of current) {
        path.push({ node: ancestor, tag: nodeTypeToTag(ancestor) })
      }
      // If the target is a text node with marks, append the mark tags
      if (node.type === 'text' && node.marks && node.marks.length > 0) {
        // Remove the #text entry at the end — we replace it with mark tags
        path.pop()
        for (const mark of node.marks) {
          path.push({ node, tag: markToTag(mark.type) })
        }
      } else if (node.type === 'text') {
        // Remove the bare #text — breadcrumbs typically stop at the inline wrapper
        path.pop()
      }
      return
    }

    if (node.content) {
      for (let i = 0; i < node.content.length; i++) {
        walk(node.content[i], current)
        if (found) return
      }
    }
  }

  walk(doc, [])
  return path
}

/**
 * Collect all text content from a document tree.
 * @param {Object} doc
 * @returns {string}
 */
function collectText(doc) {
  const parts = []
  walkTree(doc, (node) => {
    if (node.type === 'text' && node.text) {
      parts.push(node.text)
    }
  })
  return parts.join('')
}

/**
 * Count words in a string. Splits on whitespace, filters empty tokens.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function StatusBar({ showWordCount = true, showElementPath = true, resize = false, onResize }) {
  const engine = useEditorEngine()
  const version = useEditorVersion() // triggers re-render on state change

  const resizeRef = useRef(null)

  // --- Word count & character count ---
  const { wordCount, charCount } = useMemo(() => {
    // version is used implicitly to bust the memo cache
    void version
    const doc = engine.getDoc()
    const text = collectText(doc)
    return {
      wordCount: countWords(text),
      charCount: text.length,
    }
  }, [engine, version])

  // --- Element path ---
  const elementPath = useMemo(() => {
    void version
    if (!showElementPath) return []
    const doc = engine.getDoc()
    const sel = engine._selection?.getSavedSelection()
    if (!sel) return [{ node: doc, tag: 'body' }]

    const targetId = sel.focusNodeId || sel.anchorNodeId
    if (!targetId) return [{ node: doc, tag: 'body' }]

    // Verify the node exists
    const targetNode = findNodeById(doc, targetId)
    if (!targetNode) return [{ node: doc, tag: 'body' }]

    const path = buildElementPath(doc, targetId)
    return path.length > 0 ? path : [{ node: doc, tag: 'body' }]
  }, [engine, version, showElementPath])

  // --- Resize handle ---
  const handleResizeMouseDown = useCallback((e) => {
    if (!onResize) return
    e.preventDefault()

    const startY = e.clientY
    // Find the editor content area to measure its current height
    const container = engine.getContainer()
    if (!container) return
    const startHeight = container.offsetHeight

    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(100, startHeight + deltaY)
      onResize(newHeight)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [engine, onResize])

  // --- Click on path item to select that node ---
  const handlePathItemClick = useCallback((node) => {
    if (!node || !node.id || node.type === 'doc') return
    engine.focus()
    if (engine._selection) {
      // Find the first text node within this node for cursor placement
      let firstTextId = null
      walkTree(node, (n) => {
        if (n.type === 'text' && !firstTextId) {
          firstTextId = n.id
          return false
        }
      })
      if (firstTextId) {
        engine._selection.setCursorToNode(firstTextId, 0)
      }
    }
  }, [engine])

  return (
    <div className="de-statusbar">
      {/* Left side: element path */}
      <div className="de-statusbar-path">
        {showElementPath && elementPath.map((item, i) => (
          <span key={item.node.id ? `${item.node.id}-${item.tag}` : `path-${i}`}>
            {i > 0 && <span className="de-statusbar-path-sep">{' > '}</span>}
            <span
              className="de-statusbar-path-item"
              onClick={() => handlePathItemClick(item.node)}
              role="button"
              tabIndex={-1}
            >
              {item.tag}
            </span>
          </span>
        ))}
      </div>

      {/* Right side: word count + resize handle */}
      <div className="de-statusbar-right">
        {showWordCount && (
          <span className="de-statusbar-wordcount">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}, {charCount} {charCount === 1 ? 'char' : 'chars'}
          </span>
        )}
        {resize && (
          <span
            ref={resizeRef}
            className="de-statusbar-resize"
            onMouseDown={handleResizeMouseDown}
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize"
          />
        )}
      </div>
    </div>
  )
}
