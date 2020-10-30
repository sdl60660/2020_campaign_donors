

BubblePlot = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BubblePlot.prototype.initVis = function() {
    const vis = this;

    vis.margin = {top: 50, right: 10, bottom: 60, left: 60};

    // Set height/width of viewBox
    vis.width = 900 - vis.margin.left - vis.margin.right;
    vis.height = 900 - vis.margin.top - vis.margin.bottom;

    vis.defaultBubbleOpacity = 0.72;

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width+vis.margin.left+vis.margin.right, vis.height+vis.margin.top+vis.margin.bottom]);

    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.x = d3.scaleLinear()
        .domain([60, 100])
        .range([0, vis.width]);

    vis.y = d3.scaleLinear()
        .domain([30, 100])
        .range([vis.height, 0]);
        // .exponent(2);

    vis.radius = d3.scaleLinear()
        // .domain()
        .range([5.5, 20]);

    // Use party color scale defined in main.js

    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.x));

    vis.yAxis = vis.g.append("g")
        // .attr("transform", "translate(" + vis.margin.left + ",0)")
        .call(d3.axisLeft(vis.y).ticks(8));


    vis.xAxisLabel = vis.g.append("text")
        .attr("transform", `translate(${vis.width / 2}, ${vis.height + 38})`)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .style("font-size", "18px")
        .text("Majority-White Zipcodes (%)");

    vis.xAxisTip = vis.g.append("text")
        .attr("transform", `translate(${vis.width}, ${vis.height - 15})`)
        .attr("text-anchor", "end")
        .attr("class", "axis-tip")
        .style("font-size", "14px")
        .text("More Donors From Majority-White Zipcodes ⟶");

    vis.yAxisLabel = vis.g.append("text")
        .attr("transform", `rotate(-90)`)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .style("font-size", "18px")
        .attr("x", -vis.height / 2)
        .attr("y", -35)
        .text("High-Income Zipcodes (%)");

    vis.yAxisTip = vis.g.append("text")
        .attr("transform", `rotate(-90)`)
        .attr('x', 0)
        .attr('y', 30)
        .attr("text-anchor", "end")
        .attr("class", "axis-tip")
        .style("font-size", "14px")
        .text("More Donors From High-Income Zipcodes ⟶");


    // vis.circles = vis.g.selectAll('circle');
    vis.circleContainer = vis.g.append("g");
    vis.plotLabelContainer = vis.g.append("g");
    vis.hoverCircleContainer = vis.g.append("g");

    vis.tip = d3.tip()
        .attr('class', 'd3-tip bubbleplot-tip')
        .html(d => {
            let tiptext = '<div style="text-align:center">';
            tiptext += `<span><strong>${d.candidate_name} (${d.district_name})</strong></span><br><br>`;

            tiptext += '<span style="float:left">Donors From Zipcodes That Are...</span><br><br>';
            tiptext += `<span style="float:left">Majority-White:</span><span style="float:right; padding-left: 3px;">${d3.format(".1%")(d.majority_white_zipcode_pct)}</span><br>`;
            tiptext += `<span style="float:left">High-Income (Top 25%):</span><span style="float:right; padding-left: 3px;">${d3.format(".1%")(d.high_income_zipcode_pct)}</span><br>`;
            tiptext += `<span style="float:left">High Bachelors Attainment (Top 25%):</span><span style="float:right; padding-left: 3px;">${d3.format(".1%")(d.high_bachelors_zipcode_pct)}</span><br>`;

            tiptext += '</div>';

           return tiptext;
        });
    vis.svg.call(vis.tip);

    vis.yVariable = 'education';

    vis.includedCandidates = donorDemographics.slice()
        .filter( d => +d.donor_count > 15000)
        .map( d => d.fec_id);

    console.log(vis.includedCandidates);

    vis.labeledCandidates = ["BIDEN", "TRUMP", "SANDERS", "WARREN", "YANG", "OCASIO-CORTEZ", "OMAR", "KELLY", "MCCONNELL", "CORNYN", "MERKLEY", "MARKEY", "HARRISON", "GRAHAM", "MCGRATH", 
    "BUTTIGIEG", "KLOBUCHAR", "OSSOFF", "STEYER", "HARRIS", "BOWMAN", "SLOTKIN", "CASTEN", "PELOSI", "COLLINS", "ERNST", "GABBARD", "CRENSHAW", "GIDEON"];

    vis.wrangleData();
};


