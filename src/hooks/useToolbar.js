/**
 * @fileoverview useToolbar hook — returns resolved toolbar groups.
 */

import { useMemo } from 'react'
import { useEditorEngine, useEditorVersion } from '../core/EditorContext.jsx'

/**
 * Parse a toolbar string and resolve to button definitions.
 * @param {string} toolbarConfig
 */
export function useToolbar(toolbarConfig) {
  const engine = useEditorEngine()
  const version = useEditorVersion()

  return useMemo(() => {
    if (!toolbarConfig) return []

    const groups = toolbarConfig.split('|').map((group) =>
      group.trim().split(/\s+/).filter(Boolean)
    )

    const allButtons = engine._pluginManager.getAllToolbarButtons()

    return groups.map((group) =>
      group.map((name) => allButtons.get(name)).filter(Boolean)
    ).filter((group) => group.length > 0)
  }, [toolbarConfig, engine, version])
}
