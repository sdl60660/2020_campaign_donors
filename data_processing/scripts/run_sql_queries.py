import psycopg2
import pandas.io.sql as psql
import os

import requests


with psycopg2.connect(host="localhost", database="candidate_fundraising", port="5433", user="samlearner", password="postgres") as conn:
	with conn.cursor() as cur:
		sql_scripts = []

		for subdirectory in os.listdir('../sql_queries/'):
			if subdirectory == '.DS_Store' or '.sql' in subdirectory:
				continue
			for file in os.listdir('../sql_queries/' + subdirectory):
				if '.DS_Store' not in file:
					sql_scripts.append(('../sql_queries/' + subdirectory + '/' + file))

		# print('Removing Steyer miscategorized self-donations')
		# cur.execute(open('../sql_queries/remove_steyer_self_donations.sql', 'r').read())

		print(sql_scripts)

		for query in sql_scripts:
			print(query)
			cur.execute(open(query, 'r').read())