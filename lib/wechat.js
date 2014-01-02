"use strict";
require("base");var
crypto = require("crypto"),
$ = require("request"),
http = require("http"),
url = require("url"),
emf = Function.prototype;


function Message(userId, type, body){
	this.touser = userId;
	this.msgtype = type;
	this[this.msgtype] = body;
}


function WeChat(conf){
	if(this.constructor !== WeChat){
		return new WeChat(conf);
	}
	conf = conf || {};
	this.token = conf.token || "";
	this.signature = conf.signature || "";
	this.nonce = conf.nonce || "0";
	this.timestamp = conf.timestamp || "0";
	this.appId = conf.appId || "";
	this.appSecret = conf.appSecret || "";
	this.uid = conf.uid;
	this.accessToken = "";
	this.accessTokenExpires = 0;
	process.EventEmitter.call(this);
};

var _wc = WeChat.prototype;
_wc.__proto__ = process.EventEmitter.prototype;

_wc.checkSignature = function(){
	var hash = crypto.createHash("sha1");
	hash.update([this.token, this.nonce, this.timestamp].sort().join(""));
	return this.signature === hash.digest("hex");
};

_wc.sendTextMessage = function(userId, content){
	return this.sendMessage(new Message(
		userId, "text", { content : content }
	));
};
_wc.sendImageMessage = function(userId, mediaId){
	return this.sendMessage(new Message(
		userId, "image", { media_id : mediaId }
	));
};
_wc.sendVoiceMessage = function(userId, mediaId){
	return this.sendMessage(new Message(
		userId, "voice", { media_id : mediaId }
	));
};
_wc.sendVideoMessage = function(userId, mediaId, thumbMediaId, title, description){
	return this.sendMessage(new Message(
		userId, "video", {
			media_id : mediaId,
			thumb_media_id : thumbMediaId,
			title : title,
			description : description
		}
	));
};
_wc.sendMusicMessage = function(userId, musicUrl, hqmusicUrl, thumbMediaId, title, description){
	return this.sendMessage(new Message(
		userId, "music", {
			musicurl : musicUrl,
			hqmusicurl : hqmusicUrl,
			thumb_media_id : thumbMediaId,
			title : title,
			description : description
		}
	));
};
/*
title, description, url, picurl
*/

_wc.sendNewsMessage = function(userId, news){
	return this.sendMessage(new Message(
			userId, "news", {
			articles : news
		}
	));
};



var re_xml = /^\s*<xml>|<\/xml>\s*$/g;
var re_cdata = /<!\[CDATA\[([\s\S]+?)\]\]>/g;
var re_key = /<([^>]+)>([^<]*)<\/([^>]+)>/g;
var re_value = /{@\d+}/;

