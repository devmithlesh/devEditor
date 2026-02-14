/**
 * Table plugin — full table management: insert, delete, row/column ops, merge/split, clipboard.
 */

import { generateId, findParent, findNodeById, walkTree, deepClone } from '../../utils/helpers.js'
import { createElement } from 'react'
import { TableGridPicker } from '../../menubar/TableGridPicker.jsx'

// ─── SVG Icons ───

const ICONS = {
  table: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6z"/></svg>',
  cellProps: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v4h-4V7z"/></svg>',
  mergeCells: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 4h10v6H7V9z"/></svg>',
  splitCell: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z"/></svg>',
  insertRowBefore: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 8v4h6v-4H5zm8 0v4h6v-4h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zM12 5l-3 3h2v2h2V8h2l-3-3z"/></svg>',
  insertRowAfter: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zM12 19l3-3h-2v-2h-2v2H9l3 3z"/></svg>',
  deleteRow: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 12v4h6v-4H5zm8 0v4h6v-4h-6zM7 11h10v2H7v-2z"/></svg>',
  rowProps: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v4h14V5H5zm0 6v4h14v-4H5zm0 6v4h14v-4H5z"/></svg>',
  insertColBefore: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm8 2v6h4V5h-4zm0 8v6h4v-6h-4zm6-8v6h4V5h-4zm0 8v6h4v-6h-4zM5 12l3-3v2h2v2H8v2l-3-3z"/></svg>',
  insertColAfter: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v6h4V5H5zm0 8v6h4v-6H5zm6-8v6h4V5h-4zm0 8v6h4v-6h-4zM19 12l-3 3v-2h-2v-2h2V9l3 3z"/></svg>',
  deleteCol: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v6h4V5H5zm0 8v6h4v-6H5zm12-8v6h4V5h-4zm0 8v6h4v-6h-4zM11 7v10h2V7h-2z"/></svg>',
  cutRow: '<svg viewBox="0 0 24 24"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/></svg>',
  copyRow: '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
  pasteRow: '<svg viewBox="0 0 24 24"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>',
  deleteTable: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  sortAsc: '<svg viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2zm16-1l-4 4h3v4h2v-4h3l-4-4z"/></svg>',
  sortDesc: '<svg viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2zm16 3h3l-4 4-4-4h3V6h2v10z"/></svg>',
  tableProps: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v4h6V5H5zm8 0v4h6V5h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6zm-8 6v4h6v-4H5zm8 0v4h6v-4h-6z"/></svg>',
}

// ─── Helper Functions ───

function findCurrentTable(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null
  let found = null
  walkTree(engine._model.doc, (node) => {
    if (node.type === 'table') {
      let match = false
      walkTree(node, (child) => {
        if (child.id === sel.anchorNodeId) { match = true; return false }
      })
      if (match) { found = node; return false }
    }
  })
  return found
}

function findCurrentCell(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null
  let found = null
  walkTree(engine._model.doc, (node) => {
    if (node.type === 'tableCell') {
      let match = false
      walkTree(node, (child) => {
        if (child.id === sel.anchorNodeId) { match = true; return false }
      })
      if (match) { found = node; return false }
    }
  })
  return found
}

function findCurrentRow(engine) {
  const sel = engine._selection?.getSavedSelection()
  if (!sel) return null
  let found = null
  walkTree(engine._model.doc, (node) => {
    if (node.type === 'tableRow') {
      let match = false
      walkTree(node, (child) => {
        if (child.id === sel.anchorNodeId) { match = true; return false }
      })
      if (match) { found = node; return false }
    }
  })
  return found
}

function getColumnIndex(table, cellId) {
  for (const row of table.content) {
    const idx = row.content.findIndex((c) => c.id === cellId)
    if (idx !== -1) return idx
  }
  return -1
}

function getRowIndex(table, rowId) {
  return table.content.findIndex((r) => r.id === rowId)
}

