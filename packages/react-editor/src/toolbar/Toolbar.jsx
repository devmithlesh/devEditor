/**
 * @fileoverview Toolbar — the main toolbar component.
 * Parses the toolbar config string, resolves buttons from plugins,
 * and renders with responsive overflow.
 */

import { useMemo } from 'react'
import { useEditorEngine } from '../core/EditorContext.jsx'
import { parseToolbarString, resolveToolbarGroups } from './ToolbarParser.js'
import { ToolbarOverflow } from './ToolbarOverflow.jsx'

/**
 * @param {{ config: string }} props
 */
export function Toolbar({ config }) {
  const engine = useEditorEngine()

  // Groups are resolved once from config + registered plugins.
  // Individual buttons subscribe to version changes via useEditorVersion()
  // for active state and label updates.
  const groups = useMemo(() => {
    const parsed = parseToolbarString(config)
    const allButtons = engine._pluginManager.getAllToolbarButtons()
    return resolveToolbarGroups(parsed, allButtons)
  }, [config, engine])

  if (groups.length === 0) return null

  return (
    <div className="de-toolbar" role="toolbar" aria-label="Editor toolbar">
      <ToolbarOverflow groups={groups} />
    </div>
  )
}
