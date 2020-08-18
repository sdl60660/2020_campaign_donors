COPY (
	
SELECT 
first_name
, last_name
, candidates.fec_id AS "fec_id"
, party
, race_type
, incumbent
, total_donated
FROM
	
(SELECT
candidate
, SUM(total_donated) AS "total_donated"
FROM
(SELECT
candidate
, donor
, SUM(contribution_amount) AS "total_donated"
FROM contributions
 WHERE fec_record_id IS NOT NULL
GROUP BY candidate, donor
-- HAVING SUM(contribution_amount) >= 200
) total_by_donor_over_threshold
GROUP BY candidate) AS big_money_totals
	
LEFT JOIN candidates ON big_money_totals.candidate = candidates.fec_id

ORDER BY total_donated DESC

	
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/total_big_money_by_candidate_by_fec_id.csv' DELIMITER ',' CSV HEADER;

