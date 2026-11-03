/* Best Move Overlay — wires the reader, engine and overlay together. */
(function () {
  'use strict'

  var DEPTH = 4
  var TIME_MS = 500
  var THROTTLE = 220
  var POLL = 800

  var turn = 'w'
  var lastGrid = null
  var lastFen = null
  var lastResult = null
  var lastRead = null
  var scheduled = false

  function sameGrid(a, b) {
    if (!a || !b) return false
    for (var i = 0; i < 64; i++) if (a[i] !== b[i]) return false
    return true
  }

  function mover(prev, cur) {
    var w = 0
    var b = 0
    for (var i = 0; i < 64; i++) {
      if (prev[i] === cur[i]) continue
      var before = prev[i]
      var after = cur[i]
      if (before) {
        if (before[0] === 'w') w += 2
        else b += 2
      }
      if (after) {
        if (after[0] === 'w') w += 1
        else b += 1
      }
    }
    if (w > b) return 'w'
    if (b > w) return 'b'
    return null
  }

  function inferTurn(grid) {
    var fen = window.BoardReader.gridToFen(grid) + ' w ' + window.BoardReader.castlingFromGrid(grid) + ' - 0 1'
    try {
      // A position is impossible with white to move only when black is in check,
      // so a failed load means white just delivered check and black is to move.
      new Chess(fen)
      return 'w'
    } catch (err) {
      return 'b'
    }
  }

  function formatEval(result) {
    if (!result) return ''
    if (result.mate) return (result.mate > 0 ? '+M' : '−M') + Math.abs(result.mate)
    var value = result.score / 100
    return (value >= 0 ? '+' : '−') + Math.abs(value).toFixed(2)
  }

  function state(extra) {
    if (!lastRead) return null
    var out = {
      rect: lastRead.rect,
      flipped: lastRead.flipped,
      move: null,
      san: '—',
      eval: '',
      busy: false,
      error: null
    }

    if (lastResult && lastResult.best) {
      out.move = lastResult.best
      out.san = lastResult.best.san
      out.eval = formatEval(lastResult)
    }

    if (lastResult && lastResult.gameOver) {
      out.error = lastResult.gameOver
      out.san = '—'
      out.eval = ''
    }

    if (extra) for (var k in extra) out[k] = extra[k]
    return out
  }

  function tick() {
    var read = window.BoardReader.read()
    if (!read) {
      lastRead = null
      lastResult = null
      lastFen = null
      lastGrid = null
      window.BestMoveOverlay.hide()
      return
    }

    lastRead = read
    var changed = !sameGrid(lastGrid, read.grid)

    if (changed) {
      if (lastGrid) {
        var side = mover(lastGrid, read.grid)
        turn = side === 'w' ? 'b' : side === 'b' ? 'w' : turn === 'w' ? 'b' : 'w'
      } else {
        turn = inferTurn(read.grid)
      }
      lastGrid = read.grid
    }

    var fen = read.boardFen + ' ' + turn + ' ' + read.castling + ' - 0 1'

    if (!changed && fen === lastFen) {
      window.BestMoveOverlay.show(state())
      return
    }

    lastFen = fen

    var result
    try {
      result = window.BestMoveEngine.analyze(fen, DEPTH, TIME_MS)
    } catch (err) {
      lastResult = null
      window.BestMoveOverlay.show(state({ error: 'unreadable' }))
      return
    }

    lastResult = result
    window.BestMoveOverlay.show(state())
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    setTimeout(function () {
      scheduled = false
      tick()
    }, THROTTLE)
  }

  function start() {
    try {
      var observer = new MutationObserver(schedule)
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      })
    } catch (err) {
      /* ignore */
    }

    setInterval(function () {
      if (!document.hidden) tick()
    }, POLL)

    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    document.addEventListener('keydown', function (event) {
      if (!event.altKey) return
      var key = event.key.toLowerCase()
      if (key === 'b') {
        window.BestMoveOverlay.toggle()
        event.preventDefault()
      } else if (key === 't') {
        turn = turn === 'w' ? 'b' : 'w'
        lastFen = null
        lastGrid = null
        tick()
        event.preventDefault()
      }
    })

    tick()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()
