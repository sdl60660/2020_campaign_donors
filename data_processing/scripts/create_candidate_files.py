import csv
import json
import datetime
import pandas as pd
import time


def find_member_scores(fec_id, member_data):
	for row in meta_district_member:
		if row['fec_id'] == fec_id:
			try:
				return float(row['dw_nominate1']), float(row['dw_nominate2'])
			except ValueError:
				return None, None

with open('../new_candidate_summary.csv', 'r') as metadata_file:
	candidates = [x for x in csv.DictReader(metadata_file)]

with open('../db_outputs/candidate_date_donation_counts.csv') as f:
	dates = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_states.csv', 'r') as f:
	states = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_zipcodes.csv', 'r') as f:
	zipcodes = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_overlap.csv', 'r') as f:
	overlap = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_demographics_including_district.csv', 'r') as f:
	demos_with_district = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_demographics_out_of_district.csv', 'r') as f:
	demos_without_district = [x for x in csv.DictReader(f)]

with open('../db_outputs/candidate_meta_district_member_data.csv', 'r') as f:
	meta_district_member = [x for x in csv.DictReader(f)]


start = time.time()

for candidate in candidates:
	fec_id = candidate['Cand_Id']

	# if fec_id != 'P60007168':
	# 	continue
	candidate_output = {}

	##----------------##
	##-DONATION DATES-##
	##----------------##
	candidate_output['donation_dates'] = {}
	datelist = [str(x)[:10] for x in pd.date_range(pd.to_datetime('2019-01-01'), periods=181).tolist()]
	for date in datelist:
		candidate_output['donation_dates'][date] = 0
	candidate_output['donation_dates']['ordered_list_ind'] = [0 for date in datelist]
	
	for row in dates:
		if row['candidate'] == fec_id:
			candidate_output['donation_dates'][row['contribution_date']] = int(row['contribution_count'])
			
			index = (pd.to_datetime(row['contribution_date']) - pd.to_datetime('2019-01-01')).days
			candidate_output['donation_dates']['ordered_list_ind'][index] = int(row['contribution_count'])

	candidate_output['donation_dates']['ordered_list_agg'] = []
	aggregate_donations = 0
	for date in candidate_output['donation_dates']['ordered_list_ind']:
		aggregate_donations += date
		candidate_output['donation_dates']['ordered_list_agg'].append(aggregate_donations)


	##----------------##
	##----GEO DATA----##
	##----------------##

	candidate_output['geo'] = {'states': {}, 'zipcodes': {}}

	for row in states:
		if row['fec_id'] == fec_id:
			candidate_output['geo']['states'][row['state']] = {
			'total_contributors': row['total_contributors'],
			'total_contributions': row['total_contributions'],
			'total_amount_donated': row['total_amount_donated']
			}

	for row in zipcodes:
		if row['fec_id'] == fec_id:
			candidate_output['geo']['zipcodes'][row['zipcode']] = {
			'total_contributors': row['total_contributors'],
			'total_contributions': row['total_contributions'],
			'total_amount_donated': row['total_amount_donated']
			}


	##-------------------##
	##-CANDIDATE OVERLAP-##
	##-------------------##

	candidate_output['outbound_overlap'] = {}
	candidate_output['inbound_overlap'] = {}
	candidate_output['overlap_plot'] = []

	outbound_ordered_list = []
	inbound_ordered_list = []

	for row in overlap:

		if row['primary_candidate_fec_id'] == fec_id and row['compared_candidate'].split(' (')[0] != row['primary_candidate'].split(' (')[0]:
			overlap_value = 100.0*(1.0*int(row['overlap_count'])/int(row['total_primary_donors']))
			candidate_output['outbound_overlap'][row['compared_candidate']] = overlap_value
			outbound_ordered_list.append((row['compared_candidate'], overlap_value))
			
			if overlap_value > 5.0:
				dw_nominate1, dw_nominate2 = find_member_scores(row['compared_candidate_fec_id'], meta_district_member)
				candidate_output['overlap_plot'].append({
					'candidate_name': row['compared_candidate'],
					'direction': 'Outbound',
					'dw_nominate1': dw_nominate1,
					'dw_nominate2': dw_nominate2,
					'overlap_value': overlap_value
					})

		if row['compared_candidate_fec_id'] == fec_id and row['compared_candidate'].split(' (')[0] != row['primary_candidate'].split(' (')[0]:
			overlap_value = 100.0*(1.0*int(row['overlap_count'])/int(row['total_primary_donors']))
			candidate_output['inbound_overlap'][row['primary_candidate']] = overlap_value
			inbound_ordered_list.append((row['primary_candidate'], overlap_value))
			
			if overlap_value > 5.0:
				dw_nominate1, dw_nominate2 = find_member_scores(row['primary_candidate_fec_id'], meta_district_member)
				candidate_output['overlap_plot'].append({
					'candidate_name': row['primary_candidate'],
					'direction': 'Inbound',
					'dw_nominate1': dw_nominate1,
					'dw_nominate2': dw_nominate2,
					'overlap_value': overlap_value
					})



	outbound_ordered_list = sorted(outbound_ordered_list, key=lambda x: x[1], reverse=True)
	inbound_ordered_list = sorted(inbound_ordered_list, key=lambda x: x[1], reverse=True)

	candidate_output['outbound_overlap']['ordered_list'] = outbound_ordered_list
	candidate_output['inbound_overlap']['ordered_list'] = inbound_ordered_list


	##--------------------##
	##-DONOR DEMOGRAPHICS-##
	##--------------------##

	candidate_output['approximate_demographics'] = {'with_district': {}, 'without_district': {}}

	
	demographic_fields = ['bachelors_pct', 'median_household_income', 'white_pct', 'non_hispanic_white_pct', 'all_hispanic_pct', 'black_pct', 'indigenous_native_pct', 'asian_pct', 'hawaiian_pacific_islander_pct', 'other_race_pct', 'two_or_more_races_pct']

	for row in demos_with_district:
		if row['fec_id'] == fec_id:

			for field in demographic_fields:
				candidate_output['approximate_demographics']['with_district'][field] = row[field]

	for row in demos_without_district:
		if row['fec_id'] == fec_id:

			for field in demographic_fields:
				candidate_output['approximate_demographics']['without_district'][field] = row[field]


	##------------------------##
	##-META, DISTRICT, MEMBER-##
	##------------------------##

	candidate_output['meta'] = {}
	candidate_output['district'] = {}
	candidate_output['member'] = {}

	meta_fields = ['candidate_name', 'party', 'donor_count', 'donation_count', 'fec_receipts_link', 'incumbent', 'race_type']
	district_fields = ['district_name', 'partisan_lean', 'district_id', 'net_trump_vote']
	member_fields = ['bioguide_id', 'trump_score', 'ideology_score', 'dw_nominate1', 'dw_nominate2']


	for row in meta_district_member:
		if row['fec_id'] == fec_id:

			for field in meta_fields:
				candidate_output['meta'][field] = row[field]

			for field in district_fields:
				candidate_output['district'][field] = row[field]

			for field in member_fields:
				candidate_output['member'][field] = row[field]

	if candidate_output['meta']['donor_count'] == '' or int(candidate_output['meta']['donor_count']) == 0:
		print('SKIPPED:', candidate_output['meta']['candidate_name'])
		continue

	candidate_output['meta']['official_name'] = candidate['Cand_Name']
	candidate_output['meta']['total_receipts'] = candidate['Total_Receipt']
	candidate_output['meta']['total_disbursements'] = candidate['Total_Disbursement']
	candidate_output['meta']['fec_id'] = fec_id

	try:
		with open('../candidate_data/{}_({}).json'.format(candidate_output['meta']['candidate_name'].replace(' ', '_'), candidate_output['district']['district_name']), 'w') as f:
			json.dump(candidate_output, f)
	except Exception as e:
		print(e)


	print('candidate_data/{}_({}).json'.format(candidate_output['meta']['candidate_name'].replace(' ', '_'), candidate_output['district']['district_name']), round(time.time() - start, 1))

	# print(candidate_output)




	
