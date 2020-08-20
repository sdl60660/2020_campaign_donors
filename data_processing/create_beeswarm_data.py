import pandas as pd
import numpy as np
import json
import math

from collections import defaultdict


# Used to convert race type from abbreviation used in meta data file
race_type_dict = {
    'P': 'president',
    'S': 'senate',
    'H': 'house'
}

# Container to hold final chart blocks/bees
chart_blocks = []
# Size of each block/bee
block_size = 1000000


def splitPerc(l, perc, keys):
    # Turn percentages into values between 0 and 1
    splits = np.cumsum(perc)/100.

    if splits[-1] < 0.999 or splits[-1] > 1.001:
        raise ValueError("percents don't add up to 100")

    # Split doesn't need last percent, it will just take what is left
    splits = splits[:-1]

    # Turn values into indices
    splits *= len(l)

    # Turn double indices into integers.
    splits = splits.round().astype(np.int)

    chunks = np.split(l, splits)

    return {keys[i]: chunks[i] for i in range(len(keys))}


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


def add_missing_money_to_state_mappings(state_mappings_df, meta_data_totals):
    # Group together calculated state totals to get the total calculated receipts from the database
    # Compare this to the true receipts from the meta data file
    grouped_totals = state_mappings_df.groupby(['fec_id']).sum()[['total_receipts']]
    for i, candidate in meta_data_totals.iterrows():
        fec_id = candidate['fec_id']

        true_receipts = candidate['total_receipts']
        if np.isnan(true_receipts):
            true_receipts = 0

        if fec_id in grouped_totals.index:
            calculated_receipts = grouped_totals.loc[fec_id][0]
        else:
            calculated_receipts = 0

        receipt_difference = 0
        if not np.isnan(true_receipts):
            if (calculated_receipts > true_receipts and calculated_receipts > 50000):
                print(true_receipts, calculated_receipts,
                      (candidate['first_name'] + ' ' + candidate['last_name']).replace(' ', '~'), candidate['fec_id'],
                      candidate['fec_receipts_link'])
            receipt_difference = max(0, (true_receipts - calculated_receipts))

        # If the true total is greater than the calculated total (which it will be by at least a small amount in almost all cases),
        # then add synthetic "uncategorized" rows to the table of candidate-state mappings to account for the extra money.
        if receipt_difference > 0:
            row_data = {'fec_id': fec_id,
                        'race_type': race_type_dict[fec_id[0]],
                        'first_name': candidate['first_name'],
                        'last_name': candidate['last_name'],
                        'party': candidate['party'],
                        'state': 'uncategorized',
                        'total_receipts': receipt_difference,
                        'total_contributions': None,
                        'total_contributors': None}

            state_mappings_df = state_mappings_df.append(row_data, ignore_index=True)

    return state_mappings_df, grouped_totals

def create_output_meta_file(big_money_totals, meta_data_totals, grouped_totals):
    big_money_totals['large_individual_donors'] = big_money_totals['total_donated']
    join_df = big_money_totals[['fec_id', 'large_individual_donors']]

    meta_data_totals = meta_data_totals.join(join_df.set_index('fec_id'), on='fec_id', lsuffix='', rsuffix='_repeat')

    meta_data_totals['large_individual_donors'] = meta_data_totals['large_individual_donors'] - meta_data_totals[
        'contributions_from_candidate']

    meta_data_totals['large_individual_donors'][meta_data_totals['large_individual_donors'] < 0] = 0
    # meta_data_totals['small_individual_donors'] = meta_data_totals[''] - meta_data_totals['large_individual_donors']
    meta_data_totals['small_individual_donors'] = ''
    meta_data_totals['total_self_contributions'] = ''
    meta_data_totals['other_contribution_sources'] = ''

    for i, candidate in meta_data_totals.iterrows():
        self_contributions = candidate['contributions_from_candidate']

        fec_id = candidate['fec_id']
        if fec_id in grouped_totals.index:
            calculated_receipts = (grouped_totals.loc[fec_id][0] - self_contributions)
        else:
            calculated_receipts = 0
        total_individual_contributions = max(candidate['total_individual_contributions'], calculated_receipts)

        meta_data_totals.at[i, 'small_individual_donors'] = total_individual_contributions - candidate[
            'large_individual_donors']
        meta_data_totals.at[i, 'total_self_contributions'] = candidate['contributions_from_candidate'] + candidate['loans_from_candidate']
        meta_data_totals.at[i, 'other_contribution_sources'] = max(0, (candidate['total_receipts'] - total_individual_contributions - candidate['contributions_from_candidate'] - candidate['loans_from_candidate'] - candidate['transfers_from_committees']))

    return meta_data_totals


