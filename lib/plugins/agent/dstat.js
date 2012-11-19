/**
 * dstat plugin
 */
var spawn = require('child_process').spawn;
var dstat = spawn('dstat', ['-cdlmnpsy','--tcp','--top-cpu','--top-bio','--top-io','--noheaders','--nocolor','--noupdate']);
var current = null;
var log = console.log;
var first = true;
var os = require('os');

var corecount = os.cpus().length;

// dstat labels
var labels = [
{
	name: 'cpu',
	values: ['user','system','idle','iowait','hi','si']
},{
	name: 'disk',
	values: ['read','write']
},{
	name: 'load',
	values: ['1m','5m','15m','core']
},{
	name: 'memory',
	values: ['used','buff','cache','free']
},{
	name: 'net',
	values: ['recv','send']
},{
	name: 'procs',
	values: ['run','blk','new']
},{
	name: 'swap',
	values: ['used','free']
},{
	name: 'system',
	values: ['int','csw']
},{
	name: 'tcp',
	values: ['listen','active','syn','timewait','close']
}];

exports.init = function() {
	current = this;
	first = true;
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

dstat.stdout.on('data', function(data) {
	// ignore first record
	var line = data.toString('utf8');
	if (first) {
		// ignore first line
		first = false;
		return;
	}
	line = line.replace('\n','').split('|');
	// format
	var reply = {};
	for (var i = 0; i < line.length; i++) {
		var label = labels[i];
		var vars = line[i].replace(/^\s+/,'').replace(/\s+$/,'').split(/\s+/);
		if (label) {
			var unit = {};
			var values = label.values;
			for (var j = 0; j < values.length; j++) {
				var vname = values[j];
				unit[vname] = fix(vars[j]);
			}
			reply[label.name] = unit;
		}
	}
	reply.load.core = corecount;
	// send to current websocket
	if (current && current.connected) {
		current.json('dstat', 'collect', reply);
	}
});

