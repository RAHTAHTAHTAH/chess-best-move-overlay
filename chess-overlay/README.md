# Best Move Overlay

A Chrome extension that reads the chess board on **lichess.org** and **chess.com**, runs a
built-in engine, and draws the best move as an arrow directly on top of the board.

No site access beyond the page itself: no accounts, no API keys, no network calls.
Everything (parser, engine, drawing) runs locally in the content script.

---

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder (`chess-overlay`)
5. Open a game, analysis board or puzzle on lichess or chess.com

The arrow appears within a second of the position changing.

## Controls

| Key | Action |
| --- | --- |
| `Alt` + `B` | Show / hide the overlay |
| `Alt` + `T` | Flip the side to move (if the arrow points at the wrong colour) |

The badge above the board shows the suggested move and the evaluation from White's point of view.

## How it works

```
lib/chess.js      chess.js 0.13.4 + fast move accessors (see chess-coach/lib/chess.js)
src/engine.js     alpha-beta search: quiescence, PSTs, killers, iterative deepening
src/reader.js     site adapters -> 8x8 grid -> FEN
src/overlay.js    shadow-DOM SVG arrow + badge, click-through, above everything
src/content.js    wiring: watch the DOM, infer the side to move, analyze, draw
```

**Board reading**

- *lichess*: `cg-board` → `piece` elements, position from `transform: translate(x, y)`,
  orientation from the nearest `.orientation-white` / `.orientation-black` ancestor.
- *chess.com*: `wc-chess-board` → `.piece` elements, position from `square-{file}{rank}` classes.
  Two interpretations of that class are tried and the one that produces a legal position wins.

**Side to move**

The board DOM does not say whose turn it is, so it is inferred:

1. The starting turn comes from FEN validity — a position is impossible with White to move
   only when Black is in check.
2. After that, each observed board change identifies which colour moved (moving a piece
   changes 3 squares, being captured changes 2), and the turn alternates from there.
3. `Alt+T` overrides it if the inference ever gets it wrong.

Castling rights are inferred from kings/rooks on their home squares. En passant is not
tracked. Both are approximations; the engine's arrow is still legal for the position it sees.

**Engine**

Depth 4 with a 500 ms budget per position, evaluated in the page's main thread. It reuses the
search from `chess-coach/`: alpha-beta with quiescence, MVV-LVA ordering, killer/history
heuristics, and piece-square evaluation.

---

## Fair play

This is a real-time engine. Using it during live games on chess.com or lichess is against both
sites' rules and gets accounts closed — for you and, in team events, sometimes others. It's
intended for analysis boards, puzzles, bot games and study. That's a decision you make, not
something the code enforces.

---

## Known limitations

- If chess.com changes its DOM, `src/reader.js` needs updating. The reader fails closed:
  no valid position, no arrow.
- Boards inside cross-origin iframes are not read (`all_frames` is off).
- Ships no per-site toggles; it activates on any page where it finds a board.
- Only depth 4 — it is a hint tool, not a replacement for a real engine.

## Development

```powershell
.\serve.ps1 -Port 8766      # serves this folder at http://localhost:8766
```

- `mock/lichess.html` and `mock/chesscom.html` reproduce both DOM structures and auto-play
  `1.e4 e5 2.Nf3 Nc6 3.Bb5 a6`, so the whole pipeline can be tested without an account.
- `make-icons.ps1` regenerates `icons/*.png`.

The mocks load the real scripts, so they exercise the actual reader, engine and overlay code.
