import json
import pandas as pd


# Minimum number of donors for inclusion in node-link candidate overlap diagram
donor_threshold = 3000

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
all_2020_dems = candidate_df.loc[(candidate_df['party'] == 'DEM') & (candidate_df['year'] == 2020)]
# Filter the candidate set to only include these 2020 dems, since we don't have small donor info on republicans
candidate_set = list(filter(lambda x: all_2020_dems['fec_id'].isin([x[1]]).any(), candidate_set))
candidate_set_names = [x[0] for x in candidate_set]

# Create nodes using the FEC ID as their id, but also including a display name and a total number of donors for the size of their bubble
nodes = [{'id': x[1], 'display_name': x[0], 'total_donors': x[2]} for x in candidate_set]
# print(nodes)

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
        links.append({
            'source': row['primary_candidate_fec_id'],
            'target': row['compared_candidate_fec_id'],
            'pct_val': (row['overlap_count'] / row['total_primary_donors']),
            'raw_val': row['overlap_count']
        })


with open('../static/data/candidate_overlap_nodes.json', 'w') as f:
    json.dump(nodes, f)

with open('../static/data/candidate_overlap_links.json', 'w') as f:
    json.dump(links, f)