import csv
from utilities.database import Database
from utilities.db_config import config


def insert_chunk(chunk):
    with db.conn.cursor() as cur:
        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", x).decode("utf-8") for x in chunk)
        # print(args_str)
        query = ("INSERT INTO contributions {ordering} VALUES ".format(ordering=value_ordering) + args_str + " ON CONFLICT DO NOTHING;")
        db.run_query(query, cur)
        return

def clean_chunk(chunk):

    out_chunk = []

    for i, row in enumerate(chunk):
        for j, x in enumerate(row):
            if x == '':
                chunk[i][j] = None
        if len(row[2].split('~')[-1]) > 5:
            chunk[i][2] = row[2].split('~')[0] + '~' + row[2].split('~')[1] + '~' + row[2].split('~')[-1][:5]
        if row[-2] and row[0]:
            out_chunk.append(row)

    return out_chunk

value_ordering = '(committee_id,candidate,donor,fec_record_id,primary_general_indicator,contribution_date,contribution_amount)'

CHUNK_LENGTH = 10000
db = Database(config)

with open('../processed_data/consolidated_contributions.csv', 'r+') as f:
    reader_file = csv.reader(f)
    row_count = len(list(reader_file)) - 1 # to account for header row
    # row_count = 14032102 - 1
    print(row_count)

with open('../processed_data/consolidated_contributions.csv', 'r') as f:
    in_csv = csv.reader(f)
    header = next(in_csv)
    print(header)

    num_chunks = row_count//CHUNK_LENGTH
    remainder = row_count%CHUNK_LENGTH
    offset = 0
    start_chunk = offset//CHUNK_LENGTH

    db.open_connection()

    for _ in range(num_chunks):
        print(_*CHUNK_LENGTH)
        chunk = [next(in_csv) for i in range(CHUNK_LENGTH)]

        if _ < start_chunk:
            continue

        chunk = clean_chunk(chunk)
        insert_chunk(chunk)
        # db.conn.close()

    chunk = [next(in_csv) for i in range(remainder)]
    chunk = clean_chunk(chunk)
    insert_chunk(chunk)
    db.conn.close()



