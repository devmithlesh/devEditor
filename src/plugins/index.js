// Basic plugins — import locally so defaultPlugins() can reference them
import { boldPlugin } from './basic/bold.js'
import { italicPlugin } from './basic/italic.js'
import { underlinePlugin } from './basic/underline.js'
import { strikethroughPlugin } from './basic/strikethrough.js'
import { headingPlugin } from './basic/heading.js'
import { listsPlugin } from './basic/lists.js'
import { alignmentPlugin } from './basic/alignment.js'
import { linkPlugin } from './basic/link.js'
import { indentPlugin } from './basic/indent.js'
import { removeFormatPlugin } from './basic/removeformat.js'
import { wordCountPlugin } from './basic/wordcount.js'
import { horizontalRulePlugin } from './basic/hr.js'
import { fontFamilyPlugin } from './basic/fontfamily.js'
import { fontSizePlugin } from './basic/fontsize.js'
import { foreColorPlugin } from './basic/forecolor.js'
import { backColorPlugin } from './basic/backcolor.js'
import { fullscreenPlugin } from './basic/fullscreen.js'
import { previewPlugin } from './basic/preview.js'
import { printPlugin } from './basic/print.js'
import { sourceViewPlugin } from './basic/sourceview.js'
import { searchReplacePlugin } from './basic/searchreplace.js'
import { charmapPlugin } from './basic/charmap.js'
import { emoticonsPlugin } from './basic/emoticons.js'
import { insertDateTimePlugin } from './basic/insertdatetime.js'
import { directionalityPlugin } from './basic/directionality.js'
import { pageBreakPlugin } from './basic/pagebreak.js'
import { nonBreakingPlugin } from './basic/nonbreaking.js'
import { anchorPlugin } from './basic/anchor.js'
import { codeSamplePlugin } from './basic/codesample.js'
import { autosavePlugin } from './basic/autosave.js'
import { undoRedoPlugin } from './basic/undoredo.js'
import { clipboardPlugin } from './basic/clipboard.js'
import { utilityPlugin } from './basic/utility.js'

// Advanced plugins
import { tablePlugin } from './advanced/table.js'
import { imagePlugin } from './advanced/image.js'
import { codeBlockPlugin } from './advanced/codeblock.js'
import { videoPlugin } from './advanced/video.js'
import { mentionPlugin } from './advanced/mention.js'

// Shared utilities
import { toggleMark, isMarkActive, applyMarkToSelection, removeMarkFromSelection } from './basic/bold.js'

// Re-export everything
export {
  boldPlugin, italicPlugin, underlinePlugin, strikethroughPlugin,
  headingPlugin, listsPlugin, alignmentPlugin, linkPlugin,
  indentPlugin, removeFormatPlugin, wordCountPlugin, horizontalRulePlugin,
  fontFamilyPlugin, fontSizePlugin, foreColorPlugin, backColorPlugin,
  fullscreenPlugin, previewPlugin, printPlugin, sourceViewPlugin,
  searchReplacePlugin, charmapPlugin, emoticonsPlugin, insertDateTimePlugin,
  directionalityPlugin, pageBreakPlugin, nonBreakingPlugin, anchorPlugin,
  codeSamplePlugin, autosavePlugin, undoRedoPlugin, clipboardPlugin, utilityPlugin,
  tablePlugin, imagePlugin, codeBlockPlugin, videoPlugin, mentionPlugin,
  toggleMark, isMarkActive, applyMarkToSelection, removeMarkFromSelection,
}

/**
 * Returns the default set of plugins for typical usage.
 * @returns {Array<import('../types/plugin.types.js').PluginDef>}
 */
export function defaultPlugins() {
  return [
    clipboardPlugin(),
    undoRedoPlugin(),
    boldPlugin(),
    italicPlugin(),
    underlinePlugin(),
    strikethroughPlugin(),
    headingPlugin(),
    listsPlugin(),
    alignmentPlugin(),
    linkPlugin(),
    indentPlugin(),
    removeFormatPlugin(),
    wordCountPlugin(),
    horizontalRulePlugin(),
    tablePlugin(),
    imagePlugin(),
    codeBlockPlugin(),
    fontFamilyPlugin(),
    fontSizePlugin(),
    foreColorPlugin(),
    backColorPlugin(),
    fullscreenPlugin(),
    previewPlugin(),
    printPlugin(),
    sourceViewPlugin(),
    searchReplacePlugin(),
    charmapPlugin(),
    emoticonsPlugin(),
    insertDateTimePlugin(),
    directionalityPlugin(),
    pageBreakPlugin(),
    nonBreakingPlugin(),
    anchorPlugin(),
    codeSamplePlugin(),
    autosavePlugin(),
    utilityPlugin(),
  ]
}
