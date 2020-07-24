COPY (SELECT
candidates.fec_id
, CONCAT(candidates.first_name, ' ', candidates.last_name) AS "candidate_name"
, donors.state
, COUNT(DISTINCT contributions.donor) AS "total_contributors"
, COUNT(contributions.donor) AS "total_contributions"
, SUM(contributions.contribution_amount) AS "total_amount_donated"
FROM contributions
LEFT JOIN donors ON donors.donor_key = contributions.donor
LEFT JOIN candidates ON contributions.candidate = candidates.fec_id
WHERE contributions.candidate IS NOT NULL
AND donors.state IS NOT NULL
GROUP BY candidates.fec_id, "candidate_name", donors.state
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_states.csv' DELIMITER ',' CSV HEADER;
