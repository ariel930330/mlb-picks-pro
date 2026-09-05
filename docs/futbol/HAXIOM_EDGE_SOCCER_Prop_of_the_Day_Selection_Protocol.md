
HAXIOM EDGE
SOCCER
PROP OF THE DAY
SELECTION PROTOCOL
Deterministic player-prop qualification, ranking, and release standard
ONE OFFICIAL PROP - OR A DOCUMENTED NO-SELECTION
 | Criteria version 1.0  |  September 3, 2026
Prepared for the HAXIOM EDGE signal engine


1. Primary Objective
The SOCCER Prop of the Day engine must identify one single player prop offering the strongest dependable combination of calibrated probability, measurable no-vig edge, formula-driven confidence, market reliability, role/workload stability, and an executable price across the complete slate.
The objective is not to select the largest theoretical edge. It is to select the most reliable and actionable edge that survives every hard gate, uncertainty adjustment, market check, and final validation.
Required no-selection response: NO QUALIFYING SOCCER PROP OF THE DAY - The current slate does not contain a sufficiently strong and reliable opportunity.
 | 
2. Scope and Candidate Universe
Evaluate the complete eligible player-prop slate, not a hand-selected subset.
Use only standard, two-sided, widely available markets with compatible settlement rules.
Evaluate both Over and Under. A missing or unreliable opposite side is a hard block.
One player/market/line/side combination is one candidate. Alternate lines are not separate candidates.
The final output is one Official selection or a deterministic no-selection result.
3. Eligible Player-Prop Markets
Attacking volume
Shots
Shots on target
Distribution
Passes attempted
Passes completed
Defensive and duel events
Tackles
Interceptions
Fouls committed
Fouls drawn
Goalkeeper
Saves
An otherwise eligible market becomes ineligible when it fails availability, settlement, price, participation, data, or reliability requirements.
4. Ineligible Markets and Candidates
Anytime, first, last, or multiple goalscorer
Player assists and goal contributions
Player cards and exact card outcomes
Player offsides
First-half and first-event player props
Alternate ladders, exact totals, and milestones
Props whose books use incompatible stat providers or settlement definitions
Extra-time-inclusive markets when other books grade regulation only
Boosted, promotional, and same-game-parlay-only markets
Props for substitutes or players not confirmed in the starting XI
Markets offered by fewer than three independent sportsbooks
Props with incomplete or unreliable opposite-side pricing
Props driven primarily by a low-frequency event, one-book error, or stale line
Props whose current line cannot be reproduced from the registered snapshot
5. Required Registered Data Snapshot
Every run must register a complete, immutable snapshot before filtering or scoring. It must contain:
Snapshot ID
Sport, league/competition, slate date, event time, exact analysis time, and time zone
Criteria, feature, model, and calibration versions plus rounding rules
Player, team, opponent, home/away designation, and event identifiers
Exact line and both-side odds from every available sportsbook
Sportsbook, quote timestamp, market ID, line source, and settlement-rule ID
Market-consensus price and every valid book-level no-vig probability
Availability, role, workload, injury, and participation status
Relevant player, teammate, opponent, and environment metrics
Data-completeness map and missing-field reason codes
Competition, fixture, kickoff, venue, and regulation/extra-time scope
Official starting XI, formation, player position, captaincy, and set-piece role
Expected minutes, substitution pattern, fitness, rotation, congestion, and importance
Competition-specific stat provider and sportsbook settlement definitions
Team possession, field tilt, tempo, pressing, and game-state distribution
Opponent formation, direct matchup, defensive block, press, and transition style
Weather, pitch, referee, and home/away context
Determinism: The same Snapshot ID, criteria version, feature version, model version, calibration version, and rounding rules must always return the same ranking and status.
 | 
