import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'

export function ContextMenu() {
  const engine = useEditorEngine()
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
      setIsOpen(true)
    }

    // Wait for container to be available
    const tryAttach = () => {
      const container = engine.getContainer()
      if (container && container !== containerRef.current) {
        if (containerRef.current) {
          containerRef.current.removeEventListener('contextmenu', handleContextMenu)
        }
        containerRef.current = container
        container.addEventListener('contextmenu', handleContextMenu)
        return true
      }
      return !!container
    }

    if (!tryAttach()) {
      const timer = setInterval(() => {
        if (tryAttach()) clearInterval(timer)
      }, 100)
      return () => {
        clearInterval(timer)
        if (containerRef.current) {
          containerRef.current.removeEventListener('contextmenu', handleContextMenu)
          containerRef.current = null
        }
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('contextmenu', handleContextMenu)
        containerRef.current = null
      }
    }
  }, [engine])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const escHandler = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [isOpen])

  const executeAction = useCallback((action) => {
    setIsOpen(false)
    switch (action) {
      case 'cut':
        document.execCommand('cut')
        break
      case 'copy':
        document.execCommand('copy')
        break
      case 'paste':
        navigator.clipboard?.readText().then(text => {
          if (text) engine._handleInsertText(text)
        }).catch(() => {})
        break
      case 'selectAll':
        if (engine.getContainer()) {
          const range = document.createRange()
          range.selectNodeContents(engine.getContainer())
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
        }
        break
      default:
        if (engine._commandRegistry) {
          try {
            engine._commandRegistry.execute(action)
          } catch (err) {
            console.warn(`ContextMenu: command "${action}" failed:`, err)
          }
        }
    }
  }, [engine])

  if (!isOpen) return null

  const menuItems = [
    { label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
    { type: 'separator' },
    { label: 'Select All', action: 'selectAll', shortcut: 'Ctrl+A' },
  ]

  return (
    <div
      ref={menuRef}
      className="de-context-menu"
      style={{ top: position.y, left: position.x }}
      role="menu"
    >
      {menuItems.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={`sep-${i}`} className="de-context-menu-separator" />
        }
        return (
          <button
            key={item.action}
            type="button"
            className="de-context-menu-item"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              executeAction(item.action)
            }}
            role="menuitem"
          >
            <span className="de-context-menu-label">{item.label}</span>
            {item.shortcut && <span className="de-context-menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