def clean_and_summarize_state_mappings(state_mappings_df):
    total_summary_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    
    for index, row_data in state_mappings_df.iterrows():
        row_data = row_data.to_dict()

        del row_data['total_contributions']
        del row_data['total_contributors']

        total_receipts = row_data['total_receipts']
        total_summary_counts[row_data['state']][row_data['party']][row_data['race_type']] += total_receipts

    return state_mappings_df, total_summary_counts


def create_unassigned_chart_blocks(total_summary_counts, chart_blocks):
    remainder_counts = defaultdict(float)
    
    # Create chart blocks by party/state, to be assigned to specific candidates/offices later
    for state, state_data in total_summary_counts.items():
        for party, party_data in state_data.items():
            if type(state) == float or state == '' or state is None:
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

    # Create blocks with remainders from states without enough party donations for a full block
    # For example, if AK, HI, WY all gave $333,333 to GOP candidates, none of that would be enough to form
    # a full block on their own, but we do want to represent that $1 million on the visualization when we group by party,
    # so we'll create a separate block that won't be assigned a location on the map, but will be involved in the
    # other parts of the visualization
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

    return chart_blocks


def assign_candidates_to_chart_blocks(chart_blocks, large_candidate_totals, small_candidate_totals):

    remainder_counts = defaultdict(lambda: defaultdict(float))

    for index, candidate in large_candidate_totals.iterrows():
        num_blocks = int(math.floor(candidate['total_receipts'] / block_size))

        remainder_counts[candidate['party']][candidate['race_type']] += candidate['total_receipts'] % block_size

        # These "candidate" blocks are all of the blocks that could potentially be assigned to the candidate
        # (the party matches and they do not have another candidate assigned to them)
        candidate_blocks = chart_blocks.loc[(chart_blocks['fec_id'] == '') & (chart_blocks['party'] == candidate['party'])]
        # This will ensure that we're attaching candidate information to blocks with state data first
        # Ultimately, due to rounding errors, we'll end up with extra, unassigned blocks that we'll need to cut...
        # from the dataset. We'll want these to be state = 'uncategorized' blocks so that we're not misrepresenting the map data
        candidate_blocks['state_uncategorized'] = candidate_blocks['state'] == 'uncategorized'
        candidate_blocks = candidate_blocks.sort_values(by=['state_uncategorized'], ascending=True)

        # For each block that needs to be assigned, find the index of an unassigned "candidate" block and assign it to the given candidate
        for block_num in range(num_blocks):
            for col in ['first_name', 'last_name', 'fec_id', 'race_type']:
                chart_blocks.at[candidate_blocks.index.values[block_num], col] = candidate[col]

    
    for i, candidate in small_candidate_totals.iterrows():
        remainder_counts[candidate['party']][candidate['race_type']] += candidate['total_receipts']

    # Repeat this process with totals from all remaining candidates without enough raised to form their own blocks
    # However, here, make sure they're assigned to blocks of the correct office type. The "candidate" on these blocks will be "[remaining candidates]"
    for party in remainder_counts.keys():
        uncategorized_blocks = chart_blocks.loc[(chart_blocks['fec_id'] == '')
                                                & (chart_blocks['party'] == party)]
        uncategorized_blocks['state_uncategorized'] = uncategorized_blocks['state'] == 'uncategorized'
        uncategorized_blocks = uncategorized_blocks.sort_values(by=['state_uncategorized'], ascending=True)

        total_party_remainder = remainder_counts[party]['house'] + remainder_counts[party]['president'] + \
                                remainder_counts[party]['senate']
        for office_type in ['president', 'senate', 'house']:
            num_blocks = int(math.floor(remainder_counts[party][office_type] / block_size))

            print(party, office_type, num_blocks)
            for block_num in range(num_blocks):
                chart_blocks.at[uncategorized_blocks.index.values[block_num], 'race_type'] = office_type
                chart_blocks.at[uncategorized_blocks.index.values[block_num], 'fec_id'] = '[remaining candidates]'

    return chart_blocks


def process_and_assign_contribution_types(candidate, chart_blocks, blocks, total_individual_contributions, large_donor_contributions, grouped_totals):

    self_contributions = candidate['contributions_from_candidate'] + candidate['loans_from_candidate']
    transfers = candidate['transfers_from_committees']

    large_donor_contributions -= self_contributions
    large_donor_contributions = max(large_donor_contributions, 0)

    small_donor_contributions = total_individual_contributions - large_donor_contributions

    other = max(0, candidate['total_receipts'] - total_individual_contributions - transfers - self_contributions)

    calculated_total = (small_donor_contributions + large_donor_contributions + transfers + self_contributions + other)
    pct_array = [small_donor_contributions/calculated_total, large_donor_contributions/calculated_total, transfers/calculated_total, self_contributions/calculated_total, other/calculated_total]
    pct_array = np.array([100*x for x in pct_array])

    chunk_keys = ['small_donor_contributions', 'large_donor_contributions', 'transfers', 'self_contributions', 'other']
    indices_dict = splitPerc(np.arange(blocks.shape[0]), pct_array, chunk_keys)

    for money_source, indices in indices_dict.items():
        for i in indices:
            true_index = blocks.index.values[i]
            chart_blocks.at[true_index, 'contribution_source'] = money_source

    return chart_blocks


