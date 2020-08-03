
import pandas as pd
import numpy as np
import json

from collections import defaultdict


def process_blocks(num_blocks, remainder, row_data, chart_blocks):
    for block_num in range(0, num_blocks):
        block = {k: v for k, v in row_data.items()}

        if block_num == (num_blocks - 1):
            block['total_receipts'] = int(remainder)
        else:
            block['total_receipts'] = int(block_size)
        chart_blocks.append(block)

    return chart_blocks


state_mappings_df = pd.read_csv('db_outputs/candidate_states.csv')
meta_data_totals = pd.read_csv('processed_data/all_candidates.csv')
meta_data_totals = meta_data_totals.loc[meta_data_totals['year'] == 2020]

race_type_dict = {
    'P': 'president',
    'S': 'senate',
    'H': 'house'
}

grouped_totals = state_mappings_df.groupby(['fec_id']).sum()[['total_receipts']]
for candidate in meta_data_totals.iterrows():
    fec_id = candidate[1]['fec_id']

    true_receipts = candidate[1]['total_receipts']
    if true_receipts == np.nan:
        true_receipts = 0

    if fec_id in grouped_totals.index:
        calculated_receipts = grouped_totals.loc[fec_id][0]
    else:
        calculated_receipts = 0

    receipt_difference = 0
    if not np.isnan(true_receipts):
        receipt_difference = max(0, (true_receipts - calculated_receipts))

    if receipt_difference > 0:

        row_data = {'fec_id': fec_id,
                    'race_type': race_type_dict[fec_id[0]],
                    'first_name': candidate[1]['first_name'],
                    'last_name': candidate[1]['last_name'],
                    'party': candidate[1]['party'],
                    'state': 'uncategorized',
                    'total_receipts': receipt_difference,
                    'total_contributions': None,
                    'total_contributors': None}

        state_mappings_df = state_mappings_df.append(row_data, ignore_index=True)

# Add any candidates present in meta_data, but not in calculated totals (e.g. Michael Bloomberg)
# meta_data_totals.loc[(meta_data_totals['year'] == 2020)]

# print(state_mappings_df)
chart_blocks = []
block_size = 1000000

# total_money = 0
total_summary_counts = defaultdict(lambda: defaultdict(lambda : defaultdict(float)))
remainder_counts = defaultdict(lambda: defaultdict(lambda : defaultdict(float)))

for index, row_data in state_mappings_df.iterrows():
    row_data = row_data.to_dict()

    del row_data['total_contributions']
    del row_data['total_contributors']

    total_receipts = row_data['total_receipts']
    total_summary_counts[row_data['state']][row_data['party']][row_data['race_type']] += total_receipts

    num_blocks = round(total_receipts / block_size)
    remainder = total_receipts % block_size

    print(num_blocks, remainder)
    if num_blocks == 0:
        remainder_counts[row_data['party']][row_data['state']][row_data['race_type']] += remainder

    chart_blocks = process_blocks(num_blocks, remainder, row_data, chart_blocks)

# uncounted_money = 0
# total_remainder_money = 0
for party in remainder_counts.keys():
    for state in remainder_counts[party].keys():
        for race_type in remainder_counts[party][state].keys():

            total_receipts = remainder_counts[party][state][race_type]
            num_blocks = round(total_receipts / block_size)
            remainder = total_receipts % block_size

            # total_remainder_money += total_receipts

            if num_blocks > 0 and type(state) == str and state != np.nan:
                row_data = {
                    "state": state,
                    "party": party,
                    "last_name": None,
                    "total_receipts": total_receipts,
                    "fec_id": "[remaining candidates]",
                    "first_name": None,
                    "race_type": race_type}
                chart_blocks = process_blocks(num_blocks, remainder, row_data, chart_blocks)


# print(len(chart_blocks))

with open('../static/data/beeswarm_money_blocks.json', 'w') as f:
    json.dump(chart_blocks, f)

with open('../static/data/state_summary_counts.json', 'w') as f:
    json.dump(total_summary_counts, f)

