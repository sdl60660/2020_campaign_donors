

BubblePlot = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BubblePlot.prototype.initVis = function() {
    const vis = this;

    vis.margin = {top: 50, right: 0, bottom: 60, left: 60};

    // Set height/width of viewBox
    vis.width = 900 - vis.margin.left - vis.margin.right;
    vis.height = 800 - vis.margin.top - vis.margin.bottom;

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
        .range([vis.height, 0])
        // .exponent(2);

    vis.radius = d3.scaleLinear()
        // .domain()
        .range([5, 20]);

    // Use party color scale defined in main.js

    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.x));

    vis.yAxis = vis.g.append("g")
        // .attr("transform", "translate(" + vis.margin.left + ",0)")
        .call(d3.axisLeft(vis.y));


    vis.xAxisLabel = vis.g.append("text")
        .attr("transform", `translate(${vis.width / 2}, ${vis.height + 38})`)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Majority-White Zipcodes (%)");

    vis.xAxisTip = vis.g.append("text")
        .attr("transform", `translate(${vis.width}, ${vis.height - 15})`)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text("More Donors From Majority-White Zipcodes ⟶");

    vis.yAxisLabel = vis.g.append("text")
        .attr("transform", `rotate(-90)`)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .attr("x", -vis.height / 2)
        .attr("y", -35)
        .text("High-Income Zipcodes (%)");

    vis.yAxisTip = vis.g.append("text")
        .attr("transform", `rotate(-90)`)
        .attr('x', 0)
        .attr('y', 30)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text("More Donors From High-Income Zipcodes ⟶");


    // vis.circles = vis.g.selectAll('circle');
    vis.circleContainer = vis.g.append("g");
    vis.plotLabelContainer = vis.g.append("g");

    vis.tip = d3.tip()
        .attr('class', 'd3-tip bubbleplot-tip')
        .html(d => {
            let tiptext = '<div style="text-align:center">';
            tiptext += `<span><strong>${d.candidate_name} (${d.district_name})</strong></span><br><br>`;

            tiptext += '<span style="float:left">Donors From Zipcodes That Are...</span><br><br>'
            tiptext += `<span style="float:left">Majority-White:</span><span style="float:right; margin-left: 3px;">${d3.format(".1%")(d.majority_white_zipcode_pct)}</span><br>`;
            tiptext += `<span style="float:left">High-Income (Top 25%):</span><span style="float:right; margin-left: 3px;">${d3.format(".1%")(d.high_income_zipcode_pct)}</span><br>`;
            tiptext += `<span style="float:left">High Bachelors Attainment (Top 25%):</span><span style="float:right; margin-left: 3px;">${d3.format(".1%")(d.high_bachelors_zipcode_pct)}</span><br>`;

            tiptext += '</div>';

           return tiptext;
        });
    vis.svg.call(vis.tip);

    vis.yVariable = 'income';


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
    }
    else {
        // if equals 'income'
        vis.yAccessor = 'high_income_zipcode_pct';

        vis.yAxisLabel
            .text("High-Income Zipcodes (%)");

        vis.yAxisTip
            .text("More Donors From High-Income Zipcodes ⟶");
    }

    vis.chartData = donorDemographics.slice();
    vis.chartData = vis.chartData
        .filter(d => +d.donor_count > 12000)
        .sort((a,b) => b.donor_count - a.donor_count );

    vis.radius
        .domain(d3.extent(vis.chartData, d => +d.donor_count));

    console.log(vis.chartData);

    vis.updateVis();
};

BubblePlot.prototype.updateVis = function() {
    const vis = this;

    console.log(vis.chartData);

    vis.circles = vis.circleContainer.selectAll("circle")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("circle")
                .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('cy', d => vis.y(100*d[vis.yAccessor]))
                .attr('r', d => vis.radius(d.donor_count))
                .style('fill', d => partyColor(d.party))
                .style('opacity', 0.82)
                .style('stroke-width', '1px')
                .style('stroke', 'black')
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

    vis.plotLabels = vis.plotLabelContainer.selectAll("text")
        .data(vis.chartData, d => d.fec_id)
        .join(
            enter => enter.append("text")
                .attr('x', d => vis.x(100*d.majority_white_zipcode_pct))
                .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)
                .attr("text-anchor", "middle")
                .style("font-size", "9px")
                // .text(d => d.last_name),
                .text(d => (d.donor_count > 150000 || d.last_name === "SPANBERGER") ? d.last_name : ""),

            update => update
                .call(update => update
                    .transition("move-labels")
                    .duration(1000)
                        .attr('y', d => vis.y(100*d[vis.yAccessor]) + vis.radius(d.donor_count) + 10)),

            exit => exit.remove()
        )
};


BubblePlot.prototype.highlightParty = function(partyGroup) {
    const vis = this;

    vis.circles
        .transition("bubble-party-highlight")
        .duration(500)
        .style('opacity', d => partyGroup.includes(d.party) ? 0.82 : 0.3);

    vis.plotLabels
        .transition("label-party-highlight")
        .duration(500)
        .style('opacity', d => partyGroup.includes(d.party) ? 1.0 : 0.3);

};

BubblePlot.prototype.highlightCandidates = function(candidateGroup) {
    const vis = this;

    vis.circles
        .transition("bubble-candidate-highlight")
        .duration(500)
        .style('opacity', d => candidateGroup.includes(d.last_name) ? 0.82 : 0.3);

    vis.plotLabels
        .transition("label-candidate-highlight")
        .duration(500)
        .style('opacity', d => candidateGroup.includes(d.last_name) ? 1.0 : 0);

};

BubblePlot.prototype.resetHighlighting = function() {
    const vis = this;

    vis.circles
        .transition("reset-highlighting")
        .duration(500)
        .style('opacity', 0.82);

    vis.plotLabels
        .transition("reset-highlighting")
        .duration(500)
        .style('opacity', 1.0)

};
