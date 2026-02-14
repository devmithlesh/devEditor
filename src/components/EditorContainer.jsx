/**
 * @fileoverview EditorContainer — outer wrapper with border and flex layout.
 */

export function EditorContainer({ children }) {
  return (
    <div className="de-editor-container">
      {children}
    </div>
  )
}
