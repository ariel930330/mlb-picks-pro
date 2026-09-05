

PROFESSIONAL SYSTEM SPECIFICATION
HAXIOM EDGE
SOCCER SIGNAL ENGINE
Metrics, Feature Engineering, Qualification & Final-Market Validation
SCOPE
 | MARKETS
 | PROFILE
 | Pregame + live extension
 | 1X2, goals, handicaps & corners
 | Conservative / very picky
 | 
OPERATING PRINCIPLE  Detected does not mean selected. A candidate becomes an official signal only after the executable price, competition scope, lineup, tactical matchup, data-quality and uncertainty gates all pass.
 | 

Version 1.1  |  September 2026
Prepared as the Soccer module for The Baker's Picks / HAXIOM EDGE


1. Executive Direction
Soccer betting is a pricing problem built on low scoring, a material draw state, competition-specific rules and sharp information shocks around lineups. Team quality, xG, possession, pressing, goalkeeping and tactical matchup data matter only after they are translated into joint score and event distributions, then compared with the exact executable line, odds and settlement rules available at the decision timestamp. Internal calibrated probabilities remain mandatory even when the public output emphasizes only the signal and edge.
1.1 Markets covered
Core result markets: 1X2 (three-way moneyline), draw no bet, double chance, Asian handicap including quarter lines, European handicap and Team to Win Either Half. A sportsbook label of Moneyline must resolve to a canonical market and period before pricing; an untyped Moneyline label is never accepted.
Goal markets: Match Goals, Team Goals, First-Half Goals, First-Half Team Goals, alternate/Asian totals and Both Teams to Score. Additional derivatives include second-half result/totals, winning margin, clean sheet, win to nil, exact score, correct-score groups, time bands and qualification/trophy markets when rule scope and price quality pass.
Corner markets: Match Corners, Team Corners, First-Half Corners, First-Half Team Corners, alternate corner totals and corner handicaps. Every corner market must retain period, team, line, push/quarter-line behavior and sportsbook stat-provider rules.
Other team-event markets: cards, booking points, team cards, offsides, shots, shots on target, fouls and related markets only when provider grading matches the sportsbook rulebook.
Player markets: goals, assists, shots, shots on target, passes, tackles, fouls, cards, offsides, goalkeeper saves and other role-dependent props when start/substitute/DNP rules are verified.
Live extension: in-play 1X2, handicaps, match/team/period goal totals, next goal, match/team/period corners, cards and props using only official state plus a quote captured before each decision timestamp.
1.1.1 Canonical requested-market registry
The bot must preserve the sportsbook's original label while mapping it to exactly one canonical ID. This prevents Moneyline, period, team and corner scopes from being silently merged.
Canonical market
 | Selections / scope
 | Probability object
 | Settlement control
 | 1X2
 | Home / Draw / Away; regulation
 | Joint score-grid outcome mass
 | Three-way; 90 minutes plus stoppage
 | Moneyline
 | Book label resolved before use
 | Alias of 1X2, DNB or To Qualify
 | Block any ambiguous two-way/three-way scope
 | Draw No Bet
 | Home / Away; draw refunded
 | Win, draw and loss state mass
 | Draw is push; regulation scope
 | Double Chance
 | 1X / X2 / 12; regulation
 | Sum of two mutually exclusive 1X2 states
 | Three selections; no duplicated vig set
 | Asian Handicap
 | Team and signed whole/half/quarter line
 | Goal-margin settlement mass
 | Win, half-win, push, half-loss, loss
 | Team to Win Either Half
 | Home or away team wins H1 or H2
 | Joint first-/second-half score simulation
 | At least one half won; book tie rules verified
 | Match Goals
 | Over / Under combined goals
 | Full-match total-goals distribution
 | Whole/half/quarter line settlement
 | Team Goals
 | Over / Under home or away goals
 | Team marginal goal distribution
 | Team and regulation scope required
 | First-Half Goals
 | Over / Under combined H1 goals
 | First-half total-goals distribution
 | First half plus first-half stoppage
 | First-Half Team Goals
 | Over / Under one team's H1 goals
 | First-half team marginal distribution
 | Team, half and line required
 | 
1.1.1 Canonical requested-market registry — continued
Canonical market
 | Selections / scope
 | Probability object
 | Settlement control
 | Both Teams to Score
 | Yes / No; regulation
 | Joint positive-goal / zero-goal mass
 | Own-goal and abandonment rules verified
 | Match Corners
 | Over / Under combined corners
 | Full-match corner-count distribution
 | Regulation corner/stat-source scope
 | Team Corners
 | Over / Under one team's corners
 | Team corner marginal distribution
 | Team, line and stat source required
 | First-Half Corners
 | Over / Under combined H1 corners
 | First-half corner-count distribution
 | First half plus stoppage; stat source required
 | First-Half Team Corners
 | Over / Under one team's H1 corners
 | First-half team corner marginal
 | Team, half, line and stat source required
 | 
1.2 Non-negotiable output fields
Block
 | Required fields
 | Identity
 | event_id, competition_id, season_id, market_id, selection_id, sportsbook, quote_timestamp, scheduled_start
 | Market
 | source_market_name, canonical_market_id, market_type, team_scope, period_scope, overtime_scope, line, odds, best_available_price, minimum_acceptable_price, settlement_rule_id
 | Model
 | fair_line, fair_odds, calibrated_probability, edge_units, edge_percent, EV, uncertainty_band, push/half-win/half-loss mass
 | Context
 | lineup_scenarios, formation, roles/minutes, key absences, goalkeeper state, tactics, weather/pitch, referee, motivation tags
 | Qualification
 | signal_state, score, percentile, hard_gate_status, model_agreement, data_quality, fragility and liquidity
 | Release
 | release_window, expires_at, recheck_at, validation_timestamp, price tolerance, kill_switch_reason
 | Audit
 | feature_snapshot_id, source timestamps, data/definition/model/policy versions, reason codes and correlation family
 | 
1.3 What the engine must never do
Use future information in training: closing prices, confirmed lineups, late injuries, weather changes, corrected event data or final formations that were unavailable at the historical decision time.
Treat raw recent form, league table position, head-to-head results, rivalry, revenge, public percentages, motivation narratives or last-match finishing as standalone evidence.
Mix 90-minute, extra-time, penalties, qualification or abandoned-match scopes; every market must carry an exact settlement-rule identifier.
Treat all shots as equal, or use raw goals, save percentage, possession or pass completion without shot quality, score state, venue, opponent and competition adjustment.
Assume a starting XI, goalkeeper, formation, penalty taker or set-piece role without a timestamped source and a scenario confidence state.
Join two providers' xG, xA, pressure, progressive pass, possession, duel, tackle, key-pass, save or card fields without a versioned definition crosswalk.
Publish when the quote is stale, the event/market mapping is uncertain, the book's player participation rule is unresolved, or value disappears at the executable price.
Count correlated expressions of one opinion as separate plays. 1X2, handicap, team total, BTTS, scorer and goalkeeper markets may share one exposure thesis.
2. HAXIOM EDGE Soccer Workflow
#
 | Stage
 | Decision
 | Primary inputs
 | 1
 | Continuous Evaluation
 | Monitor every approved competition before any candidate reaches a board.
 | Schedule, odds, lineups/news, projected XI, roles, travel, weather, pitch and officiating
 | 2
 | Market Scan
 | Identify actionable prices and dislocations across books and market families.
 | Opener/current/best quote, movement, dispersion, limits/liquidity proxy, rule scope
 | 3
 | Team Context
 | Project scoring, shot, territory and event environment for the matchup.
 | xG process, style, lineup, goalkeeper, set pieces, rest, venue, referee
 | 4
 | Active Boards
 | Create independent release windows; candidates may expire or return to monitoring.
 | Time to kickoff, lineup publication, price tolerance, feed freshness and recheck time
 | 5
 | Signal Qualification
 | Validate, rank and compare candidates; detection alone is insufficient.
 | EV, lower-bound EV, uncertainty, model agreement, reliability, data quality
 | 6
 | Play Allocation
 | Reserve qualified signals in fixed order and remove duplicated/correlated selections.
 | Elite > Strong > Lean > Signal Detected watchlist
 | 7
 | Final Validation
 | Recheck the exact market immediately before publication.
 | Line/price, XI/role, goalkeeper, event state, settlement and market context
 | 
2.1 Snapshot discipline
Every feature must be point-in-time. Store event time (when the football or market event occurred) and ingestion time (when HAXIOM received it). Reconstruct historical boards from append-only snapshots, not from today's corrected database. Any source correction creates a new version; it never overwrites the original decision state.
Feed
 | Recommended refresh
 | Storage rule
 | Odds
 | 5-30 seconds when active; faster near kickoff/live
 | Append every quote by book, line, price, status, period and settlement scope.
 | Official schedule/event
 | On every source change
 | Preserve scheduled/actual kickoff, delay, postponement, abandonment and game-state timestamps.
 | Roster/injury/news
 | On every source change; aggressive on matchday
 | Store source, exact wording, confidence, publication time and ingestion time.
 | Projected/confirmed XI
 | On change; checks T-24h/T-6h/T-90/T-65/T-20
 | Store player, position, formation, bench, goalkeeper, role scenario and confirmation source.
 | Event data
 | Real time for live; finalized after correction
 | Do not overwrite raw events; version scorer, assist, card, x/y and VAR corrections.
 | Tracking/physical
 | Per vendor/license and processing cycle
 | Retain vendor, competition, coordinate frame, coverage quality and model version.
 | Weather/pitch/officials
 | Forecast cadence; on assignment/change
 | Store forecast issue time, observed values, surface state, referee and source confidence.
 | Settlement rules
 | At onboarding and every book/market update
 | Version 90-minute, extra-time, DNP, abandonment, stat-provider and dead-heat rules.
 | 
3. Mathematical Core
Soccer requires coherent probability mass over home goals, away goals, half-by-half scores and team event counts. Result, goal, BTTS and Team to Win Either Half markets should reconcile to approved joint score/period distributions; match, team and first-half corner markets should reconcile to an approved joint corner process. Quarter-line Asian markets must be settled by explicitly splitting the stake, not approximated as a two-way bet.
Metric
 | Formula
 | Implementation note
 | Decimal implied probability
 | q = 1 / decimal_odds
 | Raw probability includes margin; American and fractional odds convert before use.
 | American odds conversion
 | d = 1 + 100/abs(A) if A<0; d = 1 + A/100 if A>0
 | Retain original and normalized forms; reject malformed or zero prices.
 | No-vig 1X2 probability
 | p_i = q_i / sum(q_home,q_draw,q_away)
 | Use the exact mutually exclusive outcome set from the same book/time; compare multiplicative, additive, power and Shin methods.
 | Fair odds
 | fair_decimal = 1 / p; fair_A derived from decimal
 | Store probability before rounding and a display price separately.
 | Edge
 | edge_pp = p_model - p_no_vig
 | Probability-point edge is not EV; store both.
 | Two-way expected value
 | EV = p_win*(d-1) - p_loss
 | Add push/void mass explicitly; do not treat it as a loss.
 | Three-way expected value
 | EV_i = p_i*(d_i-1) - (1-p_i)
 | The selected 1X2 outcome is priced against its calibrated probability.
 | Asian-line EV
 | EV = sum_s P(score state s)*settlement_return(s,line,d)
 | Support win, half-win, push, half-loss and loss for quarter/whole/half lines.
 | Push probability
 | P(goal margin or total equals whole-number line)
 | Mandatory for whole handicaps, whole totals and integer props.
 | Independent Poisson
 | P(H=h,A=a)=Pois(h;lambda_H)*Pois(a;lambda_A)
 | Baseline only; validate dependence, overdispersion and excess-low-score behavior.
 | Dixon-Coles correction
 | P_DC(h,a)=tau(h,a;rho)*P_Poisson(h,a)
 | A validated low-score correction; version rho and time decay.
 | Bivariate/latent score model
 | (H,A) share match-tempo and state components
 | Use when score dependence materially improves proper scores and calibration.
 | Negative-binomial count
 | Var(Y) > E(Y) through dispersion parameter
 | Candidate for cards, corners, shots and overdispersed player counts.
 | Skellam goal margin
 | D = H-A from independent Poisson rates
 | Useful diagnostic for handicaps; simulation is preferred once dependence is added.
 | BTTS probability
 | 1-P(H=0)-P(A=0)+P(H=0,A=0)
 | Derive from the same joint score grid used for totals and 1X2.
 | Over total probability
 | P(H+A > L) plus settlement at L
 | Represent alternate lines and exact push/quarter-line states.
 | First-half team total
 | P(G_team,H1 > L) plus settlement at L
 | Use a first-half team marginal; do not mechanically prorate the full-match mean.
 | Team wins either half
 | P(W_H1 union W_H2)=P(W_H1)+P(W_H2)-P(W_H1 and W_H2)
 | Estimate the intersection from a joint period model; do not assume the halves are independent.
 | 