function getColumnCount(table) {
  return table.content[0]?.content?.length || 0
}

function createEmptyCell(isHeader = false) {
  return {
    id: generateId(),
    type: 'tableCell',
    attrs: { header: isHeader },
    content: [{
      id: generateId(),
      type: 'paragraph',
      content: [{ id: generateId(), type: 'text', text: '' }],
    }],
  }
}

function createEmptyRow(colCount, isHeader = false) {
  const row = { id: generateId(), type: 'tableRow', content: [] }
  for (let c = 0; c < colCount; c++) {
    row.content.push(createEmptyCell(isHeader))
  }
  return row
}

function pushHistory(engine) {
  if (engine._historyManager) {
    engine._historyManager.push(engine._model.getDoc(), engine._selection?.getSavedSelection())
  }
}

function focusFirstCellText(engine, row) {
  const firstText = row?.content?.[0]?.content?.[0]?.content?.[0]
  if (firstText) {
    engine._selection.setCursorToNode(firstText.id)
  }
}

/** Regenerate all IDs in a node tree so pasted content doesn't duplicate IDs */
function regenerateIds(node) {
  if (node.id) node.id = generateId()
  if (node.content) {
    for (const child of node.content) {
      regenerateIds(child)
    }
  }
}

/** Get the text content of a table cell for sorting */
function getCellText(cell) {
  let text = ''
  walkTree(cell, (node) => {
    if (node.type === 'text') text += node.text
  })
  return text.trim()
}

/** Sort table rows by a specific column */
function sortTable(engine, table, colIdx, direction) {
  if (!table.content || table.content.length < 2) return
  pushHistory(engine)

  // Separate header row(s) from data rows
  const headerRows = []
  const dataRows = []
  for (const row of table.content) {
    const isHeader = row.content[0]?.attrs?.header
    if (isHeader) {
      headerRows.push(row)
    } else {
      dataRows.push(row)
    }
  }

  // Sort data rows by cell text at colIdx
  dataRows.sort((a, b) => {
    const textA = getCellText(a.content[colIdx] || {}).toLowerCase()
    const textB = getCellText(b.content[colIdx] || {}).toLowerCase()
    // Try numeric comparison first
    const numA = parseFloat(textA)
    const numB = parseFloat(textB)
    if (!isNaN(numA) && !isNaN(numB)) {
      return direction === 'asc' ? numA - numB : numB - numA
    }
    // Fall back to string comparison
    const cmp = textA.localeCompare(textB)
    return direction === 'asc' ? cmp : -cmp
  })

  table.content = [...headerRows, ...dataRows]
  engine._reconcile()
  engine._bumpVersion()
}

// ─── Cell Selection State ───
let _cellSelection = null  // { tableId, startRow, startCol, endRow, endCol }
let _dragStartCellId = null
let _isDraggingCells = false

