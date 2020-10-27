
// ======== GLOBALS ======== //
let phoneBrowsing = false;

// Initialize opacity level for hidden annotation slides (this will be overriden to 0 if the slides are fixed at the top on mobile)
let hiddenOpacity = 0.2;

// Declare indices to be used by scroll controller
let activeIndex;
let lastIndex;

// Initial scroll direction is set to down since the user can only move in one direction
// (this will override almost immediately anyway)
let scrollDirection = 'down';

// Declare scrollerDiv, which will designate which set of divs are used to track scroll steps ('.step' on Desktop, '.mobile-spacer' on Mobile)
// And scrollerDivObjects, an array of all divs of this type, used for setting dynamic heights for tile wrappers
let scrollerDiv;
let scrollerDivObjects;
// Declare scroll object, which dispatch scroll trigger events (using code in scroller.js)
let scroll;
// Initialize an array of activate functions which will activate on scroll for corresponding annotation slides
let activateFunctions = [];

// Min width that browser window must be before switching to phoneBrowsing mode (even on Desktop, it will display everything as if on Mobile)
const phoneBrowsingCutoff = 1100;

// Datasets
let overlapNodes = null;
let overlapLinks = null;
// let stateMap = null;
// let beeswarmMoneyBlocks = null;
// let stateSummaryCounts = null;
let candidateMeta = null;
let donorDemographics = null;
let nonDistrictDonorDemographics = null;
let candidateIdNames = null;
// let superPACblocks = null;

let bubblePlotDataset = null;

let overlapThreshold = 7;
let featuredCandidateId = "H8NY15148";

const partyColor = d3.scaleOrdinal()
        .domain(['DEM', 'DFL', 'REP', 'LIB', 'GRE', 'IND'])
        .range(["#0015BC", "#0015BC", "#E9141D", "#FED105", "#508C1B", "gray"])
        .unknown("gray");


// ======== END GLOBALS ======== //

// Determine whether to enter phoneBrowsing mode based on browser window width or browser type (uses phoneBrowsingCutoff as threshold of window width)
// Then, execute a lot of code/formatting that depends on whether the user is on Mobile or Desktop
function determinePhoneBrowsing() {
    // Determine if the user is browsing on mobile based on browser window width or browser type
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < phoneBrowsingCutoff) {
        phoneBrowsing = true;
    }

    //
    if (phoneBrowsing === true) {
        $(".step")
            .css("font-size", "18pt");

        $(".step .body")
            .css("font-size", "18pt");
    }

    // On mobile, fade non-current annotation slides to 0, because they are all fixed at the top and overlapping
    // On desktop keep them visible, but low opacity
    if (phoneBrowsing === true) {
        hiddenOpacity = 0.0;
    }
    else {
        hiddenOpacity = 0.2;
    }

    // If mobile, and annotations are up top, adjust top-padding on viz-tiles to make room for fixed-position annotation
    if (phoneBrowsing === true) {
        // setDynamicPadding('#sunburst-tile', 1, 7);       // Keep this, but populate with correct element ID and indices
        // setDynamicPadding('#flowchart-tile', 8, 13);     // Keep this, but populate with correct element ID and indices
    }
}



// Apply necessary trnsformations to the data loaded in the dataset
// A lot of this data was prepared for analysis (and should stay that way), but needs to be in a different form for the visualizations
function preprocessDataset(dataset) {
    dataset.forEach(function(d) {

    });

    return dataset;
}

// Down arrow scroll trigger
function setScrollArrow() {
    $(".downArrow").on("click", function() {
        // If mobile, arrow will be with them the whole time
        // if (phoneBrowsing === true) {

            // // If first scroll from intro block
            // if ($(window).scrollTop() < window.innerHeight) {
            //     $('html, body').animate({scrollTop: $('#sunburst-wrapper').offset().top }, 'slow');
            // }
            // // If at joint between sunburst/flowchart, be specific
            // else if ($("#last-sunburst-annotation").css("opacity") === "1") {
            //     $('html, body').animate({scrollTop: $('#flowchart-wrapper').offset().top }, 'slow');
            // }
            // // If at joint between flowchart and conclusion, be specific
            // else if ($("#last-flowchart-annotation").css("opacity") === "1") {
            //     $('html, body').animate({scrollTop: $('#end-text-block').offset().top - 100 }, 'slow');
            // }
            // else {
            //     $('html, body').animate({scrollTop: `+=${$(".mobile-spacer").css("height")}`}, 'fast');
            // }

            // scrollSpeed = 'fast';
        // }

        // If on Desktop, arrow stays at the top and only needs this one trigger
        // else {
            $('html, body').animate({scrollTop: $('#first-annotation').offset().top + 150}, 'slow');
        // }
    });

    // If on mobile, the down arrow is fixed at the bottom of the screen and can be used to move from section to section the whole time
    // It should also be a little larger and re-centered
    if (phoneBrowsing === true) {
        $(".downArrow img")
            .attr("width", "70px")
            .attr("height", "70px");

        // $(".downArrow")
        //     .css("text-align", "center")
        //     .css("position", "fixed")
        //     .css("left", `calc(50% - 35px)`);
    }
}



