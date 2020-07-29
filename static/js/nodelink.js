// d3 = require("d3@5");

NodeLink = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};


NodeLink.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 1100;
    vis.height = 1100;

    vis.tooltipOrientation = d3.scaleThreshold()
        .domain([-91, -89, -1, 1, 89, 91, 179])
        .range(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width, vis.height]);

    // Initialize hover tooltip on nodes
    vis.tip = d3.tip()
        .attr("class", "d3-tip")
        .direction((d) => d.id === vis.centerNodeId ? "n" : vis.tooltipOrientation(d.nodeAngle))
        .html(function(d) {
            let outputString = '<div>';
            outputString += `<div style="text-align: center;"><span><strong>${d.display_name}</strong></span></div><br>`;
            outputString += `<span>Total Donors:</span> <span style="float: right;">${d3.format(",")(d.total_donors)}</span><br>`;

            const correspondingLink = vis.selectedOverlapLinks.find((x) => x.target === d.id);
            if (typeof correspondingLink !== "undefined") {
                outputString += `<span>Overlap:</span> <span style="float: right;">${d3.format(",")(correspondingLink.raw_val)}</span><br>`;
            }

            outputString += '</div>';

            return outputString
        });
    vis.svg.call(vis.tip);

    vis.minCircleRadius = 12;
    vis.centerNodeRadiusVal = 90;
    // Scales for node radius and with of line depending on overlap percentage
    vis.circleRadius = d3.scalePow()
        // .domain(d3.extent(overlapLinks, (d) => d.pct_val))
        .domain([0, 60])
        .range([vis.minCircleRadius, 70])
        .exponent(1.3);

    vis.lineWidth = d3.scalePow()
        .domain(d3.extent(overlapLinks, (d) => d.pct_val))
        .range([2,18]);

    vis.partyColor = d3.scaleOrdinal()
        .domain(['DEM', 'DFL', 'REP', 'LIB', 'GRE', 'IND'])
        .range(["#0015BC", "#0015BC", "#E9141D", "#FED105", "#508C1B", "gray"])
        .unknown("gray");

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
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            // .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto")
            .style("opacity", 0.8)
        .append("path")
            .attr("fill", vis.pathColor)
            .attr("d", "M0,-5L10,0L0,5");

    vis.straightLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("line");

    vis.curvedLink = vis.svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.6)
        .selectAll("path");

    vis.linkText = vis.svg.append("g")
        .attr('id', 'textPaths')
        .selectAll("text");

    const defs = vis.svg
        .append("defs")
        .attr("id", "imgdefs");

    vis.candidateImages = defs
        .selectAll("pattern")
        .data(overlapNodes, (d) => d.id)
        .join("pattern")
        .attr("id", d => d.id)
        .attr("height", (d) => 1)
        .attr("width", (d) => 1)
        .attr("patternUnits", "objectBoundingBox")
        .append("image")
            .attr("class", "candidate-bubble-images")
            // .attr("id", d => d.id)
            .attr("x", 0)
            .attr("y", 0)
            .attr("xlink:href", d => `/static/images/candidate_images/${d.image_url}`);

    vis.images = vis.svg.append("g")
        .attr("class", "nodelink-images")
        .selectAll("circle.images");

    vis.node = vis.svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle");

    // vis.labels = vis.svg.append("g")
    //     .attr("class", "nodelink-labels")
    //     .selectAll("text");


    vis.wrangleData();
};