BubblePlot.prototype.wrangleData = function() {
    const vis = this;

    if (vis.yVariable === 'education') {
        vis.yAccessor = 'high_bachelors_zipcode_pct';

        vis.yAxisLabel
            .text("High Bachelors Attainment Zipcodes (%)");

        vis.yAxisTip
            .text("More Donors From Zipcodes With High Bachelors Degree Attainment ⟶");

        vis.y.domain([30, 100]);
        vis.yAxis
            .transition()
            .duration(1000)
            .call(d3.axisLeft(vis.y).ticks(8));
    }
    else {
        // if equals 'income'
        vis.yAccessor = 'high_income_zipcode_pct';

        vis.yAxisLabel
            .text("High-Income Zipcodes (%)");

        vis.yAxisTip
            .text("More Donors From High-Income Zipcodes ⟶");

        vis.y.domain([30, 80]);
        vis.yAxis
            .transition()
            .duration(1000)
            .call(d3.axisLeft(vis.y).ticks(6));
    }


    vis.chartData = bubblePlotDataset.slice();
    vis.chartData = vis.chartData
        .filter(d => vis.includedCandidates.includes(d.fec_id))
        .sort((a,b) => b.donor_count - a.donor_count );

    vis.radius
        .domain(d3.extent(vis.chartData, d => +d.donor_count));

    vis.simulation =
        d3.forceSimulation(vis.chartData)
            .stop();

    vis.updateVis();
};

BubblePlot.prototype.updateVis = function() {
    const vis = this;

    vis.circles = vis.circleContainer.selectAll("circle")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("circle")
                .attr('class', 'candidate-bubble')
                .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('cy', d => vis.y(100*d[vis.yAccessor]))
                .attr('r', d => vis.radius(d.donor_count))
                .style('fill', d => partyColor(d.party))
                .style('opacity', vis.defaultBubbleOpacity)
                .style('stroke-width', '1px')
                .style('stroke', 'black'),

            update => update
                .call(update => update
                    .transition("move-bubbles")
                    .duration(1000)
                        .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
                        .attr('cy', d => vis.y(100*d[vis.yAccessor]))),

            exit => exit.remove()
        );
        

    vis.labelShadows = vis.plotLabelContainer.selectAll("text.shadow")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("text")
                .attr('x', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)
                .attr("text-anchor", "middle")
                .attr("class", "shadow")
                .style("font-size", "11px")
                .style("stroke-width", "3px")
                .style("stroke", "white")
                .style("opacity", 1.0)
                .text(d => vis.labeledCandidates.includes(d.last_name) ? d.last_name : ""),
                // .text(d => d.last_name),
                // .text(d => (d.donor_count > 500000 || d.last_name === "MERKLEY" ||
                    // d.last_name === "CORNYN" || d.last_name === "MARKEY") ? d.last_name : ""),

            update => update
                .style("opacity", 1.0)
                .call(update => update
                    .transition("move-labels")
                    .duration(1000)
                        .attr('x', d => vis.x(100*d.majority_white_zipcode_pct))
                        .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)),

            exit => exit.remove()
        );

    vis.plotLabels = vis.plotLabelContainer.selectAll("text.label")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("text")
                .attr('x', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)
                .attr("text-anchor", "middle")
                .attr("class", "label")
                .style("font-size", "11px")
                .style("stroke-width", "2px")
                .style("opacity", 1.0)
                .text(d => vis.labeledCandidates.includes(d.last_name) ? d.last_name : ""),
                // .text(d => d.last_name),
                // .text(d => (d.donor_count > 500000 || d.last_name === "MERKLEY" ||
                    // d.last_name === "CORNYN" || d.last_name === "MARKEY") ? d.last_name : ""),

            update => update
                .style("opacity", 1.0)
                .call(update => update
                    .transition("move-labels")
                    .duration(1000)
                        .attr('x', d => vis.x(100*d.majority_white_zipcode_pct))
                        .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)),

            exit => exit.remove()
        );


    vis.hoverCircles = vis.hoverCircleContainer.selectAll("circle")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("circle")
                .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('cy', d => vis.y(100*d[vis.yAccessor]))
                .attr('r', d => vis.radius(d.donor_count))
                .style('opacity', 0.0)
                .on('mouseover', (d,i,n) => {
                    vis.tip.show(d);
                    let highlightTip = $(".bubbleplot-tip");

                    // Get screen coordinates of the corresponding plot bubble
                    let bubbleY = n[i].getBoundingClientRect().y;

                    // Get the height of the tooltip to offset
                    let tooltipHeight = highlightTip[0].getBoundingClientRect().height;

                    highlightTip
                        .css("position", "fixed")
                        .css("top", bubbleY - tooltipHeight);
                })
                .on('mouseout', vis.tip.hide),

            update => update
                .call(update => update
                    .transition("move-bubbles")
                    .duration(1000)
                        .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
                        .attr('cy', d => vis.y(100*d[vis.yAccessor]))),

            exit => exit.remove()
        );
};


