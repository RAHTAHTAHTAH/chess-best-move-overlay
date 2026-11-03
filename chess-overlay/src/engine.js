/* Best Move Overlay — search engine (no dependencies, attaches to window) */
(function () {
  'use strict'

  var MATE = 100000
  var INF = 1 << 30
  var MAX_PLY = 64

  var VALUE = { p: 100, n: 325, b: 340, r: 500, q: 950, k: 0 }
  var PHASE_VALUE = { n: 1, b: 1, r: 2, q: 4 }

  var PST = {
    p: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0
    ],
    n: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50
    ],
    b: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20
    ],
    r: [
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 10, 10, 10, 10, 10, 10, 5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      0, 0, 0, 5, 5, 0, 0, 0
    ],
    q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20
    ],
    k: [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20
    ],
    kEnd: [
      -50, -40, -30, -20, -20, -30, -40, -50,
      -30, -20, -10, 0, 0, -10, -20, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -30, 0, 0, 0, 0, -30, -30,
      -50, -30, -30, -30, -30, -30, -30, -50
    ]
  }

  function squareIndex(i) {
    return ((i >> 4) << 3) | (i & 7)
  }

  function evaluateWhite(g) {
    var board = g.fast_board()
    var score = 0
    var phase = 0
    var wb = 0
    var bb = 0
    var kingW = -1
    var kingB = -1

    for (var i = 0; i < 128; i++) {
      if (i & 0x88) {
        i += 7
        continue
      }
      var piece = board[i]
      if (!piece) continue

      if (piece.type === 'k') {
        if (piece.color === 'w') kingW = squareIndex(i)
        else kingB = squareIndex(i)
        continue
      }

      var idx = squareIndex(i)
      var mirrored = ((7 - (i >> 4)) << 3) | (i & 7)
      if (piece.color === 'w') {
        score += VALUE[piece.type] + PST[piece.type][idx]
        if (piece.type === 'b') wb++
      } else {
        score -= VALUE[piece.type] + PST[piece.type][mirrored]
        if (piece.type === 'b') bb++
      }
      phase += PHASE_VALUE[piece.type] || 0
    }

    if (wb >= 2) score += 30
    if (bb >= 2) score -= 30

    var p = Math.min(phase, 24) / 24
    if (kingW >= 0) score += PST.k[kingW] * p + PST.kEnd[kingW] * (1 - p)
    if (kingB >= 0) {
      var km = ((7 - (kingB >> 3)) << 3) | (kingB & 7)
      score -= PST.k[km] * p + PST.kEnd[km] * (1 - p)
    }

    return score
  }

  function evaluateRelative(g) {
    var white = evaluateWhite(g)
    return g.turn() === 'w' ? white : -white
  }

  function moveKey(m) {
    return m.from * 128 + m.to
  }

  function orderMoves(ctx, moves, ply) {
    var killers = ctx.killers[ply]
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i]
      var s = ctx.history[moveKey(m)] || 0
      if (m.captured) s += 1000000 + VALUE[m.captured] * 10 - VALUE[m.piece]
      if (m.promotion) s += 900000 + VALUE[m.promotion]
      if (killers[0] && killers[0].from === m.from && killers[0].to === m.to && killers[0].promotion === m.promotion) s += 800000
      else if (killers[1] && killers[1].from === m.from && killers[1].to === m.to && killers[1].promotion === m.promotion) s += 700000
      m._order = s
    }
    moves.sort(function (a, b) { return b._order - a._order })
  }

  function rememberCutoff(ctx, m, ply, depth) {
    if (!m.captured && !m.promotion) {
      var killers = ctx.killers[ply]
      if (!killers[0] || killers[0].from !== m.from || killers[0].to !== m.to) {
        killers[1] = killers[0]
        killers[0] = m
      }
      ctx.history[moveKey(m)] += depth * depth
    }
  }

  function updatePV(ctx, ply, m) {
    var target = ctx.pv[ply]
    var child = ctx.pv[ply + 1]
    target.length = 0
    target.push(m)
    for (var i = 0; i < child.length; i++) target.push(child[i])
    child.length = 0
  }

  function negamax(ctx, depth, alpha, beta, ply) {
    ctx.nodes++
    if ((ctx.nodes & 2047) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true
      return 0
    }
    if (ply >= MAX_PLY - 2) return evaluateRelative(ctx.g)

    var g = ctx.g
    if (depth <= 0) return quiesce(ctx, alpha, beta, ply)

    var moves = g.fast_moves()
    if (moves.length === 0) return g.in_check() ? -MATE + ply : 0

    ctx.pv[ply].length = 0
    orderMoves(ctx, moves, ply)

    var best = -INF
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i]
      g.fast_apply(m)
      var score = -negamax(ctx, depth - 1, -beta, -alpha, ply + 1)
      g.fast_undo()
      if (ctx.aborted) return 0

      if (score > best) best = score
      if (score > alpha) {
        alpha = score
        updatePV(ctx, ply, m)
        if (alpha >= beta) {
          rememberCutoff(ctx, m, ply, depth)
          break
        }
      }
    }
    return best
  }

  function quiesce(ctx, alpha, beta, ply) {
    ctx.nodes++
    if ((ctx.nodes & 2047) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true
      return 0
    }
    if (ply >= MAX_PLY - 2) return evaluateRelative(ctx.g)

    var g = ctx.g
    var inCheck = g.in_check()
    var moves = g.fast_moves()

    if (moves.length === 0) return inCheck ? -MATE + ply : 0

    var best
    var candidates

    if (!inCheck) {
      var standPat = evaluateRelative(g)
      if (standPat >= beta) return standPat
      best = standPat
      if (standPat > alpha) alpha = standPat

      candidates = []
      for (var i = 0; i < moves.length; i++) {
        if (moves[i].captured || moves[i].promotion) candidates.push(moves[i])
      }
      if (candidates.length === 0) return best
      orderMoves(ctx, candidates, ply)
    } else {
      best = -INF
      candidates = moves
      orderMoves(ctx, candidates, ply)
    }

    for (var j = 0; j < candidates.length; j++) {
      var m = candidates[j]
      if (!inCheck && !m.promotion && m.captured && best + VALUE[m.captured] + 200 < alpha) continue

      g.fast_apply(m)
      var score = -quiesce(ctx, -beta, -alpha, ply + 1)
      g.fast_undo()
      if (ctx.aborted) return 0

      if (score > best) best = score
      if (score > alpha) {
        alpha = score
        updatePV(ctx, ply, m)
        if (alpha >= beta) break
      }
    }
    return best
  }

  function lineToSan(fen, moves) {
    var replay = new Chess(fen)
    var out = []
    for (var i = 0; i < moves.length; i++) {
      var played = replay.move({
        from: moves[i].fromAlg,
        to: moves[i].toAlg,
        promotion: moves[i].promotion
      })
      if (!played) break
      out.push(played.san)
    }
    return out
  }

  function mateDistance(score) {
    if (score > MATE - 1000) return Math.ceil((MATE - score) / 2)
    if (score < -MATE + 1000) return -Math.ceil((MATE + score) / 2)
    return 0
  }

  function analyze(fen, maxDepth, timeMs) {
    var started = Date.now()
    var g = new Chess(fen)

    var ctx = {
      g: g,
      nodes: 0,
      deadline: started + timeMs,
      aborted: false,
      killers: [],
      history: new Int32Array(128 * 128),
      pv: []
    }
    for (var i = 0; i < MAX_PLY; i++) {
      ctx.killers.push([null, null])
      ctx.pv.push([])
    }

    var rootMoves = g.fast_moves()
    var rootTurn = g.turn()

    if (rootMoves.length === 0) {
      return {
        best: null,
        lines: [],
        score: 0,
        mate: 0,
        depth: 0,
        nodes: 0,
        time: Date.now() - started,
        gameOver: g.in_check() ? 'checkmate' : 'stalemate'
      }
    }

    for (var s = 0; s < rootMoves.length; s++) {
      var rm = rootMoves[s]
      var bonus = 0
      if (rm.captured) bonus += VALUE[rm.captured] * 10 - VALUE[rm.piece] + 1000000
      if (rm.promotion) bonus += 900000
      rm._order = bonus
    }
    rootMoves.sort(function (a, b) { return b._order - a._order })

    var best = rootMoves[0]
    var bestScore = 0
    var bestPv = [best]
    var scored = []
    var completedDepth = 0

    for (var depth = 1; depth <= maxDepth; depth++) {
      ctx.aborted = false
      for (var c = 0; c < MAX_PLY; c++) ctx.pv[c].length = 0

      var turnScores = []
      var iterationBest = null
      var iterationBestScore = -INF
      var iterationPv = null

      for (var r = 0; r < rootMoves.length; r++) {
        var m = rootMoves[r]
        g.fast_apply(m)
        var score = -negamax(ctx, depth - 1, -INF, INF, 1)
        g.fast_undo()
        if (ctx.aborted) break

        turnScores.push({ move: m, score: score })

        if (score > iterationBestScore) {
          iterationBestScore = score
          iterationBest = m
          iterationPv = [m].concat(ctx.pv[1])
        }
      }

      if (ctx.aborted) break

      completedDepth = depth
      best = iterationBest || rootMoves[0]
      bestScore = iterationBestScore
      bestPv = iterationPv || [best]
      scored = turnScores

      scored.sort(function (a, b) { return b.score - a.score })
      for (var k = 0; k < scored.length; k++) rootMoves[k] = scored[k].move

      if (Date.now() >= ctx.deadline) break
    }

    var whiteScore = rootTurn === 'w' ? bestScore : -bestScore

    return {
      best: {
        from: best.fromAlg,
        to: best.toAlg,
        promotion: best.promotion || null,
        san: lineToSan(fen, [best])[0] || ''
      },
      pv: lineToSan(fen, bestPv),
      lines: scored.slice(0, 4).map(function (entry) {
        var w = rootTurn === 'w' ? entry.score : -entry.score
        return {
          from: entry.move.fromAlg,
          to: entry.move.toAlg,
          promotion: entry.move.promotion || null,
          san: lineToSan(fen, [entry.move])[0] || '',
          score: w,
          mate: mateDistance(w)
        }
      }),
      score: whiteScore,
      mate: mateDistance(whiteScore),
      depth: completedDepth,
      nodes: ctx.nodes,
      time: Date.now() - started,
      gameOver: null
    }
  }

  window.BestMoveEngine = { analyze: analyze }
})()