_wc.parseMessage = function(body){
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

_wc.processMessage = function(message, callback){
	callback(message);
	return;
	switch(message.MsgType){
		case "text" : pTextMessgae(message); break;
		case "image" : pImageMessgae(message); break;
		case "voice" : pVoiceMessgae(message); break;
		case "video" : pVideoMessgae(message); break;
		case "location" : pLocationMessgae(message); break;
		case "link" : pLinkMessgae(message); break;
		case "event" : pEventMessgae(message); break;
		default : break;
	}
};

_wc.parseMessageToXML = function(message){
	var res = ["<xml>"];
	for(var n in message){
		if(typeof message[n] === "string"){
			res.push("<" + n + "><![CDATA[" + message[n] + "]]></" + n + ">");
		}
		else if(is.a(message[n])){
			res.push("<" + n + ">" + message[n].map(function(c){
				var r = [];
				for(var n in c){
					if(typeof c[n] === "string"){
						r.push("<" + n + "><![CDATA[" + c[n] + "]]></" + n + ">");
					}
					else{
						r.push("<" + n + ">" + c[n] + "</" + n + ">");
					}
				}
				return r.join("");
			}).join("") + "</" + n + ">");
		}
		else{
			res.push("<" + n + ">" + message[n] + "</" + n + ">");
		}
	}
	res.push("</xml>");
	return res.join("");
}
_wc.buildReplyMessage = function(message){
	var out = {
		ToUserName : message.FromUserName,
		FromUserName : message.ToUserName,
		CreateTime : Math.round(Date.now() / 1000)
	};
	console.log("==================");
	console.log(message, out);
	console.log("==================");

	if(message.MsgType === "voice" && message.Recognition){
		message.MsgType = "text";
		message.Content = message.Recognition;
	}

	switch(message.MsgType){
		case "text" :
			out.MsgType = "text";
			out.Content = "你说什么我回什么，哈哈！\n ======== \n" + message.Content;
		break;
		case "image" :
			out.MsgType = "image";
			out.Image = [
				{ MediaId : message.MediaId }
			];
		break;
		case "voice" :
			out.MsgType = "voice";
			out.Voice = [
				{ MediaId : message.MediaId }
			];
		break;
		case "video" :
			out.MsgType = "video";
			out.Video = [
				{
					MediaId : message.MediaId,
					ThumbMediaId : message.ThumbMediaId
				}
			];
		break;
		case "music" :
			out.MsgType = "music";
		
		break;
		case "news" :
			out.MsgType = "news";
			out.ArticleCounts = 2;
			out.Articles = [
				{
					item : {
						Title : "AJC",
						Description : "",
						PicUrl : "",
						Url : ""
					}
				},
				{
					item : {
						Title : "LBQ",
						Description : "",
						PicUrl : "",
						Url : ""
					}
				}
			];
		break;
		case "location" :
		break;
		case "link" :
		break;
		case "event" :
			this.buildEventMessage();
		break;
		default : break;
	}
	return out;
};


/*
{
	"touser":"OPENID",
	"msgtype":"text",
	"text":{
		"content":"Hello World"
	}
}
*/





_wc.sendMessage = function(message){
	var api = this.apis["/message/custom/send"];
	return this.post(api, JSON.stringify(message));
};

_wc.getUserGroup = function(){
	var api = this.apis["/groups/get"];
	return this.get(api);
};

_wc.createUserGroup = function(name){
	var api = this.apis["/groups/create"];
	return this.post(api, JSON.stringify({
		group : {name : name.trim()}
	}));
};

_wc.updateUserGroup = function(id, name){
	var api = this.apis["/groups/update"];
	return this.post(api, JSON.stringify({
		group : {
			id : id,
			name : name
		}
	}));
};

_wc.moveUserToGroup = function(userId, groupId){
	var api = this.apis["/groups/members/update"];
	return this.post(api, JSON.stringify({
		openid : userId,
		to_groupid : groundId
	}));
};

_wc.getUserInfo = function(userId){
	var api = this.apis["/user/info"];
	api.query.openid = userId;
	return this.get(api);
};

_wc.getAllUsers = function(){
	var chain = new process.EventEmitter();
	var _ = this;
	var users = [];
	var api = this.apis["/user/get"];

	var _fn = function(next_openid, users){
		if(!is.s(next_openid)){
			delete api.query.next_openid;
		}
		else{
			api.query.next_openid = next_openid;
		}
		_.get(api)
			.success(function(json){
				if(json.count){
					users.push.apply(users, json.data.openid);
				}
				if(is.s(json.next_openid) && json.next_openid.trim()){
					_fn(json.next_openid, users);
				}
				else{
					chain.emit("success", JSON.stringify(users));
					chain.emit("complete");
				}
			})
			.error(function(e){
				chain.emit("error", e);
			})
			.responseType = "json";
	};
	_fn(null, users);
	return chain;
};


_wc.createMenu = function(menu, callback){
	var api = this.apis["/menu/create"];
	return this.post(api, menu);
};

_wc.getMenu = function(){
	var api = this.apis["/menu/get"];
	return this.get(api);
};


_wc.deleteMenu = function(){
	var api = this.apis["/menu/delete"];
	return this.get(api);
};

_wc.getAccessToken = function(){
	var chain = new process.EventEmitter();
	var _ = this;
	if(this.accessToken && this.accessTokenExpires > Date.now()){
		setTimeout(function(){
			chain.emit("success", _.accessToken);
			chain.emit("complete");
		}, 10);
	}
	else{
		var api = this.apis["/token"];
		api.query.appid = this.appId;
		api.query.secret = this.appSecret;
		$.get(api).success(function(json){
			if("access_token" in json){
				_.accessToken = json["access_token"];
				_.accessTokenExpires = Date.now() + (json["expires_in"] * 1000);
				chain.emit("success", _.accessToken);
			}
			else if("errcode" in json){
				json.message = _.stateCode[json["errcode"]];
				chain.emit("error", new Error(json));
			}
			else{
				chain.emit("error", new Error(json));
			}
		})
		.error(function(e){
			chain.emit("error", e);
		}).responseType = "json";
	}
	return chain;
};

_wc.get = function(uri){
	var chain = new process.EventEmitter();
	this.getAccessToken()
		.success(function(token){
			uri.query.access_token = token;
			$.get(uri)
				.success(function(json){chain.emit("success", json)})
				.error(function(e){chain.emit("error", e)})
				.complete(function(){chain.emit("complete")})
				.responseType = chain.responseType || "text";
		})
		.error(function(e){ chain.emit("error", e) })
		.complete(function(){ chain.emit("complete") });
	return chain;
};
_wc.post = function(uri, data){
	var chain = new process.EventEmitter();
	this.getAccessToken()
		.success(function(token){
			uri.query.access_token = token;
			$.post(uri, data)
				.success(function(json){chain.emit("success", json)})
				.error(function(){chain.emit("error", e)})
				.complete(function(){chain.emit("complete")})
				.responseType = chain.responseType || "text";
		})
		.error(function(e){ chain.emit("error", e) })
		.complete(function(){ chain.emit("complete") });
	return chain;
};


_wc.base_url = "https://api.weixin.qq.com/cgi-bin";
_wc.apis = {
	"/token": {
		"pathname": "/token",
		"query": {
			"grant_type": "client_credential",
			"appid": "",
			"secret": ""
		},
		"method" : "GET"
	},
	"/media/upload": {
		"pathname": "/media/upload",
		"query": {
			"access_token": "",
			"type": ""
		},
		"method": "POST"
	},
	"/media/get": {
		"pathname": "/media/get",
		query : {
			"access_token": "",
			"media_id": ""
		},
		"method": "GET"
	},
	"/message/custom/send": {
		"pathname": "/message/custom/send",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/user/get": {
		"pathname": "/user/get",
		"query": {
			"access_token": "",
			"next_openid": ""
		},
		"method": "GET"
	},
	"/user/info": {
		"pathname": "/user/info",
		"query": {
			"access_token": "",
			"openid": ""
		},
		"method": "GET"
	},
	"/groups/get": {
		"pathname": "/groups/get",
		"query": {
			"access_token": ""
		},
		"method": "GET"
	},
	"/groups/create": {
		"pathname": "/groups/create",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/groups/update": {
		"pathname": "/groups/update",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/groups/members/update": {
		"pathname": "/groups/members/update",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/menu/create": {
		"pathname": "/menu/create",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/menu/get": {
		"pathname": "/menu/get",
		"query": {
			"access_token": ""
		},
		"method": "GET"
	},
	"/menu/delete": {
		"pathname": "/menu/delete",
		"query": {
			"access_token": ""
		},
		"method": "GET"
	},
	"/qrcode/create": {
		"pathname": "/qrcode/create",
		"query": {
			"access_token": ""
		},
		"method": "POST"
	},
	"/showqrcode": {
		"pathname": "/showqrcode",
		"query": {
			"ticket": ""
		},
		"method": "GET"
	}
};
Object.keys(_wc.apis).forEach(function(name){
	var api = _wc.apis[name];
	_wc.apis[name] = url.parse(_wc.base_url + url.format(api), true);
	_wc.apis[name].method = api.method;
	_wc.apis[name].query = api.query;
	delete _wc.apis[name].search;
	delete _wc.apis[name].href;
	delete _wc.apis[name].path;
});


_wc.stateCode = {
"-1" : "系统繁忙",
"0" : "请求成功",
"40001":"获取access_token时AppSecret错误，或者access_token无效",
"40002":"不合法的凭证类型",
"40003":"不合法的OpenID",
"40004":"不合法的媒体文件类型",
"40005":"不合法的文件类型",
"40006":"不合法的文件大小",
"40007":"不合法的媒体文件id",
"40008":"不合法的消息类型",
"40009":"不合法的图片文件大小",
"40010":"不合法的语音文件大小",
"40011":"不合法的视频文件大小",
"40012":"不合法的缩略图文件大小",
"40013":"不合法的APPID",
"40014":"不合法的access_token",
"40015":"不合法的菜单类型",
"40016":"不合法的按钮个数",
"40017":"不合法的按钮个数",
"40018":"不合法的按钮名字长度",
"40019":"不合法的按钮KEY长度",
"40020":"不合法的按钮URL长度",
"40021":"不合法的菜单版本号",
"40022":"不合法的子菜单级数",
"40023":"不合法的子菜单按钮个数",
"40024":"不合法的子菜单按钮类型",
"40025":"不合法的子菜单按钮名字长度",
"40026":"不合法的子菜单按钮KEY长度",
"40027":"不合法的子菜单按钮URL长度",
"40028":"不合法的自定义菜单使用用户",
"40029":"不合法的oauth_code",
"40030":"不合法的refresh_token",
"40031":"不合法的openid列表",
"40032":"不合法的openid列表长度",
"40033":"不合法的请求字符，不能包含\\uxxxx格式的字符",
"40035":"不合法的参数",
"40038":"不合法的请求格式",
"40039":"不合法的URL长度",
"40050":"不合法的分组id",
"40051":"分组名字不合法",
"41001":"缺少access_token参数",
"41002":"缺少appid参数",
"41003":"缺少refresh_token参数",
"41004":"缺少secret参数",
"41005":"缺少多媒体文件数据",
"41006":"缺少media_id参数",
"41007":"缺少子菜单数据",
"41008":"缺少oauth code",
"41009":"缺少openid",
"42001":"access_token超时",
"42002":"refresh_token超时",
"42003":"oauth_code超时",
"43001":"需要GET请求",
"43002":"需要POST请求",
"43003":"需要HTTPS请求",
"43004":"需要接收者关注",
"43005":"需要好友关系",
"44001":"多媒体文件为空",
"44002":"POST的数据包为空",
"44003":"图文消息内容为空",
"44004":"文本消息内容为空",
"45001":"多媒体文件大小超过限制",
"45002":"消息内容超过限制",
"45003":"标题字段超过限制",
"45004":"描述字段超过限制",
"45005":"链接字段超过限制",
"45006":"图片链接字段超过限制",
"45007":"语音播放时间超过限制",
"45008":"图文消息超过限制",
"45009":"接口调用超过限制",
"45010":"创建菜单个数超过限制",
"45015":"回复时间超过限制",
"45016":"系统分组，不允许修改",
"45017":"分组名字过长",
"45018":"分组数量超过上限",
"46001":"不存在媒体数据",
"46002":"不存在的菜单版本",
"46003":"不存在的菜单数据",
"46004":"不存在的用户",
"47001":"解析JSON\/XML内容错误",
"48001":"api功能未授权",
"50001":"用户未授权该api"
};

module.exports = WeChat;
