
let tickCount = 0;

BeeSwarm = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BeeSwarm.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 1600;
    vis.height = 1100;

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width*1.03, vis.height]);

    vis.projection = geoAlbersUsaPr()
        .scale(vis.width)
        .translate([vis.width / 2, vis.height / 2]);


    vis.beeswarmTransitionTime = 1500;

    // Add contribution totals to the properties of each state feature
    stateMap.features.forEach(state => {
        const trueCounts = stateSummaryCounts[state.properties.SHORT_NAME];
        let contributionCounts = summarizeContributionCounts(trueCounts);

        state.properties.contributionCounts = contributionCounts;
        // state.properties.donorCounts = {};
    });

    vis.uncategorizedMapData = {'properties':
            {'NAME': 'Donor Info Unknown',
             'contributionCounts': summarizeContributionCounts(stateSummaryCounts['uncategorized'])}};

    vis.selfFundingMapData = {'properties':
            {'NAME': 'Self-Contributions',
             'contributionCounts': summarizeContributionCounts(stateSummaryCounts['self_contribution'])}};


    vis.usMap = vis.svg.append("g")
        // .attr("y", vis.height / 3)
        .selectAll("path")
        .data(stateMap.features)
        .join("path")
            .attr("id", d => `state-${d.properties.SHORT_NAME}`)
            .attr("fill", "white")
            .attr("d", d3.geoPath()
                .projection(vis.projection)
            )
            .style("stroke", "black")
            .attr("opacity", 0)
            .on("mouseover", (d,i,n) => {
                vis.tip.show(d, n[i]);

                let highlightTip = $(".beeswarm-state-tip");

                // Get screen coordinates of the corresponding plot bubble
                let stateY = n[i].getBoundingClientRect().y;

                // Get the height of the tooltip to offset
                let tooltipHeight = highlightTip[0].getBoundingClientRect().height;

                highlightTip
                    .css("position", "fixed")
                    .css("top", stateY - tooltipHeight);
            })
            .on("mouseout", d => vis.tip.hide());

    vis.stateCenters = {};
    stateMap.features.forEach(d => {
        let centroid = d3.geoPath().centroid(d);
        vis.stateCenters[d.properties.SHORT_NAME] = vis.projection(centroid);
    });

    // This is where all uncategorized data will lie (unreported individual donations/committee contributions)
    vis.stateCenters['uncategorized'] = [0.9*vis.width, 0.73*vis.height];
    vis.stateCenters['self_contribution'] = [0.9*vis.width, 0.45*vis.height];
    // Offset California by a little to avoid some of the Nevada overlap
    vis.stateCenters['CA'][0] -= 20;

    vis.includedBlocks = beeswarmMoneyBlocks.filter(d => d.state in vis.stateCenters);

    vis.beeswarm = vis.svg.append("g")
        .attr("id", "beeswarm-nodes")
        .selectAll("circle");

    vis.beeswarm = vis.beeswarm
        .data(vis.includedBlocks)
        .join("circle")
        .attr("class", "bee-node")
        .attr("cx", d => vis.stateCenters[d.state][0])
        .attr("cy", d => vis.stateCenters[d.state][1])
        .attr("r", 2.5)
        // .style("stroke", "black")
        // .style("stroke-width", 0.5)
        .attr("fill", d => partyColor(d.party))
        .on("mouseover", d => {
            let featureData;
            let matchingState;

            if (d.state === 'uncategorized') {
                featureData = vis.uncategorizedMapData;
                matchingState = vis.uncategorizedHoverCircle.node();
            }
            else if (d.state === 'self_contribution') {
                featureData = vis.selfFundingMapData;
                matchingState = vis.selfFundedHoverCircle.node();
            }
            else {
                featureData = stateMap.features.find(x => x.properties.SHORT_NAME === d.state);
                matchingState = vis.svg.select(`#state-${d.state}`).node();
            }

            console.log(matchingState);

            vis.tip.show(featureData, matchingState);

            let highlightTip = $(".beeswarm-state-tip");

            // Get screen coordinates of the corresponding plot bubble
            let stateY = matchingState.getBoundingClientRect().y;

            // Get the height of the tooltip to offset
            let tooltipHeight = highlightTip[0].getBoundingClientRect().height;

            highlightTip
                .css("position", "fixed")
                .css("top", stateY - tooltipHeight);
        })
        .on("mouseout", d => vis.tip.hide());

    vis.tick = () => {
        tickCount += 1;

        vis.simulation.tick();

		d3.selectAll('.bee-node')
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
	};

    vis.partyCoordinates = d3.scaleOrdinal()
        .domain(['DEM', 'DFL', 'REP'])
        .range([[vis.width/3, vis.height/2], [vis.width/3, vis.height/2], [2*vis.width/3, vis.height/2]])
        .unknown([0.8*vis.width, vis.height/2]);

    vis.officeTypeCoordinates = d3.scaleOrdinal()
        .domain(['president', 'senate', 'house'])
        .range([[vis.width/3, 0.15*vis.height], [vis.width/3, 0.4*vis.height], [vis.width/3, 0.65*vis.height]])
        .unknown([vis.width/3, 0.8*vis.height]);


    vis.simulation =
        d3.forceSimulation(vis.includedBlocks)
            .force('x', d3.forceX( d => (d.party === 'REP' ? 3 : -3) + vis.stateCenters[d.state][0]).strength(1.0))
            .force('y', d3.forceY( d => vis.stateCenters[d.state][1]).strength(0.9))
            .force('repel', d3.forceManyBody().strength(-20).distanceMax(5))
            .force('collide', d3.forceCollide(2.5).strength(0.8).iterations(2))
            // .alphaDecay(0.005)
            .alpha(0.12)
            .alphaDecay(0.004)
            .on('tick', vis.tick)
            .stop();

    vis.showMap();
    vis.sortByGeo();
};