6. Data Completeness and Missing-Input Policy
Missing inputs cannot be invented, estimated through narrative judgment, or silently replaced by league averages.
A fallback is allowed only when pre-registered in the criteria version and included in completeness scoring.
Participation, role, settlement, opposite-price, and timestamp fields are hard fields.
Data completeness = valid required fields / total required fields x 100.
Minimum completeness is 95%, but any missing hard field still eliminates the candidate.
7. Market and Price Requirements
The exact line must be offered by at least three independent sportsbooks.
Both sides at the identical line and settlement definition must be available.
The selected American price must be between -175 and +125, inclusive.
The selected price must be within 15 cents of the median consensus and cannot be a stale outlier.
Use the median of valid book-level fair probabilities; do not manufacture edge from one book.
Standard lines only: no ladders, alternate thresholds, boosts, or promotional prices.
Every final quote must be timestamped within five minutes of final validation.
Recheck line, price, and book count immediately before Official release.
8. Calibrated Probability Calculation
Estimate the probability of the exact side and line using fixed features, weights, distributions, calibration, and rounding rules. Narrative reasoning cannot alter the output.
Expected minutes conditional on starting position and game state
Player role, zone, set-piece duty, and formation
Team possession, field tilt, tempo, and attack share
Opponent press, block height, matchup zone, and transition profile
Competition and team-strength adjustment
Score-state, red-card, and substitution scenarios
Event-definition compatibility across provider and sportsbooks
Market-specific count distribution with zero inflation or overdispersion
P_cal = clamp(P_ensemble - U_role - U_data - U_context, 0, 100)
All terms are percentage points. Uncertainty deductions are rule-based, versioned, and applied before ranking.
 | 
Use at least two independently specified model families when required data exists.
If model probabilities differ by more than 6.0 points, apply MODEL_DISAGREEMENT and eliminate the candidate.
Probability must reflect the complete outcome distribution, including zero/minimum-volume scenarios.
Evaluate calibration out of sample by market family.
Minimum calibrated probability is 62.0% after uncertainty deductions.
9. No-Vig Market Probability
At each valid sportsbook, collect the Over and Under prices at the identical line and settlement definition.
Convert each American price to raw implied probability.
Normalize the two raw probabilities so their sum equals 100%.
Retain the selected side's book-level no-vig probability.
Use the median selected-side no-vig probability across valid books as P_market.
q(a) = |a| / (|a| + 100) if a < 0;  q(a) = 100 / (a + 100) if a > 0
Convert American odds a to raw implied probability q.
 | 
P_market = median[ q_selected / (q_over + q_under) ] x 100
Compute within each sportsbook first. Never de-vig mismatched lines or incompatible settlement rules.
 | 
10. Edge Gap and Expected Value
Edge_gap = P_cal - P_market
All values are percentage points for the exact side and line.
 | 
EV_per_unit = p x b - (1 - p)
p = P_cal / 100; b = net profit per unit at the selected American price.
 | 
Minimum raw edge gap is 5.5 percentage points.
Expected value must be positive at the selected executable price.
Edge cannot be based on a stale quote, small sample, unconfirmed role, or unusually optimistic projection.
After any price update, recompute the complete candidate rather than adjusting edge in isolation.
11. Formula-Driven Confidence
Score every component from 0 to 100 using fixed grading anchors stored in the criteria version. A hard block makes the candidate ineligible rather than merely lowering confidence.
Weight
 | Component
 | Fixed-rule contents
 | 25%
 | Lineup and minutes certainty
 | official XI, fitness, substitution pattern, minute floor
 | 20%
 | Matchup support
 | formation, role zone, possession, opponent press/block
 | 15%
 | Position and duty certainty
 | actual position, set pieces, tactical task
 | 15%
 | Model stability
 | calibration, league sample, ensemble agreement, count variance
 | 15%
 | Data completeness
 | lineup, provider, referee, weather, tactical, market inputs
 | 10%
 | Market quality
 | book count, settlement compatibility, pricing, freshness
 | Confidence = 0.25xC1 + 0.20xC2 + 0.15xC3 + 0.15xC4 + 0.15xC5 + 0.10xC6
C1-C6 correspond, in order, to the fixed-rule components in the table above.
 | 
Minimum confidence is 86/100. Written explanation cannot raise or override the score.
12. Minimum Qualification Requirements
Measurement
 | Minimum requirement
 | Calibrated probability
 | >= 62.0%
 | Confidence level
 | >= 86/100
 | Raw edge gap
 | >= 5.5 percentage points
 | Data completeness
 | >= 95%
 | Sportsbook availability
 | >= 3 independent books
 | Selected American odds
 | -175 through +125
 | Price versus consensus
 | Within 15 cents
 | Quote age at final validation
 | <= 5 minutes
 | Stress probability haircut
 | -2.5 percentage points
 | Stress-tested edge
 | >= 3.0 percentage points
 | Runner-up separation
 | >= 3.0 Solid Prop Score points
 | Failing any one requirement eliminates the candidate. Strength in one area cannot compensate for a failed gate.
13. Reliability and Solid Prop Score
Edge_quality = min(100, max(0, 10 x Edge_gap))
A 5-point edge produces 50; a 10-point or larger edge is capped at 100.
 | 
