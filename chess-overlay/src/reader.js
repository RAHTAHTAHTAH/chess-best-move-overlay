/* Best Move Overlay — reads the position out of the board DOM.
 * Supports lichess (cg-board) and chess.com (wc-chess-board).
 * Exposes window.BoardReader.read() -> { site, fen, rect, flipped } | null
 */
(function () {
  'use strict'

  var LICHESS_TYPES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
  var TYPE_LETTER = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' }

  function emptyGrid() {
    var g = new Array(64)
    for (var i = 0; i < 64; i++) g[i] = null
    return g
  }

  function gridToFen(grid) {
    var rows = []
    for (var row = 0; row < 8; row++) {
      var out = ''
      var empty = 0
      for (var file = 0; file < 8; file++) {
        var piece = grid[row * 8 + file]
        if (!piece) {
          empty++
          continue
        }
        if (empty) {
          out += empty
          empty = 0
        }
        out += piece[0] === 'w' ? piece[1].toUpperCase() : piece[1]
      }
      if (empty) out += empty
      rows.push(out)
    }
    return rows.join('/')
  }

  function castlingFromGrid(grid) {
    var rights = ''
    if (grid[60] === 'wk' && grid[63] === 'wr') rights += 'K'
    if (grid[60] === 'wk' && grid[56] === 'wr') rights += 'Q'
    if (grid[4] === 'bk' && grid[7] === 'br') rights += 'k'
    if (grid[4] === 'bk' && grid[0] === 'br') rights += 'q'
    return rights || '-'
  }

  function validGrid(grid) {
    var count = { w: 0, b: 0 }
    var kings = { w: 0, b: 0 }
    var pawns = { w: 0, b: 0 }

    for (var i = 0; i < 64; i++) {
      var piece = grid[i]
      if (!piece) continue
      var color = piece[0]
      var type = piece[1]
      if (color !== 'w' && color !== 'b') return false
      count[color]++
      if (type === 'k') kings[color]++
      if (type === 'p') {
        pawns[color]++
        var rank = 8 - (i >> 3)
        if (rank === 1 || rank === 8) return false
      }
    }

    if (kings.w !== 1 || kings.b !== 1) return false
    if (count.w > 16 || count.b > 16) return false
    if (pawns.w > 8 || pawns.b > 8) return false
    return true
  }

  /* ---------------- lichess ---------------- */

  function lichessFlipped(board) {
    var el = board
    while (el && el !== document.documentElement) {
      if (el.classList) {
        if (el.classList.contains('orientation-black') || el.classList.contains('flipped')) return true
        if (el.classList.contains('orientation-white')) return false
      }
      el = el.parentElement
    }
    return document.body.classList.contains('orientation-black')
  }

  function readLichess() {
    var board = document.querySelector('cg-board')
    if (!board) return null

    var rect = board.getBoundingClientRect()
    if (rect.width < 120 || rect.height < 120) return null

    var pieces = board.querySelectorAll('piece')
    if (!pieces.length) return null

    var square = rect.width / 8
    var visual = emptyGrid()

    for (var i = 0; i < pieces.length; i++) {
      var el = pieces[i]
      var cls = el.classList

      var color = cls.contains('white') ? 'w' : cls.contains('black') ? 'b' : null
      if (!color) continue

      var type = null
      for (var t = 0; t < LICHESS_TYPES.length; t++) {
        if (cls.contains(LICHESS_TYPES[t])) {
          type = TYPE_LETTER[LICHESS_TYPES[t]]
          break
        }
      }
      if (!type) continue

      var transform = el.style.transform || getComputedStyle(el).transform || ''
      var m = /translate\(\s*(-?[\d.]+)px[,\s]+(-?[\d.]+)px/.exec(transform)
      if (!m) continue

      var col = Math.round(parseFloat(m[1]) / square)
      var row = Math.round(parseFloat(m[2]) / square)
      if (col < 0 || col > 7 || row < 0 || row > 7) continue

      visual[row * 8 + col] = color + type
    }

    var flipped = lichessFlipped(board)
    var grid = emptyGrid()

    if (flipped) {
      for (var j = 0; j < 64; j++) grid[63 - j] = visual[j]
    } else {
      grid = visual
    }

    if (!validGrid(grid)) return null

    return { site: 'lichess', grid: grid, rect: rect, flipped: flipped }
  }

  /* ---------------- chess.com ---------------- */

  function readChessCom() {
    var board = document.querySelector('wc-chess-board')
    if (!board) return null

    var rect = board.getBoundingClientRect()
    if (rect.width < 120 || rect.height < 120) return null

    var pieces = board.querySelectorAll('.piece')
    if (!pieces.length) return null

    var swapped = emptyGrid()
    var direct = emptyGrid()
    var seen = 0

    for (var i = 0; i < pieces.length; i++) {
      var el = pieces[i]
      var cls = el.classList

      var squareClass = null
      var code = null
      for (var c = 0; c < cls.length; c++) {
        var name = cls[c]
        if (!squareClass && /^square-\d\d$/.test(name)) squareClass = name
        if (!code && /^[wb][pnbrqk]$/.test(name)) code = name
      }
      if (!squareClass || !code) continue
      seen++

      var a = parseInt(squareClass[7], 10)
      var b = parseInt(squareClass[8], 10)

      // chess.com square-{file}{rank}
      direct[(8 - b) * 8 + (a - 1)] = code
      // fallback interpretation square-{rank}{file}
      swapped[(8 - a) * 8 + (b - 1)] = code
    }

    if (!seen) return null

    var grid = null
    if (validGrid(direct)) grid = direct
    else if (validGrid(swapped)) grid = swapped
    else return null

    var flipped = board.classList.contains('flipped') ||
      (board.parentElement && board.parentElement.classList.contains('flipped'))

    return { site: 'chesscom', grid: grid, rect: rect, flipped: flipped }
  }

  /* ---------------- public ---------------- */

  function read() {
    var found = readLichess() || readChessCom()
    if (!found) return null
    return {
      site: found.site,
      grid: found.grid,
      rect: found.rect,
      flipped: found.flipped,
      castling: castlingFromGrid(found.grid),
      boardFen: gridToFen(found.grid)
    }
  }

  window.BoardReader = {
    read: read,
    gridToFen: gridToFen,
    castlingFromGrid: castlingFromGrid,
    validGrid: validGrid
  }
})()
