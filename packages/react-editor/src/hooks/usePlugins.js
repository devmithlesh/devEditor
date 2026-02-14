/**
 * @fileoverview usePlugins hook — registers/unregisters plugins on mount/unmount.
 */

import { useEffect } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'

export function usePlugins(plugins) {
  const engine = useEditorEngine()

  useEffect(() => {
    if (!plugins || plugins.length === 0) return

    for (const plugin of plugins) {
      engine._pluginManager.register(plugin)
    }

    return () => {
      for (const plugin of plugins) {
        engine._pluginManager.unregister(plugin.name)
      }
    }
  }, [engine, plugins])
}
