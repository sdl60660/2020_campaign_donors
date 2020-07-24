import psycopg2
import pandas.io.sql as psql
import os

import requests

def is_num(x):
	try:
		return int(x)
	except ValueError:
		return False

with psycopg2.connect(host="localhost", database="candidate_fundraising", port="5433", user="samlearner", password="postgres") as conn:
	with conn.cursor() as cur:
		sql_scripts = []

		for subdirectory in os.listdir('../sql_queries/'):
			if subdirectory == '.DS_Store':
				continue
			for file in os.listdir('../sql_queries/' + subdirectory):
				sql_scripts.append(('../sql_queries/' + subdirectory + '/' + file))

		print(sql_scripts)

		for query in sql_scripts:
			print(query)
			cur.execute(open(query, 'r').read())