BubblePlot.prototype.highlightParty = function(partyGroup) {
    const vis = this;

    vis.circles
        .transition("bubble-party-highlight")
        .duration(500)
        .style('opacity', d => partyGroup.includes(d.party) ? vis.defaultBubbleOpacity : 0.25);

    vis.plotLabels
        .transition("label-party-highlight")
        .duration(500)
        .style('opacity', d => partyGroup.includes(d.party) ? 1.0 : 0.25);

    vis.labelShadows
        .transition("label-shadow-party-highlight")
        .duration(500)
        .style('opacity', d => partyGroup.includes(d.party) ? 1.0 : 0.25);

};

BubblePlot.prototype.highlightCandidates = function(candidateGroup) {
    const vis = this;

    vis.circles
        .transition("bubble-candidate-highlight")
        .duration(500)
        .style('opacity', d => candidateGroup.includes(d.last_name) ? vis.defaultBubbleOpacity + 0.1 : 0.25);

    vis.plotLabels
        .transition("label-candidate-highlight")
        .duration(500)
        .style('opacity', d => candidateGroup.includes(d.last_name) ? 1.0 : 0);

    vis.labelShadows
        .transition("label-shadow-candidate-highlight")
        .duration(500)
        .style('opacity', d => candidateGroup.includes(d.last_name) ? 1.0 : 0);

};

BubblePlot.prototype.resetHighlighting = function() {
    const vis = this;

    vis.circles
        .transition("reset-circles")
        .duration(500)
        .style('opacity', vis.defaultBubbleOpacity);

    vis.plotLabels
        .transition("reset-labels")
        .duration(500)
        .style('opacity', 1.0)

    vis.labelShadows
        .transition("reset-shadows")
        .duration(500)
        .style('opacity', 1.0)

};


BubblePlot.prototype.oneAxis = function(xVar, yVar) {
    const vis = this;


    if (xVar === null) {
        vis.xAxis.style('opacity', 0.0);
        vis.xAxisLabel.style('opacity', 0.0);
        vis.xAxisTip.style('opacity', 0.0);
    }
    else {
        vis.xAxis
            .style('opacity', 1.0)
            .attr("transform", "translate(0," + 0.7*vis.height + ")");
        vis.xAxisLabel
            .style('opacity', 1.0)
            .attr("transform", `translate(${vis.width / 2}, ${0.7*vis.height + 38})`);
        vis.xAxisTip
            .style('opacity', 1.0)
            .attr("transform", `translate(${vis.width}, ${0.7*vis.height - 15})`);
    }

    if (yVar === null) {
        vis.yAxis.style('opacity', 0.0);
        vis.yAxisLabel.style('opacity', 0.0);
        vis.yAxisTip.style('opacity', 0.0);
    }
    else {
        vis.yAxis
            .style('opacity', 1.0);

        vis.yAxisLabel.style('opacity', 1.0);
        vis.yAxisTip.style('opacity', 1.0);
    }

    vis.plotLabels
        .transition("fade-labels")
        .attr('opacity', 0.0)
        .style('opacity', 0.0);

    vis.labelShadows
        .transition("fade-shadows")
        .attr('opacity', 0.0)
        .style('opacity', 0.0);


    vis.tick = () => {
        vis.simulation.tick();

		vis.circleContainer.selectAll('.candidate-bubble')
			.attr('cx', d => d.x)
            .attr("cy", d => d.y);


        vis.hoverCircleContainer.selectAll('circle')
            .attr('cx', d => d.x)
            .attr("cy", d => d.y);
	};

    vis.hoverCircleContainer.selectAll('circle')
        .attr('x', d => d.cx)
        .attr('y', d => d.cy);

    vis.circleContainer.selectAll('.candidate-bubble')
        .attr('x', d => d.cx)
        .attr('y', d => d.cy);


    vis.simulation
        .stop()
        .alpha(0.1)
        .alphaDecay(0.019)
        .force('x', d3.forceX( d => {
            if(xVar !== null) {
                return vis.x(100*d[xVar])
            }
            else {
                return vis.width / 2;
            }
        }).strength(0.95))
        .force('y', d3.forceY( d => {
            if (yVar !== null) {
                return vis.y(100*d[yVar]);
            }
            else {
                return vis.height/2;
            }
        }).strength(0.95))
        .force('repel', d3.forceManyBody().strength(-20).distanceMax(3))
        .force("charge", d3.forceCollide().radius(d => vis.radius(d.donor_count)).strength(0.9).iterations(5))
        .on('tick', vis.tick)
        .restart();
};
