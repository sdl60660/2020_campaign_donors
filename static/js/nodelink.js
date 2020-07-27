// d3 = require("d3@5");

NodeLink = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};


NodeLink.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 1200;
    vis.height = 1200;

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
    vis.circleRadius = d3.scalePow()
        // .domain(d3.extent(overlapLinks, (d) => d.pct_val))
        .domain([0, 60])
        .range([4, 50])
        .exponent(1.3);

    vis.lineWidth = d3.scalePow()
        .domain(d3.extent(overlapLinks, (d) => d.pct_val))
        .range([2,5]);

    vis.partyColor = d3.scaleOrdinal()
        .domain(['DEM', 'DFL', 'REP', 'LIB', 'GRE', 'IND'])
        .range(["#0015BC", "#0015BC", "#E9141D", "#FED105", "#508C1B", "gray"])
        .unknown("gray");

    vis.straightLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("line");

    vis.curvedLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("path");


    vis.node = vis.svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle");


    vis.wrangleData();
};

NodeLink.prototype.wrangleData = function() {
    const vis = this;

    vis.centerNodeId = featuredCandidateId;
    // vis.centerNodeId = overlapNodes[Math.round(getRandomArbitrary(0, 100))].id;
    // vis.numOuterNodes = 15;

    // console.log(overlapLinks);

    // console.log(overlapThreshold);

    vis.selectedOverlapLinks = overlapLinks
        .filter((d) =>
            (d.source === vis.centerNodeId || d.source.id === vis.centerNodeId)
            // || (d.target === vis.centerNodeId || d.target.id === vis.centerNodeId) )
            && d.pct_val > overlapThreshold
        );

    // Reset the source to contain just the ID
    vis.selectedOverlapLinks.forEach( function(d) {
        d.source = typeof(d.source) === "object" ? d.source.id : d.source;
        d.target = typeof(d.target) === "object" ? d.target.id : d.target;
    });

    // console.log(vis.selectedOverlapLinks);

    // vis.selectedOverlapLinks = vis.selectedOverlapLinks
    //     .sort(function(a, b) {
    //         return b.pct_val - a.pct_val;
    //     });
        // .slice(0, vis.numOuterNodes);

    const includedCandidates = vis.selectedOverlapLinks.map(d => d.target);
    // console.log(includedCandidates);
    vis.directionalLinks = overlapLinks
        .filter((d) =>
            (includedCandidates.includes(d.source) && (vis.centerNodeId === d.target || vis.centerNodeId === d.target.id))
            || (includedCandidates.includes(d.target) && (vis.centerNodeId === d.source || vis.centerNodeId === d.source.id))

        );

    // console.log(vis.directionalLinks.length);

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

    vis.numOuterNodes = vis.overlapNodes.length - 1;
    vis.circumferenceCoordinateSet = circlePlotCoordinates(200, [vis.width/2, vis.height/2], vis.numOuterNodes+1);

    vis.simulation = d3.forceSimulation(vis.overlapNodes)
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
        .force("link", d3.forceLink(vis.selectedOverlapLinks).id(d => d.id).distance(300));

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
        .style("z-index", 1)
        // .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
        .attr("stroke", "#333")
        // .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
        // .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));
        .attr("stroke-width", 3);

    // vis.curvedLink =  vis.curvedLink
    //     .data(vis.directionalLinks)
    //     .join("path")
    //     .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
    //     // .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
    //     .style("z-index", 1)
    //     .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));

    vis.node = vis.node
        .data(vis.overlapNodes, (d) => d.id)
        .join("circle")
            .attr("cx", function(d, i) {
                if (d.id !== vis.centerNodeId) {
                    return vis.circumferenceCoordinateSet[i][0];
                }
            })
            .attr("cy", function(d, i) {
                if (d.id !== vis.centerNodeId) {
                    return vis.circumferenceCoordinateSet[i][1];
                }
            })
            .attr('fx', function(d) {
                return d.id === vis.centerNodeId ? vis.width / 2 : null;
            })
            .attr('fy', function(d) {
                return d.id === vis.centerNodeId ? vis.height / 2 : null;
            })
            .attr("r", function(d) {
                // console.log(vis.selectedOverlapLinks, d.id);
                const correspondingLink = vis.selectedOverlapLinks.find((x) => x.target.id === d.id);
                const radiusVal = typeof(correspondingLink) === "undefined" ? 70 : correspondingLink.pct_val;
                return vis.circleRadius(radiusVal)
            })
            .attr("fill", function(d) {
                // return d.id === vis.centerNodeId ? "red" : "gray";
                return vis.partyColor(d.party);
            })
            .attr("fill-opacity", 1.0)
            .style("z-index", 10)
            .on("mouseover", (d) => { vis.tip.show(d);})
            .on("mouseout", vis.tip.hide)
            // .classed("fixed", d => d.fixed = true)
            .call(drag(vis.simulation));
            // .call((d) => d.id !== vis.centerNodeId ? drag(simulation) : null);


    vis.simulation.on("tick", () => {
        vis.straightLink
            // .attr("x1", d => d.source.x)
            // .attr("y1", d => d.source.y)
            // This x1/y1 (opposed to the one above) will work to pin the featured candidate bubble to the center
            .attr("x1", vis.width / 2)
            .attr("y1", vis.height / 2)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        vis.curvedLink.attr("d", linkArc);

        vis.node
            // These conditionals work to pin the featured candidate bubble to the center
            .attr("cx", d => d.id === vis.centerNodeId ? vis.width / 2 : d.x)
            .attr("cy", d => d.id === vis.centerNodeId ? vis.height / 2 : d.y);
      });

    vis.simulation.alpha(1).restart();
    // vis.simulation.nodes(vis.node);
    // vis.simulation.force("link").links(links);

    // console.log(vis.overlapNodes);


};


drag = simulation => {

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {

      // Conditional added to pin feature candidate to the center
      if (d.id !== featuredCandidateId) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
      }
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