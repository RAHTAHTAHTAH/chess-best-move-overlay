/* Best Move Overlay — draws the arrow and the move badge on top of the board. */
(function () {
  'use strict'

  var host = null
  var shadow = null
  var svg = null
  var badge = null
  var badgeMove = null
  var badgeSub = null
  var visible = true

  var STYLE = [
    ':host{all:initial}',
    'svg{position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:visible;pointer-events:none;transition:opacity .12s ease}',
    '.badge{position:fixed;pointer-events:none;display:flex;align-items:baseline;gap:7px;',
    'padding:5px 10px;border-radius:9px;background:rgba(14,16,21,.9);',
    'border:1px solid rgba(255,255,255,.13);color:#fff;',
    'font:600 13px/1.2 ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif;',
    'letter-spacing:.2px;box-shadow:0 6px 18px rgba(0,0,0,.45);',
    'backdrop-filter:blur(6px);transition:opacity .12s ease,transform .12s ease}',
    '.badge.off{opacity:0;transform:translateY(-4px)}',
    '.badge b{color:#f2a33c;font-size:15px;font-weight:700}',
    '.badge i{font-style:normal;color:#9aa2b1;font-size:11px;font-variant-numeric:tabular-nums}',
    '.badge.err b{color:#cf6a6a}',
    '.badge .dot{width:5px;height:5px;border-radius:50%;background:#f2a33c;align-self:center;opacity:.5}',
    '.badge.busy .dot{animation:p 1s infinite ease-in-out}',
    '@keyframes p{0%,100%{opacity:.25}50%{opacity:1}}'
  ].join('')

  function ensure() {
    if (host && host.isConnected) return

    host = document.createElement('div')
    host.setAttribute('data-bestmove-overlay', '')
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483647'
    shadow = host.attachShadow({ mode: 'open' })

    var style = document.createElement('style')
    style.textContent = STYLE

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    badge = document.createElement('div')
    badge.className = 'badge off'
    var dot = document.createElement('span')
    dot.className = 'dot'
    badgeMove = document.createElement('b')
    badgeMove.textContent = '—'
    badgeSub = document.createElement('i')
    badge.appendChild(dot)
    badge.appendChild(badgeMove)
    badge.appendChild(badgeSub)

    shadow.appendChild(style)
    shadow.appendChild(svg)
    shadow.appendChild(badge)

    document.documentElement.appendChild(host)
  }

  function center(rect, flipped, square) {
    var file = square.charCodeAt(0) - 97
    var rank = parseInt(square[1], 10)
    var size = rect.width / 8
    var col = flipped ? 7 - file : file
    var row = flipped ? rank - 1 : 8 - rank
    return {
      x: rect.left + (col + 0.5) * size,
      y: rect.top + (row + 0.5) * size,
      size: size
    }
  }

  function addArrow(a, b, color, width, alpha) {
    var dx = b.x - a.x
    var dy = b.y - a.y
    var len = Math.sqrt(dx * dx + dy * dy)
    if (!len) return

    var ux = dx / len
    var uy = dy / len
    var headLen = Math.min(a.size * 0.38, 46)
    var headW = Math.min(a.size * 0.46, 58)

    var start = { x: a.x + ux * a.size * 0.26, y: a.y + uy * a.size * 0.26 }
    var tip = { x: b.x - ux * a.size * 0.22, y: b.y - uy * a.size * 0.22 }
    var base = { x: tip.x - ux * headLen, y: tip.y - uy * headLen }

    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', start.x)
    line.setAttribute('y1', start.y)
    line.setAttribute('x2', base.x)
    line.setAttribute('y2', base.y)
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', width)
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('opacity', alpha)

    var head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    head.setAttribute('points', [
      tip.x + ',' + tip.y,
      (base.x - uy * headW / 2) + ',' + (base.y + ux * headW / 2),
      (base.x + uy * headW / 2) + ',' + (base.y - ux * headW / 2)
    ].join(' '))
    head.setAttribute('fill', color)
    head.setAttribute('opacity', alpha)

    svg.appendChild(line)
    svg.appendChild(head)
  }

  function clear() {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
  }

  function placeBadge(rect) {
    badge.style.left = Math.max(6, Math.min(window.innerWidth - 140, rect.left)) + 'px'
    var above = rect.top - 34
    badge.style.top = (above > 6 ? above : rect.top + 8) + 'px'
  }

  function show(state) {
    ensure()

    rect = state.rect
    if (!rect || rect.width < 40) {
      hide()
      return
    }

    if (!visible) {
      badge.classList.add('off')
      svg.style.opacity = '0'
      return
    }

    svg.style.opacity = '1'
    placeBadge(rect)
    badge.classList.remove('off')

    if (state.busy) {
      badge.classList.add('busy')
    } else {
      badge.classList.remove('busy')
    }

    badge.classList.toggle('err', !!state.error)

    if (state.error) {
      badgeMove.textContent = '—'
      badgeSub.textContent = state.error
      clear()
      return
    }

    badgeMove.textContent = state.san || '—'
    badgeSub.textContent = state.eval || ''

    clear()
    if (!state.move) return

    var a = center(rect, state.flipped, state.move.from)
    var b = center(rect, state.flipped, state.move.to)

    // dark outline first so the arrow reads on any board theme
    addArrow(a, b, 'rgba(0,0,0,.45)', a.size * 0.19, 1)
    addArrow(a, b, '#f2a33c', a.size * 0.13, 0.95)
  }

  var rect = null

  function hide() {
    ensure()
    clear()
    badge.classList.add('off')
  }

  function toggle() {
    visible = !visible
    if (!visible) hide()
    return visible
  }

  function redraw() {
    if (!rect) return
    var last = rect
    show({
      rect: last,
      flipped: lastState.flipped,
      move: lastState.move,
      san: lastState.san,
      eval: lastState.eval,
      error: lastState.error,
      busy: lastState.busy
    })
  }

  var lastState = { flipped: false, move: null, san: '', eval: '', error: null, busy: false }

  window.BestMoveOverlay = {
    show: function (state) {
      lastState = state
      show(state)
    },
    hide: hide,
    toggle: toggle,
    redraw: redraw,
    isVisible: function () { return visible }
  }
})()