/** Get the (row, col) position of a cell in a table by cellId */
function getCellPosition(table, cellId) {
  for (let r = 0; r < table.content.length; r++) {
    for (let c = 0; c < table.content[r].content.length; c++) {
      if (table.content[r].content[c].id === cellId) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

/** Find a table node that contains a cell with the given cellId */
function findTableByCellId(engine, cellId) {
  let found = null
  walkTree(engine._model.doc, (node) => {
    if (node.type === 'table') {
      let match = false
      walkTree(node, (child) => {
        if (child.type === 'tableCell' && child.id === cellId) { match = true; return false }
      })
      if (match) { found = node; return false }
    }
  })
  return found
}

/** Get the normalized selection range (minRow/maxRow/minCol/maxCol) */
function getSelectedRange() {
  if (!_cellSelection) return null
  return {
    minRow: Math.min(_cellSelection.startRow, _cellSelection.endRow),
    maxRow: Math.max(_cellSelection.startRow, _cellSelection.endRow),
    minCol: Math.min(_cellSelection.startCol, _cellSelection.endCol),
    maxCol: Math.max(_cellSelection.startCol, _cellSelection.endCol),
  }
}

/** Apply / remove CSS highlights for the selected cell range */
function applyHighlights(engine) {
  const container = engine.getContainer()
  if (!container) return
  // Remove all existing highlights
  container.querySelectorAll('.de-table-cell--selected').forEach((el) => {
    el.classList.remove('de-table-cell--selected')
  })
  const range = getSelectedRange()
  if (!range || !_cellSelection) return
  const table = findNodeById(engine._model.doc, _cellSelection.tableId)
  if (!table) return
  for (let r = range.minRow; r <= range.maxRow; r++) {
    for (let c = range.minCol; c <= range.maxCol; c++) {
      const cell = table.content[r]?.content[c]
      if (cell && !cell.attrs?.hidden) {
        const el = container.querySelector(`[data-node-id="${cell.id}"]`)
        if (el) el.classList.add('de-table-cell--selected')
      }
    }
  }
}

function clearCellSelection(engine) {
  _cellSelection = null
  applyHighlights(engine)
}

/**
 * Detect which cells are selected from the browser's native text selection.
 * Returns a range object { tableId, minRow, maxRow, minCol, maxCol } or null.
 */
function detectCellsFromBrowserSelection(engine) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const container = engine.getContainer()
  if (!container) return null

  const range = sel.getRangeAt(0)
  const allCells = container.querySelectorAll('td[data-node-id], th[data-node-id]')
  const selectedCellIds = []

  for (const cellEl of allCells) {
    if (range.intersectsNode(cellEl)) {
      selectedCellIds.push(cellEl.getAttribute('data-node-id'))
    }
  }

  if (selectedCellIds.length < 2) return null

  const table = findTableByCellId(engine, selectedCellIds[0])
  if (!table) return null

  let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1
  for (const cellId of selectedCellIds) {
    const pos = getCellPosition(table, cellId)
    if (pos) {
      minRow = Math.min(minRow, pos.row)
      maxRow = Math.max(maxRow, pos.row)
      minCol = Math.min(minCol, pos.col)
      maxCol = Math.max(maxCol, pos.col)
    }
  }

  if (maxRow < 0) return null
  return { tableId: table.id, minRow, maxRow, minCol, maxCol }
}

/** Initialize cell selection event listeners (called from plugin init) */
function initCellSelection(engine) {
  let startCellEl = null

  const getCellFromEvent = (e) => {
    const container = engine.getContainer()
    if (!container) return null
    const cellEl = e.target.closest('td[data-node-id], th[data-node-id]')
    if (!cellEl || !container.contains(cellEl)) return null
    return cellEl
  }

  // Mousedown — start potential cell selection
  document.addEventListener('mousedown', (e) => {
    const cellEl = getCellFromEvent(e)
    if (!cellEl) {
      if (_cellSelection) clearCellSelection(engine)
      return
    }

    startCellEl = cellEl
    _isDraggingCells = false
    _dragStartCellId = cellEl.getAttribute('data-node-id')

    if (e.shiftKey && _cellSelection) {
      // Shift+click: extend selection
      e.preventDefault()
      const cellId = cellEl.getAttribute('data-node-id')
      const table = findNodeById(engine._model.doc, _cellSelection.tableId)
      if (table) {
        const pos = getCellPosition(table, cellId)
        if (pos) {
          _cellSelection.endRow = pos.row
          _cellSelection.endCol = pos.col
          applyHighlights(engine)
        }
      }
    }
  })

  // Mousemove — detect drag across cells
  document.addEventListener('mousemove', (e) => {
    if (!startCellEl || !_dragStartCellId || e.buttons === 0) {
      startCellEl = null
      return
    }
    const cellEl = getCellFromEvent(e)
    if (!cellEl) return
    const cellId = cellEl.getAttribute('data-node-id')
    if (cellId === _dragStartCellId) return // Same cell — let normal text selection work

    // Dragging to a different cell — activate cell selection
    e.preventDefault()
    window.getSelection()?.removeAllRanges()

    if (!_isDraggingCells) {
      _isDraggingCells = true
      // Start selection from the drag origin cell
      const table = findTableByCellId(engine, _dragStartCellId)
      if (!table) return
      const pos = getCellPosition(table, _dragStartCellId)
      if (!pos) return
      _cellSelection = {
        tableId: table.id,
        startRow: pos.row, startCol: pos.col,
        endRow: pos.row, endCol: pos.col,
      }
    }

    // Extend to current cell
    if (_cellSelection) {
      const table = findNodeById(engine._model.doc, _cellSelection.tableId)
      if (table) {
        const pos = getCellPosition(table, cellId)
        if (pos) {
          _cellSelection.endRow = pos.row
          _cellSelection.endCol = pos.col
          applyHighlights(engine)
        }
      }
    }
  })

  // Mouseup — finalize
  document.addEventListener('mouseup', () => {
    startCellEl = null
    _isDraggingCells = false
  })
}

// ─── Stored row/column for clipboard operations ───
let _clipboardRow = null
let _clipboardCol = null

// ─── Plugin Export ───

export function tablePlugin() {
  return {
    name: 'table',

    init: (engine) => {
      // Delay to ensure the container is attached
      const tryInit = () => {
        if (engine.getContainer()) {
          initCellSelection(engine)
        } else {
          setTimeout(tryInit, 100)
        }
      }
      tryInit()
    },

    css: `
      .de-table-cell--selected {
        background-color: rgba(59, 130, 246, 0.2) !important;
        outline: 2px solid #3b82f6;
        outline-offset: -2px;
      }
    `,

    commands: [
      // ── Insert Table ──
      {
        name: 'insertTable',
        execute: (engine, rows = 3, cols = 3) => {
          // Use already-saved selection (from menu open) or try capturing from DOM
          const sel = engine._selection?.getSavedSelection() || engine._selection?.captureSelection()

          pushHistory(engine)

          const tableNode = { id: generateId(), type: 'table', content: [] }
          for (let r = 0; r < rows; r++) {
            tableNode.content.push(createEmptyRow(cols, r === 0))
          }

          // Try to insert after the current block
          let inserted = false
          if (sel) {
            const block = engine._findBlockForTextNode(sel.anchorNodeId)
            if (block) {
              const parentInfo = findParent(engine._model.doc, block.id)
              if (parentInfo) {
                parentInfo.parent.content.splice(parentInfo.index + 1, 0, tableNode)
                inserted = true
              }
            }
          }

          // Fallback: insert at end of document
          if (!inserted) {
            engine._model.doc.content.push(tableNode)
          }

          engine._reconcile()
          focusFirstCellText(engine, tableNode.content[0])
          engine._bumpVersion()
        },
      },
      // ── Delete Table ──
      {
        name: 'deleteTable',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          if (!table) return
          pushHistory(engine)
          engine._model.applyTransaction({
            steps: [{ type: 'deleteNode', data: { nodeId: table.id } }],
          })
          engine._model._ensureMinimumContent()
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      // ── Row Operations ──
      {
        name: 'insertRowBefore',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          const idx = getRowIndex(table, row.id)
          if (idx === -1) return
          pushHistory(engine)
          const newRow = createEmptyRow(getColumnCount(table))
          table.content.splice(idx, 0, newRow)
          engine._reconcile()
          focusFirstCellText(engine, newRow)
          engine._bumpVersion()
        },
      },
      {
        name: 'insertRowAfter',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          const idx = getRowIndex(table, row.id)
          if (idx === -1) return
          pushHistory(engine)
          const newRow = createEmptyRow(getColumnCount(table))
          table.content.splice(idx + 1, 0, newRow)
          engine._reconcile()
          focusFirstCellText(engine, newRow)
          engine._bumpVersion()
        },
      },
      {
        name: 'deleteRow',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          if (table.content.length <= 1) {
            pushHistory(engine)
            engine._model.applyTransaction({
              steps: [{ type: 'deleteNode', data: { nodeId: table.id } }],
            })
            engine._model._ensureMinimumContent()
            engine._reconcile()
            engine._bumpVersion()
            return
          }
          pushHistory(engine)
          const idx = getRowIndex(table, row.id)
          table.content.splice(idx, 1)
          engine._reconcile()
          const focusRow = table.content[Math.min(idx, table.content.length - 1)]
          focusFirstCellText(engine, focusRow)
          engine._bumpVersion()
        },
      },
      // ── Column Operations ──
      {
        name: 'insertColumnBefore',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          pushHistory(engine)
          for (const row of table.content) {
            const isHeader = row.content[0]?.attrs?.header || false
            row.content.splice(colIdx, 0, createEmptyCell(isHeader))
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      {
        name: 'insertColumnAfter',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          pushHistory(engine)
          for (const row of table.content) {
            const isHeader = row.content[0]?.attrs?.header || false
            row.content.splice(colIdx + 1, 0, createEmptyCell(isHeader))
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      {
        name: 'deleteColumn',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          if (getColumnCount(table) <= 1) {
            pushHistory(engine)
            engine._model.applyTransaction({
              steps: [{ type: 'deleteNode', data: { nodeId: table.id } }],
            })
            engine._model._ensureMinimumContent()
            engine._reconcile()
            engine._bumpVersion()
            return
          }
          pushHistory(engine)
          for (const row of table.content) {
            row.content.splice(colIdx, 1)
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      // ── Cell Operations ──
      {
        name: 'mergeCells',
        execute: (engine) => {
          // Try custom cell selection first, then fall back to browser's native text selection
          let range = getSelectedRange()
          let tableId = _cellSelection?.tableId

          if (!range) {
            const browserRange = detectCellsFromBrowserSelection(engine)
            if (browserRange) {
              range = browserRange
              tableId = browserRange.tableId
            }
          }

          if (!range || !tableId) return
          const table = findNodeById(engine._model.doc, tableId)
          if (!table) return
          // Need at least 2 cells
          const numCells = (range.maxRow - range.minRow + 1) * (range.maxCol - range.minCol + 1)
          if (numCells < 2) return

          pushHistory(engine)

          const mainCell = table.content[range.minRow].content[range.minCol]
          const colspan = range.maxCol - range.minCol + 1
          const rowspan = range.maxRow - range.minRow + 1

          // Collect content from other cells into main cell, then hide them
          for (let r = range.minRow; r <= range.maxRow; r++) {
            for (let c = range.minCol; c <= range.maxCol; c++) {
              if (r === range.minRow && c === range.minCol) continue
              const cell = table.content[r]?.content[c]
              if (!cell) continue
              // Move non-empty content
              if (cell.content) {
                for (const block of cell.content) {
                  if (getCellText({ content: [block] }).trim()) {
                    mainCell.content.push(deepClone(block))
                  }
                }
              }
              // Mark cell as hidden (absorbed by merge)
              cell.attrs = cell.attrs || {}
              cell.attrs.hidden = true
              cell.attrs.mergedInto = mainCell.id
              cell.content = [{ id: generateId(), type: 'paragraph', content: [{ id: generateId(), type: 'text', text: '' }] }]
            }
          }

          // Set colspan/rowspan on main cell
          mainCell.attrs = mainCell.attrs || {}
          mainCell.attrs.colspan = colspan
          mainCell.attrs.rowspan = rowspan

          clearCellSelection(engine)
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      {
        name: 'splitCell',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colspan = cell.attrs?.colspan || 1
          const rowspan = cell.attrs?.rowspan || 1
          if (colspan <= 1 && rowspan <= 1) return // Not a merged cell

          const pos = getCellPosition(table, cell.id)
          if (!pos) return

          pushHistory(engine)

          // Unhide all absorbed cells in the merge range
          for (let r = pos.row; r < pos.row + rowspan; r++) {
            for (let c = pos.col; c < pos.col + colspan; c++) {
              if (r === pos.row && c === pos.col) continue
              const absorbedCell = table.content[r]?.content[c]
              if (absorbedCell && absorbedCell.attrs) {
                delete absorbedCell.attrs.hidden
                delete absorbedCell.attrs.mergedInto
              }
            }
          }

          // Reset main cell's colspan/rowspan
          if (cell.attrs) {
            delete cell.attrs.colspan
            delete cell.attrs.rowspan
          }

          engine._reconcile()
          engine._bumpVersion()
        },
      },
      // ── Row Clipboard ──
      {
        name: 'cutRow',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          _clipboardRow = deepClone(row)
          if (table.content.length <= 1) return
          pushHistory(engine)
          const idx = getRowIndex(table, row.id)
          table.content.splice(idx, 1)
          engine._reconcile()
          const focusRow = table.content[Math.min(idx, table.content.length - 1)]
          focusFirstCellText(engine, focusRow)
          engine._bumpVersion()
        },
      },
      {
        name: 'copyRow',
        execute: (engine) => {
          const row = findCurrentRow(engine)
          if (!row) return
          _clipboardRow = deepClone(row)
        },
      },
      {
        name: 'pasteRowBefore',
        execute: (engine) => {
          if (!_clipboardRow) return
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          const idx = getRowIndex(table, row.id)
          if (idx === -1) return
          pushHistory(engine)
          const newRow = deepClone(_clipboardRow)
          regenerateIds(newRow)
          table.content.splice(idx, 0, newRow)
          engine._reconcile()
          focusFirstCellText(engine, newRow)
          engine._bumpVersion()
        },
      },
      {
        name: 'pasteRowAfter',
        execute: (engine) => {
          if (!_clipboardRow) return
          const table = findCurrentTable(engine)
          const row = findCurrentRow(engine)
          if (!table || !row) return
          const idx = getRowIndex(table, row.id)
          if (idx === -1) return
          pushHistory(engine)
          const newRow = deepClone(_clipboardRow)
          regenerateIds(newRow)
          table.content.splice(idx + 1, 0, newRow)
          engine._reconcile()
          focusFirstCellText(engine, newRow)
          engine._bumpVersion()
        },
      },
      // ── Column Clipboard ──
      {
        name: 'cutColumn',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          _clipboardCol = table.content.map((row) => deepClone(row.content[colIdx]))
          if (getColumnCount(table) <= 1) return
          pushHistory(engine)
          for (const row of table.content) {
            row.content.splice(colIdx, 1)
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      {
        name: 'copyColumn',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          _clipboardCol = table.content.map((row) => deepClone(row.content[colIdx]))
        },
      },
      {
        name: 'pasteColumnBefore',
        execute: (engine) => {
          if (!_clipboardCol) return
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          pushHistory(engine)
          for (let r = 0; r < table.content.length; r++) {
            const cellData = _clipboardCol[r] ? deepClone(_clipboardCol[r]) : createEmptyCell()
            regenerateIds(cellData)
            table.content[r].content.splice(colIdx, 0, cellData)
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      {
        name: 'pasteColumnAfter',
        execute: (engine) => {
          if (!_clipboardCol) return
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          pushHistory(engine)
          for (let r = 0; r < table.content.length; r++) {
            const cellData = _clipboardCol[r] ? deepClone(_clipboardCol[r]) : createEmptyCell()
            regenerateIds(cellData)
            table.content[r].content.splice(colIdx + 1, 0, cellData)
          }
          engine._reconcile()
          engine._bumpVersion()
        },
      },
      // ── Properties (placeholders) ──
      {
        name: 'tableProperties',
        execute: () => { console.info('Table properties dialog: not yet implemented') },
      },
      {
        name: 'cellProperties',
        execute: () => { console.info('Cell properties dialog: not yet implemented') },
      },
      {
        name: 'rowProperties',
        execute: () => { console.info('Row properties dialog: not yet implemented') },
      },
      // ── Sort ──
      {
        name: 'sortTableAscending',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          sortTable(engine, table, colIdx, 'asc')
        },
      },
      {
        name: 'sortTableDescending',
        execute: (engine) => {
          const table = findCurrentTable(engine)
          const cell = findCurrentCell(engine)
          if (!table || !cell) return
          const colIdx = getColumnIndex(table, cell.id)
          if (colIdx === -1) return
          sortTable(engine, table, colIdx, 'desc')
        },
      },
    ],

    toolbarButtons: {
      table: {
        type: 'popup',
        name: 'table',
        tooltip: 'Insert table',
        icon: ICONS.table,
        popupType: 'tablegrid',
      },
    },

    menuItems: {
      table: [
        {
          label: 'Table',
          icon: ICONS.table,
          render: renderTableGridPicker,
        },
        {
          label: 'Cell',
          submenuItems: [
            { label: 'Cell properties', icon: ICONS.cellProps, command: 'cellProperties' },
            { label: 'Merge cells', icon: ICONS.mergeCells, command: 'mergeCells' },
            { label: 'Split cell', icon: ICONS.splitCell, command: 'splitCell' },
          ],
        },
        {
          label: 'Row',
          submenuItems: [
            { label: 'Insert row before', icon: ICONS.insertRowBefore, command: 'insertRowBefore' },
            { label: 'Insert row after', icon: ICONS.insertRowAfter, command: 'insertRowAfter' },
            { label: 'Delete row', icon: ICONS.deleteRow, command: 'deleteRow' },
            { label: 'Row properties', icon: ICONS.rowProps, command: 'rowProperties' },
            { type: 'separator' },
            { label: 'Cut row', icon: ICONS.cutRow, command: 'cutRow' },
            { label: 'Copy row', icon: ICONS.copyRow, command: 'copyRow' },
            { label: 'Paste row before', icon: ICONS.pasteRow, command: 'pasteRowBefore' },
            { label: 'Paste row after', icon: ICONS.pasteRow, command: 'pasteRowAfter' },
          ],
        },
        {
          label: 'Column',
          submenuItems: [
            { label: 'Insert column before', icon: ICONS.insertColBefore, command: 'insertColumnBefore' },
            { label: 'Insert column after', icon: ICONS.insertColAfter, command: 'insertColumnAfter' },
            { label: 'Delete column', icon: ICONS.deleteCol, command: 'deleteColumn' },
            { type: 'separator' },
            { label: 'Cut column', icon: ICONS.cutRow, command: 'cutColumn' },
            { label: 'Copy column', icon: ICONS.copyRow, command: 'copyColumn' },
            { label: 'Paste column before', icon: ICONS.pasteRow, command: 'pasteColumnBefore' },
            { label: 'Paste column after', icon: ICONS.pasteRow, command: 'pasteColumnAfter' },
          ],
        },
        {
          label: 'Sort',
          submenuItems: [
            { label: 'Sort table ascending', icon: ICONS.sortAsc, command: 'sortTableAscending' },
            { label: 'Sort table descending', icon: ICONS.sortDesc, command: 'sortTableDescending' },
          ],
        },
        { type: 'separator' },
        { label: 'Table properties', icon: ICONS.tableProps, command: 'tableProperties' },
        { label: 'Delete table', icon: ICONS.deleteTable, command: 'deleteTable' },
      ],
    },
  }
}

/** Render callback for the Table submenu — shows the grid picker */
function renderTableGridPicker({ engine, onClose }) {
  return createElement(TableGridPicker, { engine, onClose })
}