BeeSwarm.prototype.sortByGeo = function() {
    const vis = this;

    vis.beeswarm
        .transition()
        .delay(500)
        .duration(vis.beeswarmTransitionTime)
        // .ease(d3.easeSin)
        .attr("cx", d => d.map_x)
        .attr("cy", d => d.map_y);


    const fixedTooltipCall = (d,i,n) => {
        vis.tip.show(d, n[i]);

        let highlightTip = $(".beeswarm-state-tip");

        // Get screen coordinates of the corresponding plot bubble
        let stateY = n[i].getBoundingClientRect().y;

        // Get the height of the tooltip to offset
        let tooltipHeight = highlightTip[0].getBoundingClientRect().height;

        highlightTip
            .css("position", "fixed")
            .css("top", stateY - tooltipHeight);
    };

    vis.uncategorizedHoverCircle = vis.svg.append("circle")
        .datum(vis.uncategorizedMapData)
        .attr("cx", 0.9*vis.width)
        .attr("cy", 0.73*vis.height)
        .attr("r", 120)
        .style("opacity", 0)
        .on("mouseover", (d,i,n) => fixedTooltipCall(d,i,n));

    vis.selfFundedHoverCircle = vis.svg.append("circle")
        .datum(vis.selfFundingMapData)
        .attr("cx", 0.9*vis.width)
        .attr("cy", 0.45*vis.height)
        .attr("r", 120)
        .style("opacity", 0)
        .on("mouseover", (d,i,n) => fixedTooltipCall(d,i,n));
};


BeeSwarm.prototype.sortByParty = function() {
    const vis = this;

    vis.uncategorizedHoverCircle.remove();
    vis.selfFundedHoverCircle.remove();

    vis.simulation
        // .alphaDecay(0.1)
        .alpha(0.3)
        .alphaDecay(0.021)
        .force('x', d3.forceX( d => vis.partyCoordinates(d.party)[0]).strength(0.8))
        .force('y', d3.forceY( d => vis.partyCoordinates(d.party)[1]).strength(0.8))
        .force('collide', d3.forceCollide(2.5).strength(1.0).iterations(20))
        // .restart();

    // for (let i = 0; i < 250; i++) vis.simulation.tick();
    // vis.beeswarm
    //     .transition()
    //     .duration(2000)
    //     .attr("cx", d => d.x)
    //     .attr("cy", d => d.y);

    vis.partyLabels = vis.svg.selectAll(".party-label-text")
        .data(['DEM', 'REP', 'Other'])
        .join("text")
        .attr("class", "party-label-text")
        .attr("x", d => vis.partyCoordinates(d)[0])
        .attr("y", vis.height / 3)
        .style("font-size", "20px")
        .style("text-anchor", "middle")
        .text(d => d);

    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        // .ease(d3.easeSin)
        .attr("cx", d => d.party_x)
        .attr("cy", d => d.party_y);

};


