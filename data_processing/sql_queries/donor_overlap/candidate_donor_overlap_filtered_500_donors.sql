COPY (

WITH

"candidate_donor_map" (raw_candidate_name, candidate_name, donor) AS
(SELECT
CONCAT(candidates.first_name, ' ', candidates.last_name) AS "raw_candidate_name"
, CONCAT(candidates.first_name, ' ', candidates.last_name, ' (', districts.district_name, ')') AS "candidate_name"
, donor
FROM contributions
LEFT JOIN candidates ON candidates.fec_id = contributions.candidate
LEFT JOIN districts ON candidates.district_id = districts.id
WHERE candidate IS NOT NULL
GROUP BY "candidate_name", raw_candidate_name, donor),

"candidate_unique_donor_counts" (candidate_name, fec_id, donor_count) AS
(SELECT
 CONCAT(candidates.first_name, ' ', candidates.last_name, ' (', districts.district_name, ')') AS "candidate_name"
 , fec_id AS "fec_id"
 , COUNT(DISTINCT contributions.donor) AS "donor_count"
 FROM contributions
 LEFT JOIN candidates ON candidates.fec_id = contributions.candidate
 LEFT JOIN districts ON candidates.district_id = districts.id
WHERE candidate IS NOT NULL
GROUP BY "candidate_name", fec_id)

SELECT
primary_candidate
, compared_candidate
, overlap_count
, total_counts.donor_count AS "total_primary_donors"
, total_counts_secondary.donor_count AS "total_compared_donors"
-- , TRUNC(100.0*(overlap_count / total_counts.donor_count),2) AS "overlap_percentage"
, total_counts.fec_id AS "primary_candidate_fec_id"
, total_counts_secondary.fec_id AS "compared_candidate_fec_id"
FROM
	(SELECT
	t1.candidate_name AS "primary_candidate"
	, t2.candidate_name AS "compared_candidate"
	, COUNT(t1.donor) AS "overlap_count"
	FROM
	"candidate_donor_map" AS t1
	INNER JOIN "candidate_donor_map" AS t2 ON t1.donor = t2.donor
	WHERE t1.candidate_name <> t2.candidate_name
	GROUP BY t1.candidate_name, t2.candidate_name
	) candidate_pairings

LEFT JOIN "candidate_unique_donor_counts" AS total_counts ON candidate_pairings.primary_candidate = total_counts.candidate_name
LEFT JOIN "candidate_unique_donor_counts" AS total_counts_secondary ON candidate_pairings.compared_candidate = total_counts_secondary.candidate_name

WHERE total_counts.donor_count >= 500
AND total_counts_secondary.donor_count >= 500
AND total_counts.candidate_name <> total_counts_secondary.candidate_name
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/filtered_candidate_overlap.csv' DELIMITER ',' CSV HEADER;

