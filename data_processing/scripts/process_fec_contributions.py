import json
import csv
import datetime

def process_donor(split_line):
	
	try:
		first_name = (split_line[7].split(',')[1]).split()[0]
		last_name = split_line[7].split(',')[0]
	except IndexError:
		# print(split_line[7])
		last_name = split_line[7]
		first_name = ''
	
	city = split_line[-13]
	state = split_line[-12]

	if len(str(split_line[-11])) > 5:
		zipcode = str(split_line[-11])[:5]
		zip_extension = str(split_line[-11])[5:]
	elif len(str(split_line[-11])) == 5:
		zipcode = split_line[-11]
		zip_extension = ''
	else:
		zipcode = ''
		zip_extension = ''

	employer = split_line[-10]
	title = split_line[-9]

	key = first_name+'~'+last_name+'~'+zipcode

	return {
		'first_name': first_name,
		'last_name': last_name,
		'city': city,
		'state': state,
		'zipcode': zipcode,
		'zip_extension': zip_extension,
		'employer': employer,
		'occupation': title,
		'donor_key': key
	}

def process_donation(split_line, donor_id, committee_dict, candidates):
	if int(split_line[14]) < 0 or split_line[-3] == 'X':
		return None

	try:
		if committee_dict[split_line[0]] not in candidates:
			print(committee_dict[split_line[0]])
			return None
			
		return {
		'committee_id': split_line[0],
		'fec_record_id': split_line[-1],
		'donor': donor_id,
		'primary_general_indicator': split_line[3],
		'date': (datetime.datetime.strftime(datetime.datetime.strptime(split_line[13], '%m%d%Y'), '%Y-%m-%d') if len(split_line[13])>0 else None),
		'amount': split_line[14],
		'candidate': committee_dict[split_line[0]]
		}
	except KeyError:
		return {
		'committee_id': split_line[0],
		'fec_record_id': split_line[-1],
		'donor': donor_id,
		'primary_general_indicator': split_line[3],
		'date': (datetime.datetime.strftime(datetime.datetime.strptime(split_line[13], '%m%d%Y'), '%Y-%m-%d') if len(split_line[13])>0 else None),
		'amount': split_line[14],
		'candidate': None
		}


all_donors = {}

committee_dict = {}
ccl = open('../raw_data/fec_bulk_data/ccl.txt', 'r')
for line in ccl:
	data = line.split('|')
	# print(data)
	# This filters out joint-fundraising committees, as well as party committees, that are linked to individual candidates,
	# but whose donation receipts do not directly fund their campaigns
	if data[-2] != 'J' and data[-3] != 'Y' and data[-3] != 'X':
		committee_dict[data[3]] = data[0]

with open('../table_exports/candidates.csv', 'r') as f:
	candidates = [x['fec_id'] for x in csv.DictReader(f)]


f = open('../raw_data/fec_bulk_data/itcont.txt', 'r')
donations = []
for line in f:
	processed_donor = process_donor(line.split('|'))
	all_donors[processed_donor['donor_key']] = processed_donor

	donation = process_donation(line.split('|'), processed_donor['donor_key'], committee_dict, candidates)
	if donation:
		donations.append(donation)

with open('../processed_data/fec_donors.json', 'w') as f:
	json.dump(all_donors, f)

with open('../processed_data/fec_donors.csv', 'w') as f:
	out_csv = csv.DictWriter(f, fieldnames=list(list(all_donors.values())[0].keys()))
	out_csv.writeheader()
	for row in list(all_donors.values()):
		out_csv.writerow(row)


print(len(donations))

with open('../processed_data/fec_contributions.csv', 'w') as f:
	out_csv = csv.DictWriter(f, fieldnames=list(donations[0].keys()))
	out_csv.writeheader()
	for row in donations:
		out_csv.writerow(row)