def categorize_contribution_sources(big_money_totals, meta_data_totals, chart_blocks, grouped_totals):
    remainder_candidate_df = pd.DataFrame()
    for i, candidate in meta_data_totals.iterrows():
        fec_id = candidate['fec_id']
        blocks = chart_blocks.loc[chart_blocks['fec_id'] == fec_id]

        if blocks.shape[0] == 0:
            remainder_candidate_df = remainder_candidate_df.append(candidate)
            continue

        try:
            large_donor_contributions = float(big_money_totals.loc[big_money_totals['fec_id'] == candidate['fec_id']]['total_donated'])
        except TypeError:
            large_donor_contributions = 0

        self_contributions = candidate['contributions_from_candidate'] + candidate['loans_from_candidate']

        if fec_id in grouped_totals.index:
            calculated_receipts = (grouped_totals.loc[fec_id][0] - self_contributions)
        else:
            calculated_receipts = 0
        total_individual_contributions = max(candidate['total_individual_contributions'], calculated_receipts)

        chart_blocks = process_and_assign_contribution_types(candidate, chart_blocks, blocks, total_individual_contributions, large_donor_contributions, grouped_totals)

        
    remainder_candidate_big_money = big_money_totals.loc[big_money_totals['fec_id'].isin(remainder_candidate_df['fec_id'])]
    remainder_candidate_big_money = remainder_candidate_big_money.groupby(by=['party', 'race_type'], as_index=False).sum()

    remainder_candidate_df = remainder_candidate_df.groupby(by=['party', 'office_type'], as_index=False).sum()
    remainder_candidate_df['race_type'] = remainder_candidate_df['office_type'].apply(lambda x: race_type_dict[x])

    for i, candidate_grouping in remainder_candidate_df.iterrows():
        blocks = chart_blocks.loc[(chart_blocks['fec_id'] == '[remaining candidates]') &
                                  (chart_blocks['race_type'] == candidate_grouping['race_type']) &
                                  (chart_blocks['party'] == candidate_grouping['party'])]

        if blocks.shape[0] == 0:
            continue

        try:
            large_donor_contributions = float(
                remainder_candidate_big_money.loc[(remainder_candidate_big_money['party'] == candidate_grouping['party']) &
                                                  (remainder_candidate_big_money['race_type'] == candidate_grouping['race_type'])]['total_donated'])
        except TypeError:
            large_donor_contributions = 0

        total_individual_contributions = candidate_grouping['total_individual_contributions']
        chart_blocks = process_and_assign_contribution_types(candidate_grouping, chart_blocks, blocks, total_individual_contributions, large_donor_contributions, grouped_totals)

    return chart_blocks


