// @deveditor/react-editor — Main entry point

// Components
export { Editor } from './components/Editor.jsx'
export { EditorContainer } from './components/EditorContainer.jsx'
export { EditorContent } from './components/EditorContent.jsx'
export { StatusBar } from './components/StatusBar.jsx'

// Core
export { EditorEngine } from './core/EditorEngine.js'
export { CommandRegistry } from './core/CommandRegistry.js'
export { PluginManager } from './core/PluginManager.js'
export { HistoryManager } from './core/HistoryManager.js'
export { DocumentModel } from './core/DocumentModel.js'
export { SelectionManager } from './core/SelectionManager.js'
export { EditorProvider, useEditorEngine, useEditorVersion } from './core/EditorContext.jsx'

// API
export { EditorInstance } from './api/EditorInstance.js'

// Hooks
export { useEditor } from './hooks/useEditor.js'
export { useSelection } from './hooks/useSelection.js'
export { useHistory } from './hooks/useHistory.js'
export { useToolbar } from './hooks/useToolbar.js'
export { usePlugins } from './hooks/usePlugins.js'

// Toolbar
export { Toolbar } from './toolbar/Toolbar.jsx'
export { ToolbarButton } from './toolbar/ToolbarButton.jsx'
export { ToolbarDropdown } from './toolbar/ToolbarDropdown.jsx'
export { ToolbarGroup } from './toolbar/ToolbarGroup.jsx'
export { Tooltip } from './toolbar/Tooltip.jsx'
export { parseToolbarString, resolveToolbarGroups } from './toolbar/ToolbarParser.js'

// MenuBar
export { MenuBar } from './menubar/MenuBar.jsx'
export { MenuItem } from './menubar/MenuItem.jsx'
export { MenuDropdown } from './menubar/MenuDropdown.jsx'
export { parseMenubarString, getDefaultMenuItems } from './menubar/MenuParser.js'

// Plugins
export { defaultPlugins } from './plugins/index.js'
export {
  boldPlugin, italicPlugin, underlinePlugin, strikethroughPlugin,
  headingPlugin, listsPlugin, alignmentPlugin, linkPlugin,
  indentPlugin, removeFormatPlugin, wordCountPlugin, horizontalRulePlugin,
  fontFamilyPlugin, fontSizePlugin, foreColorPlugin, backColorPlugin,
  fullscreenPlugin, previewPlugin, printPlugin, sourceViewPlugin,
  searchReplacePlugin, charmapPlugin, emoticonsPlugin, insertDateTimePlugin,
  directionalityPlugin, pageBreakPlugin, nonBreakingPlugin, anchorPlugin,
  codeSamplePlugin, autosavePlugin, undoRedoPlugin,
  tablePlugin, imagePlugin, codeBlockPlugin, videoPlugin, mentionPlugin,
  toggleMark, isMarkActive, applyMarkToSelection, removeMarkFromSelection,
} from './plugins/index.js'

// Serializers
export { serializeToHtml } from './serializer/htmlSerializer.js'
export { parseHtml } from './serializer/htmlParser.js'
export { serializeToJson, parseJson } from './serializer/jsonSerializer.js'
export { sanitizeHtml } from './serializer/sanitize.js'
export { exportFullHtml } from './serializer/exportHtml.js'

export const VERSION = '0.1.0'