3. Mathematical Core — continued
Metric
 | Formula
 | Implementation note
 | Corner-line EV
 | EV = sum_c P(corner state c)*settlement_return(c,line,d)
 | Use the correct match/team/first-half distribution and exact sportsbook corner rules.
 | Expected points
 | xPts = 3*P(win)+P(draw)
 | Team-strength/process diagnostic, not a direct betting target.
 | Expected-goal sum
 | xG = sum_j P(goal from chance j)
 | Version provider, features, penalty policy, own-goal policy and competition.
 | Recency weight
 | w_t = exp(-lambda*age_days)
 | Tune by league/feature; do not choose decay after seeing the target match.
 | Opponent adjustment
 | adj = raw - expected_vs_opponent/context
 | Estimate hierarchically across team, player, competition, venue and score state.
 | Bayesian shrinkage
 | posterior = weighted data + prior
 | Shrink finishing, goalkeeper, referee, set-piece and small-league samples strongly.
 | Lineup scenario mixture
 | P(Y)=sum_k P(Y|XI_k)*P(XI_k)
 | Use scenario probabilities before official teams; never insert one unconfirmed XI.
 | Lower-bound EV
 | EV_LCB = EV_hat - k*SE(EV_hat)
 | Primary conservative requirement for Strong and Elite promotion.
 | Ensemble uncertainty
 | Var_total = within-model + between-model + scenario variance
 | Carry parameter, model, lineup, data and price uncertainty.
 | Calibration error
 | ECE = sum_b n_b/N*abs(acc_b-conf_b)
 | Track by market, league, odds band, release window and model version.
 | Brier score
 | mean((p-y)^2)
 | Use multiclass Brier for 1X2 and binary form for derived markets.
 | Log loss
 | -mean(log p_observed)
 | Punishes overconfidence; clip only for numerical safety and report the clip.
 | Ranked probability score
 | sum_k (CDF_forecast(k)-CDF_observed(k))^2
 | Useful for ordered goals, margins and count distributions.
 | Closing-line value
 | CLV = log(d_bet / d_close) or probability-point equivalent
 | Use matched scope/book consensus; CLV is a process diagnostic, not proof alone.
 | Effective sample size
 | ESS = (sum w)^2 / sum(w^2)
 | Gate recency-weighted and scenario-weighted estimates.
 | 
DEFINITION CONTROL  IFAB and competition rules establish match semantics, while event/tracking providers establish data semantics. HAXIOM must retain provider, competition, season, coordinate system, score-state adjustment, penalty/own-goal policy, formula and model version. Never join two fields merely because both are labeled xG, xA, pressure, progressive pass, save, tackle, duel or possession.
 | 
4. Master Metric Dictionary
The dictionary is intentionally broader than the launch model. Store raw fields where legally and operationally available, then use walk-forward testing to determine which derived features survive. Direction is matchup-dependent; the final column describes decision use, not a universal positive or negative sign.
4.1 Market and Price Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Best executable decimal price
 | mkt_best_decimal
 | Highest approved live price for the exact selection, line and scope
 | Only price permitted for release EV
 | Best executable American price
 | mkt_best_american
 | Normalized American display of best executable decimal quote
 | Publication and minimum-price control
 | Opening price
 | mkt_open_price
 | First valid quote after market creation under stable mapping
 | Anchors market path, not assumed truth
 | Current consensus probability
 | mkt_consensus_novig_p
 | Robust no-vig probability across approved books at timestamp
 | Market prior and coherence check
 | Sharp-book probability
 | mkt_sharp_novig_p
 | No-vig probability from designated high-information books
 | Residual model and movement context
 | Median line
 | mkt_median_line
 | Median active line across approved books
 | Rejects isolated stale outliers
 | Mode line
 | mkt_mode_line
 | Most common line weighted by book quality
 | Identifies dominant handicap/total state
 | Line dispersion
 | mkt_line_dispersion
 | MAD or SD of active lines after scope matching
 | Measures disagreement and mapping risk
 | Price dispersion
 | mkt_price_dispersion
 | Robust spread of no-vig probabilities at the same line
 | Information and liquidity proxy
 | Overround
 | mkt_overround
 | Sum of raw implied probabilities minus 1
 | Price-quality and no-vig diagnostics
 | No-vig method spread
 | mkt_devig_spread
 | Range across multiplicative, additive, power and Shin estimates
 | Adds margin-removal uncertainty
 | Opener-to-current move
 | mkt_move_open
 | Current fair probability or line minus opener
 | Market information path
 | Recent velocity
 | mkt_move_velocity
 | Price/line change per minute over rolling windows
 | Detects active repricing near release
 | Acceleration
 | mkt_move_acceleration
 | Change in movement velocity
 | Possible news/steam transition
 | Steam breadth
 | mkt_steam_breadth
 | Share of approved books moving same direction within window
 | Separates broad move from one book
 | Reverse movement
 | mkt_reverse_move
 | Price direction opposed to public/ticket proxy where licensed
 | Context only; requires validated source
 | Stale quote flag
 | mkt_stale_quote
 | Quote age or cross-book inconsistency exceeds limit
 | Automatic block
 | Market suspension count
 | mkt_suspend_count
 | Suspensions/reopens during active window
 | News, mapping or live-volatility signal
 | 
4.1 Market and Price Metrics — continued
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Quote age
 | mkt_quote_age_ms
 | Decision time minus quote receipt time
 | Hard freshness gate
 | Feed latency
 | mkt_feed_latency_ms
 | Receipt time minus provider event/quote time
 | Backtest and live integrity
 | Active book count
 | mkt_active_books
 | Approved books with matched live quotes
 | Breadth/liquidity proxy
 | Book reliability score
 | mkt_book_reliability
 | Historical uptime, rejection, correction and stale-rate score
 | Quote selection and quality weighting
 | Limit/liquidity proxy
 | mkt_liquidity_proxy
 | Limits, market age, spread, book count and movement response
 | Fragility control
 | Derivative coherence
 | mkt_derivative_gap
 | Difference between joint-model implied and related market prices
 | Finds inconsistency; also detects bad mapping
 | Cross-market arbitrage residual
 | mkt_cross_market_resid
 | Constraint residual across 1X2, DNB, AH, totals, BTTS and team totals
 | Quality check before claiming edge
 | Minimum acceptable price
 | mkt_min_price
 | Worst price retaining tier EV after uncertainty/costs
 | Publication expiration boundary
 | Price tolerance
 | mkt_price_tolerance
 | Allowed movement from qualified quote before rerun
 | Post-qualification control
 | Rule-scope match
 | mkt_scope_match
 | Exact 90m/ET/qualification, period, stat and DNP rule agreement
 | Hard settlement gate
 | Market mapping confidence
 | mkt_mapping_conf
 | Confidence event, participant, side, line and selection IDs are correct
 | Hard integrity gate
 | Closing quote
 | mkt_close_price
 | Last valid matched quote before lock/kickoff
 | CLV and replay only; never pregame input
 | 
4.2 Match Result and Goal-Production Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Goals for per 90
 | team_gf_p90
 | Non-own goals scored per regulation 90 with competition policy
 | Descriptive output; shrink and context-adjust
 | Goals against per 90
 | team_ga_p90
 | Goals conceded per regulation 90
 | Outcome history; weaker than process alone
 | Goal difference per 90
 | team_gd_p90
 | GF minus GA per 90
 | Broad team result signal
 | Non-penalty goals per 90
 | team_npg_p90
 | Goals excluding penalties per 90
 | Reduces penalty-event noise
 | Penalty goals/awards
 | team_pen_rate
 | Penalties scored and awarded per box entry or match
 | Regress heavily; referee/attack context
 | Own-goal rate
 | team_own_goal_rate
 | Own goals for/against per defensive event
 | Low-frequency noise and rule audit
 | First-goal probability
 | team_first_goal_p
 | Probability team scores before opponent in model/historical state
 | Game-script and live branching
 | Score-first win rate
 | team_win_given_first
 | Outcome rate after scoring first, shrunk and strength-adjusted
 | State-management profile
 | Concede-first recovery
 | team_points_given_concede_first
 | Points or win/draw rate after conceding first
 | Bench, style and comeback profile
 | Nil-nil probability
 | match_p_0_0
 | Joint model mass at 0-0
 | 1X2, totals, BTTS and correct score
 | Draw probability
 | match_draw_p
 | Sum of score-grid diagonal mass
 | Central 1X2/AH input
 | Home-win probability
 | match_home_win_p
 | Mass where home goals exceed away goals
 | Calibrated 1X2 input
 | Away-win probability
 | match_away_win_p
 | Mass where away goals exceed home goals
 | Calibrated 1X2 input
 | Expected home goals
 | match_lambda_home
 | Model mean home goals under current scenarios
 | Unified score distribution
 | Expected away goals
 | match_lambda_away
 | Model mean away goals under current scenarios
 | Unified score distribution
 | Expected total goals
 | match_lambda_total
 | Home plus away expected goals
 | Totals/BTTS anchor
 | Goal-margin distribution
 | match_goal_margin_dist
 | Probability mass for home minus away goals
 | Asian/European handicap pricing
 | Clean-sheet probability
 | team_clean_sheet_p
 | Probability opponent scores zero
 | Win-to-nil and goalkeeper/team props
 | Win-to-nil probability
 | team_win_to_nil_p
 | Joint probability of win and clean sheet
 | Derivative consistency
 | Expected points
 | team_expected_points
 | 3*P(win)+P(draw)
 | Strength and pricing diagnostic
 | Result entropy
 | match_result_entropy
 | Entropy of 1X2 calibrated probabilities
 | Uncertainty and tier fragility
 | Low-score dependence
 | match_low_score_rho
 | Estimated Dixon-Coles/latent dependence term
 | Improves 0-0, 1-0, 0-1, 1-1 mass
 | Goal overdispersion
 | match_goal_dispersion
 | Observed/model variance relative to Poisson mean
 | Chooses score-distribution family
 | 
4.3 Expected-Goals and Chance-Quality Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Expected goals for
 | team_xg_for
 | Sum of shot-level scoring probabilities
 | Core chance-quality production
 | Expected goals against
 | team_xg_against
 | Opponent shot xG conceded
 | Core defensive process
 | Non-penalty xG
 | team_npxg
 | xG excluding penalties
 | More stable open/set-play process
 | xG difference
 | team_xgd
 | xG for minus xG against
 | Primary team-quality feature
 | xG share
 | team_xg_share
 | xGF divided by xGF plus xGA
 | Chance-quality control share
 | xG per 90
 | team_xg_p90
 | xG normalized by eligible minutes
 | Competition/player comparison
 | xG per shot
 | team_xg_per_shot
 | xG divided by eligible shots
 | Average chance quality
 | Post-shot xG
 | team_psxg
 | On-target scoring expectation using placement/trajectory features
 | Finishing/goalkeeper decomposition
 | xGOT difference
 | team_xgot_minus_xg
 | Post-shot xG minus pre-shot xG
 | Shot placement signal; shrink
 | Open-play xG
 | team_open_play_xg
 | xG created from non-set-play possessions
 | Tactical matchup baseline
 | Set-piece xG
 | team_set_piece_xg
 | xG from corners, free kicks, throw-ins and related restarts
 | Set-piece matchup input
 | Penalty xG
 | team_penalty_xg
 | Provider-defined xG assigned to penalties
 | Separate low-frequency mechanism
 | Fast-break xG
 | team_counter_xg
 | xG following validated transition/counter events
 | Transition matchup interaction
 | High-turnover xG
 | team_high_turnover_xg
 | xG after regain in advanced zone within defined window
 | Pressing payoff
 | Big-chance xG
 | team_big_chance_xg
 | Provider-defined high-quality-chance xG
 | Use only with definition version
 | Box-entry-to-xG conversion
 | team_box_entry_xg_rate
 | xG produced per controlled box entry
 | Final-action efficiency
 | Deep-completion xG yield
 | team_deep_completion_xg
 | Subsequent xG per deep completion
 | Territory quality
 | Cross xG yield
 | team_cross_xg_rate
 | xG per eligible cross by zone/type
 | Aerial/cross matchup
 | 
4.3 Expected-Goals and Chance-Quality Metrics — continued
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Cutback xG
 | team_cutback_xg
 | xG created from detected cutback actions
 | High-value chance style
 | Through-ball xG
 | team_through_ball_xg
 | xG generated after through balls
 | Back-line/high-line matchup
 | Rebound xG
 | team_rebound_xg
 | xG from immediate second chances under provider rule
 | Goalkeeper/box-clearance interaction
 | Header xG share
 | team_header_xg_share
 | Share of xG from headed shots
 | Aerial and crossing matchup
 | Footed shot xG share
 | team_foot_xg_share
 | Share of xG from non-headed shots
 | Shot-profile interaction
 | Chance-quality trend
 | team_xg_quality_ewm
 | Predeclared exponentially weighted xG features
 | Regime-aware form without cherry-picking
 | xG model disagreement
 | team_xg_provider_spread
 | Difference between approved xG providers/models after alignment
 | Definition/model uncertainty gate
 | 
