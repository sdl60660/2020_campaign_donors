import csv
from utilities.database import Database
from utilities.db_config import config


def insert_chunk(chunk):
    with db.conn.cursor() as cur:
        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s)", x).decode("utf-8") for x in chunk)
        # print(args_str)
        query = ("INSERT INTO donors {ordering} VALUES ".format(ordering=value_ordering) + args_str + " ON CONFLICT DO NOTHING;")
        db.run_query(query, cur)
        return

value_ordering = '(first_name, last_name, zipcode, state, city, employer, occupation, donor_key, zip_extension)'

CHUNK_LENGTH = 20000
db = Database(config)

with open('../processed_data/consolidated_donors.csv', 'r') as f:
    row_count = sum(1 for row in f) - 1 # to account for header row
    print(row_count)

with open('../processed_data/consolidated_donors.csv', 'r') as f:
    in_csv = csv.reader(f)
    header = next(in_csv)
    print(header)

    num_chunks = row_count//CHUNK_LENGTH
    remainder = row_count%CHUNK_LENGTH

    db.open_connection()

    for _ in range(num_chunks):
        print(_*CHUNK_LENGTH)
        chunk = [next(in_csv) for i in range(CHUNK_LENGTH)]
        insert_chunk(chunk)

    chunk = [next(in_csv) for i in range(remainder)]
    insert_chunk(chunk)
    db.conn.close()







