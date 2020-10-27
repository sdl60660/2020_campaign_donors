import json
import csv
import pandas as pd
import math
import os


# Minimum number of donors for inclusion in node-link candidate overlap diagram
donor_threshold = 5000

# Load full dataset of candidate overlaps, as pulled from database
df = pd.read_csv('db_outputs/filtered_candidate_overlap.csv')
# print(df.loc[df['total_primary_donors'] >= 5000].groupby('primary_candidate').primary_candidate.nunique().size)

# Filter overlap data down to only those where the primary and compared candidate have at least as many donors as the threshold
filtered_df = df.loc[(df['total_primary_donors'] >= donor_threshold) & (df['total_compared_donors'] >= donor_threshold)]
# Pull out a list of tuples containing each of these candidates' names, fec IDs, and total donors (to be turned into nodes)
candidate_set = filtered_df.groupby(['primary_candidate', 'primary_candidate_fec_id', 'total_primary_donors']).primary_candidate.nunique().index.tolist()
# print(candidate_set)
# print(len(candidate_set))

# Read in the candidate table from the postgres database
candidate_df = pd.read_csv('table_exports/candidates.csv')
# Find all candidates who are dems running for a 2020 office
all_2020_candidates = candidate_df.loc[candidate_df['year'] == 2020]
# print(all_2020_candidates)
# Filter the candidate set to only include these 2020 dems, since we don't have small donor info on republicans
candidate_set = list(filter(lambda x: all_2020_candidates['fec_id'].isin([x[1]]).any(), candidate_set))
candidate_set_names = [x[0] for x in candidate_set]

# Available candidate images
candidate_images = os.listdir('../static/images/candidate_images')

# Create nodes using the FEC ID as their id, but also including a display name and a total number of donors for the size of their bubble
nodes = []
for candidate in candidate_set:

    if '{}.jpg'.format(candidate[1]) in candidate_images:
        image_url = '{}.jpg'.format(candidate[1])
    else:
        image_url = 'fallback.jpg'

    node = {'id': candidate[1], 'display_name': candidate[0], 'total_donors': candidate[2], 'image_url': image_url}
    for col in ['party', 'race_type', 'first_name', 'last_name', 'incumbent']:
        col_value = all_2020_candidates.loc[all_2020_candidates['fec_id'] == candidate[1]][col].values[0]

        # There's at least one NaN values passed through from the database
        if type(col_value) == float and math.isnan(col_value):
            col_value = ""
        node[col] = col_value

    nodes.append(node)


# Create id to candidate name dictionary to use on front-end and avoid having to pass names through on each link
candidate_ids = {x['id']: x['last_name'] for x in nodes}

# Create an empty list to store link values
links = []
for node in nodes:
    # print(node['display_name'])

    # Find all rows in the overlap dataframe for this given candidate and where the compared candidate is in the 2020 dems list
    overlaps = filtered_df.loc[(filtered_df['primary_candidate_fec_id'] == node['id']) &
                            (filtered_df['compared_candidate'].isin(candidate_set_names))]

    # For each matching value, create a link entry containing the source (primary candidate), target (caompared candidate),
    # a percentage value for overlap (as a percentage of the source's total donors) and a raw value (total number of overlapping donors)
    for index, row in overlaps.iterrows():
        overlap = 100*(row['overlap_count'] / row['total_primary_donors'])

        reverse_link = filtered_df.loc[(filtered_df['primary_candidate_fec_id'] == row['compared_candidate_fec_id']) & (filtered_df['compared_candidate_fec_id'] == row['primary_candidate_fec_id'])]
        reverse_overlap = (100*reverse_link['overlap_count']/reverse_link['total_primary_donors']).values[0]

        if overlap >= 1.0 or reverse_overlap >= 1.0:
            links.append({
                'source': row['primary_candidate_fec_id'],
                'target': row['compared_candidate_fec_id'],
                'pct_val': round(overlap, 1),
                'raw_val': row['overlap_count']
            })


with open('../static/data/candidate_overlap_nodes.csv', 'w') as f:
    out_csv = csv.DictWriter(f, fieldnames=list(nodes[0].keys()))
    out_csv.writeheader()
    for row in nodes:
        out_csv.writerow(row)
    # json.dump(nodes, f)

with open('../static/data/candidate_overlap_links.csv', 'w') as f:
    out_csv = csv.DictWriter(f, fieldnames=list(links[0].keys()))
    out_csv.writeheader()
    for row in links:
        out_csv.writerow(row)
    # json.dump(links, f)

with open('../static/data/candidate_id_name_lookup.json', 'w') as f:
    json.dump(candidate_ids, f)