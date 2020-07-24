SELECT
 CONCAT(candidates.first_name, ' ', candidates.last_name) AS "candidate_name"
 , COUNT(DISTINCT contributions.donor) AS "donor_count"
 FROM contributions
 LEFT JOIN candidates ON candidates.fec_id = contributions.candidate
WHERE candidate IS NOT NULL
GROUP BY "candidate_name"
