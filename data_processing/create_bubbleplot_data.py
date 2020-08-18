import pandas as pd


df = pd.read_csv('db_outputs/candidate_demographics_including_indistrict.csv')
df = df.loc[df['year'] == 2020]

print(df.columns)

df = df[['fec_id', 'candidate_name', 'party', 'donor_count',
       'first_quartile_bachelors_pct', 'second_quartile_bachelors_pct',
       'third_quartile_bachelors_pct', 'fourth_quartile_bachelors_pct',
       'first_quartile_household_income', 'second_quartile_household_income',
       'third_quartile_household_income', 'fourth_quartile_household_income',
       'majority_non_hispanic_white_zipcode', 'majority_hispanic_zipcode',
       'majority_black_zipcode', 'majority_asian_zipcode',
       'majority_indigenous_zipcode',
       'majority_hawaiian_pacific_islander_zipcode',
       'no_majority_ethnicity_zipcode', 'median_household_income', 'district_name']]

df['high_income_zipcode_pct'] = df['first_quartile_household_income'] / df['donor_count']
df['majority_white_zipcode_pct'] = df['majority_non_hispanic_white_zipcode'] / df['donor_count']
df['high_bachelors_zipcode_pct'] = df['first_quartile_bachelors_pct'] / df['donor_count']

df.to_csv('../static/data/donor_demographics.csv')