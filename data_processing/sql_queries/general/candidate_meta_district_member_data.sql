COPY (
SELECT
candidates.fec_id
, candidates.first_name
, candidates.last_name
, CONCAT(candidates.first_name, ' ', candidates.last_name) AS "candidate_name"
, candidates.race_type
, candidates.party
, candidates.incumbent
, candidates.fec_receipts_link
, candidates.district_id
, districts.district_name
, districts.partisan_lean
, districts.net_trump_vote
, members.bioguide_id
, members.trump_score
, members.ideology_score
, members.dw_nominate1
, members.dw_nominate2
FROM candidates
LEFT JOIN districts ON districts.id = candidates.district_id
LEFT JOIN members ON members.bioguide_id = candidates.member_id
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_meta_data.csv' DELIMITER ',' CSV HEADER;
