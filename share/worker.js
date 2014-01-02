"use strict";
module.paths[module.paths.length] = process.cwd() + '/lib';
var httpd = require("httpd");
var fs = require("fs");
var $ = require("request");
var path = require("path");
var crypto = require("crypto");

if(is.s(process.argv[3])){
	var data_path = process.argv[3];
}
else{
	return 0;
}

var profiles = {
	"test.host.org" : {
		token : "tokentokentoken"
	}
};

var re_xml = /^\s*<xml>|<\/xml>\s*$/g;
var re_cdata = /<!\[CDATA\[([\s\S]+?)\]\]>/g;
var re_key = /<([^>]+)>([^<]*)<\/([^>]+)>/g;
var re_value = /{@\d+}/;

var fn_parse_message = function(body){
	var json = {}, _tmp = {};
	body.replace(re_cdata, function(m, v, i){
		_tmp[i] = v;
		return "{@" + i + "}";
	}).replace(re_key, function(m, k1, v, k2){
		if(k1 === k2){
			if(re_value.test(v)){
				var k = v.slice(2).slice(0, -1);
				json[k1] = _tmp[k];
				_tmp[k] = null;
				delete _tmp[k];
				return "";
			}
			json[k1] = isNaN(v) ? v : parseInt(v);
		}
		return "";
	});
	return json;
};

var str_string_node = "<{@node}><![CDATA[{@value}]]></{@node}>";
var str_number_node = "<{@node}>{@value}</{@node}>";
var fn_message_to_xml = function(message){
	var xml = [str_string_node.format({
		"node" : "MsgType",
		"value" : message.msgtype
	})];
	switch(message.msgtype){
		case "text" :
			xml.push(str_string_node.format({
				"node" : "Content",
				"value" : message.content
			}));
		break;
		case "news" :
			xml.push(str_number_node.format({
				"node" : "ArticleCount",
				"value" : message.articles.length
			}));
			xml.push("<Articles>" +
				message.articles.map(function(art){
					return "<item>" +
						Object.keys(art).map(function(key){
							switch(key){
								case "title":
									return str_string_node.format({
										"node" : "Title",
										"value" : art[key]
									});
								break;
								case "description":
									return str_string_node.format({
										"node" : "Description",
										"value" : art[key]
									});
								break;
								case "url":
									return str_string_node.format({
										"node" : "Url",
										"value" : art[key]
									});
								break;
								case "picurl":
									return str_string_node.format({
										"node" : "PicUrl",
										"value" : art[key]
									});
								break;
							}
							return "";
						}).join("")
					+ "</item>";
				}) +
			"</Articles>");
		break;
	}
	return xml.join("");
};



var messages = {};
fs.readFileSync(path.join(data_path, "messages.txt")).toString("utf-8").split(/\r?\n/).forEach(function(line){
	var m = line.split("\t");
	var msg;
	if(m.length > 2){
		var id = m.shift();
		msg = [];
		for(var i = 0; i < m.length; i+=4){
			msg.push({
				url : decodeURIComponent(m[i]),
				picurl : decodeURI(m[i+1]),
				title : decodeURI(m[i+2]),
				description : decodeURIComponent(m[i+3])
			});
		}
		messages[id] = fn_message_to_xml({
			msgtype : "news",
			articles : msg
		});
	}
	else{
		messages[m.shift()] = fn_message_to_xml({
			msgtype : "text",
			content : decodeURIComponent(m.shift())
		});
	}
});
var keywords = fs.readFileSync(path.join(data_path, "keywords.txt")).toString("utf-8").split(/\r?\n/).map(function(line){
	var key = line.split("\t");
	return {
		re : new RegExp(key[0]),
		id : key[1]
	};
});
var events = {};
fs.readFileSync(path.join(data_path, "events.txt")).toString("utf-8").split(/\r?\n/).forEach(function(line){
	var key = line.split("\t");
	events[key[0]] = key[1];
});

var str_xml_data = "<xml><ToUserName><![CDATA[{@ToUserName}]]></ToUserName>"+
"<FromUserName><![CDATA[{@FromUserName}]]></FromUserName>"+
"<CreateTime>{@CreateTime}</CreateTime>"+
"{@MsgBody}</xml>";


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
					var in_msg = fn_parse_message(Buffer.concat(data).toString("utf-8"));
					var out_msg = {
						ToUserName : in_msg.FromUserName,
						FromUserName : in_msg.ToUserName,
						CreateTime : Math.round(Date.now() / 1000)
					};
					console.log(in_msg);
					switch(in_msg.MsgType){
						case "text":
							if(keywords.some(function(key){
								if(key.re.test(in_msg.Content)){
									out_msg.MsgBody = messages[key.id];
									response.setHeader("Content-Type", "text/xml");
									response.end(str_xml_data.format(out_msg));
									return true;
								}
							})){}
							else{
								out_msg.MsgBody = messages[keywords[0].id];
								response.setHeader("Content-Type", "text/xml");
								response.end(str_xml_data.format(out_msg));
							}
							console.log(out_msg, str_xml_data.format(out_msg));
						break;
						case "event":
							console.log(events[in_msg.EventKey])
							if(events[in_msg.EventKey]){
								out_msg.MsgBody = messages[events[in_msg.EventKey]];
								response.setHeader("Content-Type", "text/xml");
								response.end(str_xml_data.format(out_msg));
							}
						break;
					}
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
	}
});