4.4 Shot Creation and Finishing Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Shots per 90
 | team_shots_p90
 | Eligible attempts per regulation 90
 | Volume input to goals and props
 | Shots on target per 90
 | team_sot_p90
 | Official/provider on-target shots per 90
 | Goalkeeper saves and scoring volume
 | SOT rate
 | team_sot_rate
 | Shots on target divided by shots
 | Placement/selection profile
 | Blocked-shot rate
 | team_blocked_shot_rate
 | Blocked attempts divided by shots/attempts
 | Box density and shot access
 | Shots inside box
 | team_box_shots_p90
 | Shots originating inside penalty area per 90
 | Chance quality and territory
 | Shots in six-yard box
 | team_six_yard_shots
 | Shots from close range under coordinate rule
 | High-value chance access
 | Shots outside box
 | team_long_shots_p90
 | Attempts outside penalty area per 90
 | Often lowers average xG
 | Central-shot share
 | team_central_shot_share
 | Share from central high-value channels
 | Shot-profile quality
 | Shot distance
 | team_avg_shot_distance
 | Mean/median distance with coordinates normalized
 | Chance selection feature
 | Shot angle
 | team_shot_angle
 | Distribution of goal-mouth angle at shot
 | xG and goalkeeper interaction
 | Shot speed
 | team_shot_speed
 | Tracked ball speed where available
 | Post-shot scoring/keeper model
 | Shot pressure
 | team_shot_pressure
 | Defender proximity/pressure at attempt
 | xG context and tactical creation
 | One-touch-shot share
 | team_one_touch_share
 | Share of attempts struck first time
 | Chance speed and placement
 | Open-goal/keeper-position context
 | team_keeper_context
 | Keeper/defender locations at shot if provider supplies
 | Advanced xG/PSxG
 | Shot-ending possessions
 | team_shot_end_poss_rate
 | Share of possessions ending in a shot
 | Attacking control and turnover tradeoff
 | Non-shot attacking value
 | team_nonshot_value
 | OBV/xT/EPV added before the shot
 | Captures dangerous buildup without attempt
 | Finishing over xG
 | team_goals_minus_xg
 | Goals minus xG by player/team with posterior shrinkage
 | Talent/regression decomposition
 | Non-penalty finishing rate
 | team_npg_minus_npxg
 | NPG minus NPxG, time-decayed and shrunk
 | Persistent finishing signal with high uncertainty
 | Conversion rate
 | team_goal_per_shot
 | Goals divided by eligible shots
 | Descriptive; adjust for xG mix
 | SOT conversion
 | team_goal_per_sot
 | Goals divided by SOT
 | Placement/goalkeeping mix
 | Big-chance conversion
 | team_big_chance_conv
 | Goals divided by provider big chances
 | Narrative only unless definition/sample pass
 | Shot assist rate
 | team_shot_assist_rate
 | Passes directly creating shots per possession/90
 | Chance-creation volume
 | 
4.5 Possession and Territorial-Control Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Possession share
 | team_possession
 | Provider-defined share of controlled possession/time
 | Style/context, not dominance by itself
 | Possession-adjusted rates
 | team_padj_features
 | Defensive actions scaled for opponent possession
 | Fair comparison across styles
 | Field tilt
 | team_field_tilt
 | Final-third pass/touch share versus opponent
 | Territorial control
 | Territory share
 | team_territory_share
 | Average ball location or possession value territory
 | Game control and pressure
 | Final-third entries
 | team_final_third_entries
 | Controlled and total entries per 90
 | Attacking access
 | Final-third entry success
 | team_final_third_entry_success
 | Entries retained/advanced under provider window
 | Buildup efficiency
 | Penalty-area entries
 | team_box_entries
 | Controlled carries/passes into the box per 90
 | Pre-shot threat
 | Deep completions
 | team_deep_completions
 | Completed passes near goal excluding crosses per provider rule
 | Sustained dangerous possession
 | Touches in box
 | team_box_touches
 | Attacking touches in penalty area per 90
 | Player/team opportunity
 | Attacking-third touches
 | team_att_third_touches
 | Touches in final third per 90
 | Territory and prop context
 | Possession value added
 | team_obv_xt_epv
 | Approved on-ball value/expected-threat added
 | Values actions before shots
 | Possession value conceded
 | team_value_conceded
 | Opponent OBV/xT/EPV added
 | Defensive territorial leakage
 | Possession length
 | team_possession_duration
 | Mean/quantile seconds per possession
 | Tempo/style and live updating
 | Passes per possession
 | team_passes_per_poss
 | Completed/attempted passes per possession
 | Buildup directness
 | Sequence length
 | team_sequence_length
 | Actions or distance before possession ends
 | Control and transition style
 | Direct speed
 | team_direct_speed
 | Meters progressed toward goal per second in possession
 | Directness matchup
 | Attack speed
 | team_attack_speed
 | Time/distance from regain to entry/shot
 | Transition likelihood
 | Game control index
 | team_control_index
 | Validated blend of field tilt, value, territory and suppression
 | Ranking feature only after ablation
 | Score-state possession residual
 | team_poss_score_adj
 | Possession minus expected for contemporaneous score/minute
 | Removes leading/trailing bias
 | 
4.6 Buildup, Passing and Ball-Progression Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Pass completion
 | team_pass_completion
 | Completed divided by attempted passes with exclusions versioned
 | Style and pressure response
 | Expected pass completion
 | team_xpass_completion
 | Model probability of completion from geometry/pressure
 | Difficulty adjustment
 | Pass completion over expected
 | team_pass_cpoe
 | Actual minus expected completion
 | Execution under difficulty
 | Progressive passes
 | team_progressive_passes
 | Provider-defined forward progression toward goal
 | Buildup penetration
 | Progressive carries
 | team_progressive_carries
 | Carries advancing ball by defined distance/zone
 | Ball-carrying threat
 | Progressive distance
 | team_progressive_distance
 | Net meters toward opponent goal by pass/carry
 | Territorial advancement
 | Line-breaking passes
 | team_line_breaks
 | Passes breaking an opposition unit under tracking/event rule
 | Press-resistance and chance access
 | Packing rate
 | team_packing
 | Opponents bypassed by completed actions
 | Advanced progression context
 | Passes into final third
 | team_passes_final_third
 | Completed passes entering final third
 | Territorial buildup
 | Passes into penalty area
 | team_passes_box
 | Completed passes entering box excluding/including crosses by rule
 | Shot/chance precursor
 | Through balls
 | team_through_balls
 | Passes splitting/backing the defensive line under provider rule
 | High-line matchup
 | Switches of play
 | team_switches
 | Long lateral passes changing attacking side
 | Block manipulation
 | Cross volume
 | team_crosses
 | Attempted crosses by zone, height and phase
 | Corners/headers/box matchup
 | Cross completion
 | team_cross_completion
 | Completed crosses divided by attempts
 | Recipient/defender interaction
 | Cutbacks
 | team_cutbacks
 | Backward/lateral passes from byline/box channel
 | High-value chance creation
 | Build-up completion
 | team_buildup_completion
 | Goalkeeper/defensive-third possession reaching target zone
 | Press-vs-buildup interaction
 | Goalkeeper build involvement
 | team_gk_buildup_share
 | Share of buildup actions involving goalkeeper
 | Press vulnerability/style
 | Long-ball rate
 | team_long_ball_rate
 | Long passes divided by passes under provider threshold
 | Directness and aerial matchup
 | Second-ball recovery
 | team_second_ball_rate
 | Recovery following contested long ball/aerial duel
 | Territory retention
 | Turnovers in own third
 | team_own_third_turnovers
 | Possessions lost in defensive third per buildup
 | Opponent high-turnover chance input
 | Pass network stability
 | team_pass_network_stability
 | Role/connection persistence adjusted for lineup
 | Regime and formation context
 | 
4.7 Pressing and Defensive-Activity Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | PPDA
 | team_ppda
 | Opponent passes allowed per defensive action in defined high zones
 | Lower often indicates more active press; definition versioned
 | High press frequency
 | team_high_press_freq
 | Press sequences initiated in advanced zones per opponent buildup
 | Pressing style
 | Pressure events
 | team_pressures_padj
 | Possession-adjusted pressures per 90
 | Defensive activity
 | Pressure success
 | team_pressure_success
 | Pressure leading to loss/backward action within window
 | Press effectiveness
 | Counterpress frequency
 | team_counterpress_freq
 | Pressure/regain attempts shortly after possession loss
 | Transition defense
 | Counterpress success
 | team_counterpress_success
 | Ball regained within approved post-loss window
 | Prevents opponent counters
 | High turnovers forced
 | team_high_turnovers
 | Opponent losses forced in advanced zone
 | Creates short-field attacks
 | High-turnover shots
 | team_high_turnover_shots
 | Shots generated after high turnovers
 | Press payoff
 | High-turnover goals/xG
 | team_high_turnover_xg
 | xG/goals following high turnover
 | Quality-adjusted press payoff
 | Defensive actions height
 | team_def_action_height
 | Average x-coordinate of defensive actions
 | Block height
 | Line of confrontation
 | team_confrontation_height
 | Tracking/event estimate of initial defensive line
 | Tactical matchup
 | Passes allowed per sequence
 | team_opp_sequence_passes
 | Opponent passes before defensive interruption
 | Disruption control
 | Forced long-ball rate
 | team_forced_long_rate
 | Opponent buildup ending in long ball under pressure
 | Press outcome
 | Opponent buildup success
 | team_opp_buildup_success
 | Opponent possessions escaping first/second press line
 | Press vulnerability
 | Press resistance
 | team_press_resistance
 | Retention/progression against high pressure
 | Opponent interaction
 | Pressure bypass value
 | team_pressure_bypass_value
 | OBV/xT gained after evading pressure
 | Punishes aggressive press matchups
 | Fouls from press
 | team_press_foul_rate
 | Fouls committed during/after pressure sequences
 | Cards/set-piece downside
 | Press intensity decay
 | team_press_decay
 | Change in pressure rate/success by match phase
 | Fatigue and live update
 | 
4.8 Defensive Suppression and Box-Protection Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Shots allowed per 90
 | team_shots_allowed
 | Opponent attempts per regulation 90
 | Volume suppression
 | SOT allowed per 90
 | team_sot_allowed
 | Opponent on-target shots per 90
 | Goalkeeper workload
 | xG allowed per shot
 | team_xga_per_shot
 | Opponent xG divided by shots
 | Chance-quality suppression
 | Box shots allowed
 | team_box_shots_allowed
 | Opponent box shots per 90
 | Penalty-area protection
 | Box entries allowed
 | team_box_entries_allowed
 | Controlled opponent entries into penalty area
 | Pre-shot defense
 | Deep completions allowed
 | team_deep_allowed
 | Opponent deep completions per 90
 | Back-line pressure
 | Touches in box allowed
 | team_box_touches_allowed
 | Opponent penalty-area touches per 90
 | Territorial leakage
 | Crosses allowed
 | team_crosses_allowed
 | Opponent crosses by zone/type
 | Fullback/block matchup
 | Cross defense success
 | team_cross_defense
 | Cleared/denied crosses adjusted for delivery quality
 | Aerial protection
 | Cutbacks allowed
 | team_cutbacks_allowed
 | Opponent cutbacks per box entry
 | Structural vulnerability
 | Through balls allowed
 | team_through_allowed
 | Opponent through balls/line breaks
 | High-line vulnerability
 | Defensive duel win rate
 | team_def_duel_win
 | Won defensive duels divided by eligible duels
 | Player/style context
 | Aerial duel win rate
 | team_aerial_win
 | Won aerials divided by contested aerials
 | Cross/long-ball interaction
 | Tackle success
 | team_tackle_success
 | Successful tackles under provider rule
 | Role/opportunity adjusted
 | Interceptions
 | team_interceptions_padj
 | Possession-adjusted interceptions per 90
 | Lane control
 | Blocks
 | team_blocks
 | Shot/pass blocks per opponent action
 | Low-block and prop context
 | Clearances
 | team_clearances
 | Clearances per opponent box possession
 | Pressure/low-block profile
 | Errors leading to shot
 | team_errors_to_shot
 | Provider-defined errors producing opponent shot
 | Shrink heavily; lineup/press context
 | Errors leading to goal
 | team_errors_to_goal
 | Provider-defined errors producing goal
 | Narrative only without process/sample
 | Rest defense index
 | team_rest_defense
 | Validated structure behind attack using player locations/coverage
 | Counterattack prevention
 | Defensive compactness
 | team_compactness
 | Team length/width/area out of possession
 | Space-control matchup
 | 
4.9 Transition and Counterattack Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Counterattacks per 90
 | team_counters
 | Provider/model-defined fast attacks after regain
 | Transition volume
 | Counterattack xG
 | team_counter_xg
 | xG created from counterattacks
 | Transition quality
 | Counterattack xG per event
 | team_counter_xg_event
 | Counter xG divided by counterattacks
 | Efficiency
 | Regain-to-shot time
 | team_regain_shot_seconds
 | Seconds from regain to shot in transition
 | Speed/directness
 | Regain-to-box-entry time
 | team_regain_box_seconds
 | Seconds from regain to controlled box entry
 | Threat tempo
 | Transition progressive distance
 | team_transition_distance
 | Meters advanced during early post-regain window
 | Counter potency
 | Players committed forward
 | team_counter_numbers
 | Tracked attackers crossing thresholds during transition
 | Scoring and rest-defense tradeoff
 | Turnovers conceded
 | team_turnovers
 | Possession losses by zone/type
 | Opponent counter opportunity
 | Dangerous losses
 | team_dangerous_losses
 | Losses leaving validated transition disadvantage
 | Defensive vulnerability
 | Counterattacks allowed
 | team_counters_allowed
 | Opponent counterattacks per own loss/90
 | Transition defense
 | Counter xG allowed
 | team_counter_xga
 | Opponent xG from counterattacks
 | Critical style interaction
 | Recovery speed
 | team_recovery_speed
 | Time/distance to restore defensive shape after loss
 | Transition defense
 | Tactical foul rate
 | team_transition_foul_rate
 | Fouls used to stop transition per dangerous loss
 | Cards/free-kick interaction
 | Numerical transition advantage
 | team_transition_overload
 | Frequency/magnitude of attackers versus defenders
 | Tracking-based chance context
 | Transition matchup index
 | match_transition_edge
 | Attack counter quality against opponent rest defense
 | Market-specific interaction feature
 | 