// Window re-size/scroll functions
function setWindowFunctions() {
    $(window)
        .resize(function () {
            // If window is re-sized to above/below mobile cutoff, refresh the page
            if ((phoneBrowsing === true && window.innerWidth > phoneBrowsingCutoff)
                || (phoneBrowsing === false && window.innerWidth < phoneBrowsingCutoff)) {

                this.location.reload(false);
            }

        })
        // Hide the scroll arrow if the user passes a certain scroll height (past the top of the sunburst on Desktop,
        // a little before the end text on mobile)
        .scroll(function () {
            let arrowFadeHeight = (phoneBrowsing === true) ?
                $('#end-text-block').offset().top - 110 :
                $('#sunburst-wrapper').offset().top;

            if ($(window).scrollTop() > arrowFadeHeight) {
                $(".downArrow")
                    .css("opacity", 0.0);
                // .fadeTo( "fast" , 0);
            }
            else {
                $(".downArrow")
                    .css("opacity", 1.0);
                // .fadeTo( "fast" , 1);
            }
        });
}


// Initialize timeline slider
function initSlider() {

    const updateSliderLabel = () => {
        const range = document.getElementById('min-overlap-threshold');
        const rangeLabel = document.getElementById('min-overlap-slider-label');

        rangeLabel.innerHTML = `<span>${overlapThreshold}%</span>`;
        const newVal = Number(((overlapThreshold - range.min) * 100) / (range.max - range.min));
        rangeLabel.style.left = `calc(${newVal}% + (${8 - newVal * 0.15}px))`;
    };

    $("#min-overlap-threshold").on('input', () => {
        const range = document.getElementById('min-overlap-threshold');

        overlapThreshold = range.value;
        // nodeLink.wrangleData();

        updateSliderLabel();
    });

    updateSliderLabel();

}

function buildCandidateDropdowns() {

    let htmlString = "";
    overlapNodes.forEach(d => {
        htmlString += `<option class="candidate-option" id="candidate-${d.id}" value="${d.id}">${d.display_name}</option>`;
    });

    $('#overlap-nodelink-candidate-select').append(htmlString);
    $("#overlap-nodelink-candidate-select").val(featuredCandidateId);
    document.querySelector("#overlap-nodelink-candidate-select").fstdropdown.rebind();

    $("#overlap-nodelink-candidate-select")
        .on("change", () => {
            featuredCandidateId = $("#overlap-nodelink-candidate-select").val();
            nodeLink.wrangleData();
        })

}


// This will run if a user loads/reloads in the middle of the screen. It will run all activate functions that
// should have run by the given Y Position
function catchupPagePosition(startYPosition) {
    $(".step").toArray().forEach( function(step, i) {

        const topMargin = parseInt($(step).css("margin-top"));

        // Run every activate function that should have run by this point on the page
        if (startYPosition + topMargin > $(step).offset().top) {
            // console.log(i);
            activateFunctions[i]();
        }
    });
}


// Wrapper function for activate functions
// Changes opacity of annotation text, sets scroll direction and makes sure that all activate functions that should trigger,
// do trigger on a fast scroll (rather than skipping intermediate sections)
function activate(index) {

    // Fade/show corresponding annotation slide
    $("section.step")
        // .css("opacity", hiddenOpacity)
        .css("z-index", 10);

    if (index-1 > 0) {
        $("section.step").eq(index - 1)
            // .css("opacity", 1.0)
            .css("z-index", 51);
    }

    activeIndex = index;

    if (lastIndex > activeIndex) {
        scrollDirection = 'up'
    }
    else {
        scrollDirection = 'down';
    }

    // Make sure that all activateFunctions between the activeIndex and the lastIndex run, in case of a fast scroll
    const sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    const scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function(i) {
        if (i-1 >= 0) {
            console.log(i);
            activateFunctions[i - 1]();
        }
    });

    lastIndex = activeIndex;
};