NodeLink.prototype.wrangleData = function() {
    const vis = this;

    vis.centerNodeId = featuredCandidateId;
    // vis.centerNodeId = overlapNodes[Math.round(getRandomArbitrary(0, 100))].id;
    // vis.numOuterNodes = 15;

    const direction = "outbound";
    if (direction === "outbound") {
        vis.selectedOverlapLinks = overlapLinks
            .filter((d) =>
                (d.source === vis.centerNodeId || d.source.id === vis.centerNodeId)
                // || (d.target === vis.centerNodeId || d.target.id === vis.centerNodeId) )
                && d.pct_val > overlapThreshold
            );
    }
    else {
        vis.selectedOverlapLinks = overlapLinks
            .filter((d) =>
                // (d.source === vis.centerNodeId || d.source.id === vis.centerNodeId)
                ((d.target === vis.centerNodeId || d.target.id === vis.centerNodeId)
                && d.pct_val > overlapThreshold)
            );
    }

    // Reset the source to contain just the ID
    vis.selectedOverlapLinks.forEach( function(d) {
        d.source = typeof(d.source) === "object" ? d.source.id : d.source;
        d.target = typeof(d.target) === "object" ? d.target.id : d.target;
    });

    const includedCandidates = vis.selectedOverlapLinks.map(d => d.target);
    // console.log(includedCandidates);
    vis.directionalLinks = overlapLinks
        .filter((d) =>
            (includedCandidates.includes(d.source) && (vis.centerNodeId === d.target || vis.centerNodeId === d.target.id))
            || (includedCandidates.includes(d.target) && (vis.centerNodeId === d.source || vis.centerNodeId === d.source.id))

        );

    vis.directionalLinks.forEach(function(d) {
        d.direction = d.source === vis.centerNodeId ?
            "outbound" :
            "inbound";
    });

    vis.directionalLinks.forEach(d => {
        if (d.direction === "outbound") {
            d.x1 = vis.width / 2;
            d.y1 = vis.height / 2;
        }
        // else {
        //     d.x2 = vis.width / 2;
        //     d.y2 = vis.height / 2;
        // }
    });

    vis.overlapNodes = overlapNodes.filter(d => includedCandidates.includes(d.id) || d.id === vis.centerNodeId);
    vis.numOuterNodes = vis.overlapNodes.length - 1;

    // Determine node layout (using multiple rings, if necessary)
    const linkDistance = 450;

    vis.getCircleCoordinates(linkDistance);
    // console.log(vis.circumferenceCoordinateSet);

    let coordinateIndex = 0;
    vis.overlapNodes.forEach(d => {
        const correspondingLink = vis.selectedOverlapLinks.find((x) => x.target === d.id);
        const correspondingOutboundArrow = vis.directionalLinks.find((x) => x.target === d.id);
        const correspondingInboundArrow = vis.directionalLinks.find((x) => x.source === d.id);

        const radiusVal = typeof(correspondingLink) === "undefined" ? vis.centerNodeRadiusVal : correspondingLink.pct_val;
        d.radiusVal =  vis.circleRadius(radiusVal);

        if (d.id !== vis.centerNodeId) {
            d.initialX = d.x = correspondingLink.initialX2 =  vis.circumferenceCoordinateSet[coordinateIndex][0];
            d.initialY = d.y = correspondingLink.initialY2 = vis.circumferenceCoordinateSet[coordinateIndex][1];

            d.nodeAngle = getAngle(vis.width/2, vis.height/2, d.initialX, d.initialY);
            const distanceFromCenter = getDistance(vis.width/2, vis.height/2, d.initialX, d.initialY);
            const adjustedDistance = distanceFromCenter - d.radiusVal;
            const adjustedCoordinates = getCoordinates([vis.width/2, vis.height/2], adjustedDistance, d.nodeAngle);

            correspondingOutboundArrow.x2 = correspondingInboundArrow.x1 = adjustedCoordinates[0];
            correspondingOutboundArrow.y2 = correspondingInboundArrow.y1 = adjustedCoordinates[1];

            const reverseAngle = d.nodeAngle - 180;
            const reverseAdjustedDistance = distanceFromCenter - vis.circleRadius(vis.centerNodeRadiusVal);
            const reverseAdjustedCoordinates = getCoordinates([d.initialX, d.initialY], reverseAdjustedDistance, reverseAngle);

            correspondingInboundArrow.x2 = reverseAdjustedCoordinates[0];
            correspondingInboundArrow.y2 = reverseAdjustedCoordinates[1];

            coordinateIndex += 1;
        }
        else {
            d.initialX = d.x = vis.width / 2;
            d.initialY = d.y = vis.height / 2;
        }
    });

    // console.log(vis.selectedOverlapLinks, vis.overlapNodes);

    // vis.simulation = d3.forceSimulation(vis.overlapNodes)
    //     .force("charge", d3.forceManyBody().strength(450).distanceMax(10))
    //     .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
    //     .force("link", d3.forceLink(vis.selectedOverlapLinks).id(d => d.id).distance(linkDistance))
    //     // .stop();

    vis.updateVis();

};

