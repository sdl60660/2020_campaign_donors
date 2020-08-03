COPY (

SELECT
candidates.fec_id
, candidates.first_name
, candidates.last_name
, candidates.race_type
, candidates.party
, donors.zipcode
, SUM(contributions.contribution_amount) AS "total_receipts"
, COUNT(DISTINCT contributions.donor) AS "total_contributors"
, COUNT(contributions.donor) AS "total_contributions"
FROM contributions
LEFT JOIN candidates ON candidates.fec_id = contributions.candidate
LEFT JOIN donors ON contributions.donor = donors.donor_key
WHERE fec_id IS NOT NULL AND donors.zipcode IS NOT NULL
GROUP BY candidates.fec_id, candidates.first_name, candidates.last_name, candidates.race_type, candidates.party, donors.zipcode
ORDER BY SUM(contributions.contribution_amount) DESC
	
)
TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_zipcodes.csv' DELIMITER ',' CSV HEADER;	
	