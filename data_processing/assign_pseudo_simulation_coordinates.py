import json


with open('../static/data/beeswarm_money_blocks.json', 'r') as f:
	beeswarm_money_blocks = json.load(f)


for coordinate_file in ['map_coordinate_data.json', 'party_coordinate_data.json', 'office_coordinate_data.json', 'candidate_coordinate_data.json']:
	with open('simulation_coordinates/{}'.format(coordinate_file), 'r') as f:
		coordinates = json.load(f)

		view_name = coordinate_file.split('_')[0]
		print(view_name)
		
		for i, block in enumerate(beeswarm_money_blocks):
			for coordinate_set in coordinates:
				if block['block_id'] == coordinate_set['block_id']:
					block['{}_x'.format(view_name)] = coordinate_set['x']
					block['{}_y'.format(view_name)] = coordinate_set['y']

					beeswarm_money_blocks[i] = block


with open('../static/data/beeswarm_money_blocks.json', 'w') as f:
	json.dump(beeswarm_money_blocks, f)
