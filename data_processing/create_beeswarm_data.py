
import pandas as pd
import numpy as np
import json
import math

from collections import defaultdict


def process_blocks(num_blocks, remainder, row_data, chart_blocks):
    for block_num in range(0, num_blocks):
        block = {k: v for k, v in row_data.items()}

        if block_num == (num_blocks - 1):
            block['total_receipts'] = int(remainder)
        else:
            block['total_receipts'] = int(block_size)

        block['first_name'] = block['last_name'] = block['fec_id'] = ''

        # if block['total_receipts'] > block_size / 2:
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

grouped_df = state_mappings_df.groupby(by=['state', 'party'], as_index=False).sum()

# print(state_mappings_df)
chart_blocks = []
block_size = 1000000

# total_money = 0
total_summary_counts = defaultdict(lambda: defaultdict(lambda : defaultdict(float)))
remainder_counts = defaultdict(float)

for index, row_data in state_mappings_df.iterrows():
    row_data = row_data.to_dict()

    del row_data['total_contributions']
    del row_data['total_contributors']

    total_receipts = row_data['total_receipts']
    total_summary_counts[row_data['state']][row_data['party']][row_data['race_type']] += total_receipts


# for index, row_data in grouped_df.iterrows():
for state, state_data in total_summary_counts.items():
    for party, party_data in state_data.items():
        if state == np.nan or state == '' or state is None:
            state = 'uncategorized'

        total_receipts = sum(party_data.values())

        num_blocks = round(total_receipts / block_size)
        remainder = total_receipts % block_size

        remainder_counts[party] += remainder

        row_data = {
            'party': party,
            'state': state,
            'total_receipts': total_receipts
        }

        chart_blocks = process_blocks(num_blocks, remainder, row_data, chart_blocks)

for party, sub_dict in remainder_counts.items():
    total_remainder = remainder_counts[party]
    num_blocks = round(total_remainder / block_size)
    remainder = total_remainder % block_size

    row_data = {
        'party': party,
        'state': 'uncategorized',
        'race_type': ''
    }

    chart_blocks = process_blocks(num_blocks, remainder, row_data, chart_blocks)


candidate_totals = state_mappings_df.groupby(by=['fec_id', 'race_type', 'party', 'first_name', 'last_name'], as_index=False).sum()
large_candidate_totals = candidate_totals.loc[candidate_totals['total_receipts'] >= block_size]
# print(candidate_totals)


chart_blocks = pd.DataFrame(chart_blocks)
chart_blocks['first_name'] = ''
chart_blocks['last_name'] = ''
chart_blocks['fec_id'] = ''
chart_blocks['race_type'] = ''

remainder_counts = defaultdict(lambda : defaultdict(float))
for index, candidate in large_candidate_totals.iterrows():
    num_blocks = math.floor(candidate['total_receipts'] / block_size)

    remainder_counts[candidate['party']][candidate['race_type']] += candidate['total_receipts'] % block_size

    candidate_blocks = chart_blocks.loc[(chart_blocks['fec_id'] == '') & (chart_blocks['party'] == candidate['party'])]

    for block_num in range(num_blocks):
        for col in ['first_name', 'last_name', 'fec_id', 'race_type']:
            chart_blocks.at[candidate_blocks.index.values[block_num], col] = candidate[col]


print(chart_blocks)

small_candidate_totals = candidate_totals.loc[candidate_totals['total_receipts'] < block_size]
for index,candidate in small_candidate_totals.iterrows():
    remainder_counts[candidate['party']][candidate['race_type']] += candidate['total_receipts']
    # df.at['C', 'x'] = 10

for party in remainder_counts.keys():
    uncategorized_blocks = chart_blocks.loc[(chart_blocks['fec_id'] == '')
                                            & (chart_blocks['party'] == party)]

    total_party_remainder = remainder_counts[party]['house'] + remainder_counts[party]['president'] + remainder_counts[party]['senate']
    for office_type in ['president', 'senate', 'house']:
        num_blocks = math.floor(remainder_counts[party][office_type] / block_size)

        print(party, office_type, num_blocks)
        for block_num in range(num_blocks):
            chart_blocks.at[uncategorized_blocks.index.values[block_num], 'race_type'] = office_type
            chart_blocks.at[uncategorized_blocks.index.values[block_num], 'fec_id'] = '[remaining candidates]'

print(len(chart_blocks))
output_data = []
for i, row in chart_blocks.iterrows():
    output_data.append(row.to_dict())


output_data = [x for x in output_data if x['race_type'] != '']
with open('../static/data/beeswarm_money_blocks.json', 'w') as f:
    json.dump(output_data, f)

with open('../static/data/state_summary_counts.json', 'w') as f:
    json.dump(total_summary_counts, f)