4.10 Set Pieces, Corners and Restarts
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Corners for per 90
 | team_corners_for
 | Official corners awarded per regulation 90
 | Corner totals/handicaps
 | Corners against per 90
 | team_corners_against
 | Official corners conceded per 90
 | Opponent corner projection
 | Corner share
 | team_corner_share
 | Corners for divided by total corners
 | Territorial corner control
 | Expected corners
 | team_xcorners
 | Count model mean from attacks, crosses, blocks and game state
 | Primary corner distribution input
 | Corner overdispersion
 | team_corner_dispersion
 | Variance beyond Poisson after context
 | Selects count model
 | Early corners
 | team_corner_first_half
 | Corners in first half/time bands
 | Period markets and live pace
 | Late corners
 | team_corner_late
 | Corners by trailing/leading state in late minutes
 | Game-script sensitivity
 | Corner conversion xG
 | team_corner_xg
 | xG generated directly/within restart window
 | Set-piece scoring quality
 | Corner xG per corner
 | team_corner_xg_rate
 | Corner xG divided by corners
 | Delivery/targeting efficiency
 | First-contact win rate
 | team_corner_first_contact
 | Attacking first contacts per eligible delivery
 | Aerial matchup
 | Second-ball retention
 | team_corner_second_ball
 | Possessions retained/recovered after first phase
 | Sustained set-piece threat
 | Inswing/outswing/short mix
 | team_corner_delivery_mix
 | Share of corner routines by delivery type
 | Opponent/keeper interaction
 | Free-kick xG
 | team_fk_xg
 | Direct and indirect free-kick xG
 | Foul-location/referee interaction
 | Direct free-kick skill
 | team_direct_fk_post
 | Posterior conversion/PSxG over expectation
 | Player availability and shooting talent
 | Wide free-kick threat
 | team_wide_fk_xg
 | xG from wide indirect deliveries
 | Aerial/set-piece matchup
 | Throw-in progression
 | team_throw_progression
 | Territory/value generated from throw-ins
 | Possession/set-piece style
 | Long-throw xG
 | team_long_throw_xg
 | xG generated from long attacking throws
 | Specialized matchup
 | Set-piece xG against
 | team_set_piece_xga
 | Opponent xG from corners/free kicks/throws
 | Defensive weakness
 | Set-piece marking profile
 | team_set_piece_marking
 | Zone/man/hybrid and target matchups from charting
 | Lineup-height and role interaction
 | Set-piece taker status
 | team_set_piece_roles
 | Current corner/free-kick/penalty takers with confidence
 | Player props and team chance distribution
 | Penalty taker status
 | team_pen_taker
 | Scenario probability for each taker
 | Scorer props; hard role gate
 | Penalty award probability
 | match_penalty_award_p
 | Model from box entries, dribbles, referee/VAR and league
 | Low-frequency goal/carder branch
 | 
4.11 Goalkeeper Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Save percentage
 | gk_save_pct
 | Saves divided by shots on target faced under provider rule
 | Descriptive; shot-quality adjustment required
 | Post-shot xG faced
 | gk_psxg_faced
 | Sum of on-target scoring expectation faced
 | Workload quality
 | Goals prevented
 | gk_goals_prevented
 | Post-shot xG faced minus goals conceded
 | Shot-stopping posterior
 | Goals prevented per 90
 | gk_gp_p90
 | Goals prevented normalized by minutes
 | Comparability with shrinkage
 | Goals prevented per shot
 | gk_gp_per_sot
 | PSxG minus goals divided by SOT faced
 | Workload-normalized skill
 | Expected save percentage
 | gk_xsave_pct
 | 1 minus PSxG/SOT under provider eligibility
 | Shot mix baseline
 | High-xG save rate
 | gk_high_xg_save
 | Saves on high-quality on-target attempts
 | Small-sample contextual signal
 | Low-shot-volume performance
 | gk_low_volume_post
 | Posterior performance in low-volume matches
 | Concentration narrative only if validated
 | Cross claim rate
 | gk_cross_claim
 | Claims/punches per eligible cross
 | Aerial/set-piece control
 | Cross prevention value
 | gk_cross_value
 | Value prevented by claims/interventions
 | Set-piece/open-play interaction
 | Sweeper actions
 | gk_sweeper_actions
 | Defensive actions outside box per through ball/high line
 | High-line coverage
 | One-on-one goals prevented
 | gk_one_v_one_value
 | Model value on isolated attacker situations
 | Transition matchup
 | Distribution completion
 | gk_pass_completion
 | Completed goalkeeper passes by length/pressure
 | Buildup/press interaction
 | Distribution over expected
 | gk_pass_cpoe
 | Actual minus expected pass completion
 | Execution difficulty adjustment
 | Long distribution retention
 | gk_long_retention
 | Team retains/contests long deliveries
 | Press escape and territory
 | Goal-kick pattern
 | gk_goal_kick_mix
 | Short/long/side distribution mix
 | Opponent press matchup
 | Rebound concession
 | gk_rebound_rate
 | Dangerous rebounds per on-target shot
 | Second-chance model
 | Starting position
 | gk_start_position
 | Average location relative to goal/line under state
 | Sweeper/shot context
 | Keeper availability
 | gk_start_scenario
 | Probability each goalkeeper starts/finishes
 | Hard gate for sides/totals/saves
 | Keeper workload
 | gk_recent_load
 | Minutes, travel, match density and injury return
 | Uncertainty adjustment
 | Save-prop mean
 | gk_saves_mean
 | Joint projection of SOT faced and goals/rebounds
 | Goalkeeper save markets
 | Clean-sheet probability
 | gk_clean_sheet_p
 | Joint zero-goal probability conditional on start minutes
 | Clean sheet and win-to-nil markets
 | 
4.12 Player Attacking, Opportunity and Prop Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Start probability
 | player_start_p
 | Scenario probability player starts
 | Primary participation gate
 | Appearance probability
 | player_appear_p
 | Probability of any eligible appearance
 | DNP and anytime markets
 | Minutes distribution
 | player_minutes_dist
 | Full probability distribution of played minutes
 | All player prop denominators
 | Substitution hazard
 | player_sub_hazard
 | Minute/state-dependent probability of removal
 | Live/pregame minutes model
 | Role/position scenario
 | player_role_scenario
 | Probabilities for tactical role, side and unit
 | Opportunity and matchup
 | Non-penalty xG per 90
 | player_npxg_p90
 | Player NPxG per 90, opponent/role adjusted
 | Scorer/shot quality
 | xA per 90
 | player_xa_p90
 | Expected assists per 90 under provider rule
 | Assist props
 | xG+xA per 90
 | player_xgi_p90
 | Combined non-penalty expected involvement
 | Attack role strength
 | Shots per 90
 | player_shots_p90
 | Shot attempts normalized by minutes
 | Shot props
 | SOT per 90
 | player_sot_p90
 | Official/provider SOT normalized by minutes
 | SOT props
 | Shot share
 | player_shot_share
 | Player shots divided by team shots while on pitch
 | Lineup redistribution
 | xG share
 | player_xg_share
 | Player xG divided by team xG while on pitch
 | Scorer allocation
 | Box touches per 90
 | player_box_touches
 | Touches in opponent box per 90
 | Shot/scorer leading indicator
 | Touches by zone
 | player_touch_zones
 | Touches in wide/half-space/central/final-third zones
 | Role and matchup
 | Progressive receptions
 | player_prog_receptions
 | Receives progressive passes in advanced zones
 | Opportunity creation
 | Runs in behind
 | player_runs_behind
 | Tracked runs attacking space behind line
 | High-line matchup
 | Crosses per 90
 | player_crosses
 | Open-play/set-piece crosses per 90
 | Assist/corner context
 | Key passes
 | player_key_passes
 | Passes directly leading to shots under provider rule
 | Assist opportunity
 | 
4.12 Player Attacking, Opportunity and Prop Metrics — continued
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Open-play xG assisted
 | player_open_xga
 | xG assisted excluding set pieces
 | Stable creation context
 | Shot-creating actions
 | player_sca
 | Defined actions leading to shot within action window
 | Broader creation
 | Goal-creating actions
 | player_gca
 | Defined actions leading to goal
 | Sparse; context only
 | Possession value added
 | player_obv_xt
 | Approved OBV/xT/EPV contribution
 | Role quality before end product
 | Penalty-taking probability
 | player_pen_taker_p
 | Chance player takes next penalty under XI scenario
 | Material scorer edge/gate
 | Set-piece share
 | player_set_piece_share
 | Corners/free kicks delivered while available
 | Assist/pass/cross props
 | Anytime goal probability
 | player_anytime_goal_p
 | Competing-risk goal probability over minutes/scenarios
 | Scorer pricing
 | First goal probability
 | player_first_goal_p
 | Player hazard before all competing scorers/no-goal
 | First-scorer pricing
 | Assist probability
 | player_assist_p
 | Chance of at least one graded assist under rule
 | Assist pricing and rule check
 | Multi-goal probability
 | player_2plus_goal_p
 | P(goals >= 2) from correlated event/minutes model
 | Alternate scorer market
 | 
4.13 Player Defensive, Passing and Discipline Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Pass attempts per 90
 | player_pass_att_p90
 | Pass attempts adjusted for role, minutes and team possession
 | Pass props
 | Completed passes per 90
 | player_pass_comp_p90
 | Completed passes adjusted for role/minutes
 | Completion props
 | Expected pass attempts
 | player_pass_att_mean
 | Projected from team possession, role, press and game script
 | Primary pass-count mean
 | Pass completion over expected
 | player_pass_cpoe
 | Actual minus expected completion by difficulty
 | Execution/press matchup
 | Progressive passes
 | player_prog_passes
 | Provider-defined progressive completions/attempts
 | Role and value
 | Final-third passes
 | player_final_third_passes
 | Passes into/in final third
 | Attacking role
 | Long passes
 | player_long_passes
 | Passes above provider length threshold
 | Goalkeeper/defender props
 | Carries and progressive carries
 | player_carries
 | Carries by zone/progression
 | Role and matchup
 | Tackles attempted
 | player_tackle_att
 | Attempts per defensive opportunity
 | Tackle prop volume
 | Tackles won
 | player_tackles_won
 | Provider-graded successful tackles
 | Rule-matched tackle props
 | Tackle opportunity
 | player_tackle_opportunity
 | Opponent dribbles/carries entering player's zone
 | Opponent interaction
 | Interceptions
 | player_interceptions
 | Possession-adjusted interceptions per 90
 | Role and passing-lane matchup
 | Blocks
 | player_blocks
 | Shot/pass blocks per 90 and opportunity
 | Low-block/defender props
 | Clearances
 | player_clearances
 | Clearances per opponent box/cross event
 | Pressure and defender props
 | Aerial duels
 | player_aerial_duels
 | Contested aerials per 90
 | Long-ball/cross matchup
 | Aerial win probability
 | player_aerial_win_p
 | Posterior win rate conditional on opponent/zone
 | Matchup and event model
 | Fouls committed
 | player_fouls_committed
 | Fouls per duel/defensive action/minute
 | Card/foul props
 | Fouls won
 | player_fouls_won
 | Drawn fouls per touch/dribble/minute
 | Opponent/referee interaction
 | Card probability
 | player_card_p
 | Yellow/red hazard conditional on minutes, role and referee
 | Player card pricing
 | Offside rate
 | player_offside_rate
 | Offsides per run in behind/90
 | Offside props and line height
 | 
4.14 Lineups, Formation, Roles and Availability
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Projected XI
 | lineup_projected_xi
 | Timestamped player/start probability set
 | Pre-lineup scenario layer
 | Confirmed XI
 | lineup_confirmed_xi
 | Official starting eleven with source/time
 | Final pregame rebuild trigger
 | Bench composition
 | lineup_bench
 | Available substitutes and roles
 | Substitution/game-state flexibility
 | Formation scenario
 | lineup_formation_p
 | Probability distribution over in/out-of-possession shapes
 | Tactical matchup uncertainty
 | Goalkeeper confirmation
 | lineup_gk_confirmed
 | Starter confidence and source hierarchy
 | Hard side/total/GK-prop gate
 | Key absence value
 | lineup_absence_delta
 | Model change from unavailable player relative to replacements
 | Use role/interaction, not star narrative
 | Replacement quality
 | lineup_replacement_value
 | Posterior impact and role fit of likely replacement
 | Scenario distribution
 | Team continuity
 | lineup_continuity
 | Shared minutes/starts among current XI and units
 | Coordination/regime feature
 | Starting-XI change count
 | lineup_changes
 | Changes from comparable recent lineup
 | Context only; distinguish planned rotation
 | Formation change
 | lineup_shape_change
 | Difference from established shapes
 | Potential regime/matchup shift
 | Player impact
 | player_team_impact
 | Regularized on/off or action-value contribution
 | Shrink; avoid raw on/off confounding
 | Role-adjusted impact
 | player_role_impact
 | Impact relative to position/role and teammates
 | Replacement and matchup
 | On/off xG impact
 | player_onoff_xg
 | Team xG difference with player, adjusted for context
 | Lineup delta with strong regularization
 | Chemistry/network continuity
 | lineup_network_continuity
 | Stability of key passing/defensive connections
 | Buildup and press coordination
 | Captain/organizer absence
 | lineup_leadership_tag
 | Structured qualitative input with source/confidence
 | Never direct edge; raises uncertainty
 | Penalty taker
 | lineup_pen_taker
 | Current taker hierarchy by XI/game state
 | Scorer props
 | Set-piece takers
 | lineup_set_piece_takers
 | Corner/free-kick delivery shares by side
 | Assist/pass/cross props
 | Expected minutes by player
 | lineup_expected_minutes
 | Scenario-weighted start and substitution minutes
 | Prop engine
 | Availability entropy
 | lineup_entropy
 | Entropy of XI/role scenarios weighted by value swing
 | Hard-gate/tier quality
 | Lineup swing
 | lineup_fair_price_swing
 | Range of fair prices across plausible XI scenarios
 | Blocks when above tolerance
 | 
