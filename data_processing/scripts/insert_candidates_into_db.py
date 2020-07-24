import csv
from utilities.database import Database
from utilities.db_config import config


def insert_chunk(chunk):
    with db.conn.cursor() as cur:
        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", x).decode("utf-8") for x in chunk)
        # print(args_str)
        # query = ("INSERT INTO candidates {ordering} VALUES ".format(ordering=value_ordering) + args_str + " ON CONFLICT (fec_id) DO UPDATE SET member_id = EXCLUDED.member_id;")
        query = ("INSERT INTO candidates {ordering} VALUES ".format(ordering=value_ordering) + args_str + " ON CONFLICT DO NOTHING;")
        db.run_query(query, cur)
        return



value_ordering = '(fec_id, first_name, last_name, district_id, race_type, incumbent, year, fec_receipts_link, party, candidate_city, candidate_state, candidate_zipcode)'
header_keys = value_ordering.strip('(').strip(')').split(', ')

CHUNK_LENGTH = 1000
db = Database(config)

with open('../processed_data/all_candidates.csv', 'r') as f:
    row_count = sum(1 for row in f) - 1 # to account for header row
    print(row_count)

with open('../processed_data/all_candidates.csv', 'r') as f:
    in_csv = csv.DictReader(f)
    header = next(in_csv)
    print(header)

    num_chunks = row_count//CHUNK_LENGTH
    remainder = row_count%CHUNK_LENGTH

    print(num_chunks, remainder)

    db.open_connection()

    for _ in range(num_chunks):
        print(_*CHUNK_LENGTH)
        chunk = []
        for i in range(CHUNK_LENGTH):
            row = next(in_csv)
            if (row['district_id'] == ''):
                continue
            out_row = [row[key] for key in header_keys]
            chunk.append(out_row)

        # chunk = [next(in_csv) for i in range(CHUNK_LENGTH)]
        insert_chunk(chunk)

    chunk = []
    for i in range(remainder):
        print(i)
        row = next(in_csv)
        if (row['district_id'] == ''):
            continue
        out_row = [row[key] for key in header_keys]
        chunk.append(out_row)    
    # chunk = [next(in_csv) for i in range(remainder)]
    insert_chunk(chunk)
    db.conn.close()







