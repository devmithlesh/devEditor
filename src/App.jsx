import { useRef } from 'react'
import { Editor, defaultPlugins } from '@deveditor/react-editor'
import '@deveditor/react-editor/styles'
import './App.css'

function App() {
  const editorRef = useRef(null)

  return (
    <div className="demo-container">
      <header className="demo-header">
        <h1>DevEditor</h1>
        <p>A modern React rich text editor — built from scratch</p>
      </header>

      <main className="demo-main">
        <Editor
          ref={editorRef}
          init={{
            height: 500,
            menubar: 'file edit view insert format tools table help',
            plugins: defaultPlugins(),
            toolbar: [
              'formatselect fontfamily fontsize | undo redo | bold italic underline strikethrough | forecolor backcolor',
              'alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | link image table | searchreplace charmap emoticons | fullscreen preview print sourceview | removeformat',
            ].join(' | '),
            statusbar: true,
            wordcount: true,
            elementpath: true,
            resize: true,
            browser_spellcheck: true,
            contextmenu: true,
            placeholder: 'Start typing...',
            content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; line-height: 1.7; }',
          }}
        />
      </main>
    </div>
  )
}

export default App