4.15 Schedule, Travel, Fatigue and Competition Context
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Days rest
 | sched_days_rest
 | Days since prior competitive match
 | Nonlinear fatigue/recovery feature
 | Hours rest
 | sched_hours_rest
 | Exact hours between final whistle and kickoff
 | Better for tight turnarounds
 | Matches in 7/14/21 days
 | sched_match_density
 | Competitive workload over fixed windows
 | Congestion and rotation
 | Minutes load
 | sched_team_minutes_load
 | Player/team minutes weighted by intensity and recency
 | Lineup-specific fatigue
 | Starter load
 | sched_starter_load
 | Projected XI recent minutes and travel
 | More precise than team schedule
 | Extra-time load
 | sched_extra_time
 | Extra-time minutes in prior fixtures
 | Recovery and rotation
 | Travel distance
 | sched_travel_km
 | Great-circle/actual distance to venue since last base
 | Fatigue and routine
 | Time-zone shift
 | sched_timezone_shift
 | Clock change from prior location/home base
 | Circadian adjustment
 | Travel sequence
 | sched_road_sequence
 | Consecutive away legs and days from base
 | Accumulated travel
 | Altitude transition
 | sched_altitude_delta
 | Venue altitude minus recent training/match altitude
 | Physiology/tempo context
 | Kickoff local time
 | sched_kickoff_local
 | Local body-clock timing
 | Heat/circadian interaction
 | International return
 | sched_intl_return
 | Hours/distance/minutes after national-team duty
 | Player availability/load
 | Tournament stage
 | comp_stage
 | League, group, knockout leg, final, relegation/playoff context
 | Changes incentives and ET scope
 | First/second leg state
 | comp_aggregate_state
 | Aggregate score, away-goal rule version and leg
 | Game theory and tempo
 | Qualification incentive
 | comp_incentive_state
 | Structured objective based on table/tie rules
 | Scenario input, never narrative alone
 | Rotation likelihood
 | sched_rotation_p
 | Model probability of material XI rotation
 | Lineup entropy
 | Season phase
 | comp_season_phase
 | Round/time within competition
 | Fitness, tactics and motivation context
 | Break length
 | sched_break_days
 | Days since competitive match including winter/offseason
 | Rust/fitness uncertainty
 | Manager tenure
 | team_manager_days
 | Days/matches under current manager
 | Regime/change-point feature
 | Post-manager-change window
 | team_new_manager_state
 | Predeclared matches/days after coaching change
 | Raises recency and uncertainty
 | 
4.16 Venue, Weather, Pitch and Referee Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Home advantage
 | venue_home_adv
 | Hierarchical home effect by team, league, era and attendance
 | 1X2/handicap baseline
 | Neutral-site flag
 | venue_neutral
 | Official neutral venue indicator
 | Removes home-field assumption
 | Venue familiarity
 | venue_familiarity
 | Matches/training history at site
 | Temporary stadium/neutral nuance
 | Traveling-support/attendance
 | venue_attendance_context
 | Attendance/capacity and restriction state where available
 | Home-effect modifier
 | Pitch dimensions
 | venue_pitch_dimensions
 | Length/width and effective playing area
 | Press/directness/space interaction
 | Surface type
 | venue_surface
 | Natural, hybrid or artificial under competition record
 | Ball speed/fatigue/context
 | Pitch condition
 | venue_pitch_condition
 | Official/reliable condition score with timestamp
 | Tempo, passing and injury uncertainty
 | Roof state
 | venue_roof_state
 | Open/closed/retractable condition
 | Weather application gate
 | Altitude
 | venue_altitude_m
 | Meters above sea level
 | Fatigue/tempo/home adaptation
 | Temperature
 | weather_temp_c
 | Forecast/observed temperature at match time
 | Nonlinear intensity modifier
 | Humidity/dew point
 | weather_humidity
 | Humidity/dew point and heat index
 | Fatigue and hydration context
 | Wind speed/gust
 | weather_wind
 | Wind at pitch level where available
 | Crosses, long passes, shots, totals
 | Precipitation
 | weather_precip
 | Rain/snow type and rate
 | Pitch/ball handling and event variance
 | Weather uncertainty
 | weather_forecast_spread
 | Provider/scenario spread at kickoff
 | Feature uncertainty
 | Referee foul rate
 | ref_fouls_p90
 | Opponent/league/score-adjusted fouls called
 | Cards/free kicks/tempo
 | Referee yellow rate
 | ref_yellows_p90
 | Cards per match/foul with hierarchical shrinkage
 | Cards and suspension risk
 | Referee red rate
 | ref_reds_p90
 | Send-offs per match with strong shrinkage
 | Tail-state simulation
 | Referee penalty rate
 | ref_penalties_p90
 | Penalties awarded per box-event/match
 | Goals/cards interaction
 | Advantage tendency
 | ref_advantage_rate
 | Advantages played relative to fouls
 | Foul/stat/transition impact
 | VAR intervention rate
 | ref_var_rate
 | Competition/crew review and overturn behavior
 | Low-frequency uncertainty; rule versioned
 | Added-time tendency
 | ref_added_time
 | First/second-half added minutes by state
 | Totals/cards/corners and live clock
 | Competition ball/pitch regime
 | venue_comp_regime
 | Ball, pitch, climate and operational differences by league
 | Cross-league normalization
 | 
4.17 League, Team Strength and Cross-Competition Normalization
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Team latent attack
 | strength_attack
 | Hierarchical attacking strength relative to competition
 | Score/xG baseline
 | Team latent defense
 | strength_defense
 | Hierarchical defensive strength relative to competition
 | Score/xG baseline
 | Goalkeeper-adjusted defense
 | strength_def_gk_adj
 | Outfield suppression separated from goalkeeper shot stopping
 | Transferable team process
 | Elo rating
 | strength_elo
 | Time-decayed result strength with home/margin controls
 | Broad prior; not standalone price
 | xG Elo/rating
 | strength_xg_rating
 | Rating updated from expected-goal performance
 | Process-oriented prior
 | Squad market/quality prior
 | strength_squad_prior
 | Contract/squad/player-quality prior where licensed
 | Early-season/promoted-team stabilization
 | Player-value aggregation
 | strength_active_squad
 | Projected active-player impacts by role
 | Lineup-aware team rating
 | Competition strength
 | strength_competition
 | Hierarchical league/competition quality parameter
 | Cross-league transfer
 | Promotion/relegation adjustment
 | strength_transition_adj
 | Prior for teams changing divisions
 | Early-season uncertainty
 | Continental-match adjustment
 | strength_continental_adj
 | Opponent/venue-normalized cross-league evidence
 | Improves league bridge
 | National-team adjustment
 | strength_nt_adj
 | Competition/squad-strength context for international football
 | Sparse-schedule normalization
 | Home/away split shrinkage
 | strength_venue_split
 | Hierarchical venue-specific team effects
 | Avoid raw small-sample splits
 | Opponent-adjusted form
 | strength_recent_resid
 | Recent performance residual after opponent/context
 | Regime signal
 | Schedule strength
 | strength_schedule
 | Expected opponent quality over sample window
 | Context for raw records
 | Rating uncertainty
 | strength_rating_sd
 | Posterior SD of team/competition strength
 | Tier and early-season gate
 | Newly assembled squad uncertainty
 | strength_roster_turnover
 | Minutes/value lost and added plus cohesion prior
 | Raises variance
 | Cross-provider normalization
 | strength_provider_crosswalk
 | Mapped z-scores/definitions across data coverage tiers
 | Prevents false league comparisons
 | 
4.18 Market-Specific Derivative Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | First-half expected goals
 | deriv_fh_xg
 | Model goals in first half with starting tactics and time share
 | First-half totals/1X2
 | Second-half expected goals
 | deriv_sh_xg
 | Conditional second-half goal mean by state/substitution
 | Second-half/live markets
 | Goal timing hazard
 | deriv_goal_hazard
 | Minute/state-dependent scoring intensity
 | Time bands/next goal/live
 | First 10-minute no-goal
 | deriv_10m_no_goal
 | Survival probability to minute threshold
 | Early-goal markets
 | Moneyline canonical mapping
 | deriv_moneyline_map
 | Resolve source label to 1X2, DNB or qualification with team/period/overtime scope
 | Hard mapping gate; never price untyped ML
 | Match-goals distribution
 | deriv_match_goals_dist
 | Distribution of home plus away regulation goals from the approved joint score grid
 | Match Goals totals and alternate lines
 | Match-goals settlement mass
 | deriv_match_goals_states
 | Win/push/loss or quarter-line split mass for the quoted total
 | Exact Match Goals EV
 | Home team-total distribution
 | deriv_home_tt_dist
 | Marginal home goal probabilities
 | Team totals
 | Away team-total distribution
 | deriv_away_tt_dist
 | Marginal away goal probabilities
 | Team totals
 | Team-goals settlement mass
 | deriv_team_goal_states
 | Team-specific win/push/loss or quarter-line split mass at quoted line
 | Exact Team Goals EV
 | First-half total-goals distribution
 | deriv_fh_goals_dist
 | Distribution of combined first-half goals including first-half stoppage
 | First-Half Goals totals
 | First-half home goals distribution
 | deriv_fh_home_goals_dist
 | Marginal home first-half goal-count probabilities
 | First-Half Team Goals
 | First-half away goals distribution
 | deriv_fh_away_goals_dist
 | Marginal away first-half goal-count probabilities
 | First-Half Team Goals
 | First-half goal settlement mass
 | deriv_fh_goal_states
 | Exact match/team first-half over-under settlement mass at quoted line
 | First-half totals EV
 | Team win either half probability
 | deriv_team_win_either_half_p
 | P(team wins H1 union wins H2) from the joint period simulation, retaining overlap
 | Team to Win Either Half pricing
 | 
4.18 Market-Specific Derivative Metrics — continued
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | BTTS probability
 | deriv_btts_p
 | Joint probability both teams score at least once
 | BTTS pricing
 | BTTS and over joint mass
 | deriv_btts_over
 | Joint event probability
 | Derivative/correlation check
 | Clean-sheet probability
 | deriv_clean_sheet
 | Opponent zero-goal mass
 | Team/GK derivatives
 | Win-to-nil probability
 | deriv_win_nil
 | Win and clean-sheet joint mass
 | Derivative pricing
 | Winning-margin distribution
 | deriv_win_margin
 | Exact/banded goal-margin mass
 | Handicap/winning margin
 | Correct-score distribution
 | deriv_correct_score
 | Normalized score grid through configured maximum/tail
 | Correct score and coherence
 | Half-time/full-time matrix
 | deriv_htft
 | Joint halftime and fulltime outcome probabilities
 | HT/FT; high-uncertainty market
 | Draw-no-bet price
 | deriv_dnb_fair
 | Fair two-way price conditional on non-draw with refund state
 | DNB comparison
 | Double-chance price
 | deriv_double_chance
 | Sum of relevant calibrated 1X2 states
 | Derivative constraint
 | Asian handicap state mass
 | deriv_ah_states
 | Win/half-win/push/half-loss/loss probabilities
 | Exact AH EV
 | Asian total state mass
 | deriv_at_states
 | Over/under quarter-line settlement probabilities
 | Exact total EV
 | Qualification probability
 | deriv_qualify_p
 | Advance probability including tie state, ET and penalties
 | Knockout qualification market
 | Extra-time probability
 | deriv_et_p
 | Probability regulation ends tied when ET applies
 | Qualification/trophy markets
 | Penalty-shootout probability
 | deriv_shootout_p
 | Tie through extra time times shootout branch
 | Knockout pricing
 | To-lift-trophy probability
 | deriv_trophy_p
 | Tournament bracket simulation with future opponent uncertainty
 | Futures; separate model/governance
 | 
4.19 Corners, Cards and Other Team-Event Markets
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Expected match corners
 | event_corners_mean
 | Joint contextual count mean
 | Corner totals
 | Corner count distribution
 | event_corners_dist
 | Poisson/NB/bivariate count distribution
 | Lines, alternates and pushes
 | Match-corners settlement mass
 | event_match_corner_states
 | Win/push/loss or quarter-line split mass for combined regulation corners
 | Exact Match Corners EV
 | Home team-corner distribution
 | event_home_corners_dist
 | Marginal home regulation corner-count probabilities
 | Home Team Corners totals
 | Away team-corner distribution
 | event_away_corners_dist
 | Marginal away regulation corner-count probabilities
 | Away Team Corners totals
 | Team-corners settlement mass
 | event_team_corner_states
 | Team-specific settlement mass at the quoted corner line
 | Exact Team Corners EV
 | First-half match-corner mean
 | event_fh_corners_mean
 | Expected combined first-half corners from period-specific attack and state rates
 | First-Half Corners baseline
 | First-half corner distribution
 | event_fh_corners_dist
 | Combined first-half corner-count distribution including first-half stoppage
 | First-Half Corners totals
 | First-half home-corner distribution
 | event_fh_home_corners_dist
 | Marginal home first-half corner-count probabilities
 | First-Half Team Corners
 | First-half away-corner distribution
 | event_fh_away_corners_dist
 | Marginal away first-half corner-count probabilities
 | First-Half Team Corners
 | First-half corner settlement mass
 | event_fh_corner_states
 | Exact match/team first-half corner settlement mass at the quoted line
 | First-half corner EV
 | Corner handicap margin
 | event_corner_margin
 | Distribution of home minus away corners
 | Corner handicap
 | Corner pace
 | event_corner_pace
 | Corners per attacking possession/time by score state
 | Pregame/live feature
 | Cross/block-to-corner rate
 | event_corner_conversion
 | Corners generated per cross, blocked shot and box attack
 | Mechanistic projection
 | 
