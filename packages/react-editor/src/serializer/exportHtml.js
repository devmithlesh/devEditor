/**
 * @fileoverview Export document as a standalone HTML file.
 */

import { serializeToHtml } from './htmlSerializer.js'

/**
 * @param {Object} doc
 * @param {Object} [options]
 * @param {string} [options.title='Document']
 * @param {string} [options.contentStyle='']
 * @returns {string}
 */
export function exportFullHtml(doc, options = {}) {
  const { title = 'Document', contentStyle = '' } = options
  const body = serializeToHtml(doc)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;color:#333}
img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}
blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1em;color:#666}
pre{background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto}
${contentStyle}
</style>
</head>
<body>
${body}
</body>
</html>`
}
