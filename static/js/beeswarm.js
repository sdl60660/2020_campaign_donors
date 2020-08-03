
BeeSwarm = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BeeSwarm.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 1500;
    vis.height = 1500;

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width, vis.height]);

    vis.projection = d3.geoAlbersUsa()
        .scale(vis.width)
        .translate([vis.width / 2, vis.height / 2]);

    vis.usMap = vis.svg.append("g")
        .selectAll("path")
        .data(stateMap.features)
        .join("path")
            .attr("fill", "white")
            .attr("d", d3.geoPath()
                .projection(vis.projection)
            )
            .style("stroke", "black");

    let stateCenters = {};
    stateMap.features.forEach(d => {
        let centroid = d3.geoPath().centroid(d);
        stateCenters[d.properties.SHORT_NAME] = vis.projection(centroid);
    });

    // This is where all uncategorized data will lie (unreported individual donations/committee contributions)
    stateCenters['uncategorized'] = [0.9*vis.width, 0.7*vis.height];
    // Offset California by a little to avoid some of the Nevada overlap
    stateCenters['CA'][0] -= 20;

    vis.beeRadius = d3.scaleLinear()
        .domain([0, 1000000])
        .range([0, 3]);

    vis.includedBlocks = beeswarmMoneyBlocks.filter(d => d.state in stateCenters);

    vis.beeswarm = vis.svg.append("g")
        .attr("id", "beeswarm-nodes")
        .selectAll("circle");

    vis.beeswarm = vis.beeswarm
        .data(vis.includedBlocks)
        .join("circle")
        .attr("class", "bee-node")
        .attr("cx", vis.width / 2)
        .attr("cy", -1)
        .attr("r", 3)
        // .attr("r", d => vis.beeRadius(d.total_receipts))
        .style("stroke", "black")
        .style("stroke-width", 0.5)
        .attr("fill", d => partyColor(d.party));

    vis.tick = () => {
		d3.selectAll('.bee-node')
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
	};

    vis.partyCoordinates = d3.scaleOrdinal()
        .domain(['DEM', 'DFL', 'REP'])
        .range([[vis.width/3, vis.height/2], [vis.width/3, vis.height/2], [2*vis.width/3, vis.height/2]])
        .unknown([0.8*vis.width, 0.6*vis.height]);

    vis.officeTypeCoordinates = d3.scaleOrdinal()
        .domain(['president', 'senate', 'house'])
        .range([[vis.width/3, 0.2*vis.height], [vis.width/3, 0.35*vis.height], [vis.width/3, 0.5*vis.height]])
        .unknown([vis.width/3, 0.8*vis.height]);


    vis.simulation =
        d3.forceSimulation(vis.includedBlocks)
            .force('x', d3.forceX( d => (d.party === 'REP' ? 3 : -3) + stateCenters[d.state][0]).strength(0.9))
            .force('y', d3.forceY( d => stateCenters[d.state][1]).strength(0.9))
            .force('repel', d3.forceManyBody().strength(-30).distanceMax(10))
            .force('collide', d3.forceCollide(d => vis.beeRadius(d.total_receipts)))
            // .alphaDecay(0.005)
            .alpha(0.12)
            .on('tick', vis.tick);

    vis.wrangleData();
};


BeeSwarm.prototype.sortByParty = function() {
    const vis = this;

    vis.simulation
        // .alphaDecay(0.1)
        .alpha(0.3)
        .force('x', d3.forceX( d => vis.partyCoordinates(d.party)[0]).strength(0.8))
        .force('y', d3.forceY( d => vis.partyCoordinates(d.party)[1]).strength(0.8))
        .restart()

};

BeeSwarm.prototype.sortByOfficeType = function() {
    const vis = this;

    vis.simulation
        // .alphaDecay(0.1)
        .alpha(0.3)
        // .force('x', d3.forceX( d => vis.officeTypeCoordinates(d.office_type)[0]).strength(0.8))
        .force('y', d3.forceY( d => vis.officeTypeCoordinates(d.race_type)[1]).strength(0.8))
        .restart();

    vis.officeTypeLabels = vis.svg.selectAll(".office-type-text")
        .data(['President', 'Senate', 'House'])
        .join("text")
        .attr("class", "office-type-text")
        .attr("x", vis.width / 9)
        .attr("y", d => vis.officeTypeCoordinates(d.toLowerCase())[1])
        .style("font-size", "16px")
        .style("text-anchor", "middle")
        .text(d => d)

};


BeeSwarm.prototype.sortByCandidates = function() {
    const vis = this;

    // const partyGroups = [['DEM', 'DFL'], ['REP'], ['IND', 'LIB']];
    const offices = ['president', 'senate', 'house'];


    let candidateGroups = [];
    // partyGroups.forEach(partyGroup => {
    offices.forEach(officeType => {

        let candidateGroup = candidateMeta.slice()
            .filter(d => d.total_receipts !== "" && officeType === d.race_type) // && partyGroup.includes(d.party)
            .sort((a,b) => (b.total_receipts > a.total_receipts) ? 1 : -1)
            .slice(0,6);
            // .map(d => d.fec_id);

        // console.log(candidateGroup)
        candidateGroups.push(candidateGroup);

    });

    const presidentXScale = d3.scaleOrdinal()
        .domain(candidateGroups[0].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown([1.1]);

    const senateXScale = d3.scaleOrdinal()
        .domain(candidateGroups[1].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown([1.1]);

    const houseXScale = d3.scaleOrdinal()
        .domain(candidateGroups[2].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown([1.1]);

    vis.simulation
        .alpha(0.3)
        .force('x', d3.forceX( d => {
            if (d.race_type === "president") {
                return presidentXScale(d.fec_id)*vis.width;
            }
            else if (d.race_type === "senate") {
                return senateXScale(d.fec_id)*vis.width;
            }
            else {
                return houseXScale(d.fec_id)*vis.width;
            }
            // vis.officeTypeCoordinates(d.office_type)[0]
        }).strength(0.8))
        .restart();

    vis.candidateLabels = vis.svg.selectAll(".candidate-label-text")
        .data(candidateGroups.flat())
        .join("text")
        .attr("class", "candidate-label-text")
        .attr("x", d => {
            if (d.race_type === "president") {
                return presidentXScale(d.fec_id)*vis.width;
            }
            else if (d.race_type === "senate") {
                return senateXScale(d.fec_id)*vis.width;
            }
            else {
                return houseXScale(d.fec_id)*vis.width;
            }
        })
        .attr("y", d => vis.officeTypeCoordinates(d.race_type)[1] - 60)
        .style("font-size", "10px")
        .style("text-anchor", "middle")
        .text(d => `${d.first_name} ${d.last_name} (${d.full_candidate_district})`)

};

BeeSwarm.prototype.hideMap = function() {
    const vis = this;

    vis.usMap
        .transition()
        .duration(1000)
        .attr("opacity", 0)

};

BeeSwarm.prototype.showMap = function() {
    const vis = this;

    vis.usMap
        .transition()
        .duration(1000)
        .attr("opacity", 1)

};

const getSubsetCounts = (array, office, parties) => {
    array = array.slice().filter(d => d.race_type === office && parties.includes(d.party));

    let counts = array.reduce((p, c) => {
        let fec_id = c.fec_id;
        if (!p.hasOwnProperty(fec_id)) {
            p[fec_id] = 0;
        }
        p[fec_id]++;
        return p;
        }, {});

    return counts;
}

BeeSwarm.prototype.wrangleData = function() {
    const vis = this;

    vis.updateVis();

};

BeeSwarm.prototype.updateVis = function() {
    const vis = this;

};