4.19 Corners, Cards and Other Team-Event Markets — continued
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Expected cards
 | event_cards_mean
 | Yellow/red/booking-points count mean
 | Card totals
 | Card count distribution
 | event_cards_dist
 | Overdispersed count with referee/player/team effects
 | Card lines and tails
 | Booking points
 | event_booking_points
 | Book-specific points mapping for yellow/red events
 | Exact settlement only
 | Team card share
 | event_team_card_share
 | Expected share of match card events
 | Team cards/handicap
 | Player card hazard
 | event_player_card_hazard
 | Minute/duel/matchup/referee conditional booking risk
 | Player card props
 | Expected fouls
 | event_fouls_mean
 | Team/player foul-count distribution
 | Foul props/cards
 | Foul matchup
 | event_foul_matchup
 | Dribbler/foul-winner versus defender/team/referee interaction
 | Cards/free kicks
 | Expected offsides
 | event_offside_mean
 | Runs behind, line height and assistant/VAR-era model
 | Offside totals/player props
 | Expected shots
 | event_shots_mean
 | Team/player shot count distribution
 | Shot props/team events
 | Expected SOT
 | event_sot_mean
 | Shot attempts times on-target probability
 | SOT/GK save props
 | Team throw-ins
 | event_throwins_mean
 | Possession, directness and venue-adjusted count
 | Niche market with quality gate
 | Goal kicks
 | event_goal_kicks_mean
 | Opponent attack/shot/cross-ending processes
 | Niche event market
 | Stat-source agreement
 | event_stat_source_match
 | Book grading provider matches modeled provider/definition
 | Hard gate for all stat markets
 | 
4.20 Live-Game Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Official match clock
 | live_clock
 | Period/minute/seconds plus stoppage state
 | Primary state; latency audited
 | Score state
 | live_score
 | Official goals by team after confirmed reviews
 | Joint posterior conditioning
 | VAR/review state
 | live_var_state
 | Active/recent review, decision and uncertainty
 | Automatic pause/kill switch
 | Red-card state
 | live_red_cards
 | Players dismissed, minute and team
 | Structural model reset
 | Player-count state
 | live_players_on_pitch
 | Current eligible players by team
 | Core live intensity input
 | Current formation
 | live_shape
 | Estimated in/out-of-possession shape
 | Tactical regime update
 | On-pitch personnel
 | live_players
 | Players, roles and substitution capacity
 | Team/player distributions
 | Substitutions remaining
 | live_subs_remaining
 | Competition-rule-aware remaining changes/windows
 | Late-state scenario
 | Live xG
 | live_xg
 | Point-in-time xG by team and shot sequence
 | Update evidence, not score replacement
 | Live shots/SOT
 | live_shots_sot
 | Official/provider cumulative counts
 | Volume and prop state
 | Live field tilt
 | live_field_tilt
 | Rolling territory share
 | Pressure/next-event context
 | Live possession value
 | live_obv_xt
 | Rolling on-ball threat/value
 | Detects dangerous control
 | Live box entries
 | live_box_entries
 | Rolling controlled box entries
 | Goal/corner pressure
 | Live pressing state
 | live_press_state
 | Rolling PPDA/pressure height/success
 | Tactical/fatigue shift
 | Live pace
 | live_possession_pace
 | Possessions, attacks and transitions per minute
 | Totals/events update
 | Live corner state
 | live_corners
 | Official count plus rolling corner-generation intensity
 | Corner markets
 | Live card/foul state
 | live_cards_fouls
 | Official counts and foul/duel intensity
 | Card markets
 | Time-wasting/stoppage proxy
 | live_stoppage_state
 | Delays, injuries, substitutions, VAR and referee added-time prior
 | Late events and clock
 | Game-state intensity
 | live_intensity_multiplier
 | Validated rate multiplier by score, minute and competition
 | Hazard update
 | Remaining goal distribution
 | live_remaining_goals
 | Conditional score mass from current state to end
 | Sides/totals/next goal
 | Remaining event distribution
 | live_remaining_events
 | Conditional corners/cards/shots/saves distribution
 | Live derivative markets
 | Market latency
 | live_quote_latency
 | Difference between state time and executable quote time
 | Hard live gate
 | Feed desynchronization
 | live_feed_desync
 | Clock/score/event mismatch across sources
 | Automatic block
 | Possession/current attack state
 | live_possession_state
 | Team, zone, restart and pressure state where licensed
 | Very short-horizon models only
 | 
4.21 Tracking, Physical and Spatial Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Team length
 | track_team_length
 | Distance between deepest and highest outfield players
 | Compactness/space
 | Team width
 | track_team_width
 | Lateral spread of outfield unit
 | Block and buildup structure
 | Team surface area
 | track_team_area
 | Area of player convex hull or validated shape
 | Compactness/control
 | Defensive-line height
 | track_def_line_height
 | Mean deepest-line location by state
 | Through-ball/offsides matchup
 | Attacking-line height
 | track_att_line_height
 | Highest sustained attacking unit location
 | Territory and counter risk
 | Inter-line distance
 | track_interline_distance
 | Spacing between defensive/midfield/forward units
 | Chance access and press resistance
 | Pitch control
 | track_pitch_control
 | Probability each team controls locations given positions/velocities
 | Space and possession value
 | Expected possession value
 | track_epv
 | Future scoring/value expectation from full state
 | Action/tactical quality
 | Off-ball run value
 | track_run_value
 | Change in pitch control/EPV caused by run
 | Player matchup and chance creation
 | Runs in behind
 | track_runs_behind
 | Detected movements beyond/back line
 | High-line interaction
 | Support runs
 | track_support_runs
 | Runs creating passing/support options
 | Transition and buildup
 | Pressure distance
 | track_pressure_distance
 | Nearest-defender distance and closing speed
 | Pass/shot difficulty
 | Defensive pressure on ball
 | track_ball_pressure
 | Probability/intensity ball carrier is pressured
 | xPass/xG/turnover models
 | Receiver separation
 | track_receiver_separation
 | Space around intended/actual receiver
 | Pass success/value
 | Numerical superiority
 | track_overload
 | Attackers versus defenders in local zone
 | Chance/transition quality
 | Rest-defense numbers
 | track_rest_defense_numbers
 | Players positioned to protect transition
 | Counter xGA
 | Total distance
 | phys_distance
 | Player/team distance covered per minute/90
 | Workload and role
 | High-speed running
 | phys_hsr
 | Distance/actions above calibrated speed band
 | Fatigue/explosiveness
 | Sprint distance/count
 | phys_sprints
 | Distance/efforts above sprint threshold
 | Role and recovery
 | Accelerations/decelerations
 | phys_accel_decel
 | High-intensity speed-change events
 | Neuromuscular load
 | Peak speed posterior
 | phys_peak_speed
 | Robust high-quantile speed with measurement confidence
 | Recovery/run matchup
 | Load trend
 | phys_load_ewm
 | Time-decayed physical workload versus baseline
 | Fatigue/injury uncertainty
 | Tracking coverage score
 | track_coverage
 | Player/ball identification, frame coverage and calibration quality
 | Hard gate for tracking-derived features
 | 
4.22 Data Quality, Reliability and Governance Metrics
Metric
 | Bot field
 | Definition / calculation
 | Decision use
 | Source authority
 | dq_source_authority
 | Rank official, licensed primary, club, reputable secondary and inferred sources
 | Confidence weighting
 | Field completeness
 | dq_completeness
 | Required non-null fields divided by expected fields
 | Hard/soft quality gate
 | Coverage depth
 | dq_coverage_depth
 | Basic, event, enriched event, 360, XY or skeletal tier
 | Feature availability control
 | Timestamp integrity
 | dq_timestamp_integrity
 | Valid event and ingestion time with monotonicity checks
 | Prevents look-ahead
 | Freshness
 | dq_freshness
 | Decision time minus latest required source update
 | Market-specific hard gate
 | Cross-source agreement
 | dq_cross_source_agreement
 | Agreement on event, XI, score, player and stat state
 | Detects mapping/correction issues
 | Provider correction rate
 | dq_correction_rate
 | Historical late changes by field/provider/competition
 | Uncertainty and replay
 | Coordinate validity
 | dq_coordinate_validity
 | Range, direction, venue and transform checks
 | xG/spatial gate
 | Definition version
 | dq_definition_version
 | Provider formula/event-definition identifier
 | Reproducibility
 | Settlement-rule version
 | dq_settlement_version
 | Book/market grading and participation rule identifier
 | Hard grading gate
 | Entity mapping confidence
 | dq_entity_mapping
 | Team/player/competition/market ID resolution score
 | Hard integrity gate
 | Duplicate-event rate
 | dq_duplicate_rate
 | Duplicate raw or normalized events per match
 | Feed-health alert
 | Missing-event rate
 | dq_missing_rate
 | Expected versus observed events/frames
 | Bias/quality control
 | Latency percentile
 | dq_latency_p95
 | P50/P95/P99 source-to-ingestion delay
 | Live/pregame freshness limits
 | Model drift
 | dq_model_drift
 | Feature/prediction/residual distribution change
 | Kill switch/challenger review
 | Calibration drift
 | dq_calibration_drift
 | Change in reliability/ECE by segment
 | Tier suspension
 | Effective sample size
 | dq_ess
 | Weighted independent information after recency/correlation
 | Promotion gate
 | Outlier influence
 | dq_outlier_influence
 | Change in estimate when influential matches/events removed
 | Fragility control
 | Scenario coverage
 | dq_scenario_coverage
 | Probability mass represented in XI/weather/rule scenarios
 | Uncertainty gate
 | Reproducibility hash
 | dq_snapshot_hash
 | Hash of raw snapshot, features, model and policy versions
 | Audit trace
 | Data-quality score
 | dq_score
 | Governed weighted score from required quality dimensions
 | Lean/Strong/Elite threshold
 | Human-review status
 | dq_human_review
 | Reviewer, timestamp and disposition during controlled launch
 | Launch governance
 | 
5. Feature Engineering Rules
Rule
 | Implementation standard
 | Competition isolation
 | Version league/cup, gender, season, rules, ball, venue and data-coverage tier. Pool only through explicit hierarchical parameters.
 | Match-state isolation
 | Use contemporaneous score, minute, player count and competition/tie state. Never adjust with final score or later cards.
 | Multi-window state
 | Maintain season, prior season, last 20/10/5, manager regime and exponential estimates. Learn blends; never pick a window after seeing the result.
 | Opponent adjustment
 | Estimate team/player/event rates against schedule strength, venue, competition and active personnel using hierarchical residuals.
 | Home/neutral adjustment
 | Separate true venue advantage from team strength, attendance, travel, altitude and temporary-home effects.
 | Event definition
 | Version shots, SOT, assists, key passes, pressures, tackles, duels, saves, cards and xG eligibility by provider/book.
 | Coordinate normalization
 | Transform every pitch to one direction and standardized dimensions; retain original coordinates and transform version.
 | Penalty/own-goal policy
 | Store penalty and own-goal components separately. Define whether each metric/model includes them.
 | Recency/regime change
 | Use change points for manager, formation, goalkeeper, transfer window, injuries and promotion. Increase recency only under a supported new regime.
 | Hierarchical shrinkage
 | Pull small-sample finishing, goalkeeping, set-piece, referee, home/away, player-prop and competition effects toward defensible priors.
 | Scenario integration
 | Before official teams, average XI, goalkeeper, formation, role, minutes, weather and pitch scenarios rather than inserting one guess.
 | Interaction features
 | Model press versus buildup, counterattack versus rest defense, crosses/set pieces versus aerial defense/GK, creator versus marker and lineup versus formation.
 | Nonlinear effects
 | Rest, travel, weather, altitude, score, red cards, time remaining and substitution behavior require learned bins/splines/trees with constraints.
 | Uncertainty propagation
 | Carry team, player, lineup, model, definition, data, weather and price uncertainty into distributions and EV lower bounds.
 | Correlation control
 | Cluster redundant features and related markets; jointly simulate teammates, opponent events, score state, cards, corners and goalkeeper saves.
 | Rule/season regime
 | Version substitutions, added time, VAR, handball, away-goals, extra-time, competition formats and sportsbook settlements.
 | Discrete outcomes
 | Model goals, margins, corners, cards, shots and props with appropriate count/hazard distributions; do not force an untested normal model.
 | Market isolation
 | Train each market on information actually available at that timestamp. Never leak lineups, corrections or later/closing prices.
 | Narrative quarantine
 | Streaks, H2H, revenge, table pressure and media sentiment enter only through validated, timestamped structured features or reasoned uncertainty.
 | 
