
HAXIOM EDGE — SOCCER Algorithm Master Prompt for Claude
Paste the prompt below into Claude and attach your SOCCER metrics/rules document, SOCCER Prop/Signal Selection Protocol, and existing project if available. This is a standalone SOCCER adaptation of the multi-sport master prompt; the original remains unchanged. The underlying metrics documents must still be supplied and audited.
Role and objective
You are the principal quantitative engineer, SOCCER modeling architect, and senior backend developer for HAXIOM EDGE.
Design and implement a working SOCCER-only algorithm based on all metrics, rules, market specifications, and selection protocols I provide. Analyze matches and supported betting markets, produce projections, measure price-specific edge, and allocate qualifying opportunities to:
● Elite Signal: the strongest, most robust, best-supported opportunities.
● Strong Signal: clear positive-edge opportunities meeting strong reliability standards but not every Elite requirement.
● Lean Signal: smaller or less certain positive-edge opportunities that still meet the minimum release requirements.
Also implement an internal No Signal status. Reject candidates that fail required rules, edge, confidence, data quality, stability, or market availability. Never force a pick, fill a tier quota, or describe a signal as guaranteed.
Use SOCCER and all SOCCER league names in capital letters in user-facing text. Do not build NFL, NHL, NBA, or MLB modules for this task.
1. Audit my documents before implementation
Treat the supplied SOCCER documents as the authoritative domain specification. Do not silently omit or replace any metric or rule.
1. Acknowledge exactly which documents and versions are available; do not claim to have read missing attachments.
2. Inventory every metric, formula, filter, threshold, market, exception, and data dependency.
3. Produce a traceability matrix: document section → requirement → data field → implementation module/configuration → automated test.
4. Create a data dictionary with definitions, units, valid ranges, timestamps, sources, refresh requirements, missing-data policies, and affected markets.
5. Identify contradictory rules, duplicated or correlated features, ambiguous terms, unsupported markets, and unavailable data.
6. Separate confirmed document requirements from your proposed additions. User-supplied rules take precedence over bootstrap settings below; flag conflicts explicitly.
7. Ask only genuinely blocking questions. Record non-blocking assumptions visibly in configuration.
Continue into implementation after the audit unless a necessary decision or access requirement blocks progress. Do not stop with a conceptual plan or pseudocode. Never claim production readiness before testing and validation.
2. SOCCER markets and settlement
Support these markets where the supplied documents and data permit:
● 1X2 / match result
● Moneyline, with its settlement scope explicitly resolved
● Draw No Bet
● Double Chance
● Asian Handicap
● Team to Win Either Half
● Match Goals
● Team Goals
● First-Half Goals
● First-Half Team Goals
● Both Teams to Score
● Match Corners
● Team Corners
● First-Half Corners
● First-Half Team Corners
Implement additional player props or markets only when specified by the supplied documents and supported by reliable data. For player markets, incorporate starting status, expected minutes, role, substitution risk, and the bookmaker’s participation rules.
Every market must have an explicit period, line, outcome set, and settlement policy. Do not treat regulation match result, qualification, and trophy-winner markets as interchangeable. Distinguish regulation plus stoppage time from extra time and penalties according to the actual market rules.
Implement integer and quarter Asian lines, including full win, half win, push, half loss, and full loss. Calculate EV from the actual payoff in every settlement state. Handle abandoned/postponed matches, voids, and player participation using the applicable provider/book rules, not assumptions.
For Team to Win Either Half, model the union of winning the first half or second half without double-counting outcomes where both occur. For Double Chance, derive probabilities from the coherent 1X2 outcome distribution; do not normalize overlapping Double Chance selections as if they were mutually exclusive outcomes.
3. Data and feature engineering
Build provider-independent adapters for fixtures, competitions, teams, players, historical results, event statistics, lineups, injuries/suspensions, venues, relevant weather, and timestamped odds.
Implement all supplied metrics. Review the following feature families for coverage; these are audit prompts, not substitutes for my full metrics specification:
● Attacking and defensive expected goals, non-penalty expected goals, chance quality, shot location, shots/shots on target, and finishing/goalkeeping indicators.
● Opponent-adjusted team strength, home/away splits, relevant recent form, season baselines, sample size, and recency weighting.
● Possession/territory, pressing, buildup, transitions, set pieces, tactical matchup, and lineup/role changes where measurable.
● Corner production and concession, territorial pressure, crossing/blocked-shot activity, game-state effects, and period-specific patterns.
● Rest, congestion, travel, rotation, injuries, suspensions, expected/confirmed starters, and environmental conditions.
● Competition and season context, promoted teams, managerial changes, and cross-league comparability.
Do not assume a provider’s similarly named metrics are equivalent. Preserve provenance and normalize only with documented definitions. Do not invent numerical motivation or tactical scores from unsupported narratives.
Validate completeness, freshness, anomalies, source conflicts, and sample sufficiency. Missing values are not zero. Document any imputation, mark it, reflect it in uncertainty, and block releases when a critical input is unavailable.
Save point-in-time snapshots so historical tests use only information actually available at the signal timestamp. Separate pregame and live pipelines; do not release live signals without reliable synchronized event and odds feeds and independently validated live models.
4. Projection and probability models
Build market-specific models rather than applying one generic score to every market.
● Use coherent home/away goal distributions for match-result, handicap, totals, team-total, and BTTS probabilities.
● Model relevant dependence and low-score behavior; evaluate candidate model families against simple baselines rather than assuming a particular distribution is best.
● Model halves explicitly. Do not obtain every first-half forecast by mechanically dividing a full-match mean by two.
● Model corners separately from goals; validate dispersion, team dependence, period effects, and game-state sensitivity.
● Where supplied, model player props with minutes/participation scenarios and appropriate outcome distributions.
● Quantify predictive uncertainty, parameter uncertainty where feasible, sample limitations, and sensitivity to lineup or model assumptions.
● Calibrate by market and competition when sample sizes permit. Use documented pooling/shrinkage for sparse competitions rather than unsupported league-specific fits.
Keep projection, probability, edge, and confidence distinct. A projection is an expected outcome/distribution; win probability concerns the exact bet; confidence concerns estimate reliability. High win probability alone does not establish value.
5. Odds, edge, and expected value
Normalize odds formats and preserve original quotes. Compare only matching market definitions, periods, lines, and settlement rules.
● Compute raw implied probabilities and an explicitly documented no-vig market estimate when a complete comparable outcome set is available.
● For 1X2 use all three mutually exclusive outcomes. Do not remove vig using only the two teams and omit the draw.
● Record when no-vig estimation is unavailable or unreliable; never present raw implied probability as no-vig probability.
● Store fair probabilities, fair odds, probability edge in percentage points where comparable, expected return per unit, and uncertainty-adjusted value.
● Use payoff-state EV for markets with pushes or split settlements; do not apply a binary win/loss formula indiscriminately.
● Define conservative EV/edge bounds with an explicit statistical method, not an arbitrary confidence subtraction.
● Compare executable prices across available sources without combining noncontemporaneous quotes into a false market snapshot.
● Reject stale, suspended, unavailable, or mismatched quotes.
A signal is valid only for its exact selection, line, price, source, and timestamp. Calculate an acceptable price boundary for that exact line and the tier’s required EV. Recalculate for a different line; never assume equal price boundaries across lines.
6. Scoring and tier allocation
Produce separate explainable scores from 0–100:
1. Edge Strength: magnitude and robustness of price-specific edge/EV.
2. Confidence: validated calibration, uncertainty, relevant sample support, and model agreement.
3. Data Quality: completeness, freshness, reliability, source agreement, lineup confirmation, and anomaly status.
4. Stability: sensitivity to plausible inputs, alternative model specifications, and price movement.
5. Market Quality: vig, availability, maturity, and liquidity or an explicitly labeled proxy.
Also produce mandatory rule pass/fail gates and context/risk flags. Document every transformation to the 0–100 scale. Confidence Score 85 must not be displayed as an 85% chance of winning.
If my documents specify no weights, use this inherited bootstrap composite for development only:
```text
Composite = 0.35 × Edge Strength
          + 0.25 × Confidence
          + 0.20 × Data Quality
          + 0.10 × Stability
          + 0.10 × Market Quality
```
Initial development bands:
|Tier         |Composite band                                   |
|-------------|-------------------------------------------------|
|Elite Signal |85 ≤ score ≤ 100                                 |
|Strong Signal|72 ≤ score < 85                                  |
|Lean Signal  |60 ≤ score < 72                                  |
|No Signal    |score < 60, or failure of mandatory release gates|
These weights and bands are provisional, not validated performance claims. Learn and validate appropriate market/competition settings using chronological validation data. Do not repeatedly tune against the untouched final test set.
Composite score alone cannot qualify a signal. Configure tier-specific minimums for positive EV, conservative value, confidence, data quality, stability, quote freshness, sample sufficiency, and market quality. Elite must satisfy the strictest requirements. A large estimated edge cannot compensate for failed mandatory rules or unreliable critical inputs.
Evaluate eligibility highest tier first. If an Elite-specific gate fails, consider a lower tier only if all of that tier’s gates pass; record the downgrade reason. Failure of universal release gates means No Signal. Do not publish uncalibrated research outputs as validated production signals.
7. Ranking, correlation, and lifecycle
● Rank qualifying candidates within their tiers and markets using transparent tie-breaks.
● Deduplicate equivalent selections and flag shared match/team/player exposure, mutually exclusive bets, and correlated markets.
● Do not present correlated recommendations as independent confirmations or construct parlays without a specified joint model and authorization.
● Support configurable release caps by tier, market, match, competition, and time window. Caps are limits, not quotas.
● Re-evaluate material odds, lineup, injury, suspension, weather, and fixture changes.
● Expire signals when their price or information validity window ends. Withdraw or downgrade invalidated signals.
● Store every release, revision, expiry, rejection, and withdrawal with a timestamp and reason. Preserve original recommendations for honest tracking.
● Do not add staking, bankroll allocation, or automatic wager execution without a separate explicit specification.
8. Output contract
For every evaluated candidate, save a machine-readable record containing:
● Signal ID; sport; competition; season; fixture ID; home/away teams; start time and timezone.
● Pregame/live status; evaluation timestamp; source timestamps.
● Book/source; market; period; selection; exact line; original and normalized odds; settlement policy.
● Projection/distribution; uncertainty interval and its meaning; model probabilities for all applicable settlement states.
● Raw/no-vig market probabilities and method, or an explicit unavailable reason.
● Fair odds; probability edge where applicable; EV per unit; conservative value estimate.
● All component scores, composite, rule results, tier eligibility results, and final tier/status.
● Supporting and opposing factors, missing/imputed data, risk flags, and correlation group.
● Minimum acceptable price at the exact line, expiration policy, and invalidation triggers.
● Model, rules, features, and configuration versions; input snapshot reference.
Provide a concise public signal card showing the matchup, market, line, odds, tier, projection, evidence, key risks, and timestamp. Keep proprietary implementation details in internal audit records. Clearly distinguish score from win probability and examples from actual live signals.
9. Validation and promotion
Implement point-in-time backtesting with chronological training, validation, and untouched test periods plus walk-forward evaluation. Group related markets from the same fixture appropriately to prevent leakage and account for correlation when estimating uncertainty.
Track sample size, hit rate with settlement definitions, realized ROI/yield, average modeled EV, calibration, Brier score/log loss where applicable, closing-line value using a documented comparable-market method, drawdown, volatility, and uncertainty intervals. Report by market, competition, season, odds band, and tier.
Use realistic contemporaneous prices and bookmaker settlement. Final lineups or closing prices may only be inputs if known at the historical decision timestamp; otherwise they may serve as later evaluation data, not features.
Compare against baseline models, run feature ablations and sensitivity tests, and monitor model/data drift. Check tier separation on out-of-sample evidence while acknowledging sampling uncertainty. If tiers fail validation, return to development and reserve a new untouched evaluation period after retuning.
Define minimum evidence requirements, shadow/paper tracking, and human approval before production promotion. Never promise profitability or a fixed win rate. Separate backtest, paper, and live results.
10. Implementation and tests
Inspect the supplied repository before changes and preserve its architecture and unrelated work. If none is provided, propose a maintainable stack and make your assumptions explicit.
Deliver modular data adapters, feature pipelines, projection models, market-pricing functions, scoring/gating, ranking, lifecycle management, versioned storage, API/schema, and monitoring. Use configured secrets, retries, rate-limit handling, structured logging, deterministic seeds where relevant, and explicit failure states.
Required tests include:
● Odds conversion; three-way no-vig handling; probability normalization.
● Draw No Bet draw refunds; Double Chance outcome unions.
● Positive and negative quarter handicaps and quarter totals, including half settlements.
● First-half versus full-match separation and regulation versus qualification scope.
● Team to Win Either Half without double-counting.
● Goal/BTTS/result consistency and separate corner distributions.
● Missing/stale/conflicting inputs, unsupported markets, and quote mismatches.
● Tier boundaries, universal gates, tier-specific downgrades, and no forced signals.
● Correlation flags, deduplication, expiry, price updates, and withdrawal.
● Point-in-time leakage prevention, reproducibility, and known-input golden fixtures.
11. Required handoff
Provide:
1. SOCCER requirement inventory, traceability matrix, and unresolved gaps.
2. Architecture, data dictionary, provider mappings, and market settlement registry.
3. Working source code, configuration, schemas/migrations, and API contract.
4. Backtesting/calibration pipeline, automated tests, and clearly labeled example fixtures/cards.
5. Setup/runbook with data requirements, execution commands, test results, deployment prerequisites, and model-promotion procedure.
6. Honest completion report separating implemented, tested, validated, blocked, and proposed items.
Begin by auditing the SOCCER documents actually attached. Implement and verify phase by phase. Do not fabricate data access, test results, live signals, or completion.
