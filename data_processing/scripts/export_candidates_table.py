import psycopg2
import pandas.io.sql as psql
import os

import requests


query = """COPY (

	SELECT
	*
	FROM
	candidates
) TO '/users/samlearner/miscellaneous_programming/portfolio_projects/candidate_contributions/data_processing/table_exports/candidates.csv' DELIMITER ',' CSV HEADER;
"""


with psycopg2.connect(host="localhost", database="candidate_fundraising", port="5433", user="samlearner", password="postgres") as conn:
	with conn.cursor() as cur:
		cur.execute(query)