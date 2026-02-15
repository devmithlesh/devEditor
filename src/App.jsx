import { useRef } from 'react'
import { Editor, defaultPlugins, mentionPlugin } from './index.js'
import './styles/base.css'
import './App.css'

function App() {
  const editorRef = useRef(null)

  // Custom users for @mention feature
  const customUsers = [
    { id: 'john', name: 'John Doe', avatar: 'JD' },
    { id: 'jane', name: 'Jane Smith', avatar: 'JS' },
    { id: 'bob', name: 'Bob Johnson', avatar: 'BJ' },
    { id: 'alice', name: 'Alice Cooper', avatar: 'AC' },
  ]

  const handleInit = (editor) => {
    // Set custom users for @mention
    if (editor && editor._engine) {
      editor._engine._mentionUsers = customUsers
    }
  }

  return (
    <div className="demo-container">
      <main className="demo-main">
        <Editor
          ref={editorRef}
          onInit={handleInit}
          init={{
            height: 500,
            menubar: 'file edit view insert format tools table help',
            plugins: [
              ...defaultPlugins(),
              mentionPlugin(), // Enable @mention feature
            ],
            toolbar: [
              'formatselect  fontsize | undo redo | bold italic underline strikethrough | forecolor backcolor',
              'alignment | bullist numlist | link image table | searchreplace charmap emoticons | fullscreen preview print sourceview | removeformat',
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
          onEditorChange={(content) => {
            // You can extract mentions from content here if needed
            console.log('Editor content changed')
          }}
        />
      </main>
    </div>
  )
}

export default App
