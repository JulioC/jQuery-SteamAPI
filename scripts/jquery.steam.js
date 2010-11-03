/**
 * jQuery Steam
 * 
 * Licensed under MIT LICENSE:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 * Depencies:
 *  jQuery [of course]
 *
 * This file is just a space holder for future generic
 * Steam stuff, like SteamID manipulation
 */

// Nothing here yet
(function($){
  $.steam = (function(){
    var pre = '7656119';
    var pos = 7960265728;
    
    return {
      validSteamID: function(steamID) {
        return steamID.match(/^STEAM_[0-1]:[0-1]:[0-9]+$/i);
      },
      getSteamID: function(steamID64) {
        // Crop the SteamID64 and subtract the base
        var val = parseInt(steamID64.substr(pre.length)) - pos;
        return 'STEAM_0:' + (val & 1) + ':' + (val >> 1);
      },
      getSteamID64: function(steamID) {
        if(!$.steam.validSteamID(steamID)) {
          return false;
        }
        var parts = steamID.split(':');      alert(parseInt(parts[1]));  
        return pre + (parseInt(parts[1]) + (parseInt(parts[2]) << 1) + pos);
      }
    };
  })();  
})(jQuery);