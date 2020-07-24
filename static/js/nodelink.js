// d3 = require("d3@5");

NodeLink = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};


NodeLink.prototype.initVis = function() {
    const vis = this;

    vis.numOuterNodes = 20;
    overlapNodes = overlapNodes.slice(0,vis.numOuterNodes+1);
    const centerNodeId = overlapNodes[Math.round(getRandomArbitrary(0, vis.numOuterNodes))].id;

    const includedCandidates = overlapNodes.map(d => d.id);
    let selectedOverlapLinks = overlapLinks.filter((d) =>
        includedCandidates.includes(d.source)
        && includedCandidates.includes(d.target)
        // && (d.target === centerNodeId || d.source === centerNodeId));
        && (d.source === centerNodeId));

    selectedOverlapLinks.forEach(function(d) {
        d.direction = d.source === centerNodeId ?
            "outbound" :
            "inbound";
    });

    console.log(selectedOverlapLinks);


    vis.width = 800;
    vis.height = 800;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width, vis.height]);

    vis.tip = d3.tip()
        .attr("class", "d3-tip")
        .html(function(d) {
            return d.display_name;
        });
    vis.svg.call(vis.tip);

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

    vis.circleRadius = d3.scaleLog()
        .domain(d3.extent(overlapNodes, (d) => d.total_donors))
        .range([10, 40]);

    vis.lineWidth = d3.scaleLog()
        .domain(d3.extent(selectedOverlapLinks, (d) => d.pct_val))
        .range([1,20]);

    const simulation = d3.forceSimulation(overlapNodes)
        .force("link", d3.forceLink(selectedOverlapLinks).id(d => d.id).distance(300))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(vis.width / 2, vis.height / 2));

    const straightLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
            .data(selectedOverlapLinks)
            .join("line")
            .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
            // .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
            .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));

    // const curvedLink = vis.svg.append("g")
    //     .attr("fill", "none")
    //     .attr("stroke-opacity", 0.6)
    //     .selectAll("path")
    //         .data(selectedOverlapLinks)
    //         .join("path")
    //         .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
    //         .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`)
    //         .attr("stroke-width", (d) => vis.lineWidth(d.pct_val));

    const node = vis.svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        // .attr("stroke-linecap", "round")
        // .attr("stroke-linejoin", "round")
        .selectAll("circle")
        .data(overlapNodes)
        .join("circle")
            .attr('fx', function(d) {
                return d.id === centerNodeId ? vis.width / 2 : null;
            })
            .attr('fy', function(d) {
                return d.id === centerNodeId ? vis.height / 2 : null;
            })
            .attr("r", (d) => vis.circleRadius(d.total_donors))
            .attr("fill", function(d) {
                return d.id === centerNodeId ? "red" : "gray";
            })
            .on("mouseover", vis.tip.show)
            .on("mouseout", vis.tip.hide)
            // .classed("fixed", d => d.fixed = true)
            .call(drag(simulation));
            // .call((d) => d.id !== centerNodeId ? drag(simulation) : null);


    simulation.on("tick", () => {
        straightLink
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            // .attr('transform', function(d) {
            //     let translationVal = d.source.id === centerNodeId ? 4 : -4;
            //     const translation = vis.calcTranslationApproximate(translationVal, d.source, d.target);
            //     return `translate (${translation.dx}, ${translation.dy})`;
            // });

        // curvedLink.attr("d", linkArc);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
      });


    vis.wrangleData();
};

NodeLink.prototype.wrangleData = function() {
    const vis = this;



    vis.updateVis();

};

NodeLink.prototype.updateVis = function() {

};

NodeLink.prototype.calcTranslationApproximate = function(targetDistance, point0, point1) {
    let x1_x0 = point1.x - point0.x,
        y1_y0 = point1.y - point0.y,
        x2_x0, y2_y0;
    if (targetDistance === 0) {
      x2_x0 = y2_y0 = 0;
    }
    else if (y1_y0 === 0 || Math.abs(x1_x0 / y1_y0) > 1) {
      y2_y0 = -targetDistance;
      x2_x0 = targetDistance * y1_y0 / x1_x0;
    }
    else {
      x2_x0 = targetDistance;
      y2_y0 = targetDistance * (-x1_x0) / y1_y0;
    }
    return {
      dx: x2_x0,
      dy: y2_y0
    };
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