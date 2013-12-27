"use strict";
var httpd = require("httpd");
var $ = require("request");
var crypto = require("crypto");


var profiles = {
	"dxct.9way.biz" : {
		token : "dexunchaotai"
	},
	"jtails.9way.biz" : {
		token : "whosyoudaddy"
	}
};

var server = httpd.create();

var re_wechat = /^\/wechat$/;
var fn_check_signature = function(profile, signature, nonce, timestamp){
	var hash = crypto.createHash("sha1");
	hash.update([profile.token, nonce, timestamp].sort().join(""));
	return signature === hash.digest("hex");
};
var fn_wechat_handle = function(request, response){
	var uri = request.uri;
	var params = uri.query;
	var profile = profiles[uri.hostname];
	if(is.o(profile) && fn_check_signature(profile, params.signature, params.nonce, params.timestamp)){
		switch(request.method){
			case "GET" :
				response.end(params.echostr);
			break;
			case "POST" :
				var data = [];
				request.on("data", function(d){ data.push(d); });
				request.once("end", function(){
					$.post(profile.interface, Buffer.concat(data)).success(function(buffer){
						response.setHeader("Content-Type", "text/xml");
						response.statusCode = 200;
						response.end(buffer);
					}).error(function(){
						response.end();
					});
				});
			break;
			default : response.renderCode(403); break;
		}
	}
	else if(params.cipher){
		if(is.o(profile)){
			switch(params.cipher){
				case "status" :
					response.setHeader("Content-Type", "text/javascript");
					response.end("{code:0,status:'OK'}");
				break;
				default : response.renderCode(403); break;
			}
		}
		else if(params.cipher === "kitsune"){
			response.setHeader("Content-Type", "text/html");
			response.end("<pre>" + JSON.stringify(profiles, null, "\t") + "</pre>");
		}
		else{
			response.renderCode(403);
		}
	}
	else{
		response.renderCode(403);
	}
};

server.get(re_wechat, fn_wechat_handle);
server.post(re_wechat, fn_wechat_handle);


server.on("connection", function(scoket){
	this.getConnections(function(){
		console.log(arguments);
	});
});

process.on("message", function(msg, handle){
	switch(msg.label){
		case "handle" :
			if(server._handle){
				server.close(function(){
					server.listen(handle);
				});
			}
			else{
				server.listen(handle);
			}
		break;
		case "profile" :
			profiles = msg.body;
		break;
	}
});