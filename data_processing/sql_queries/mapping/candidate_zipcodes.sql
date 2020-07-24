COPY (SELECT
candidates.fec_id
, CONCAT(candidates.first_name, ' ', candidates.last_name) AS "candidate_name"
, donors.zipcode
, COUNT(DISTINCT contributions.donor) AS "total_contributors"
, COUNT(contributions.donor) AS "total_contributions"
, SUM(contributions.contribution_amount) AS "total_amount_donated"
FROM contributions
LEFT JOIN donors ON donors.donor_key = contributions.donor
LEFT JOIN candidates ON contributions.candidate = candidates.fec_id
WHERE contributions.candidate IS NOT NULL
AND donors.zipcode IS NOT NULL
GROUP BY candidates.fec_id, "candidate_name", donors.zipcode
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_zipcodes.csv' DELIMITER ',' CSV HEADER;
