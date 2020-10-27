import csv
import os
import datetime


def try_parsing_date(text):
    for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.datetime.strptime(text, fmt)
        except ValueError:
            pass
    print(text)
    raise ValueError('no valid date format found')


def process_row(raw_row, ccl_dict):

	if len(raw_row['zip']) == 5:
		donor_zip = raw_row['zip']
		donor_zip_extension = ''
	elif len(raw_row['zip']) > 5:
		donor_zip = raw_row['zip'][:5]
		donor_zip_extension = raw_row['zip'][5:]
	else:
		donor_zip = ''
		donor_zip_extension = ''
		print(raw_row['state'], raw_row['city'])

	try:
		committee_id = raw_row['memo_text'].split('(')[1][:-1]

		try:
			candidate_id = ccl_dict[committee_id]
		except KeyError:
			candidate_id = None

		donor = '{}~{}~{}'.format(raw_row['first_name'], raw_row['last_name'], donor_zip)

		# split_character = '/' if '/' in raw_row['date'] else '-'
		# print(raw_row['date'])
		formatted_date = datetime.datetime.strftime(try_parsing_date(raw_row['date']), '%Y-%m-%d')
		# print(formatted_date)
		# 2020-04-26

		contribution_data = {
			'donor': donor,
			'amount': raw_row['amount'],
			'date': formatted_date,
			'committee_id': committee_id,
			'candidate': candidate_id
			# 'key': donor + '~' + committee_id + '~' + raw_row['contribution_date']
		}

	except:
	# 	# print('Error:', raw_row['memo_text_description'])
		contribution_data = None

	if len(raw_row['zip']) == 5:
		donor_zip = raw_row['zip']
		donor_zip_extension = ''
	elif len(raw_row['zip']) > 5:
		donor_zip = raw_row['zip'][:5]
		donor_zip_extension = raw_row['zip'][5:]
	else:
		donor_zip = ''
		donor_zip_extension = ''
		print(raw_row['state'], raw_row['city'])


	if 'employer' in raw_row.keys():
		employer = raw_row['employer']
	else:
		employer = ''

	if 'occupation' in raw_row.keys():
		occupation = raw_row['occupation']
	else:
		occupation = ''


	donor_data = {
		'first_name': raw_row['first_name'],
		'last_name': raw_row['last_name'], 
		'zipcode': donor_zip,
		'state': raw_row['state'],
		'city': raw_row['city'],
		'employer': employer,
		'occupation': occupation,
		'zip_extension': donor_zip_extension, 
		'donor_key': '{}~{}~{}'.format(raw_row['first_name'], raw_row['last_name'], donor_zip)
		}

	return contribution_data, donor_data


def process_state_file(state_file, contribution_csv, donor_csv):
	state_file = '../raw_data/act_blue_fillings/' + state_file

	with open(state_file, 'r') as f:
		in_csv = csv.DictReader(f)
		keep_going = True

		while keep_going:
			try:
				row = next(in_csv)

				if 'Earmark' not in row['memo_text']:
					continue
				else:
					processed_contribution, processed_donor = process_row(row, candidate_committee_dict)
					if processed_contribution:
						contribution_csv.writerow(processed_contribution)

					if processed_donor:
						donor_csv.writerow(processed_donor)

			except Exception as e:
				print(e)
				# print(row)
				keep_going = False


candidate_committee_dict = {}
with open('../raw_data/fec_bulk_data/ccl.txt') as ccl:
	for line in ccl:
		data = line.split('|')
		if data[-2] != 'J' and data[-3] != 'Y' and data[-3] != 'X':
			candidate_committee_dict[data[3]] = data[0]
			

filings = [file for file in os.listdir('../raw_data/act_blue_fillings') if '.csv' in file]


with open('../processed_data/act_blue_donors.csv', 'w') as donor_file:
	donor_csv = csv.DictWriter(donor_file, fieldnames=['first_name', 'last_name', 'zipcode', 'state', 'city', 'employer', 'occupation', 'zip_extension', 'donor_key'])
	donor_csv.writeheader()

	with open('../processed_data/act_blue_contributions.csv', 'w') as f:
		contribution_csv = csv.DictWriter(f, fieldnames=['donor', 'amount', 'date', 'committee_id', 'candidate'])
		contribution_csv.writeheader()

		for state_file in filings:
			print(state_file)
			process_state_file(state_file, contribution_csv, donor_csv)
			

with open('../processed_data/act_blue_donors.csv', 'r') as donor_file:
	donors = {}
	donor_csv = csv.DictReader(donor_file)
	keep_going = True

	while keep_going:
		try:
			row = next(donor_csv)

			if row['donor_key'] in donors.keys():
				continue
			else:
				donors[row['donor_key']] = row

		except Exception as e:
			print(e)
			keep_going = False

with open('../processed_data/act_blue_donors.csv', 'w') as donor_file:
	out_csv = csv.DictWriter(donor_file, fieldnames=list(list(donors.values())[0].keys()))
	out_csv.writeheader()
	for row in (donors.values()):
		out_csv.writerow(row)