Reliability = (Role_or_workload + Data_completeness + Market_quality) / 3
Use the sport-specific role/workload component defined by this protocol.
 | 
Solid_Prop_Score = 0.35xConfidence + 0.30xP_cal + 0.20xEdge_quality + 0.15xReliability
All inputs use a 0-100 scale. Large but fragile edge cannot dominate probability and confidence.
 | 
Rank with unrounded stored values; round displayed inputs to one decimal place.
Round the displayed Solid Prop Score to two decimals only after ranking.
The highest score leads only after all stress, settlement, stability, and final-price checks pass.
14. Standardized Stress Test
P_stress = P_cal - 2.5
Apply the same fixed probability haircut to every candidate in this sport.
 | 
Stress_edge = P_stress - P_market
Minimum Stress_edge is 3.0 percentage points.
 | 
The engine cannot use a smaller haircut for a preferred candidate.
A candidate below the stress threshold is eliminated even if its raw score ranks first.
The stress test supplements role/workload scenario modeling already inside P_cal.
15. Sport-Specific Metrics by Market
The following SOCCER feature families are mandatory. Store each lookback, opponent adjustment, shrinkage rule, distribution, and weight in the model version.
Shots
Shots, non-penalty shots, xG, box touches, and player shot share per 90
Expected minutes and probability of remaining on the pitch by game state
Starting position, central/wide role, striker partner, and set-piece duty
Team possession, field tilt, final-third entries, crosses, and transition volume
Opponent shot suppression, block rate, defensive line, press, and direct matchup
Shot location, body part, open-play/set-piece split, and xG per shot
Score-state sensitivity and tactical substitution pattern
Shots on target
All shot-volume inputs plus regressed on-target conversion
Shot distance, angle, body part, big-chance share, and headed-shot share
Opponent block pressure and goalkeeper/defense shot-quality environment
Use a nested model: shot count, then on-target probability by shot type
Do not use raw on-target percentage without small-sample regression
Passes attempted and completed
Pass attempts/completions per 90 and per team possession
Expected minutes, position, formation, and build-up responsibility
Team possession distribution, game-state possession, and opponent strength
Opponent PPDA, press intensity, high turnovers, block height, and marking
Touches, receptions, circulation role, and goalkeeper build-up style
Completion props also require pass difficulty, pressure, and progressive-pass mix
Book settlement must use compatible provider treatment of crosses and dead balls
Tackles and interceptions
Tackles attempted/won and interceptions per 90 by position and formation
Expected defensive-zone time and inverse relationship with possession
Opponent dribbler volume, carry lanes, pass destinations, and duel frequency
Pressing responsibility, fullback/wingback height, and midfield assignment
Referee threshold and risk an attempted tackle is recorded as a foul
Score-state/substitution effects and provider-specific event definitions
Fouls committed and drawn
Player fouls committed/drawn per 90 and per duel
Direct-opponent dribble, tackle, pressure, and foul-drawing profile
Expected matchup zone, possession share, and transition exposure
Referee foul rate, card threshold, home/away tendency, and competition baseline
Tactical role, pressing task, game importance, and score state
Model committed and drawn events separately
Goalkeeper saves
Confirmed starting goalkeeper
Opponent projected shots and shots on target from xG, location, and attack strength
Team defensive suppression, block rate, possession, and likely score state
Opponent finishing/on-target rates with regression
Red-card, extra-time, injury, and substitution settlement rules
Model saves jointly with shots on target and goals allowed
16. Participation, Role, and Workload Gates
A selection may become Official only after the official starting XI, player position, and competition-specific settlement rules are confirmed.
Player confirmed in the official starting XI
Expected position and tactical duty confirmed
No material fitness, rotation, or early-substitution concern
Expected minutes use manager, competition, score-state, and congestion patterns
Stat provider and sportsbook settlement rules aligned across consensus quotes
Hard rule: Unresolved participation or workload uncertainty cannot be offset by price, probability, confidence, or edge.
 | 