function setScrollDispatcher() {

    // Initialize scroll object (from scroller.js)
    scroll = scroller()
        .container(d3.select('body'));

    // Set the div elements that will be used to determine index for activate functions
    // If on mobile, the scrollerDiv used to identify the scroll controller sections will be the '.mobile-spacer' divs
    // If on desktop, it will be the '.step' divs with the annotation content (on mobile these are all fixed to the top)
    if (phoneBrowsing === true) {
        scrollerDiv = '.mobile-spacer';
    }
    else {
        scrollerDiv = '.step';
    }
    scroll(d3.selectAll(scrollerDiv));


    // When the dispatcher sends an 'active' event run the activate wrapper function
    // It dispatches this even every time it hits a new full index (annotation slide)
    scroll.on('active', function(index){
        console.log(index);

        activate(index);
    });

    // When the dispatcher sends a 'progress event', it'll look for a few unique triggers
    // It sends these any time the user scrolls.
    // The 'index' will the int value of the current annotation index.
    // The 'progress' will be a float that represents how far the user has progressed within that index
    // (e.g. progress will equal 0.45 when the user is 45% through the given index)
    scroll.on('progress', function(index, progress) {
        
    });

}


function setDynamicPadding(tileID, startIndex, endIndex) {
    let maxAnnotationHeight = 150;
    $(".step").toArray().slice(startIndex, endIndex+1).forEach(function (annotationBox) {
        const boxHeight = annotationBox.getBoundingClientRect().height;
        if (boxHeight > maxAnnotationHeight) {
            maxAnnotationHeight = boxHeight;
        }
    });

    $(".step").toArray().slice(startIndex, endIndex+1).forEach(function (annotationBox) {
        $(annotationBox)
            .css("min-height", 0.7*maxAnnotationHeight);
    });

    $(tileID)
        .css("padding-top", maxAnnotationHeight);

    console.log(maxAnnotationHeight);
}


// Populate activateFunctions array with functions that will trigger on corresponding annotation slides
function setActivateFunctions() {
    scrollerDivObjects = $(scrollerDiv);

    // These are example from another project. You'll need to set your own activate functions, but these are kept in as a template

    // Intro tile functions
    activateFunctions[0] = () => {

    };
    activateFunctions[1] = () => {
        // if (scrollDirection === "up") {
        //     bubblePlot.oneAxis("majority_white_zipcode_pct", null);
        // }
    };
    activateFunctions[2] = () => {
        if (scrollDirection === "up") {
            bubblePlot.oneAxis("majority_white_zipcode_pct", null);
        }
    };
    activateFunctions[3] = () => {
        if (scrollDirection === "up") {
            bubblePlot.plotLabelContainer.selectAll('text.label').remove();
        }

        bubblePlot.oneAxis(null, "high_bachelors_zipcode_pct");
    };
    activateFunctions[4] = () => {
        bubblePlot.simulation.stop();

        bubblePlot.xAxis
            .style('opacity', 1.0)
            .attr("transform", "translate(0," + bubblePlot.height + ")");
        bubblePlot.xAxisLabel
            .style('opacity', 1.0)
            .attr("transform", `translate(${bubblePlot.width / 2}, ${bubblePlot.height + 38})`);
        bubblePlot.xAxisTip
            .style('opacity', 1.0)
            .attr("transform", `translate(${bubblePlot.width}, ${bubblePlot.height - 15})`);

        if (scrollDirection === "up") {
            bubblePlot.resetHighlighting();
        }
        bubblePlot.wrangleData();

    };
    activateFunctions[5] = () => {
        bubblePlot.highlightParty(['REP']);
    };
    activateFunctions[6] = () => {
        bubblePlot.highlightParty(['DEM', 'DFL']);
    };
    activateFunctions[7] = () => {
        bubblePlot.highlightCandidates(['SANDERS', 'KLOBUCHAR']);
        // bubblePlot.highlightCandidates(['OCASIO-CORTEZ', 'OMAR', 'PRESSLEY', 'TLAIB', 'BUSH', 'BOWMAN']);
    };
    activateFunctions[8] = () => {
        // bubblePlot.highlightCandidates(['SANDERS', 'KLOBUCHAR']);

        if (scrollDirection === "up") {
            bubblePlotDataset = donorDemographics;
            bubblePlot.wrangleData();
        }
        bubblePlot.highlightCandidates(['OCASIO-CORTEZ', 'OMAR', 'PRESSLEY', 'TLAIB', 'BUSH', 'BOWMAN', 'KHANNA']);
    };
    activateFunctions[9] = () => {
        // bubblePlot.highlightCandidates(['SANDERS', 'KLOBUCHAR']);
        bubblePlot.resetHighlighting();
        bubblePlotDataset = nonDistrictDonorDemographics;

        bubblePlot.yVariable = 'education';
        bubblePlot.wrangleData();
    };
    activateFunctions[10] = () => {
        bubblePlot.resetHighlighting();
        bubblePlot.yVariable = 'income';
        bubblePlot.wrangleData();
    };


}