5.1 Recommended model stack
Layer
 | Candidate method
 | Purpose
 | Team baseline
 | Hierarchical xG/shot/possession-strength model
 | Opponent-adjusted attacking and defensive latent process by competition.
 | Score distribution
 | Dixon-Coles, bivariate Poisson, negative-binomial or Bayesian score model
 | Coherent 1X2, totals, BTTS, team totals and handicap probabilities.
 | Lineup layer
 | Player impact plus XI/formation/role scenario model
 | Replacement, tactical shape, minutes and interaction effects.
 | Chance/event layer
 | Shot xG/PSxG, xPass and possession-value models
 | Quality of chances, actions, goalkeeper and spatial matchups.
 | Set-piece layer
 | Restart hazard/count and delivery-target model
 | Corners, set-piece xG and player delivery/target roles.
 | Discipline layer
 | Hierarchical foul/card hazard with referee effects
 | Team/player cards, booking points and red-card tail states.
 | Market residual
 | Regularized residual versus no-vig consensus
 | Identify repeatable mispricing without blindly copying market.
 | Player props
 | Participation + minutes + opportunity + conversion
 | Shots, SOT, goals, assists, passes, tackles, cards and saves.
 | Counts
 | Poisson, negative-binomial, binomial or beta-binomial
 | Corners, cards, shots, saves, passes and defensive actions as validated.
 | Ordered events
 | Survival, hazard and competing-risk simulation
 | First/next goal, scorer timing, card and substitution events.
 | Joint markets
 | Shared-event Monte Carlo or copula
 | Correlated team, player, goalkeeper, goal, corner and card outcomes.
 | Live
 | State-space/Bayesian update with event-time quotes
 | Update priors without overreacting to score, red card or a few shots.
 | Ensemble
 | At least two genuinely distinct model families
 | Model agreement/disagreement becomes a qualification feature.
 | 
6. Market-Specific Signal Models
Market
 | Primary drivers
 | Secondary context
 | Automatic caution / block
 | 1X2
 | Joint regulation score distribution, XI/GK and latent team strength
 | Draw dependence, venue, tactics, market price
 | XI/scope unresolved; draw calibration poor; price coverage weak
 | Moneyline label
 | Canonical mapping to 1X2, DNB or To Qualify before model selection
 | Book naming, regulation/ET/penalty scope
 | Untyped or conflicting two-way/three-way Moneyline label
 | Draw No Bet
 | Team win/loss probabilities with explicit draw-refund mass
 | XI/GK, venue, tactics and market path
 | Draw not modeled as push; duplicate side exposure
 | Double Chance
 | Coherent sum of relevant calibrated 1X2 states
 | Draw dependence, price-set vig and side correlation
 | Selections not from one matched outcome set; stale derivative
 | Asian Handicap
 | Goal-margin distribution and exact whole/half/quarter-line settlement
 | Game script, red-card tail and market path
 | Half-win/loss logic absent; derivative incoherence
 | European handicap
 | Exact regulation margin distribution
 | Low-score mass, lineup and venue
 | Three-way mapping or settlement unclear
 | Team to Win Either Half
 | Joint first-/second-half score simulation with overlap retained
 | Starting tactics, halftime adaptation, substitutions
 | Halves treated as independent; book definition unresolved
 | Match Goals
 | Joint score distribution, xG/shot rates, XI/GK and tactics
 | Weather, pitch, referee and added time
 | Lineup/weather ambiguity; total model uncalibrated
 | Team Goals
 | Team marginal scoring distribution versus opponent defense/GK
 | Set pieces, lineup and likely score state
 | Team/scope missing; duplicated side/BTTS thesis
 | First-Half Goals
 | Period-specific combined goal hazard and starting XI/tactics
 | Early press, kickoff tempo, referee
 | Only full-match rates available; H1 calibration weak
 | First-Half Team Goals
 | Team-specific first-half scoring marginal
 | Starting role, opponent opening shape and set pieces
 | Full-match team rate merely prorated; team/period unclear
 | Both Teams to Score
 | Team zero-goal marginals and score dependence
 | Finishing/GK, game state and tactical risk
 | Derived price conflicts with same joint score grid
 | Correct score / HTFT
 | Full joint score or period transition matrix
 | Low-score correction and tail handling
 | Thin price, excessive model sensitivity or mapping ambiguity
 | 
6. Market-Specific Signal Models — continued
Market
 | Primary drivers
 | Secondary context
 | Automatic caution / block
 | Match Corners
 | Joint regulation corner-count distribution
 | Attack, width, crosses, blocks, weather and score behavior
 | Stat-provider mismatch; dispersion or lineup not modeled
 | Team Corners
 | Team marginal corner distribution versus opponent concession process
 | Territory, width, trailing-state response and takers
 | Team marginal unavailable; side and period scope unclear
 | First-Half Corners
 | Period-specific combined corner-count distribution
 | Opening press, width, tempo and early game state
 | Full-match corner rate merely prorated; H1 model weak
 | First-Half Team Corners
 | Team-specific first-half corner marginal
 | Opening matchup, flank access, blocks and delivery roles
 | Team/period/stat source unresolved; sparse H1 coverage
 | Cards / booking points
 | Foul/duel hazards, referee and player matchup
 | Game importance, rivalry only as validated feature
 | Booking mapping/red-card scoring unclear; referee unassigned
 | Player shots / SOT
 | Start x minutes x team shots x player share x on-target rate
 | Role, marker, set pieces and game script
 | Start/role/minutes unresolved; stat-source mismatch
 | Goals / assists
 | Minutes, NPxG/xA, penalty/set-piece role and joint teammate events
 | Finishing, opponent GK and formation
 | Price/role fragile; never use streak alone
 | Passes
 | Minutes, role, team possession, opponent press and game state
 | Formation, teammate network and venue
 | Position/role uncertainty or provider grading mismatch
 | Tackles / fouls / cards
 | Minutes x opponent zone opportunities x role/referee hazard
 | Dribbler matchup, score and shape
 | Tackle/foul definition or expected role unresolved
 | Goalkeeper saves
 | Start x opponent SOT distribution x goals/rebounds jointly
 | Game script, shot quality and defense
 | Starter/DNP/finish rule unresolved
 | Qualification / trophy
 | Regulation + ET + shootout + bracket simulation
 | Future opponent and venue distributions
 | Away-goals/ET/shootout/bracket rules unresolved
 | Live
 | Pregame prior plus official clock/score/player count/on-pitch state
 | Rolling xG, territory, subs, fatigue and review state
 | Feed/quote latency, VAR, red card mapping or suspension
 | 
7. Qualification, Ranking and Allocation
Every candidate passes hard gates before ranking. Qualification scores compare only candidates that remain executable, auditable and internally coherent. A strong narrative or large raw model gap cannot compensate for missing lineup, rule, price or data integrity.
Gate
 | Pass condition
 | Use
 | Executable price
 | Best approved-book quote is live and inside minimum acceptable price.
 | Hard
 | Data freshness
 | Odds, event, lineup, role, weather and model inputs meet market-specific age limits.
 | Hard
 | Event integrity
 | Correct teams/player/competition/market; event active; period/ET/DNP/stat rule verified.
 | Hard
 | Lineup/goalkeeper
 | No unresolved scenario can move fair line/price beyond tolerance.
 | Hard for official signals
 | Role/minutes
 | Prop start, position, taker role and minutes uncertainty inside tolerance.
 | Hard for affected props
 | Model agreement
 | Independent model families agree on direction; disagreement below limit.
 | Strong/Elite hard
 | Lower-bound value
 | Conservative EV remains positive at executable quote.
 | Strong/Elite hard
 | Market coherence
 | Candidate is not a stale outlier and related prices/rules are consistent.
 | Hard
 | Competition/data coverage
 | Required definition and coverage tier is available for the market.
 | Hard
 | Duplicate/correlation
 | No reserved selection expresses the same thesis beyond exposure cap.
 | Hard
 | Drift/health
 | No feed, feature, calibration or model kill switch is active.
 | Hard
 | Auditability
 | Reason codes, timestamps, scenarios, settlement and versions are complete.
 | Hard
 | 
State
 | Initial value threshold
 | Additional requirements
 | Board treatment
 | Signal Detected
 | Raw edge > 0 or material fair-line disagreement
 | May have unresolved XI/role, marginal EV, weak coverage or insufficient reliability
 | Watchlist only; no automatic allocation
 | Lean Signal
 | EV after costs >= 1.5%; rank >= 85th percentile
 | All hard gates pass; data quality >= 80/100; no fragile input dominates
 | Eligible, lowest priority
 | Strong Signal
 | EV >= 3.0%; rank >= 95th percentile; lower-bound EV >= 0
 | Models agree; price/XI/role stable; data quality >= 90
 | Reserved after Elite
 | Elite Signal
 | EV >= 4.5%; rank >= 98th percentile; lower-bound EV >= 1.0%
 | Confirmed/high-certainty context; live best price; no conflict; data quality >= 95
 | First allocation priority; rare by design
 | 
IMPORTANT  A high model score cannot override a hard gate. If the price crosses tolerance or the lineup, goalkeeper, role, market scope, weather/pitch or event state changes after qualification, downgrade to Signal Detected/Expired and rerun. Staking and bankroll sizing remain a separate governed module.
 | 
7.1 Starting component weights
Market
 | Team/xG
 | XI/GK
 | Role/min
 | Tactics
 | Context
 | Market/value
 | Quality
 | 1X2 / DNB / DC / AH
 | 25
 | 20
 | 5
 | 15
 | 5
 | 20
 | 10
 | Game total / BTTS
 | 25
 | 20
 | 5
 | 15
 | 10
 | 15
 | 10
 | Team total
 | 25
 | 20
 | 5
 | 20
 | 5
 | 15
 | 10
 | Player attack prop
 | 10
 | 10
 | 30
 | 20
 | 5
 | 15
 | 10
 | Pass/defense prop
 | 5
 | 10
 | 35
 | 20
 | 5
 | 15
 | 10
 | Goalkeeper prop
 | 15
 | 30
 | 20
 | 10
 | 5
 | 10
 | 10
 | Match/team corners
 | 15
 | 10
 | 5
 | 25
 | 10
 | 20
 | 15
 | First-half corners
 | 15
 | 10
 | 5
 | 30
 | 10
 | 15
 | 15
 | Cards
 | 5
 | 10
 | 15
 | 15
 | 25
 | 15
 | 15
 | First-half market
 | 25
 | 20
 | 5
 | 20
 | 5
 | 15
 | 10
 | 
Weights are launch priors, not permanent truths. Re-estimate by market and competition through walk-forward validation, retain monotonic governance constraints, and prevent any single fragile component from creating an Elite classification.
8. Final Market Validation
The decision is checked against current conditions, not yesterday's assumptions. Every release window refreshes the price, lineup, goalkeeper, formation, participant role, event status and settlement scope before publication.
Window
 | Required checks
 | Action
 | T-24h
 | Schedule, roster/news, rest/travel, weather/pitch, projected XI/GK and opener-to-current market path.
 | Keep candidate or return to monitoring.
 | T-6h
 | Travel arrival, training/news, rotation probability, officials, forecast and price breadth.
 | Pre-qualify or widen scenarios; set minimum price.
 | T-90
 | Likely XI/formation/roles, penalty and set-piece takers, venue/pitch, exact rules and line path.
 | Qualify provisionally or hold.
 | Official XI / about T-75 to T-60
 | Verify official starters, goalkeeper, bench, shape, roles and market reaction; rebuild every affected distribution.
 | Official release may open only after lineup swing passes.
 | T-30
 | Refresh tactical mapping, warmup/news, forecast, price breadth, correlated exposure and stat/DNP rules.
 | Publish, expire or hold.
 | T-5
 | Final exact line/price/status check; no unresolved event; quote age inside limit.
 | Publish, expire or kill.
 | Post-release
 | Monitor price, lineup/event/market status until expiration/kickoff.
 | Retract or downgrade if any hard gate fails.
 | Live
 | Validate clock, score, VAR/red-card state, player count, quote latency and suspension before every decision.
 | Release only from synchronized snapshot.
 | 
