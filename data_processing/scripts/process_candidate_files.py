
import csv
from fuzzywuzzy import fuzz


def get_fec_link(fec_id):
	return 'https://www.fec.gov/data/candidate/' + fec_id


def format_candidate_names(raw_candidate_name):
	raw_candidate_name = raw_candidate_name.replace('.', '')
	
	remove_titles = ['DDS', 'PHD', 'II', 'III', 'JR', 'SR', 'MR', 'DR', 'REV', 'MRS', 'MS' 'HON', 'SENATOR']
	name_parts = [x for x in raw_candidate_name.split(' ') if x not in remove_titles and len(x) > 1]
	raw_candidate_name = ' '.join(name_parts)

	if ', ' in raw_candidate_name:
		first_name = raw_candidate_name.split(', ')[1]
		last_name = raw_candidate_name.split(', ')[0]
	elif len(raw_candidate_name.split()) > 1:
		first_name = raw_candidate_name.split(' ')[0]
		last_name = raw_candidate_name.split(' ')[1]
	else:
		first_name = None
		last_name = raw_candidate_name

	return first_name, last_name


def format_incumbent_status(abbreviation):
	if abbreviation == 'I':
		return 'INCUMBENT'
	elif abbreviation == 'O':
		return 'OPEN'
	else:
		return 'CHALLENGER'


candidates = {}
output_columns = ['first_name', 'last_name', 'district_id', 'member_id', 'race_type', 'full_candidate_district', 'fec_receipts_link']

with open('../raw_data/fec_bulk_data/candidates.txt', 'r') as f:
	columns = ['fec_id', 'candidate_name', 'party', 'candidate_election_year', 'candidate_state', 'office_type', \
	'candidate_district', 'incumbent_status', 'candidate_status', 'principal_campaign_committee', 'mailing_street1', 'mailing_street2', \
	'mailing_city', 'mailing_state', 'mailing_zip']
	output_columns += [x for x in columns if x not in output_columns]
	candidate_data = [x for x in f.readlines()]

	for row in candidate_data:
		row = row.split('|')
		candidate_data = {}
		for index, field_data in enumerate(row):
			candidate_data[columns[index]] = field_data
		candidates[row[0]] = candidate_data


with open('../raw_data/fec_bulk_data/candidates-meta.txt', 'r') as f:
	columns = ['fec_id', 'candidate_name', 'incumbent_status', 'party_code', 'party', 'total_receipts', 'transfers_from_committees', \
	'total_disbursements', 'transfers_to_committees', 'beginning_cash', 'ending_cash', 'contributions_from_candidate', \
	'loans_from_candidate', 'other_loans', 'candidate_loan_repayments', 'other_loan_repayments', 'debts_owed', \
	'total_individual_contributions', 'candidate_state', 'candidate_district', 'special_election_status', 'primary_election_status', \
	'runoff_election_status', 'general_election_status', 'general_election_percentage', 'contributions_from_other_pacs', \
	'contributions_from_party_committees', 'coverage_end_date', 'refunds_to_individuals', 'refunds_to_committees']
	output_columns += [x for x in columns if x not in output_columns]

	candidate_meta_data = [x for x in f.readlines()]
	for row in candidate_meta_data:
		row = row.split('|')
		candidate_data = {}
		for index, field_data in enumerate(row):
			candidate_data[columns[index]] = field_data

		fec_id = row[0]
		existing_data = candidates.get(fec_id, {})
		candidates[fec_id] = {**candidate_data, **existing_data}


with open('../table_exports/districts.csv', 'r') as f:
	districts = {x['district_name']: x['id'] for x in csv.DictReader(f)}

with open('../table_exports/members.csv', 'r') as f:
	members = [x for x in csv.DictReader(f)]


for k,v in candidates.items():
	v['fec_receipts_link'] = get_fec_link(v['fec_id'])

	v['first_name'], v['last_name'] = format_candidate_names(v['candidate_name'])

	v['incumbent'] = format_incumbent_status(v['incumbent_status'])


	if 'office_type' not in v.keys():
		continue

	if v['office_type'] == 'P':
		v['race_type'] = 'president'
		v['full_candidate_district'] = 'USA'
	elif v['office_type'] == 'H':
		v['race_type'] = 'house'
		if v['candidate_district'] == '00':
			v['full_candidate_district'] = v['candidate_state'] + '-AL'
		else:
			v['full_candidate_district'] = v['candidate_state'] + '-' + v['candidate_district']
	elif v['office_type'] == 'S':
		v['race_type'] = 'senate'
		v['full_candidate_district'] = v['candidate_state'] + '-' + 'SEN'
	else:
		print(v['office_type'])
		v['race_type'] = None

	try:
		v['district_id'] = districts[v['full_candidate_district']]

		if v['incumbent_status'] == 'INCUMBENT':
			for member in members:
				if member['district'] == v['district_id'] and fuzz.partial_ratio(member['last_name'].lower(), v['last_name'].lower()) > 90:
					v['member_id'] = member['bioguide_id']

	except KeyError:
		v['district_id'] = None

	# For matching DB table column names
	v['year'] = v['candidate_election_year']
	v['candidate_city'] = v['mailing_city']
	v['candidate_state'] = v['mailing_state']
	v['candidate_zipcode'] = v['mailing_zip']



with open('../processed_data/all_candidates.csv', 'w') as f:
	out_csv = csv.DictWriter(f, fieldnames=output_columns)
	out_csv.writeheader()

	for row in candidates.values():
		out_csv.writerow(row)