def reassign_self_contributions(meta_data_totals, chart_blocks, total_summary_counts):
    self_funding_totals = defaultdict(lambda: defaultdict(float))
    for i, candidate in meta_data_totals.iterrows():
        if not np.isnan(candidate['contributions_from_candidate']):
            self_contributions = candidate['contributions_from_candidate']
        else:
            self_contributions = 0

        if not np.isnan(candidate['loans_from_candidate']):
            self_loans = candidate['loans_from_candidate']
        else:
            self_loans = 0

        home_state = candidate['candidate_state.1']
        party = candidate['party']
        race_type = race_type_dict[candidate['office_type']]

        self_funding_totals[home_state][party] += self_contributions
        self_funding_totals['uncategorized'][party] += self_loans

        total_summary_counts[home_state][party][race_type] -= self_contributions
        total_summary_counts['uncategorized'][party][race_type] -= self_loans

        total_summary_counts['self_contribution'][party][race_type] += (self_contributions + self_loans)

    for state in self_funding_totals.keys():
        for party in self_funding_totals[state].keys():
            blocks_to_change = int(self_funding_totals[state][party] // block_size)

            if blocks_to_change < 1:
                continue

            block_set_indices = chart_blocks.loc[(pd.notnull(chart_blocks['race_type'])) & (chart_blocks['state'] == state) & (chart_blocks['party'] == party)].index[:blocks_to_change]

            for block_index in list(block_set_indices):
                chart_blocks.at[block_index, 'state'] = 'self_contribution'

    return chart_blocks, total_summary_counts


def main():

    # ==== Load data files ===== #

    # Candidate totals by state
    state_mappings_df = pd.read_csv('db_outputs/candidate_states.csv')

    # Total large individual donor money by candidate (to differentiate between large/small indiv. donations)
    big_money_totals = pd.read_csv('db_outputs/total_big_money_by_candidate_by_fec_id.csv')

    # Meta data on candidate funding sources from FEC (filtered to only include those running in 2020)
    meta_data_totals = pd.read_csv('processed_data/all_candidates.csv')

    # Filter out 2022/2024 senate campaigns included in this FEC cycle
    state_mappings_df = state_mappings_df.loc[state_mappings_df['year'] == 2020]
    big_money_totals = big_money_totals.loc[big_money_totals['year'] == 2020]
    meta_data_totals = meta_data_totals.loc[meta_data_totals['year'] == 2020]


    # Add "synthetic" rows to the state-candidate mappings table to account for money that was not calculated from individual contributions.
    # This could be small-dollar donations not received through ActBlue/WinRed, it could be committee contributions, loans from the candidate,
    # or a number of other sources that wouldn't be filed as individual donations with the FEC
    state_mappings_df, grouped_totals = add_missing_money_to_state_mappings(state_mappings_df, meta_data_totals)


    # Add other meta counts to meta data file to be used by visualization for totals
    output_meta_data = create_output_meta_file(big_money_totals, meta_data_totals, grouped_totals)


    # Remove unnecessary columns from state_mappings dataframe and return totals to be used for "remainder" blocks later
    state_mappings_df, total_summary_counts = clean_and_summarize_state_mappings(state_mappings_df)


    # Create blocks by party/state, without assigning specific candidates/office types for now
    # This "double mapping", where we only assign a party/state for now and then assign blocks to candidates,
    # that might not correspond with their fundraising in that particular state, avoids some really tricky issues
    # inherent to rounding numbers to $1 million to create blocks (e.g. if Candidate X raises $200,000 in 50 separate states,
    # they should have ten blocks on the visualization, but they would have none because each would be rounded down to zero).
    # Instead, we map party/state totals, and then assign blocks to candidates within their own party. Technically, each block
    # is not a fully accurate representation on its own, but it will truthfully represent totals for each separate part of the visualization.
    # (e.g. A DEM block may be assigned to Puerto Rico and assigned to Candidate X, even though they didn't raise any money in Puerto Rico.
    # The block itself is not, stricly speaking, "accurate", but in the map visual, it accurately represents PR's DEM fundraising, and in
    # the visuals after that, it accurately represents Candidate X's total fundraising).
    chart_blocks = []
    chart_blocks = create_unassigned_chart_blocks(total_summary_counts, chart_blocks)


    candidate_totals = state_mappings_df.groupby(by=['fec_id', 'race_type', 'party', 'first_name', 'last_name'],
                                                 as_index=False).sum()
    # Grouped dataframe containing only candidates who raised enough money to be represented by at least one block
    large_candidate_totals = candidate_totals.loc[candidate_totals['total_receipts'] >= block_size]
    small_candidate_totals = candidate_totals.loc[candidate_totals['total_receipts'] < block_size]

    # Create a dataframe with the state/party mapped chart blocks
    chart_blocks = pd.DataFrame(chart_blocks)
    # Add (empty) columns to the chart blocks to hold candidate data
    chart_blocks['first_name'] = ''
    chart_blocks['last_name'] = ''
    chart_blocks['fec_id'] = ''
    chart_blocks['race_type'] = ''
    chart_blocks['contribution_source'] = ''

    # Assign candidates to available blocks corresponding with their party (but not necessarily corresponding with their state fundraising totals)
    chart_blocks = assign_candidates_to_chart_blocks(chart_blocks, large_candidate_totals, small_candidate_totals)


    # Categorize contribution source type
    chart_blocks = categorize_contribution_sources(big_money_totals, meta_data_totals, chart_blocks, grouped_totals)


    # Adjust state assignments for self-funding totals
    chart_blocks, total_summary_counts = reassign_self_contributions(meta_data_totals, chart_blocks, total_summary_counts)

    # Assign a unique block id to each block
    output_data = []
    for i, row in chart_blocks.iterrows():
        block = row.to_dict()
        block['block_id'] = str(i)
        output_data.append(block)

    # Because of rounding, there will be a few extra blocks assigned to a party/state combination that aren't assigned to a candidate or set of candidates.
    # Filter these out
    output_data = [x for x in output_data if x['race_type'] != '']
    with open('../static/data/beeswarm_money_blocks.json', 'w') as f:
        json.dump(output_data, f)

    with open('../static/data/state_summary_counts.json', 'w') as f:
        json.dump(total_summary_counts, f)

    output_meta_data.to_csv('../static/data/candidates_meta.csv')

main()