import psycopg2
import sys
import logging

class Database:
    """PostgreSQL Database class."""

    def __init__(self, config):
        self.host = config['db_host']
        self.username = config['db_user']
        self.password = config['db_password']
        self.port = config['db_port']
        self.dbname = config['db_name']
        self.conn = None

    def open_connection(self):
        """Connect to a Postgres database."""
        try:
            if(self.conn is None):
                self.conn = psycopg2.connect(host=self.host,
                                             user=self.username,
                                             password=self.password,
                                             port=self.port,
                                             dbname=self.dbname)
        except psycopg2.DatabaseError as e:
            logging.error(e)
            sys.exit()
        finally:
            logging.info('Connection opened successfully.')

    def run_query(self, query, cur):
        # self.open_connection()
        # curr = self.conn.cursur()
        """Run a SQL query."""
        try:
            result = cur.execute(query)
            self.conn.commit()
            affected = f"{cur.rowcount} rows affected."
            cur.close()
            return affected
        except psycopg2.DatabaseError as e:
            print(e)
        # finally:
        #     if self.conn:
        #         self.conn.close()
        #         logging.info('Database connection closed.')