
// Used on flowchart/timeline for adding days to a given date and returning a new Date object
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Used on flowchart/timeline for adding months to a given date and returning a new Date object
function addMonths(date, months) {
	returnDate = new Date(date.getTime());
	returnDate.setMonth(date.getMonth() + months);
	return returnDate;
}

// Used on flowchart/timeline for getting the difference, in months, between two dates
function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months;
}

// Used on flowchart highlight tile for getting a random int within a range
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

// Used for explicit wait before functions
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Used for setting/getting the corresponding element class/id for an outcome value with a space in it
function formatSpacedStrings(str) {
    return str.replace(/ /g, '-').replace(/\//g, '-');
}