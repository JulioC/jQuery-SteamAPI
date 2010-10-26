/**
 * jQuery Steam - WebAPI plugin
 * 
 * Licensed under MIT LICENSE:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 * Depencies:
 *  jQuery [of course]
 *
 * This plugin will provide you functions to interact with
 * the Steam WebAPI [including the game APIs, like TF2 one]
 * Since the WebAPI doesn't support JSONP and your API Key 
 * need to be used on each request, I sugest you use a Proxy
 * to handle the requests, append the API Key and return the
 * JSONP version of the response. 
 * More info about the proxy can be found on our repository
 */
 
(function($){
  var webapi = (function(){	  
    // URL creator to generate then dinamicly
	// This allow us to easily change the key, version, protocol, ...
	// So, we can hide our API key [using a proxy] or use another API version
	var url = (function(){
	  // Default values, to be used if the custom are null
	  var default_base = 'api.steampowered.com';
	  var default_version = '0001';
		
	  var key = null;
	  var base = null;
	  var version = null;
	  var secure = false;
	  var url_mask = null;
	  
	  return {
		// 'opt' holds all data we need to build the url with this scheme:
		// protocol://base/interface/method/version/?arg=val&&key=mykey
		build: function(opt) {
		  var url = (secure ? 'https' : 'http') + '://'
			+ (base || default_base) + '/'
			+ opt.interface + '/'
			+ opt.method + '/' +
			'v' + (version || default_version) + '/';
				  
		  var arr = [];
		  for(var arg in opt.arguments) {
			arr.push(arg + "=" + encodeURIComponent(opt.arguments[arg]));
		  }
		  
		  // Add the API key, if we have one
		  if(key) {
			arr.push('key=' + key);
		  }
		  
		  // BAD: Hard coded stuff for json/jsonp
		  arr.push('format=json');
		  arr.push('jsonp=?');
		  
		  // Build the query string with all arguments
		  url += '?' + arr.join('&');
		  
		  // Mask the url, so it can be used with proxies
		  if(url_mask) {
			url = url_mask(url);
		  }
		  
		  return url;
		},
		setKey: function(_key) {
		  if(_key === null || (_key  && typeof _key  === 'string')) {
			key = _key ;
		  }
		},
		setBase: function(_base) {
		  if(_base === null || (_base && typeof _base === 'string')) {
			base = _base;
		  }
		},
		setVerion: function(_version) {
		  if(_version === null || (_version && typeof _version === 'string')) {
			version = _version;
		  }
		},
		setSecure: function(secure) {
		  secure = secure;
		},
		// Allow the user to mask the url to use with his proxy
		setURLMask: function(_url_mask) {
		  url_mask = _url_mask;
		}	
	  };
	})();
	
	// Make the request for the server
	var request = function(interface, method, arguments, success, sync, cachable, sync) {
	  var myurl = url.build({
		  interface: interface,
		  method: method,
		  arguments: arguments
		});
		
		$.ajax({
		  url: myurl,
		  dataType: 'jsonp', 
		  success: success,
		  cache: true,
		  async: !sync
		});
	};
	
	return {
	  // Execute a direct call. Used for unsupported interfaces/methods
	  raw: function(interface, method, arguments, success, sync) {
		request(interface, method, arguments, success, sync);
	  },
	  
	  // GetNewsForApp returns the latest of a game specified by its appID. 
	  // http://developer.valvesoftware.com/wiki/Steam_Web_API#GetNewsForApp_.28v0001.29
	  appNews: function(appid, maxlength, count, success, sync) {
        var arguments = {
		  appid: appid,
		  maxlength: maxlength,
		  count: count
		};
		
		request('ISteamNews', 'GetNewsForApp', arguments, success, sync);
	  },  
	  
	  // Returns on global achievements overview of a specific game in percentages. 
	  // http://developer.valvesoftware.com/wiki/Steam_Web_API#GetGlobalAchievementPercentagesForApp_.28v0001.29
	  appAchievments: function(gameid, success, sync) {
        var arguments = {
		  gameid: gameid
		};
		
		request('ISteamUserStats', 'GetGlobalAchievementPercentagesForApp', arguments, success, sync);
	  },  
	  
	  // Returns basic profile information for a list of 64-bit Steam IDs. 
	  // http://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0001.29
	  playerSummaries: function(players, success, sync) {
		var steamids;
		if(typeof players === 'string') {
		  steamids = players;
		}
		else {
		  var arr = [];
		  for(var p in players) {
			arr.push(players[p]);
		  }
		  
		  steamids = arr.join(',');
		}		  
		
		var arguments = {
		  steamids: steamids
		};
		  
		request('ISteamUser', 'GetPlayerSummaries', arguments, success, sync);
	  }, 
	  
	  // Encapsulate the TF2 methods, so we dont have to worry about name conflits
	  tf2: {
		// This method returns the item schema for the current build of Team Fortress 2.
		// http://wiki.teamfortress.com/wiki/WebAPI#GetSchema_.28v0001.29
		schema: function(language, success, sync) {
		  var arguments = {
			language: language
		  };
		  
		  request('ITFItems_440', 'GetSchema', arguments, success, sync);
		},  
		
		// This method returns the item schema for the current build of Team Fortress 2.
		// http://wiki.teamfortress.com/wiki/WebAPI#GetPlayerItems_.28v0001.29
		playerItems: function(SteamID, success, sync) {
		  var arguments = {
			SteamID: SteamID
		  };
		  
		  request('ITFItems_440', 'GetPlayerItems', arguments, success, sync);
		},  
		
		// This method returns the item schema for the current build of Team Fortress 2.
		// http://wiki.teamfortress.com/wiki/WebAPI#GetGoldenWrenches_.28v0001.29
		goldenWrenchs: function(success) {
		  request('ITFItems_440', 'GetGoldenWrenches', {}, success, sync);
		}
	  },
	   
	  // Expose the url.set methods with the webapi
	  setKey: url.setKey,
	  setBase: url.setBase,
	  setVerion: url.setVerion,
	  setSecure: url.setSecure
	};
	  
  })();
  
  // Create the steam object on jQuery and expose the webapi
  if(!$.steam || typeof $.steam !== 'object') {
	$.steam = {};
  }  
  $.steam.webapi = webapi;
})(jQuery);