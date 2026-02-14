/**
 * @fileoverview useEditor hook — initializes the EditorEngine, registers plugins,
 * wires up callbacks, and returns the engine + public instance.
 */

import { useRef, useEffect, useCallback } from 'react'
import { EditorEngine } from '../core/EditorEngine.js'
import { CommandRegistry } from '../core/CommandRegistry.js'
import { PluginManager } from '../core/PluginManager.js'
import { HistoryManager } from '../core/HistoryManager.js'
import { EditorInstance } from '../api/EditorInstance.js'
import { debounce } from '../utils/helpers.js'

/**
 * @param {Object} options
 * @param {string} [options.initialValue]
 * @param {function} [options.onInit]
 * @param {Object} [options.init]
 * @param {function} [options.onEditorChange]
 * @param {function} [options.onBlur]
 * @returns {{ engine: EditorEngine, instance: EditorInstance }}
 */
export function useEditor({ initialValue, onInit, init = {}, onEditorChange, onBlur }) {
  const engineRef = useRef(null)
  const instanceRef = useRef(null)
  const initializedRef = useRef(false)
  const onInitRef = useRef(onInit)
  const initRef = useRef(init)

  // Create engine once
  if (!engineRef.current) {
    const engine = new EditorEngine()
    const commandRegistry = new CommandRegistry(engine)
    const pluginManager = new PluginManager(engine, commandRegistry)
    const historyManager = new HistoryManager()

    engine._commandRegistry = commandRegistry
    engine._pluginManager = pluginManager
    engine._historyManager = historyManager

    // Register built-in undo/redo commands
    commandRegistry.register('undo', (eng) => eng.undo())
    commandRegistry.register('redo', (eng) => eng.redo())
    commandRegistry.registerShortcut('ctrl+z', 'undo')
    commandRegistry.registerShortcut('ctrl+y', 'redo')
    commandRegistry.registerShortcut('ctrl+shift+z', 'redo')

    // Register plugins from init config
    if (init.plugins && Array.isArray(init.plugins)) {
      for (const plugin of init.plugins) {
        pluginManager.register(plugin)
      }
    }

    // Parse initial content
    if (initialValue) {
      engine.setContent(initialValue)
    }

    // Inject content style
    if (init.content_style) {
      engine.injectContentStyle(init.content_style)
    }

    engineRef.current = engine
    instanceRef.current = new EditorInstance(engine)
  }

  // Wire up onChange with debounce
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !onEditorChange) return

    const debouncedChange = debounce(() => {
      const html = engine.getContent()
      onEditorChange(html, instanceRef.current)
    }, 100)

    const unsubscribe = engine.subscribe(() => {
      // Only trigger onChange if not updating from external prop
      debouncedChange()
    })

    return () => {
      unsubscribe()
      debouncedChange.cancel()
    }
  }, [onEditorChange])

  // Update refs when props change
  useEffect(() => {
    onInitRef.current = onInit
    initRef.current = init
  }, [onInit, init])

  // Call onInit after first mount
  useEffect(() => {
    if (!initializedRef.current && instanceRef.current) {
      initializedRef.current = true

      // Delay slightly to ensure DOM is attached
      requestAnimationFrame(() => {
        // Call setup callback
        if (initRef.current.setup) {
          initRef.current.setup(instanceRef.current)
        }

        // Call onInit
        if (onInitRef.current) {
          onInitRef.current(instanceRef.current)
        }
      })
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const engine = engineRef.current
      if (engine) {
        engine.removeContentStyle()
        engine._pluginManager?.removeAllStyles()
        engine.detach()
      }
    }
  }, [])

  return {
    engine: engineRef.current,
    instance: instanceRef.current,
  }
}
