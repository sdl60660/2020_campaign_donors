COPY (

SELECT
candidates.fec_id
, candidates.first_name
, candidates.last_name
, SUM(contributions.contribution_amount)
FROM contributions
LEFT JOIN candidates ON candidates.fec_id = contributions.candidate
GROUP BY candidates.fec_id, candidates.first_name, candidates.last_name
ORDER BY SUM(contributions.contribution_amount) DESC

) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/calculated_candidate_totals.csv' DELIMITER ',' CSV HEADER;