 COPY (SELECT
 demo_data.*
 , candidates.race_type
 , candidates.incumbent
 , candidates.year
 , candidates.party
 , candidates.fec_receipts_link
 , candidates.last_name
 , members.bioguide_id
 , members.trump_score
 , members.ideology_score
 , members.dw_nominate1
 , members.dw_nominate2
 , districts.id AS "district_id"
 , districts.district_name
 , districts.state
 , districts.partisan_lean AS "district_partisan_lean"
 , districts.net_trump_vote AS "district_net_trump_vote"
 FROM 
 (SELECT donors_grouped.fec_id,
    donors_grouped.candidate_name,
    count(donors_grouped.candidate_name) AS donor_count,
  
  -- Education quartile counts    
    sum(case when donors_grouped.bachelors_pct >= 0.3021 then 1 else 0 end) as "first_quartile_bachelors_pct",
    sum(case when donors_grouped.bachelors_pct >= 0.1912 and donors_grouped.bachelors_pct < 0.3021 then 1 else 0 end) as "second_quartile_bachelors_pct",
    sum(case when donors_grouped.bachelors_pct >= 0.1253 and donors_grouped.bachelors_pct < 0.1912 then 1 else 0 end) as "third_quartile_bachelors_pct",
    sum(case when donors_grouped.bachelors_pct < 0.1253 then 1 else 0 end) as "fourth_quartile_bachelors_pct",
  
    -- Household Income quartile counts
    sum(case when donors_grouped.median_household_income >= 70711 then 1 else 0 end) as "first_quartile_household_income",
    sum(case when donors_grouped.median_household_income >= 53333 and donors_grouped.median_household_income < 70711 then 1 else 0 end) as "second_quartile_household_income",
    sum(case when donors_grouped.median_household_income >= 42413 and donors_grouped.median_household_income < 53333 then 1 else 0 end) as "third_quartile_household_income",
    sum(case when donors_grouped.median_household_income < 42413 then 1 else 0 end) as "fourth_quartile_household_income",
  
    -- Majority race in zipcode counts
    sum(case when donors_grouped.non_hispanic_white_pct >= 0.5 then 1 else 0 end) as "majority_non_hispanic_white_zipcode",
    sum(case when donors_grouped.all_hispanic_pct >= 0.5 then 1 else 0 end) as "majority_hispanic_zipcode",
    sum(case when donors_grouped.black_pct >= 0.5 then 1 else 0 end) as "majority_black_zipcode",
    sum(case when donors_grouped.asian_pct >= 0.5 then 1 else 0 end) as "majority_asian_zipcode",
    sum(case when donors_grouped.indigenous_native_pct >= 0.5 then 1 else 0 end) as "majority_indigenous_zipcode",
  sum(case when donors_grouped.hawaiian_pacific_islander_pct >= 0.5 then 1 else 0 end) as "majority_hawaiian_pacific_islander_zipcode",
    sum(case when (donors_grouped.non_hispanic_white_pct < 0.5) and (donors_grouped.all_hispanic_pct < 0.5) and (donors_grouped.black_pct < 0.5) and (donors_grouped.asian_pct < 0.5) and (donors_grouped.indigenous_native_pct < 0.5) and (donors_grouped.hawaiian_pacific_islander_pct < 0.5) then 1 else 0 end) as "no_majority_ethnicity_zipcode",
  
    -- Averages using zipcode demos
    trunc(avg(donors_grouped.bachelors_pct), 4) AS bachelors_pct,
    trunc(avg(donors_grouped.median_household_income), 4) AS median_household_income,
    trunc(avg(donors_grouped.white_pct), 4) AS white_pct,
    trunc(avg(donors_grouped.non_hispanic_white_pct), 4) AS non_hispanic_white_pct,
    trunc(avg(donors_grouped.all_hispanic_pct), 4) AS all_hispanic_pct,
    trunc(avg(donors_grouped.black_pct), 4) AS black_pct,
    trunc(avg(donors_grouped.indigenous_native_pct), 4) AS indigenous_native_pct,
    trunc(avg(donors_grouped.asian_pct), 4) AS asian_pct,
    trunc(avg(donors_grouped.hawaiian_pacific_islander_pct), 4) AS hawaiian_pacific_islander_pct,
    trunc(avg(donors_grouped.other_race_pct), 4) AS other_race_pct,
    trunc(avg(donors_grouped.two_or_more_races_pct), 4) AS two_or_more_races_pct
   FROM ( SELECT 
      candidates.fec_id,
            concat(candidates.first_name, ' ', candidates.last_name) AS candidate_name,
            contributions.donor,
            avg(donors_with_expected_demographics.bachelors_pct) AS bachelors_pct,
            avg(donors_with_expected_demographics.median_household_income) AS median_household_income,
            avg(donors_with_expected_demographics.white_pct) AS white_pct,
            avg(donors_with_expected_demographics.non_hispanic_white_pct) AS non_hispanic_white_pct,
            avg(donors_with_expected_demographics.all_hispanic_pct) AS all_hispanic_pct,
            avg(donors_with_expected_demographics.black_pct) AS black_pct,
            avg(donors_with_expected_demographics.indigenous_native_pct) AS indigenous_native_pct,
            avg(donors_with_expected_demographics.asian_pct) AS asian_pct,
            avg(donors_with_expected_demographics.hawaiian_pacific_islander_pct) AS hawaiian_pacific_islander_pct,
            avg(donors_with_expected_demographics.other_race_pct) AS other_race_pct,
            avg(donors_with_expected_demographics.two_or_more_races_pct) AS two_or_more_races_pct
           FROM contributions
             LEFT JOIN donors_with_expected_demographics ON contributions.donor = donors_with_expected_demographics.donor_key
             LEFT JOIN candidates ON contributions.candidate = candidates.fec_id
          WHERE contributions.candidate IS NOT NULL AND donors_with_expected_demographics.median_household_income IS NOT NULL
          GROUP BY candidates.fec_id, (concat(candidates.first_name, ' ', candidates.last_name)), contributions.donor) donors_grouped
  GROUP BY donors_grouped.fec_id, donors_grouped.candidate_name
 HAVING count(donors_grouped.candidate_name) > 1000)
 demo_data
 LEFT JOIN candidates ON candidates.fec_id = demo_data.fec_id
 LEFT JOIN members ON members.bioguide_id = candidates.member_id
 LEFT JOIN districts ON districts.id = candidates.district_id
     ) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/db_outputs/candidate_demographics_including_indistrict.csv' DELIMITER ',' CSV HEADER;
