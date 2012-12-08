
var url = process.argv[2];

require('./fetcher').analyse(
	url,
	function (rules) {
		console.log(rules)
	}
);