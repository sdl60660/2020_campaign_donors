COPY (
SELECT
first_name
, last_name
, party
, race_type
, incumbent
, grouped_contribution_data.*
FROM
(SELECT
candidate
, contribution_date
, COUNT(contribution_date) AS "donation_count"
, SUM(contribution_amount) AS "donation_total_amount"
FROM
contributions
GROUP BY candidate, contribution_date) grouped_contribution_data
LEFT JOIN candidates ON candidates.fec_id = grouped_contribution_data.candidate

)	TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_date_donation_counts.csv' DELIMITER ',' CSV HEADER;
