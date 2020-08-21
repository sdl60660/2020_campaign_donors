import json

import pandas as pd
import numpy as np

from collections import defaultdict


# Used to convert race type from abbreviation used in meta data file
race_type_dict = {
    'P': 'president',
    'S': 'senate',
    'H': 'house'
}


# Find any associated candidate from 'supports' column,
# Disregard the 'opposes', we don't know that it necessarily supports the opponent
super_pac_df = pd.read_csv('raw_data/open_secrets_super_pac_mapping.csv')
super_pac_df['associated_candidate'] = super_pac_df['Supports/Opposes'].apply(
    lambda x: '' if (type(x) == float or 'supports ' not in x) else x.replace('supports ', '').upper())

# Load meta data and filter to just 2020 candidates
meta_data_df = pd.read_csv('processed_data/all_candidates.csv')
meta_data_df = meta_data_df.loc[meta_data_df['year'] == 2020]

# Sort by total receipts and remove duplicate last names (we're going to assume the PAC affiliation is for the
# top-raising candidate)
sorted_meta_data = meta_data_df.sort_values(by=['total_receipts'], ascending=False)
sorted_meta_data = sorted_meta_data.drop_duplicates(subset=['last_name'], keep='first')


# Append associated candidate's FEC ID to the Super PAC data
name_fec_id = sorted_meta_data[['last_name', 'fec_id', 'office_type']]
name_fec_id['office_type'] = name_fec_id['office_type'].map(race_type_dict)

super_pac_df = super_pac_df.merge(name_fec_id, left_on=['associated_candidate'], right_on=['last_name'], how='left')
super_pac_df = super_pac_df.drop(['last_name'], axis=1)
super_pac_df = super_pac_df.replace(np.nan, '', regex=True)


# Translate 'viewpoint' ('liberal', 'conservative') to a party affiliation to be used for the color scale on the visualization
super_pac_df['party_affiliation'] = super_pac_df['Viewpoint'].apply(lambda x: 'DEM' if x == 'Liberal' else ('REP' if x == 'Conservative' else 'N/A'))
super_pac_df['Independent'] = super_pac_df['Independent'].apply(lambda x: int(x.replace('$', '').replace(',', '')))
super_pac_df['Total Raised'] = super_pac_df['Total Raised'].apply(lambda x: int(x.replace('$', '').replace(',', '')))


# Group by party affiliation and by specific candidate
grouped_df = super_pac_df.groupby(['party_affiliation', 'fec_id', 'associated_candidate', 'office_type'], as_index=False).sum().sort_values(by=['Total Raised'], ascending=False)


# Create money blocks for the visualization for every $1M. If a PAC is affiliated with a candidate, but isn't enough for
# a full block on its own, add it to the remainder totals for its party to be added as generalized blocks later
block_size = 1000000
blocks = []
party_remainders = defaultdict(int)
for i, row in grouped_df.iterrows():
    num_blocks = round(row['Total Raised'] / block_size)

    if num_blocks > 0:
        for _ in range(num_blocks):
            block_data = {
                'party': row['party_affiliation'],
                'fec_id': row['fec_id'],
                'candidate': row['associated_candidate'],
                'race_type': row['office_type']
            }
            blocks.append(block_data)
    else:
        party_remainders[row['party_affiliation']] += row['Total Raised']


# Add the generalized 'party' (really ideology) blocks with the remainders from smaller PACs or from PACs not associated
#  with specific candidates
for party, total in party_remainders.items():
    num_blocks = round(total / block_size)

    for _ in range(num_blocks):
        block_data = {
            'party': party,
            'fec_id': '',
            'candidate': '',
            'race_type': row['office_type']
        }

        blocks.append(block_data)


# Append ID to each block to be used for pre-processing coordinates later
for i, block in enumerate(blocks):
    block["block_id"] = i


# Dump into a JSON file to be loaded by the visualization
with open('../static/data/super_pac_money_blocks.json', 'w') as f:
    json.dump(blocks, f)