NodeLink.prototype.updateVis = function() {
    const vis = this;

    const transitionDuration = 800;

    // vis.simulation.stop();

    vis.straightLink = vis.straightLink
        .data(vis.selectedOverlapLinks, (d) => [d.source, d.target])
        .join(
            enter => enter.append("line")
                .style("z-index", 1)
                .attr("class", "straight-link")
                .attr("stroke", "#333")
                .attr("stroke-width", 3)
                .attr("x1", vis.width/2)
                .attr("y1", vis.height/2)
                .attr("x2", vis.width/2)
                .attr("y2", vis.height/2)
                .call(enter => enter.transition()
                    .duration(transitionDuration)
                    .attr("x2", d => d.initialX2)
                    .attr("y2", d => d.initialY2)
                ),
            update => update
                .transition()
                .duration(transitionDuration)
                    .attr("x2", d => d.initialX2)
                    .attr("y2", d => d.initialY2)
        );

    vis.curvedLink =  vis.curvedLink
        .data(vis.directionalLinks, (d) => [d.source, d.target])
        .join("path")
        .attr("class", "directional-link")
        .attr("id", d => {
            return d.direction === "outbound" ?
                `directional-link-${d.target}-outbound` :
                `directional-link-${d.source}-inbound`
        })
        .attr("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
        .style("z-index", 1)
        .attr("stroke-width", (d) => vis.lineWidth(d.pct_val))
        .attr("d", linkArc)
        .style("opacity", 0.0)
        .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.direction}`, location)})`);

    vis.linkText = vis.linkText
        .data(vis.directionalLinks, (d) => [d.source, d.target])
        .join("text")
        .attr("class", "arrow-labels")
        .attr("dy", "-8");

    vis.linkText.selectAll("textPath").remove();
    vis.linkText
        .append("textPath")
        // .append("textPath") //append a textPath to the text element
            .attr("xlink:href", d => {
                return d.direction === "outbound" ?
                    `#directional-link-${d.target}-outbound` :
                    `#directional-link-${d.source}-inbound`
            })
            .attr("class", d => {
                return d.direction === "outbound" ?
                    `textpath textpath-${d.target}` :
                    `textpath textpath-${d.source}`
            })
            .classed('noselect', true)
            .style("text-anchor","middle")
            .style("opacity", 0)
            .style("font-size", "10px")
            .attr("startOffset", d => d.direction === "outbound" ? "62%" : "50%")
            .style("stroke", (d) => d.direction === "outbound" ? "blue" : "green")
            .text((d) => {
                return `${d3.format(".0f")(d.pct_val)}% of ${d.source_name} donors donated to ${d.target_name}`
            });

    // console.log(vis.curvedLink);

    vis.svg.selectAll(".candidate-bubble-images")
        .transition()
        .duration(transitionDuration)
            .attr("height", (d) => typeof d.radiusVal === "undefined" ? 0 : d.radiusVal*2)
            .attr("width", (d) =>  typeof d.radiusVal === "undefined" ? 0 : d.radiusVal*2);

    vis.images = vis.images
        .data(vis.overlapNodes, (d) => d.id)
        .join(
            enter => enter.append("circle")
                .attr("class", "images")
                .style("fill", d => `url(#${d.id})`)
                .attr("cx", vis.width/2)
                .attr("cy", vis.height/2)
                .attr("x", vis.width/2)
                .attr("y", vis.height/2)
                .call(enter => enter.transition()
                    .duration(transitionDuration)
                    .attr("r", d => d.radiusVal)
                    .attr("cx", (d) => d.initialX)
                    .attr("cy", (d) => d.initialY)
                    .attr("cx", (d) => d.initialX)
                    .attr("cy", (d) => d.initialY)
                    .attr("x", vis.width/2)
                    .attr("y", vis.height/2)
                ),

            update => update
                .transition()
                    .duration(transitionDuration)
                    .attr("r", d => d.radiusVal)
                    .attr("cx", (d) => d.initialX)
                    .attr("cy", (d) => d.initialY)
                    .attr("cx", (d) => d.initialX)
                    .attr("cy", (d) => d.initialY)
                    .attr("x", vis.width/2)
                    .attr("y", vis.height/2)
        );


    vis.node = vis.node
        .data(vis.overlapNodes, (d) => d.id)
        .join(
            enter => enter.append("circle")
                .attr("fill", (d) => vis.partyColor(d.party))
                .attr("fill-opacity", 0.2)
                .style("z-index", 10)
                .on("mouseover", (d) => {
                    vis.tip.show(d);

                    if (d.id !== vis.centerNodeId) {
                        vis.svg.selectAll(".straight-link")
                            .style("opacity", 0);

                        vis.svg.selectAll(`#directional-link-${d.id}-outbound, #directional-link-${d.id}-inbound`)
                            .style("opacity", 0.8);

                        vis.svg.selectAll(`.textpath-${d.id}`)
                            .style("opacity", 1.0);
                    }

                })
                .on("mouseout", (d) => {
                    vis.tip.hide();

                    vis.svg.selectAll('.directional-link')
                        .style("opacity", 0);

                    vis.svg.selectAll(".straight-link")
                        .style("opacity", 1);

                    vis.svg.selectAll('.textpath')
                        .style('opacity', 0);

                })
                .on("dblclick", (d) => {
                    $("#overlap-nodelink-candidate-select").val(d.id);
                    document.querySelector("#overlap-nodelink-candidate-select").fstdropdown.rebind();
                    featuredCandidateId = d.id;
                    // vis.simulation.stop();
                    vis.wrangleData();
                })
                .attr("cx", vis.width/2)
                .attr("cy", vis.height/2)
                .attr("x", vis.width/2)
                .attr("y", vis.height/2)
                .style("stroke-width", "2px")
                .style("stroke", d => vis.partyColor(d.party))
                // .call(drag(vis.simulation))
                .call(enter => enter.transition()
                    .duration(transitionDuration)
                    .attr("cx", (d) => d.initialX)
                    .attr("cy", (d) => d.initialY)

                    .attr("x", (d) => d.initialX)
                    .attr("y", (d) => d.initialY)

                    // .attr("fx", (d) => d.initialX)
                    // .attr("fy", (d) => d.initialY)

                    .attr("r", d => d.radiusVal)
                ),

            update => update.transition()
                .duration(transitionDuration)
                .attr("cx", (d) => d.initialX)
                .attr("cy", (d) => d.initialY)

                .attr("x", (d) => d.initialX)
                .attr("y", (d) => d.initialY)

                // .attr("fx", (d) => d.initialX)
                // .attr("fy", (d) => d.initialY)

                .attr("r", d => d.radiusVal)


        );

    // vis.labels = vis.labels
    //     .data(vis.overlapNodes, (d) => d.id)
    //     .join("text")
    //     .attr("dx", 12)
    //     .attr("dy", ".35em")
    //     .style("stroke", "black")
    //     .text((d) => d.display_name );

    // vis.simulation.on("tick", () => {
    //     vis.straightLink
    //         // .attr("x1", d => d.source.x)
    //         // .attr("y1", d => d.source.y)
    //         // This x1/y1 (opposed to the one above) will work to pin the featured candidate bubble to the center
    //         .attr("x1", vis.width / 2)
    //         .attr("y1", vis.height / 2)
    //         .attr("x2", d => d.target.x)
    //         .attr("y2", d => d.target.y);
    //
    //     vis.curvedLink.attr("d", linkArc);
    //
    //     vis.node
    //         // These conditionals work to pin the featured candidate bubble to the center
    //         .attr("cx", d => d.id === vis.centerNodeId ? vis.width / 2 : d.x)
    //         .attr("cy", d => d.id === vis.centerNodeId ? vis.height / 2 : d.y);
    //
    //     vis.images
    //         .attr("cx", d => d.id === vis.centerNodeId ? vis.width / 2 : d.x)
    //         .attr("cy", d => d.id === vis.centerNodeId ? vis.height / 2 : d.y)
    //   });

    // vis.simulation.alpha(1).restart();
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

        // if (d.id !== featuredCandidateId) {
            d.fx = null;
            d.fy = null;
        // }
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
};

