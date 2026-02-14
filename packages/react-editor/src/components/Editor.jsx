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

import { forwardRef, useImperativeHandle, useCallback, useState } from 'react'
import { useEditor } from '../hooks/useEditor.js'
import { EditorProvider } from '../core/EditorContext.jsx'
import { EditorContainer } from './EditorContainer.jsx'
import { EditorContent } from './EditorContent.jsx'
import { StatusBar } from './StatusBar.jsx'
import { ContextMenu } from './ContextMenu.jsx'
import { Toolbar } from '../toolbar/Toolbar.jsx'
import { MenuBar } from '../menubar/MenuBar.jsx'
import { MentionDropdown } from './MentionDropdown.jsx'

const DEFAULT_TOOLBAR = 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image | removeformat'
const DEFAULT_MENUBAR = 'file edit view insert format tools table help'

const Editor = forwardRef(function Editor(props, ref) {
  const {
    initialValue,
    onInit,
    init = {},
    onEditorChange,
    onBlur,
  } = props

  const { engine, instance } = useEditor({
    initialValue,
    onInit,
    init,
    onEditorChange,
    onBlur,
  })

  useImperativeHandle(ref, () => instance, [instance])

  const [editorHeight, setEditorHeight] = useState(init.height || 300)

  const contentStyle = {
    minHeight: `${editorHeight}px`,
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
  const toolbarConfig = typeof init.toolbar === 'string' ? init.toolbar : DEFAULT_TOOLBAR

  return (
    <EditorProvider engine={engine}>
      <EditorContainer>
        {showMenubar && <MenuBar config={menubarConfig} />}
        {showToolbar && <Toolbar config={toolbarConfig} />}
        <EditorContent
          style={contentStyle}
          onBlur={handleBlur}
          placeholder={init.placeholder}
          spellCheck={init.browser_spellcheck !== false}
        />
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