BeeSwarm.prototype.sortByOfficeType = function() {
    const vis = this;

    vis.simulation
        // .alphaDecay(0.1)
        .alpha(0.3)
        // .force('x', d3.forceX( d => vis.officeTypeCoordinates(d.office_type)[0]).strength(0.8))
        .force('y', d3.forceY( d => vis.officeTypeCoordinates(d.race_type)[1]).strength(0.8))
        // .restart();

    vis.partyLabels
        .transition()
        .duration(1000)
        .attr("y", 15);

    vis.officeTypeLabels = vis.svg.selectAll(".office-type-text")
        .data(['President', 'Senate', 'House'])
        .join("text")
        .attr("class", "office-type-text")
        .attr("x", vis.width / 9)
        .attr("y", d => vis.officeTypeCoordinates(d.toLowerCase())[1])
        .style("font-size", "20px")
        .style("text-anchor", "middle")
        .text(d => d)

    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        // .ease(d3.easeSin)
        .attr("cx", d => d.office_x)
        .attr("cy", d => d.office_y);

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

    vis.presidentXScale = d3.scaleOrdinal()
        .domain(candidateGroups[0].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown(0.9);

    vis.senateXScale = d3.scaleOrdinal()
        .domain(candidateGroups[1].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown(0.9);

    vis.houseXScale = d3.scaleOrdinal()
        .domain(candidateGroups[2].map(d => d.fec_id))
        .range([0.25, 0.35, 0.45, 0.55, 0.65, 0.75])
        .unknown(0.9);

    vis.simulation
        .alpha(0.2)
        // .force('force', d3.forceManyBody().strength(-2))
        .force('x', d3.forceX( d => {
            if (d.race_type === "president") {
                return vis.presidentXScale(d.fec_id)*vis.width;
            }
            else if (d.race_type === "senate") {
                return vis.senateXScale(d.fec_id)*vis.width;
            }
            else {
                return vis.houseXScale(d.fec_id)*vis.width;
            }
            // vis.officeTypeCoordinates(d.office_type)[0]
        }).strength(0.8))
        // .restart();

    let allCandidateLabels = candidateGroups.flat();
    vis.candidateLabels = vis.svg.selectAll(".candidate-label-text")
        .data(allCandidateLabels)
        .join("text")
        .attr("class", "candidate-label-text")
        .attr("x", d => {
            if (d.race_type === "president") {
                return vis.presidentXScale(d.fec_id)*vis.width;
            }
            else if (d.race_type === "senate") {
                return vis.senateXScale(d.fec_id)*vis.width;
            }
            else {
                return vis.houseXScale(d.fec_id)*vis.width;
            }
        })
        .attr("y", d => (d.race_type) === "president" ? vis.officeTypeCoordinates(d.race_type)[1] - 100 :
            vis.officeTypeCoordinates(d.race_type)[1] - 50)
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        // .text(d => `${d.first_name} ${d.last_name} (${d.full_candidate_district})`);
        .text(d => `${d.first_name} ${d.last_name}`);

    // Remaining Candidates Label
    vis.remainingCandidateLabel = vis.svg.append("text")
        .attr("class", ".candidate-label-text")
        .attr("x", 0.9*vis.width)
        .attr("y", vis.officeTypeCoordinates("president")[1] - 100)
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .text("ALL REMAINING CANDIDATES");


    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        // .ease(d3.easeSin)
        .attr("cx", d => d.candidate_x)
        .attr("cy", d => d.candidate_y);


    // d3.select("#beeswarm-area").append("select")
    //     .attr("x", vis.width*0.75)
    //     .attr("y", vis.height/2);

    vis.removeLabels('.party-label-text');
    vis.removeLabels(".contribution-type-label");

};


BeeSwarm.prototype.separateSelfContributions = function() {
    const vis = this;

    const selfContributionOffset = 100;
    const allOthersOffset = -15;

    vis.simulation
        .alpha(0.2)
        .force('y', d3.forceY( d => {
            let yPosition = vis.officeTypeCoordinates(d.race_type)[1];

            if (d.contribution_source === "self_contributions") {
                yPosition += selfContributionOffset;
            }
            else {
                yPosition += allOthersOffset;
            }

            return yPosition;
        }).strength(0.8))
        // .restart();

    vis.removeLabels(".contribution-type-label");

    vis.selfContributionLabel = vis.svg.append("text")
        .attr("class", "contribution-type-label")
        .attr("x", vis.width*0.94)
        .attr("y", vis.officeTypeCoordinates("president")[1] + selfContributionOffset)
        .style("font-size", "10px")
        .style("text-anchor", "start")
        .text("Self-Contributions");

    vis.allOtherContributionLabel = vis.svg.append("text")
        .attr("class", "contribution-type-label")
        .attr("x", vis.width*0.94)
        .attr("y", vis.officeTypeCoordinates("president")[1] + allOthersOffset)
        .style("font-size", "10px")
        .style("text-anchor", "start")
        .text("All Other Sources");

    vis.individualContributionLabel = vis.svg.append("text")
        .attr("class", "contribution-type-label")
        .attr("x", vis.width*0.94)
        .style("font-size", "10px")
        .style("text-anchor", "start")
        .text("");

    vis.largeContributionLabel = vis.svg.append("text")
        .attr("class", "contribution-type-label")
        .attr("x", 0.9*vis.width + -30)
        .attr("y", vis.officeTypeCoordinates("president")[1] - 75)
        .style("font-size", "10px")
        .style("text-anchor", "middle")
        .text("");

    vis.smallContributionLabel = vis.svg.append("text")
        .attr("class", "contribution-type-label")
        .attr("x", 0.9*vis.width + 30)
        .attr("y", vis.officeTypeCoordinates("president")[1] - 75)
        .style("font-size", "10px")
        .style("text-anchor", "middle")
        .text("");


    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        .attr("cx", d => d.selfDonation_x)
        .attr("cy", d => d.selfDonation_y)
        // .attr("opacity", d => d.contribution_source === "self_contributions" ? 1.0 : 0.5)
};


BeeSwarm.prototype.separateTransfersOther = function() {
    const vis = this;

    vis.simulation
        .stop()
        .alpha(0.3)
        .force('y', d3.forceY( d => {
            let yPosition = vis.officeTypeCoordinates(d.race_type)[1];

            if (d.contribution_source === "self_contributions") {
                if (d.race_type === 'house') {
                    yPosition += 125;
                }
                else {
                    yPosition += 110;
                }
            }
            else if (d.contribution_source === 'transfers' || d.contribution_source === 'other') {
                if (d.first_name === 'MICHAEL' && d.last_name === 'BLOOMBERG')  {
                    yPosition += 20
                }
                else if (d.race_type === 'president') {
                    yPosition += 30;
                }
                else if (d.race_type === 'senate') {
                    yPosition += 55
                }
                else {
                    yPosition += 65
                }
            }
            else if(d.race_type === 'president') {
                yPosition -= 40;
            }
            else {
                yPosition -= 20;
            }

            return yPosition;
        }).strength(0.9))
        // .restart();

    vis.selfContributionLabel
        .transition()
        .duration(vis.beeswarmTransitionTime)
        .attr("y", vis.officeTypeCoordinates("president")[1] + 110);

    vis.allOtherContributionLabel
        .transition()
        .duration(vis.beeswarmTransitionTime)
        .attr("y", vis.officeTypeCoordinates("president")[1] + 30)
        .text("Transfers");

    vis.individualContributionLabel
        .attr("y", vis.officeTypeCoordinates("president")[1] - 40)
        .text("Individual Contributions");

    vis.largeContributionLabel
        .text("");

    vis.smallContributionLabel
        .text("");

    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        .attr("cx", d => d.transfers_x)
        .attr("cy", d => d.transfers_y)
        // .attr("opacity", d => (d.contribution_source === "transfers" || d.contribution_source === "other") ? 1.0 : 0.5)
};


BeeSwarm.prototype.separateIndividualDonationTypes = function() {
    const vis = this;

    vis.simulation
        .alpha(0.3)
        // .force('force', d3.forceManyBody().strength(-2))
        .force('x', d3.forceX( d => {
            let xPosition = null;

            if (d.race_type === "president") {
                xPosition = vis.presidentXScale(d.fec_id)*vis.width;
            }
            else if (d.race_type === "senate") {
                xPosition = vis.senateXScale(d.fec_id)*vis.width;
            }
            else {
                xPosition = vis.houseXScale(d.fec_id)*vis.width;
            }

            if (d.contribution_source === "small_donor_contributions") {
                if (xPosition / vis.width === 0.9) {
                    if (d.race_type === 'president') {
                        xPosition += 30
                    }
                    else if (d.race_type === 'senate') {
                        xPosition += 32
                    }
                    else {
                        xPosition += 40
                    }
                }
                else {
                    xPosition += 25
                }
            }
            else if (d.contribution_source === "large_donor_contributions") {
                if (xPosition / vis.width === 0.9) {
                    if (d.race_type === 'president') {
                        xPosition -= 30
                    }
                    else if (d.race_type === 'senate') {
                        xPosition -= 32
                    }
                    else {
                        xPosition -= 40
                    }
                }
                else {
                    xPosition -= 25
                }
            }

            if (d.contribution_source !== "small_donor_contributions" && d.contribution_source !== "large_donor_contributions" && d.contribution_source !== 'transfers' &&
            d.contribution_source !== "other" && d.contribution_source !== "self_contributions") {
                console.log(d.contribution_source, d)
            }

            return xPosition;
            // vis.officeTypeCoordinates(d.office_type)[0]
        }).strength(0.9))
        // .restart();


    vis.largeContributionLabel
        .text("$200+");

    vis.smallContributionLabel
        .text("<$200");


    vis.beeswarm
        .transition()
        .duration(vis.beeswarmTransitionTime)
        .attr("cx", d => d.individualDonation_x)
        .attr("cy", d => d.individualDonation_y)
        // .attr("opacity", d => (d.contribution_source === "small_donor_contributions" || d.contribution_source === "large_donor_contributions") ? 1.0 : 0.5)

};


BeeSwarm.prototype.removeLabels = function(labelClass) {
    const vis = this;

    vis.svg.selectAll(labelClass).remove();
};


BeeSwarm.prototype.hideMap = function() {
    const vis = this;

    vis.removeLabels(".map-label");

    vis.usMap
        .transition()
        .duration(1000)
        .attr("opacity", 0);

    d3.select(".beeswarm-state-tip").remove();

};

BeeSwarm.prototype.showMap = function() {
    const vis = this;


    vis.svg.append("text")
        .attr("class", "map-label")
        .attr("x", 0.9*vis.width)
        .attr("y", 0.35*vis.height)
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Self-Contributions");

    vis.svg.append("text")
        .attr("class", "map-label")
        .attr("x", 0.9*vis.width)
        .attr("y", 0.65*vis.height)
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Donor Unknown");

    vis.usMap
        .transition()
        .duration(1000)
        .attr("opacity", 1);

    vis.initStateTooltip();
};


BeeSwarm.prototype.initStateTooltip = function() {
    const vis = this;

    vis.tip = d3.tip()
        .attr("class", "d3-tip beeswarm-state-tip")
        .html(function(d) {
            let outputString = '<div>';
            outputString += `<div style="text-align: center;"><span><strong>${d.properties.NAME}</strong></span></div><br>`;

            outputString += '<table><tr>\n' +
                '    <td></td>\n' +
                '    <th scope="col">DEM</th>\n' +
                '    <th scope="col">REP</th>\n' +
                '    <th scope="col">OTHER</th>\n' +
                '  </tr>\n' +
                '  <tr>\n' +
                '    <th scope="row">President</th>\n' +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.DEM.president)}</td>\n` +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.REP.president)}</td>\n` +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.OTH.president)}</td>\n` +
                '  </tr>\n' +
                '  <tr>\n' +
                '    <th scope="row">Senate</th>\n' +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.DEM.senate)}</td>\n` +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.REP.senate)}</td>\n` +
                `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.OTH.senate)}</td>\n` +
                '  </tr>' +
                '  <tr>\n' +
                    '    <th scope="row">House</th>\n' +
                    `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.DEM.house)}</td>\n` +
                    `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.REP.house)}</td>\n` +
                    `    <td>${d3.format("$,.0f")(d.properties.contributionCounts.OTH.house)}</td>\n` +
                    '  </tr></table>'

            // outputString += `<span>Democratic Money:</span> <span style="float: right;">${d3.format("$,.0f")(d.properties.contributionCounts.DEM.president)}</span><br>`;

            outputString += '</div>';

            return outputString
        });

    vis.svg.call(vis.tip);
};


function summarizeContributionCounts(trueCounts) {

    let contributionCounts = {};

    contributionCounts['DEM'] = {'president': 0, 'house': 0, 'senate': 0};
        contributionCounts['REP'] = {'president': 0, 'house': 0, 'senate': 0};
        contributionCounts['OTH'] = {'president': 0, 'house': 0, 'senate': 0};

        Object.keys(trueCounts).forEach(party => {
            let partyGroup = (party === 'DEM' || party === 'DFL') ? 'DEM' : (party === 'REP') ? 'REP' : 'OTH';

            Object.keys(trueCounts[party]).forEach(office => {
                contributionCounts[partyGroup][office] += trueCounts[party][office]
            })
        });

    return contributionCounts;
}