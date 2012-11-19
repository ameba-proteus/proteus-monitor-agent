
var domain = require('domain');
var spawn = require('child_process').spawn;

var current;
var ps;
var psconf;

// setup 
exports.configure = function(conf) {
	psconf = conf;
	var interval = conf.interval || 5000;
	setInterval(checkps, interval);
};

// init connection
exports.init = function() {
	current = this;
};

// execution domain
var d = domain.create();
d.on('error', function(err) {
	console.error('unexpected error on ps plugin');
	console.error(err.stack);
});

function checkps() {

	d.run(function() {
		var ps = spawn('ps', ['ax']);
		ps.stdout.on('data', function(data) {
			var text = data.toString('utf8');
			var result = {};
			for (var name in psconf) {
				var regex = new RegExp(psconf[name]);
				if (regex.test(text)) {
					result[name] = 1;
				} else {
					result[name] = 0;
				}
			}
			// send to the server
			if (current) {
				current.json('ps', 'collect', result);
			}
		});
		ps.on('error', function(err) {
			console.log("ERROR", err.message);
		});
		ps.on('exit', function(code) {
			if (code != 0) {
				console.error('ps exit unexpectedly', code);
			}
		});
	});

}

