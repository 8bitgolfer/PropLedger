# PropLedger

**Track the picks. Measure the edge.** A personal NBA prediction and research accuracy journal, hosted on GitHub Pages. There is **no profit/loss, stake or bankroll dashboard**.

## November 2026 visual redesign

PropLedger now has exactly **three primary pages** with a shared dark charcoal and lime-green interface:

- **Results** — an interactive calendar starting **November 16, 2026**, with daily `wins / graded tracked picks (hit rate)`, completed-pick table, monthly summary and clearly labeled watchlist outcomes.
- **Picks** — a clean, compact date-specific table without player portraits, search fields, or name badges; clicking a row opens saved line, projection, edge, research graphs, historical career H2H and opponent-matchup detail.
- **Analytics** — overall tracked-pick record, cumulative hit-rate trend, stat-market performance, recent results, separate locked-model audit, and data backup controls. No Settings page, ROI, profit/loss, bankroll or unit tracking.

The displayed stats are derived **only from stored records**. Image concepts were visual references, not sources of genuine 4/5 or 80% results. Watchlist/draft entries can receive final NBA box scores automatically and contribute to the Results calendar's *tracked* hit rate; they are separately identifiable from the official locked-model hit rate on the Analytics page. Predictions cannot be retroactively locked after tipoff to inflate historic performance.

Scores are imported by GitHub Actions on an approximately 20-minute schedule (delays possible), deployed through the same NBA results workflow, and rechecked by the browser every five minutes and when the page regains focus. The frontend keeps existing `propledger-v1` localStorage keys, IDs and historical records intact.

## What the tracker does

- Shows the prediction's game date and the actual NBA tipoff time in Eastern Time
- Provides an expandable **+ WHY THIS PICK** research explanation immediately beneath every entry
- Resolves current NBA games through scheduled game IDs, and players through ESPN roster player IDs when available
- Records projection, original line, forecast probability, final box-score result and hit/loss/push status
- Keeps research watchlists separate from timestamp-locked final recommendations
- Locks final model predictions **before official tipoff**; postgame correction notes are saved separately
- Automatically grades points, assists, rebounds, three-pointers, steals, blocks and supported combined markets from published final NBA box scores
- Permanently retains historical score files per Eastern game date; supports manual historical date-range backfills
- Tracks model accuracy and projection error without collecting financial betting information
- Supports optional **private Supabase cloud backup and restore** with email authentication and row-level security
- Continues working with locally saved browser journal data when cloud backup is unconfigured

## Graph-based "Why This Pick"

Each prop's expandable research drawer now has an Outlier-style, independently designed analysis panel:

- **LAST 5:** most recent five archived games before the prediction date, with per-game bars
- **LAST 10:** last ten archived games
- **H2H:** archived prior games against the selected opponent
- **2026–27:** archived games in the current NBA season
- A visible **prop-line marker**, per-game green/orange results, sample size, average and historical coverage
- A separate **defensive matchup spectrum** (red → orange → green). This is a transparent **team-level opponent statistical allowance proxy**, not a player-specific defensive matchup model. The polarity follows the saved More/Less selection.

The dashboard never fabricates missing historical data. Unavailable games and incomplete history show explicit empty states. The hourly archive workflow publishes `public/insights.json` from verified final NBA box scores. On the first regular run it attempts a current-season backfill; older H2H data requires an optional manual historical backfill.

**Important:** Only games completed **before the saved prediction date** count toward displayed research charts. The defense heat scale is descriptive, not a calibrated probability or statement that a bet is +EV. Its shade depends on opponent-team total allowed per game and a minimum history threshold.

## H2H history and automatic projection baseline

The Last 5 and Last 10 tabs include archived games before the chosen prediction date. H2H displays the **most recent 10 career games against the specified opponent**, across NBA seasons and team changes, with a smaller sample when fewer verified meetings are available. If no matching historical matchup exists in the published archive, the tab says so instead of inventing statistics.

The hourly NBA workflow now runs `scripts/backfill_h2h.py`, which fills historical NBA regular seasons from 2025–26 back to 2019–20 in bounded 35-day batches, most recent seasons first, and persists its progress in `public/history-progress.json`. Several successful workflow runs may be needed before older career H2H matchups appear; the tracker displays only verified games already archived. This is automatic once workflow permissions and publishing are working.

Where a model projection was never saved, the journal and chart panel can show an **AUTO BASELINE** from available older box scores. It requires at least five verified earlier games and uses 60% of the previous 5-game mean plus 40% of the previous 10-game mean. It does **not** rewrite the saved model prediction, imply we made a pregame research forecast, or incorporate injuries and opponent adjustments. If the historical data is inadequate, the baseline remains unavailable.

