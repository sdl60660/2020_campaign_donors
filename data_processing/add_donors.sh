cd scripts

python process_candidate_files.py 					# creates csv file from bulk candidate and candidate meta files
python process_fec_contributions.py 				# creates structured csv file from bulk contributions .txt download from FEC site (~10 minutes)
python process_act_blue_data.py						# creates consolidated doc from individual state files (~20 minutes)
python combine_canididate_act_blue_filings.py		# combines act_blue donor/contribution data with candidate filings (~15 minutes)

python insert_candidates_into_db.py 				# inserts all candidate info into database
python insert_donors_into_db.py 					# inserts all donor info into database (~20 minutes)
python insert_contributions_into_db.py 				# inserts all contribution info into database (~2 hours)

python run_sql_queries.py 							# runs all sql_queries to generate new db_outputs (~4 hours)
python3.7 create_candidate_files.py 				# creates consolidated candidate files that live in candidate_data directory (~10 minutes)
python create_candidate_list.py 					# creates new JSON file with list of candidates for use on the front-end (< 1 minute)