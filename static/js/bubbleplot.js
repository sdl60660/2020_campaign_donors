

BubblePlot = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BubblePlot.prototype.initVis = function() {
    const vis = this;

    vis.margin = {top: 50, right: 50, bottom: 60, left: 60};

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

    vis.y = d3.scalePow()
        .domain([0, 80])
        .range([vis.height, 0])
        .exponent(2);

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


    vis.circles = vis.g.selectAll('circle');


    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
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


    vis.wrangleData();
};

BubblePlot.prototype.wrangleData = function() {
    const vis = this;

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

    vis.circles
        .data(vis.chartData)
        .join('circle')
        .attr('cx', d => vis.x(100*d.majority_white_zipcode_pct))
        .attr('cy', d => vis.y(100*d.high_income_zipcode_pct))
        .attr('r', d => vis.radius(d.donor_count))
        .style('fill', d => partyColor(d.party))
        .style('fill-opacity', 0.85)
        .style('stroke-width', '1px')
        .style('stroke', 'black')
        .on('mouseover', vis.tip.show)
        .on('mouseout', vis.tip.hide)


};