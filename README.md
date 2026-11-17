# PropLedger

**Track the picks. Measure the edge.**

A local-first NBA prop research and performance journal.

## Features
- Analytics-terminal style dashboard
- Preloaded November 16, 2026 **unverified watchlist targets** (not graded as bets)
- Separate model recommendations from bets you actually placed
- Manual result grading (win, loss, push, void)
- Performance by statistical market, ROI for recorded wagers, projection error
- JSON export/import; all data stored in this browser's localStorage
- GitHub Pages automated deployment

## Local development
```bash
npm install
npm run dev
```

## GitHub Pages
Open **Settings → Pages**, select **GitHub Actions** under Build and deployment. Pushes to `main` deploy to `https://8bitgolfer.github.io/PropLedger/`.

## Data & limitations
No live lines, odds, scores or player stats are fetched. Manual grading and verified line entry are required. Watchlist targets are research notes, not confirmed wagers. Browser data does **not** sync between devices. Use Export/Import regularly.

This is a research journal and is not a promise of profitable wagering.