17. Matchup and Environment Validation
The model and final validation must explicitly account for each applicable factor:
Official XI and formation
Position or set-piece-duty changes
League/cup rotation and fixture congestion
Manager changes
Weather and pitch
Referee assignment
Possession and game-state expectation
Regulation versus extra-time settlement
Context must enter through registered features, scenario probabilities, or hard rules. It cannot be appended as an unmeasured narrative boost.
18. Sample Reliability and Regression
Use hierarchical or empirical-Bayes shrinkage when player, role, lineup, or matchup samples are small.
Separate descriptive recent form from predictive role or skill change.
Require underlying volume or quality support before treating a streak as persistent.
Use opponent large-sample baselines adjusted for current role; do not ignore material role changes.
Track calibration by market family, side, line range, price range, and role-certainty band.
19. Correlation and Duplicate-Candidate Control
Do not create multiple candidates from alternate lines of the same underlying market.
For strongly correlated props on the same player, retain only the highest-scoring qualified candidate.
Combination props must use a joint distribution that preserves covariance.
The ranking is across unique economic exposures, not duplicated board variants.
20. General Reliability Checks
Participation is confirmed to the level required for Official status.
Role and expected workload are defined and stable.
The exact line is broadly available and the market is not stale.
No material injury, restriction, tactical, lineup, or substitution concern is unresolved.
The sample and opponent adjustment are sufficiently reliable.
Recent performance is supported by underlying volume and quality.
Model families agree within the allowed band.
Two-sided, settlement-compatible pricing is available.
The current price remains inside every qualification gate.
21. Runner-Up Separation Rule
The leader must finish at least 3.0 Solid Prop Score points ahead of the second-ranked fully qualified candidate. Eliminated candidates cannot serve as the runner-up.
Close-ranking response: NO OFFICIAL PROP OF THE DAY YET - The leading candidates are too close to establish one clearly superior play.
 | 
22. Deterministic Tie-Breaking
If unrounded Solid Prop Scores are identical, rank in this exact order:
Higher confidence level
Higher calibrated probability
Larger stress-tested edge
Greater data completeness
Greater role/workload certainty
Greater sportsbook availability
Lower price volatility during the registered observation window
Alphabetical player name
Alphabetical market name, then Over before Under
23. Status Lifecycle
Candidate
Leads but awaits a required confirmation, final market recheck, or lock window.
Official
Passed every hard gate and was locked using a registered final snapshot.
Pass
Was acceptable, but the current line/price no longer satisfies a price-dependent gate.
Invalidated
A participation, role, data, settlement, market, or model condition changed.
No Selection
No candidate passed every rule or the qualified leader lacked separation.
24. Price Recheck, Playable Limit, Expiry, and Replacement
Store the selected line/price and the exact worst still-qualifying price as the playable limit.
Derive the limit by recalculating book-level no-vig probability with current valid opposite-side quotes.
If the market crosses the playable limit, change status to Pass.
If the line changes, create a new candidate calculation; never reuse the previous line's probability.
Any material participation, role, settlement, or context change invalidates the snapshot.
A replacement may become Official only from a new snapshot and after independently passing every rule.
25. Required Output Record
Output group
 | Required fields
 | Identity
 | sport, league/competition, event, player, team, opponent, market, side, line
 | Snapshot
 | snapshot_id, criteria_version, model_version, created_at, quote_timestamp
 | Price
 | selected_book, selected_odds, consensus_odds, book_count, playable_limit
 | Probability
 | calibrated_probability, no_vig_probability, edge_gap, stress_probability, stress_edge
 | Quality
 | confidence, data_completeness, reliability, solid_prop_score, runner_up_gap
 | Status
 | Candidate | Official | Pass | Invalidated | No Selection
 | Control
 | reason_codes, recheck_at, expires_at, invalidation_trigger, settlement_rule_id
 | Explanation
 | three strongest factors and every material risk; prose cannot override scores
 | 26. Reason Codes and Audit Trail
Every elimination, downgrade, expiry, Pass, or invalidation must include a standardized reason code:
XI_UNCONFIRMED
POSITION_BLOCK
MINUTES_BLOCK
ROLE_BLOCK
SETTLEMENT_BLOCK
PROVIDER_MISMATCH
MODEL_DISAGREEMENT
PRICE_EXPIRED
MARKET_DEPTH_BLOCK
DATA_BLOCK
PROBABILITY_BLOCK
CONFIDENCE_BLOCK
EDGE_BLOCK
STRESS_BLOCK
RUNNER_UP_BLOCK
ODDS_RANGE_BLOCK
OPPOSITE_PRICE_MISSING
Store previous and new values for every changed field.
Store event time, process, Snapshot ID, criteria version, and model version.
Do not overwrite a prior Official record; append a status transition.
Every changed selection must trace to changed data, price, status, or a version update.
27. Final System Instruction
System directive: Select the single most reliable SOCCER player prop across the complete slate only when it passes every probability, confidence, edge, market, data, role/workload, stress, and separation requirement. Do not select the largest edge automatically. Do not select prohibited or low-frequency markets. Do not force a play. Identical registered inputs and versions must return the same result.
 | 