8.1 Automatic kill switches
Executable price moves beyond the stored minimum price or the exact line is no longer available.
Official XI, goalkeeper, formation, penalty/set-piece role or expected minutes produces a fair-price swing beyond market tolerance.
Competition, 90-minute/extra-time/qualification, Asian-line, DNP, abandonment or stat-source settlement cannot be verified.
Quote, lineup, event, weather or model snapshot is stale beyond the market-specific freshness limit.
Cross-source team/player/event mapping conflicts, or score/clock/player-count state is desynchronized.
Material weather, pitch, venue, referee or schedule change is outside trained support or scenario coverage.
Data-quality score falls below tier minimum; required event/tracking coverage is missing or corrected after qualification.
Independent models reverse direction or lower-bound EV falls below the tier threshold.
Related market prices reveal a scope/mapping error or the candidate is an isolated stale outlier.
Reserved exposure duplicates/correlates with a higher-ranked play beyond the governed cap.
Live market is suspended, a VAR review is active/recent beyond tolerance, or a red card/substitution is not incorporated.
Feature, residual, calibration, latency or provider health monitor triggers a production alarm.
9. Backtesting, Calibration and Monitoring
Control
 | Method
 | Why
 | Walk-forward testing
 | Train on past only; validate the next chronological block; roll forward.
 | Primary estimate of live behavior.
 | Competition-aware splits
 | Separate leagues, cups, genders, promotion regimes and data tiers; pool hierarchically.
 | Prevents false transferability.
 | Historical quote replay
 | Grade exact book, scope, line, odds, status and timestamp.
 | Eliminates closing-line/look-ahead bias.
 | Lineup/news replay
 | Use only XI, role, injury and forecast information known at candidate time.
 | Prevents availability leakage.
 | Event correction replay
 | Preserve original event feed and correction timestamps.
 | Prevents clean-final-data hindsight.
 | Rule replay
 | Apply historical IFAB/competition and book settlement definitions.
 | Correct labels, pushes, voids and qualification.
 | Calibration
 | Reliability curves, Brier/log loss, ranked probability score and interval coverage.
 | Probability/uncertainty integrity.
 | Price performance
 | Realized EV/yield, CLV and percentage beating matched close by market.
 | Economic/market health.
 | Distribution error
 | Poisson deviance, log score, CRPS, MAE/RMSE and PIT/quantile diagnostics.
 | Full-distribution accuracy.
 | Signal outcomes
 | Win/loss/push/void/half-win/half-loss and hit rate by tier/market/odds/window.
 | Board reporting; never sufficient alone.
 | Risk
 | Drawdown, volatility, losing streaks, tail loss and cross-market correlation.
 | Separate allocation module.
 | Uncertainty
 | Bootstrap/Bayesian intervals, ESS and scenario coverage.
 | Blocks small-sample promotion.
 | Stability
 | Season/month/team/book/league/venue/referee/time-to-start/regime splits.
 | Detects fragile edges.
 | Ablation
 | Remove feature families/providers and compare true out-of-sample change.
 | Finds redundant or story-only features.
 | Champion/challenger
 | Shadow-test new models without altering official release.
 | Controlled improvement.
 | Failure injection
 | Simulate stale quotes, wrong XI, provider corrections, VAR and latency spikes.
 | Confirms kill switches.
 | 
9.1 Promotion standard
Requirement
 | Promotion rule
 | Point-in-time integrity
 | 100% of sampled training/replay records reproduce only information available at the decision timestamp.
 | Calibration
 | No material overconfidence in the target league/market/odds bands; intervals achieve governed coverage.
 | Economic value
 | Positive out-of-sample EV and CLV after realistic price availability, void/push states and execution costs.
 | Sample adequacy
 | Minimum ESS and event counts are set by market; no promotion on raw match count alone.
 | Stability
 | Edge survives seasons, release windows, books and reasonable modeling/definition perturbations.
 | Ablation
 | Incremental feature family improves proper scores, calibration or economic value out of sample.
 | Operational health
 | Latency, mapping, lineup, rule and data-quality SLOs pass under normal and injected failures.
 | Human approval
 | Named review and rollback plan are required before a challenger affects official signals.
 | 
10. Bot-Ready Decision Object
The payload below is a schema example, not a hard-coded pick. Numeric thresholds, field ages and source hierarchies belong in versioned configuration. Preserve null versus unknown versus not-applicable states.
{
  "event_id": "SOCCER_COMP_YYYYMMDD_HOME_AWAY",
  "decision_timestamp": "ISO-8601 UTC",
  "market": {
    "source_market_name": "Total Goals", "canonical_market_id": "MATCH_GOALS",
    "type": "asian_total", "team_scope": "MATCH",
    "selection": "OVER", "line": 2.25,
    "odds_decimal": 1.95, "book": "approved_book",
    "quote_timestamp": "ISO-8601 UTC", "minimum_decimal": 1.91,
    "period_scope": "REGULATION_90_PLUS_STOPPAGE",
    "settlement_rule_id": "book_soccer_vX"
  },
  "projection": {
    "home_goals_mean": 1.62, "away_goals_mean": 1.18,
    "fair_line": 2.62, "fair_decimal": 1.82,
    "edge_pp": 0.036, "ev_pct": 0.041, "ev_lower_bound": 0.009,
    "settlement_mass": {"win": 0.49, "half_win": 0.14, "push": 0.0,
                         "half_loss": 0.12, "loss": 0.25},
    "distribution_version": "soccer_joint_score_vX"
  },
  "context": {
    "lineup_scenario_id": "xi_scenario_X", "lineup_confidence": 0.98,
    "goalkeeper_confidence": {"home": 1.0, "away": 1.0},
    "formation": {"home": "4-3-3", "away": "4-2-3-1"},
    "projected_xg": {"home": 1.56, "away": 1.14},
    "key_absences": [], "weather_scenario_id": "weather_X",
    "matchup_tags": ["transition_edge", "set_piece_edge"]
  },
  "market_state": {
    "open_line": 2.5, "consensus_line": 2.5, "best_line": 2.25,
    "active_books": 9, "steam_breadth": 0.61,
    "stale_quote": false, "scope_mismatch": false
  },
  "quality": {
    "data_quality": 96, "model_agreement": true,
    "lineup_entropy": 0.01, "definition_match": true,
    "drift_alarm": false, "hard_gates_passed": true
  },
  "signal": {
    "state": "Strong Signal", "score": 95, "rank_percentile": 0.97,
    "expires_at": "ISO-8601 UTC", "recheck_at": "ISO-8601 UTC",
    "reason_codes": ["VALUE", "LINEUP_CONFIRMED", "LOWER_BOUND_PASS"]
  },
  "audit": {
    "model_version": "soccer_ensemble_vX",
    "feature_snapshot_id": "snapshot_X",
    "decision_policy_version": "haxiom_soccer_policy_v1"
  }
}
 | 10.1 Standard reason codes
Code
 | Meaning
 | VALUE
 | Executable no-vig price is below calibrated fair price by the tier threshold.
 | LINEUP_CONFIRMED
 | Official XI and material bench scenarios are stable.
 | GOALKEEPER_CONFIRMED
 | Starting goalkeeper is confirmed or inside approved uncertainty.
 | ROLE_CONFIRMED
 | Player position, minutes, penalty/set-piece and prop opportunity are stable.
 | XG_MATCHUP
 | Validated chance-quality interaction materially supports the distribution.
 | TACTICAL_EDGE
 | Press/buildup, transition, width or block interaction supports the edge.
 | SET_PIECE_EDGE
 | Validated restart attack/defense and personnel interaction supports value.
 | GOALKEEPER_EDGE
 | Shot-quality-adjusted goalkeeper posterior materially supports value.
 | REST_TRAVEL_STABLE
 | Workload, travel and international-duty assumptions are current and inside tolerance.
 | WEATHER_PITCH_STABLE
 | Weather, roof/surface and pitch scenarios are current and inside tolerance.
 | REFEREE_CONTEXT
 | Validated referee interaction supports cards, fouls, penalties or added-time distribution.
 | MARKET_COHERENT
 | Candidate survives cross-book, rule-scope and derivative checks.
 | LOWER_BOUND_PASS
 | Conservative EV remains above the tier requirement.
 | PRICE_EXPIRED
 | Executable line or odds moved beyond approved tolerance.
 | LINEUP_BLOCK
 | A high-leverage XI, goalkeeper, formation or bench scenario remains unresolved.
 | ROLE_BLOCK
 | A player's start, position, taker role or minutes remain materially unresolved.
 | SETTLEMENT_BLOCK
 | Period, extra-time, qualification, DNP, abandonment or stat-source rule is unverified.
 | DATA_BLOCK
 | Freshness, coverage, mapping, correction or provider-health requirement failed.
 | MODEL_DISAGREEMENT
 | Independent models disagree beyond the tier tolerance.
 | CORRELATION_BLOCK
 | Selection duplicates or exceeds exposure with a higher-ranked thesis.
 | LIVE_STATE_BLOCK
 | Clock, score, VAR, red-card, player-count or quote state is not synchronized.
 | 
11. Implementation Priority
RECOMMENDED LAUNCH BOUNDARY  Do not enable every feature at launch. Prove point-in-time odds and rule integrity, official lineup scenarios, competition-adjusted xG/score distributions, exact Asian settlement and closing-line capture first. Add advanced event, tracking, corners/cards and live families one at a time through ablation and walk-forward testing.
 | 
Phase
 | Build
 | Result
 | Phase 1 - Required
 | Point-in-time odds/rules; canonical market mapping; schedules; XI/GK scenarios; official events; competition-adjusted xG/strength; joint score grid; market/EV engine; hard gates; closing capture.
 | Auditable 1X2/Moneyline mapping, DNB, double chance, AH, Match Goals, Team Goals, BTTS and core player signals.
 | Phase 2 - High value
 | Joint period-goal model; formation/role/minutes; press/buildup/transition; set pieces; match/team/first-half corner models; referee/weather/pitch; correlated-board control; live monitoring.
 | Team to Win Either Half, First-Half Goals, First-Half Team Goals, Match/Team Corners and first-half corner signals.
 | Phase 3 - Advanced
 | Tracking-derived pitch control/EPV; physical load; joint player/team/event simulation; full live state-space; automated drift, failure injection and champion/challenger.
 | Higher ceiling after clean foundations, coverage and licensing are proven.
 | 
11.1 Production acceptance checklist
Every training row and backtest decision can be reconstructed from append-only feature, quote, news/lineup and rule snapshots.
Every supported competition has a versioned rule, season, team/player/entity and data-coverage registry.
Every source market label maps to one canonical market ID with explicit team, period, overtime, line and stat-provider scope; an ambiguous Moneyline label is blocked.
Every market has tested settlement logic for win, loss, push, void, half-win, half-loss, dead heat and DNP states where applicable.
1X2, DNB, double chance, Asian handicap, Match Goals, Team Goals and BTTS are coherent with one approved regulation joint score distribution or documented reconciliation layer.
Team to Win Either Half, First-Half Goals and First-Half Team Goals reconcile to an approved joint period-score distribution and are never created by simple full-match prorating.
Match Corners, Team Corners, First-Half Corners and First-Half Team Corners reconcile to approved joint and marginal corner-count distributions with matched sportsbook grading rules.
Lineup, goalkeeper, formation, taker and minutes scenarios are timestamped and propagate into uncertainty.
All official signals pass executable price, freshness, mapping, settlement, quality, agreement, correlation and audit gates.
Strong and Elite use lower-bound EV, minimum price and independent model agreement; Elite remains rare by design.
Closing prices are captured for evaluation but unavailable to historical pregame features.
Calibration, CLV, yield, drawdown, drift, latency and error reports segment by league, market, book, price band and release window.
Rollback, model registry, policy versions, reason codes and human-review controls exist before automated publication.
12. Source and Definition Register
Use official and licensed sources wherever possible. URLs below are starting points; HAXIOM must retain contractual permissions, endpoint/schema versions, retrieval timestamps and competition coverage. A public label such as xG or pressure is not a universal definition.
Source
 | Link
 | Use
 | IFAB Laws of the Game 2026/27
 | Open source
 | Official match-law, periods, restarts, cards, penalties and competition-rule baseline.
 | IFAB latest law changes
 | Open source
 | Version changes that can affect events, substitutions and match states.
 | FIFA Football Data Ecosystem
 | Open source
 | Official description of competition, event, tracking and enhanced data layers.
 | FIFA Football Data
 | Open source
 | Official football-data programmes and collection context.
 | FIFA automated event data
 | Open source
 | Event/tracking collection, repeatability and processing context.
 | Hudl StatsBomb
 | Open source
 | Commercial event/360 data and provider-specific xG, pressure and OBV context.
 | StatsBomb possession value explainer
 | Open source
 | Possession-value concepts including xT/OBV-style action valuation.
 | StatsBomb Open Data
 | Open source
 | Public event/lineup/competition data examples; schema and license must be retained.
 | Stats Perform Opta Data
 | Open source
 | Licensed live/historical football feeds, advanced metrics and predictions.
 | Stats Perform pressure methodology
 | Open source
 | Provider discussion of pressure/PPDA concepts and definition sensitivity.
 | Sportradar Soccer API
 | Open source
 | Schedules, lineups, events, statistics, odds and coverage documentation.
 | 
12. Source and Definition Register — continued
Source
 | Link
 | Use
 | Sportradar update frequencies
 | Open source
 | Operational freshness expectations and feed cadence.
 | SkillCorner Physical Data
 | Open source
 | Tracking-derived speed, work-rate, explosiveness and workload context.
 | SkillCorner XY Tracking Data
 | Open source
 | Player/ball positional tracking for spatial and tactical models.
 | UEFA technical reports
 | Open source
 | Official competition technical/tactical reports and terminology.
 | ClubElo
 | Open source
 | Public club-strength rating methodology/reference; independently validate before use.
 | Football-Data odds/results
 | Open source
 | Historical results, match statistics and odds for research; timestamp limitations must be documented.
 | worldfootballR
 | Open source
 | Open-source access helpers; obey upstream terms and record source provenance.
 | Pinnacle betting rules
 | Open source
 | Example sportsbook rule surface; each deployed book requires its own versioned rules.
 | Official competition/team channels
 | Open source
 | Official fixtures, squads, disciplinary, venue and competition announcements.
 | Licensed odds and sportsbook feeds
 | Open source
 | Executable quotes, market status, rulebooks and limits/liquidity proxies under contract.
 | 
12.1 Final governance note
GOVERNANCE  This specification is a decision-support and model-governance framework, not a guarantee of profit or a promised win rate. Soccer contains substantial low-scoring, officiating, lineup and event variance. HAXIOM should preserve complete audit logs, require human review during launch, cap exposure in a separate risk module, and suspend any component that loses point-in-time integrity, data health or out-of-sample calibration.
 | 
