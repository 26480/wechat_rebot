"use strict";
module.paths[module.paths.length] = process.cwd() + '/lib';
require("base");var
http = require("http"),
https = require("https"),
url = require("url");

var _ = {};

function Request(method, u, data, option){
	if(!(this instanceof Request)){
		return new Request(method, u, data, option);
	}
	this
	var uri = is.o(u) ? u : url.parse(is.s(u) ? u : "");
	var proc = null;
	var _ = this;
	process.EventEmitter.call(this);
	switch(uri.protocol){
		case "http:" : proc = http; break;
		case "https:" : proc = https; break;
		default : break;
	}

	if(is.o(option)){
		Object.keys(option).forEach(function(key){
			if(is.u(uri[key])){
				uri[key] = option[key];
			}
		});
	}
	if(proc){
		var opt = url.parse(url.format(uri));
		opt.method = (is.s(method) ? method : "GET").toUpperCase();
		var req = proc.request(opt);
		req.once("response", function(response){
			var data = [];
			response.on("data", function(d){ data.push(d); });
			response.once("end", function(){
				if(!_.timeouted){
					switch(_.responseType){
						case "text" :
							_.emit("success", Buffer.concat(data).toString("utf-8"));
						break;
						case "json" :
							try{
								_.emit("success", JSON.parse(Buffer.concat(data).toString("utf-8")));
							}
							catch(e){ _.emit("error", e) }
						break;
						default :
							console.log(_.emit);
							_.emit("success", Buffer.concat(data));
						break;
					}
					_.emit("complete", response);
				}
			});
		});
		req.error(function(e){
			_.emit("complete", null);
		});

		setTimeout(function(){
			if(data){
				console.log(data);
				req.write(data);
			}
			req.end();
		}, 10);
		req.setTimeout(this.timespan, function(){
			_.emit("complete");
		});
	}
	else{
		this.emit("error", new Error("illegal url"));
	}
}

var _req = Request.prototype;
_req.__proto__ = process.EventEmitter.prototype;
_req.timespan = 5000;
_req.timeouted = false;
_req.responseType = "buffer";

_.request = function(method, u, data, option){
	return new Request(method, u, data, option);
};

_.get = function(u, option){
	return _.request("GET", u, null, option);
};

_.post = function(u, data, option){
	return _.request("POST", u, data, option);
};

module.exports = _;
