
var nodestat = require('node-stat');
var domain = require('domain');
var os = require('os');

var current;

var corecount = os.cpus().length;

// initialize
exports.init = function() {
	current = this;
};

exports.configure = function() {
};

function fix(value) {
	if (!value) {
		return Number(value);
	}
	var lastchar = value.charAt(value.length-1);
	if (lastchar === 'B' || lastchar === 'k' || lastchar === 'M' || lastchar === 'G') {
		//return value;
		value = Number(value.substring(0,value.length-1));
		if (lastchar === 'k') {
			value = Math.round(value * 1024);
		}
		if (lastchar === 'M') {
			value = Math.round(value * 1024 * 1024);
		}
		if (lastchar === 'G') {
			value = Math.round(value * 1024 * 1024 * 1024);
		}
	}
	return Number(value);
}

var d = domain.create();

d.run(function() {
	var interval = 1000;
	function retrieve() {
		var next = Date.now() + interval;
		nodestat.get('stat','load','net','mem','disk', function(err,data) {
			if (err) {
				console.error(err.message);
			} else {
				if (current && current.connected) {
					data.stat.cpu.core = corecount;
					current.json('stat', 'collect', data);
				}
			}
			var wait = Math.max(0, next - Date.now());
			wait = Math.min(1000,wait);
			setTimeout(retrieve, wait);
		});
	}
	retrieve();
});
d.on('error', function(err) {
	console.error(err.stack);
});
