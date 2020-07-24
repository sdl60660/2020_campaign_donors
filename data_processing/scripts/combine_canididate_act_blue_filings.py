
import csv
import datetime


with open('../processed_data/consolidated_donors.csv', 'w') as donor_output:
	donor_out_csv = csv.DictWriter(donor_output, fieldnames=['first_name','last_name','zipcode','state','city','employer','occupation','donor_key','zip_extension'])
	donor_out_csv.writeheader()

	print("fec donors")
	with open('../processed_data/fec_donors.csv', 'r') as fec_donor_file:
		fec_csv = csv.DictReader(fec_donor_file)
		try:
			while True:
				donor_out_csv.writerow(next(fec_csv))
		except StopIteration:
			pass
		finally:
			print('finished')

	print("act blue donors")
	with open('../processed_data/act_blue_donors.csv', 'r') as act_blue_donor_file:
		act_blue_csv = csv.DictReader(act_blue_donor_file)
		try:
			while True:
				donor_out_csv.writerow(next(act_blue_csv))
		except StopIteration:
			pass
		finally:
			print('finished')


with open('../processed_data/consolidated_contributions.csv', 'w') as contribution_output:
	contribution_out_csv = csv.DictWriter(contribution_output, fieldnames=['committee_id','candidate','donor','fec_record_id','primary_general_indicator','date','amount'])
	contribution_out_csv.writeheader()

	print("fec contributions")
	with open('../processed_data/fec_contributions.csv', 'r') as fec_contribution_file:
		fec_csv = csv.DictReader(fec_contribution_file)
		try:
			while True:
				row = next(fec_csv)
				if 'primary_indicator' in row.keys():
					row['primary_general_indicator'] = row['primary_indicator']
					del row['primary_indicator']
				contribution_out_csv.writerow(row)
		except StopIteration:
			pass
		finally:
			print('finished')

	print("act blue contributions")
	with open('../processed_data/act_blue_contributions.csv', 'r') as act_blue_contribution_file:
		act_blue_csv = csv.DictReader(act_blue_contribution_file)

		try:
			while True:
				row = next(act_blue_csv)
				contribution_out_csv.writerow(row)
		except StopIteration:
			pass
		finally:
			print('finished')

