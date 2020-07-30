

BeeSwarm = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

BeeSwarm.prototype.initVis = function() {
    const vis = this;

    // Set height/width of viewBox
    vis.width = 1400;
    vis.height = 1400;

    // Initialize SVG
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("viewBox", [0, 0, vis.width, vis.height]);



    vis.wrangleData();
};

BeeSwarm.prototype.wrangleData = function() {
    const vis = this;

    vis.updateVis();

};

BeeSwarm.prototype.updateVis = function() {
    const vis = this;

};