## Automatic grading

The GitHub workflow **Refresh NBA scores and schedule** runs on an approximately 20-minute scheduled cadence (GitHub may delay scheduled jobs) or can be started manually from **Actions**. It refreshes game schedules and current rosters and archives final box scores under `public/results/YYYY-MM-DD.json`. It never deletes older dates during its normal rolling refresh.

New picks should be created by selecting their game from the schedule and their player from that team's roster. This stores the official game and player IDs. Existing legacy picks without IDs fall back to an unambiguous full-name, date and opponent match; uncertain matches remain pending.

The website checks archived results when opened and about every 15 minutes while open. DNP, no posted stats, unresolved name matches or unavailable markets stay pending until a reliable resolution is available. Official platform-specific injury protections and settlement rules are not inferred.

### Historical backfill

On GitHub open **Actions → Refresh NBA scores and schedule → Run workflow**. Optionally specify `start_date` and `end_date` in ISO format, e.g. `2026-11-01` and `2026-11-16`. Each request can span at most 90 days; run successive ranges for longer periods. Already archived finals persist.

**Warning:** ESPN's public site API is unofficial, can change without notice and has not been verified in a live end-to-end test here.

## Prediction integrity

Use **Add prop** to save a draft. Verify the actual line and any research rationale, then choose **LOCK** in the journal **before the selected game's official tipoff**. Locked predictions contribute to model hit rate only once a final grade is available. In the application UI, original fields are read-only after locking; only separate correction notes can be added.

This is a browser-side safeguard, *not cryptographically tamper-proof*. Anyone with direct access to their browser storage could modify the underlying data. A future server-side append-only signed log would be needed for independently auditable immutability.

## GitHub Pages publishing

1. In **Settings → Pages**, choose **GitHub Actions** as the deployment source.
2. In **Settings → Actions → General**, ensure workflow permissions permit writing repository contents, so score archives can be committed.
3. Check **Actions → Deploy PropLedger** for a successful build before opening `https://8bitgolfer.github.io/PropLedger/`.
4. Check **Actions → Refresh NBA scores and schedule** for successful score updates.

## Private cloud backup — optional setup

Cloud backups require a separate account/database; **they are not active simply because files were committed**. Do not store personal pick histories or Supabase service-role keys in this public repository.

1. Create a private Supabase project.
2. In its SQL editor, run `supabase/schema.sql` to create a table protected by row-level security (RLS).
3. In Supabase Auth, enable email OTP/magic links, set your site URL to `https://8bitgolfer.github.io/PropLedger/`, and allow that redirect URL.
4. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, create `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using your project's public URL and publishable/anon key. **Never add the service-role key.**
5. Redeploy **Deploy PropLedger**. On the Analytics page, sign in using an email link to enable **Back up to cloud** and **Restore from cloud**.
6. A cloud restore replaces this browser's local journal only after explicit confirmation. Export a local JSON backup before restoring.

Backups are **manual and private per authenticated user**, not live device-to-device synchronization. Local browser storage still works without this setup. Automatic synchronization with merge conflict management is a separate future project.

## Development

```bash
npm install
npm run dev
npm run build
```

## Limitations

- No verification yet of live workflows/build success in this session.
- The legacy November 16 entries are unverified *watchlist* ideas, not timestamp-locked model recommendations.
- No real-time player props, sportsbook line imports or account synchronization.
- Automatic box-score matching and grading are best-effort and require successful GitHub Actions execution.
- Predictions entered after tipoff cannot be retroactively locked as pregame model predictions.

## Automatic end-of-game updates

The NBA archive workflow now publishes GitHub Pages itself after fetching and committing the latest final box scores. This is essential because commits performed by the default GitHub Actions token do **not** trigger the separate push-based Pages deployment workflow. Once a game becomes final and the next scheduled run succeeds, the latest archive and rebuilt website are deployed together. During an open browser session the journal checks published results about every 15 minutes; page refresh or reopening also rechecks. Historical career-H2H backfill is restricted to the daily scheduled run or manually dispatched runs so it cannot delay ordinary final-result refreshes.

The archive schedule runs approximately every 20 minutes, subject to GitHub's scheduling delays. A finalized box score, GitHub Actions success, Pages deployment, and the next browser poll are all needed for the change to appear. Existing entries can be automatically graded as watchlist items without counting toward locked-model performance metrics. Player DNPs, missing individual box scores and ambiguous player matches remain unresolved rather than being declared wins or losses.
