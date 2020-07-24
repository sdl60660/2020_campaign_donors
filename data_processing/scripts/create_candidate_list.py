import os
import json

candidate_list = sorted([x[:-5].replace('_', ' ') for x in os.listdir('candidate_data') if '.DS' not in x])

with open('js/candidate_list.json', 'w') as f:
	json.dump({'candidates': candidate_list}, f)