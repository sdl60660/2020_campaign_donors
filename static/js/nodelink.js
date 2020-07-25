// d3 = require("d3@5");

NodeLink = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};


NodeLink.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 800;
    vis.height = 800;

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width, vis.height]);

    // Initialize hover tooltip on nodes
    vis.tip = d3.tip()
        .attr("class", "d3-tip")
        .html(function(d) {
            return d.display_name;
        });
    vis.svg.call(vis.tip);

    // Set path color scale and define arrow markers
    const types = ["outbound", "inbound"];
    vis.pathColor = d3.scaleOrdinal()
        .domain(types)
        .range(["blue", "green"]);
    vis.svg.append("defs").selectAll("marker")
        .data(types)
        .join("marker")
            .attr("id", d => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto")
        .append("path")
            .attr("fill", vis.pathColor)
            .attr("d", "M0,-5L10,0L0,5");

    // Scales for node radius and with of line depending on overlap percentage
    vis.circleRadius = d3.scaleLog()
        .domain(d3.extent(overlapNodes, (d) => d.total_donors))
        .range([10, 35]);

    vis.lineWidth = d3.scaleLog()
        .domain(d3.extent(overlapLinks, (d) => d.pct_val))
        .range([2,5]);

    vis.partyColor = d3.scaleOrdinal()
        .domain(['DEM', 'REP', 'LIB', 'GRE', 'IND'])
        .range(["#0015BC", "#E9141D", "#FED105", "#508C1B", "gray"])
        .unknown("gray");

    vis.straightLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("line");

    vis.node = vis.svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle");



    vis.wrangleData();
};

NodeLink.prototype.wrangleData = function() {
    const vis = this;

    // vis.centerNodeId = "S0AK00196";
    vis.centerNodeId = overlapNodes[Math.round(getRandomArbitrary(0, 100))].id;
    vis.numOuterNodes = 15;

    console.log(overlapLinks);

    vis.selectedOverlapLinks = overlapLinks
        .filter( (d) =>
            d.source === vis.centerNodeId || d.source.id === vis.centerNodeId
            // || d.target === vis.centerNodeId
        );

    // Reset the source to contain just the ID
    vis.selectedOverlapLinks.forEach( function(d) {
        d.source = typeof(d.source) === "object" ? d.source.id : d.source;
        d.target = typeof(d.target) === "object" ? d.target.id : d.target;
    });

    console.log(vis.selectedOverlapLinks);

    vis.selectedOverlapLinks = vis.selectedOverlapLinks
        .sort(function(a, b) {
            return b.pct_val - a.pct_val;
        })
        .slice(0, vis.numOuterNodes);

    const includedCandidates = vis.selectedOverlapLinks.map(d => d.target);
    console.log(includedCandidates);

    vis.overlapNodes = overlapNodes.filter(d => includedCandidates.includes(d.id) || d.id === vis.centerNodeId);

    // const includedCandidates = vis.overlapNodes.map(d => d.id);
    // vis.selectedOverlapLinks = overlapLinks.filter((d) =>
    //     includedCandidates.includes(d.source)
    //     && includedCandidates.includes(d.target)
    //     // && (d.target === centerNodeId || d.source === centerNodeId));
    //     && (d.source === vis.centerNodeId));

    vis.selectedOverlapLinks.forEach(function(d) {
        d.direction = d.source === vis.centerNodeId ?
            "outbound" :
            "inbound";
    });

    vis.circumferenceCoordinateSet = circlePlotCoordinates(200, [vis.width/2, vis.height/2], vis.numOuterNodes+1);

    vis.simulation = d3.forceSimulation(vis.overlapNodes)
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
        .force("link", d3.forceLink(vis.selectedOverlapLinks).id(d => d.id).distance(200));

    vis.updateVis();

};

NodeLink.prototype.updateVis = function() {
    const vis = this;

    vis.simulation.stop();

    // invalidation.then(() => vis.simulation.stop());

    // const old = new Map(vis.node.data().map(d => [d.id, d]));
    // const nodes = vis.overlapNodes.map(d => Object.assign(old.get(d.id) || {}, d));
    // const links = vis.selectedOverlapLinks.map(d => Object.assign({}, d));
    // console.log(vis.selectedOverlapLinks);

    vis.straightLink = vis.straightLink
        .data(vis.selectedOverlapLinks, (d) => [d.source, d.target])
        .join("line")
        // .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
        .attr("stroke", "#333")
        // .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
        .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));

    // vis.curvedLink = vis.svg.append("g")
    //     .attr("fill", "none")
    //     .attr("stroke-opacity", 0.6)
    //     .selectAll("path")
    //         .data(vis.selectedOverlapLinks)
    //         .join("path")
    //         .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
    //         .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
    //         .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));

    vis.node = vis.node
        .data(vis.overlapNodes, (d) => d.id)
        .join("circle")
            .attr("cx", function(d, i) {
                if (d.id !== vis.centerNodeId) {
                    console.log('here');
                    return vis.circumferenceCoordinateSet[i][0];
                }
            })
            .attr("cy", function(d, i) {
                if (d.id !== vis.centerNodeId) {
                    console.log('here');
                    return vis.circumferenceCoordinateSet[i][1];
                }
            })
            .attr('fx', function(d) {
                return d.id === vis.centerNodeId ? vis.width / 2 : null;
            })
            .attr('fy', function(d) {
                return d.id === vis.centerNodeId ? vis.height / 2 : null;
            })
            .attr("r", (d) => vis.circleRadius(d.total_donors))
            .attr("fill", function(d) {
                // return d.id === vis.centerNodeId ? "red" : "gray";
                return vis.partyColor(d.party);
            })
            .attr("fill-opacity", 1.0)
            .on("mouseover", vis.tip.show)
            .on("mouseout", vis.tip.hide)
            // .classed("fixed", d => d.fixed = true)
            .call(drag(vis.simulation));
            // .call((d) => d.id !== vis.centerNodeId ? drag(simulation) : null);


    vis.simulation.on("tick", () => {
        vis.straightLink
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        // curvedLink.attr("d", linkArc);

        vis.node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
      });

    vis.simulation.alpha(1).restart();
    // vis.simulation.nodes(vis.node);
    // vis.simulation.force("link").links(links);

    console.log(vis.overlapNodes);


};


drag = simulation => {

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
};

function linkArc(d) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
}