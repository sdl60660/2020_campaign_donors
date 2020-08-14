COPY (

SELECT 
first_name
, last_name
, candidates.fec_id AS "fec_id"
, party
, race_type
, incumbent
, donor
, total_donated
FROM (SELECT
candidate
, donor
, SUM(contribution_amount) AS "total_donated"
FROM contributions
GROUP BY candidate, donor) total_donated_by_donor
LEFT JOIN candidates ON total_donated_by_donor.candidate = candidates.fec_id
	
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_donor_mapping_totals.csv' DELIMITER ',' CSV HEADER;

