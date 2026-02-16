/**
 * @fileoverview Editor — the main export component.
 * Config-driven, matches TinyMCE's API pattern.
 *
 * Usage:
 *   <Editor
 *     initialValue="<p>Hello</p>"
 *     onInit={(editor) => {}}
 *     init={{ height: 500, menubar: '...', toolbar: '...', plugins: [...] }}
 *     onEditorChange={(content, editor) => {}}
 *     onBlur={(editor) => {}}
 *   />
 */

import { forwardRef, useImperativeHandle, useCallback, useState, useEffect, useRef } from 'react'
import { useEditor } from '../hooks/useEditor.js'
import { EditorProvider } from '../core/EditorContext.jsx'
import { EditorContainer } from './EditorContainer.jsx'
import { EditorContent } from './EditorContent.jsx'
import { StatusBar } from './StatusBar.jsx'
import { ContextMenu } from './ContextMenu.jsx'
import { Toolbar } from '../toolbar/Toolbar.jsx'
import { MenuBar } from '../menubar/MenuBar.jsx'
import { MentionDropdown } from './MentionDropdown.jsx'
import { ImageResizeOverlay } from './ImageResizeOverlay.jsx'
import { TableResizeOverlay } from './TableResizeOverlay.jsx'

const DEFAULT_TOOLBAR = 'undo redo | formatselect | bold italic underline strikethrough | alignleft | bullist numlist | outdent indent | link image | removeformat'
const DEFAULT_MENUBAR = 'file edit view insert format tools table help'

const Editor = forwardRef(function Editor(props, ref) {
  const {
    initialValue,
    value,
    onInit,
    init = {},
    onEditorChange,
    onBlur,
  } = props

  const { engine, instance } = useEditor({
    initialValue: value !== undefined ? value : initialValue,
    onInit,
    init,
    onEditorChange,
    onBlur,
  })

  useImperativeHandle(ref, () => instance, [instance])

  const [editorHeight, setEditorHeight] = useState(init.height || 300)
  const isUpdatingFromPropRef = useRef(false)
  const contentAreaRef = useRef(null)

  // Handle controlled value prop (like TinyMCE React)
  useEffect(() => {
    if (value !== undefined && engine) {
      const currentContent = engine.getContent()
      // Only update if content actually differs (avoid unnecessary updates)
      if (currentContent !== value) {
        isUpdatingFromPropRef.current = true
        engine.setContent(value)
        // Reset flag after a short delay to allow the update to complete
        requestAnimationFrame(() => {
          isUpdatingFromPropRef.current = false
        })
      }
    }
  }, [value, engine])

  // Update CSS variable for editor height
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--de-content-min-height', `${editorHeight}px`)
    }
  }, [editorHeight])

  const contentStyle = {
    // Remove inline minHeight - now using CSS variable
  }

  const handleBlur = useCallback(() => {
    if (onBlur && instance) {
      onBlur(instance)
    }
  }, [onBlur, instance])

  const handleResize = useCallback((newHeight) => {
    setEditorHeight(newHeight)
  }, [])

  const showMenubar = init.menubar !== false
  const showToolbar = init.toolbar !== false
  const showStatusbar = init.statusbar !== false
  const menubarConfig = typeof init.menubar === 'string' ? init.menubar : DEFAULT_MENUBAR
  
  // Handle toolbar as string or array (like TinyMCE)
  let toolbarConfig = DEFAULT_TOOLBAR
  if (init.toolbar !== undefined && init.toolbar !== false) {
    if (typeof init.toolbar === 'string') {
      toolbarConfig = init.toolbar
    } else if (Array.isArray(init.toolbar)) {
      toolbarConfig = init.toolbar.join(' | ')
    }
  }

  return (
    <EditorProvider engine={engine}>
      <EditorContainer>
        {showMenubar && <MenuBar config={menubarConfig} />}
        {showToolbar && <Toolbar config={toolbarConfig} />}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <EditorContent
            ref={contentAreaRef}
            style={contentStyle}
            onBlur={handleBlur}
            placeholder={init.placeholder}
            spellCheck={init.browser_spellcheck !== false}
          />
          <ImageResizeOverlay contentRef={contentAreaRef} />
          <TableResizeOverlay contentRef={contentAreaRef} />
        </div>
        {showStatusbar && (
          <StatusBar
            showWordCount={init.wordcount !== false}
            showElementPath={init.elementpath !== false}
            resize={init.resize !== false}
            onResize={handleResize}
          />
        )}
        {init.contextmenu !== false && <ContextMenu />}
        <MentionDropdown />
      </EditorContainer>
    </EditorProvider>
  )
})

export { Editor }