// Use the boundingRects of annotation tiles that correspond with a given tile to determine the height of the wrapper div
// Actual visualization tiles are set with position: sticky, so the height of the surrounding wrapper div will determine when they stop moving with the scroll
function setTileWrapperHeights() {

    // These are examples from another project. You'll need to set your own wrapper heights using the tile IDs and the annotation indices, but these are kept in as a template

    // Sunburst annotations run from the second annotation div (first visible) to the ninth (top of ten)
    // There's a little extra finagling at the end to get the margin between the two viz wrappers correct
    // const beeswarmWrapperHeight = scrollerDivObjects[13].getBoundingClientRect().bottom - scrollerDivObjects[1].getBoundingClientRect().top - 200;
    // $("#beeswarm-wrapper")
    //     .css("height", beeswarmWrapperHeight);


    const bubblePlotWrapperHeight = scrollerDivObjects[10].getBoundingClientRect().bottom - scrollerDivObjects[0].getBoundingClientRect().top;
    $("#bubbleplot-wrapper")
        .css("height", bubblePlotWrapperHeight);

    // // Flowchart annotation divs run from the tenth annotation div to the fourteenth
    // const flowChartWrapperHeight = scrollerDivObjects[scrollerDivObjects.length - 1].getBoundingClientRect().top - scrollerDivObjects[9].getBoundingClientRect().top + 700;
    // $("#flowchart-wrapper")
    //     .css("height", flowChartWrapperHeight);
}


function main() {

    // Begin loading datafiles
    const promises = [
        // d3.json("static/data/candidate_overlap_links.json"),
        // d3.json("static/data/candidate_overlap_nodes.json"),
        // d3.json("static/data/states.geojson"),
        // d3.json("static/data/beeswarm_money_blocks.json"),
        // d3.json("static/data/state_summary_counts.json"),
        d3.csv("static/data/candidates_meta.csv"),
        d3.csv("static/data/donor_demographics.csv"),
        d3.csv("static/data/donor_demographics_excluding_district.csv"),
        d3.json("static/data/candidate_id_name_lookup.json")
        // d3.json("static/data/super_pac_money_blocks.json")
    ];

    // Initialize both main viz tiles to faded
    // $("#sunburst-tile")
    //     .css("opacity", 0.2);

    // $("#flowchart-tile")
    //     .css("opacity", 0.2);

    determinePhoneBrowsing();
    setScrollArrow();
    // setWindowFunctions();
    setScrollDispatcher();
    setActivateFunctions();
    setTileWrapperHeights();

    Promise.all(promises).then(function(allData) {

        // overlapLinks = allData[0];
        // overlapNodes = allData[1];

        // stateMap = allData[2];
        // beeswarmMoneyBlocks = allData[3];
        // stateSummaryCounts = allData[4];
        candidateMeta = allData[0];
        candidateMeta
            .forEach(d => d.total_receipts = +d.total_receipts);
        donorDemographics = allData[1];
        nonDistrictDonorDemographics = allData[2];
        candidateIdNames = allData[3];
        // superPACblocks = allData[8];

        $(".loadring-container")
            .hide();

        $("#intro-wrapper")
            .css("visibility", "visible");

        $(".downArrow")
            .css("visibility", "visible");

        // initSlider();
        // buildCandidateDropdowns();

        // beeSwarm = new BeeSwarm("#beeswarm-area");
        bubblePlotDataset = donorDemographics;
        bubblePlot = new BubblePlot("#bubbleplot-area");
        bubblePlot.oneAxis("majority_white_zipcode_pct" , null);
        // nodeLink = new NodeLink("#nodelink-area");


        // If user loads visualization in the middle of the page, run all activate functions that they should have passed
        // already to "catch them up"
        const startingOffset = window.pageYOffset;
        if (startingOffset > 5) {
            catchupPagePosition(startingOffset);
        }
    });
}

main();






