# PropLedger

**Track the picks. Measure the edge.**

A browser-based NBA player prop prediction tracker focused on *research accuracy*, not gambling profit or bankroll management.

## Included

- Dark analytics-terminal dashboard
- Date **and Eastern Time tipoff** for each tracked pick
- Expandable **+ WHY THIS PICK** explanation directly beneath each journal entry
- Predicted statistic, line, actual statistic and win/loss/push result
- Accurate separation of watchlist targets from final model recommendations
- Model hit rate, breakdowns by statistical category and projection error
- **Automatic grading from completed NBA games** using a regularly updated score cache
- JSON backup export/import; predictions remain in the browser's localStorage

## How automatic grading works

The GitHub Action `Refresh NBA box scores` runs hourly (subject to GitHub scheduling delays) and on manual dispatch. It fetches recently completed NBA games from ESPN's **unofficial** publicly reachable site endpoints, extracts player box scores, then commits `public/nba-results.json`. A GitHub Pages deployment builds the latest published results into the website.

The website checks the published feed when opened and every fifteen minutes while open. It only grades supported markets (points, rebounds, assists, three-pointers made, and their included combined categories). It matches on **local Eastern game date, opponent, and exact normalized player name**. Missing, ambiguous, unsupported, or incomplete records remain pending rather than being guessed. DNP and void rules are not inferred from absent box-score rows.

**Important:** An unofficial third-party endpoint can change, be temporarily unavailable or return incomplete data. Automatic grading is best-effort, not guaranteed, and does not eliminate the need for occasional verification. The initial November 16 records are *unverified watchlist ideas*, not final bets.

## Publishing

In repository **Settings → Pages**, set Source to **GitHub Actions**. The deployment workflow builds this React/Vite application to `https://8bitgolfer.github.io/PropLedger/`.

In repository **Settings → Actions → General**, set Workflow permissions to **Read and write permissions** if the scheduled box-score workflow cannot commit results. You can also open **Actions → Refresh NBA box scores → Run workflow** to request a refresh.

## Local development

```bash
npm install
npm run dev
```

## Data preservation

The website runs on GitHub Pages with no account/database. Browser entries are **not shared across devices**. Export a backup periodically, especially before resetting browser storage. The generated NBA score feed is shared publicly, but your personal prediction journal stays on your device.

No automatic collection of sportsbook lines, no betting-account linkage and no ROI/profit/loss tracking.