function linkArc(d) {
    // console.log(d);
  const r = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
  return `
    M${d.x1},${d.y1}
    A${r},${r} 0 0,1 ${d.x2},${d.y2}
  `;
}


NodeLink.prototype.getCircleCoordinates = function(linkDistance) {
    const vis = this;

    const ringCircumference = linkDistance*2*Math.PI;
    const nodeSpace = ringCircumference / vis.numOuterNodes;

    // console.log(nodeSpace, 2*(vis.minCircleRadius+8));
    if ( nodeSpace > 2*(vis.minCircleRadius + 8) ) {
        vis.circumferenceCoordinateSet = circlePlotCoordinates(linkDistance, [vis.width / 2, vis.height / 2], vis.numOuterNodes);
    }
    else {
        let nodePadding = 8;
        let nodeDiameter = ((2*vis.minCircleRadius) + nodePadding);
        const numRings = Math.ceil((nodeDiameter * vis.numOuterNodes) / ringCircumference);

        // const numRings = Math.ceil(ringCircumference / (2*vis.minCircleRadius + 8));
        const baseRadius = linkDistance - 50;

        vis.circumferenceCoordinateSet = [];
        for(let i=0; i<numRings; i++) {
            let chunkSize = vis.numOuterNodes / numRings;
            if (i === numRings-1) {
                chunkSize = Math.ceil(chunkSize);
            }
            else {
                chunkSize = Math.floor(chunkSize);
            }

            vis.circumferenceCoordinateSet = vis.circumferenceCoordinateSet.concat( circlePlotCoordinates((baseRadius + i*100), [vis.width / 2, vis.height / 2], chunkSize) );
        }

    }
};