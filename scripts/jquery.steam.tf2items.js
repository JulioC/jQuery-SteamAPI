/**
 * jQuery Steam - TF2Items plugin
 * 
 * Licensed under MIT LICENSE:
 *  http://www.opensource.org/licenses/mit-license.php
 *
 * Depencies:
 *  jQuery [of course]
 *  WebAPI plugin
 *
 * With the methods provided by this plugin, you will be
 * able to have an always-updated player backpack. Since
 * the data is REALLY big, it will take some time to load
 * the data [about 5 seconds on a good connection].
 *
 * Some stuff on this plugin are really ugly, I'll try to
 * update it ASAP. 
 */
 
(function($){
  var tf2items = (function(){
    // Game defines
    var classes = ['scout', 'sniper', 'soldier', 'demoman', 'medic', 'heavy', 'pyro', 'spy', 'engineer'];
    var particles = ['particle0', 'particle1', 'particle2', 'particle3', 'particle4', 'particle5',
                     'Green Confetti',  'Purple Confetti', 'Haunted Ghosts', 'Green Energy', 'Purple Energy',
                     'Circling TF Logo', 'Massed Flies', 'Burning Flames', 'Scorching Flames', 'Searing Plasma',
                     'Vivid Plasma', 'Sunbeams', 'Circling Peace Sign', 'Circling Heart'];
                     
    // Attributes that shouldn't be added to items
    var attBlackList = [25, 37, 116, 142, 195, 196];
    // Items that have limited uses number
    var limitedItems = [241, 280, 281, 282, 283, 284, 286, 287, 288, 289, 290, 291, 
                        5020, 5021, 5023, 5027, 5028, 5029, 5030, 5031, 5032, 5033,
                        5034, 5035, 5036, 5037, 5038, 5039, 5040, 5042, 5043, 5044];
    // Strings that come unstralated from the server
    var unstraslated = {
      TF_Wearable_Hat: 'Hat',
      TF_LockedCrate: 'Crate'
    };
     
    var schema = null;
    var language = null;
    
    // Parse the inventory token to its real values
    // http://wiki.teamfortress.com/wiki/WebAPI#Inventory_Token
    var parseInventory = function(inv) {
      var val = Number(inv);
      var equipped = [];
      for(var n = 0; n < 9; n++) {
        if((val & 1 << (n + 16))) {
          equipped.push(classes[n]);
        }
      }
      
      return {
          position: val & 0xFFFF,
          equipped: equipped
      };
    };
    
    // Load the item data, parsing the Schema value
    var loadSchema = function(callback) {
      if(schema) {
        callback();
      }
      else {
        $.steam.webapi.tf2.schema((language || 'en'), function(data) {
          var items = data.result.items.item;
          var qualities = data.result.qualities;
          var qualityNames = data.result.qualityNames;
          var attributes = data.result.attributes.attribute;
          
          schema = {
            qualities: [],
            items: [],
            attributes: {}
          };
          
          for(var q in qualities) {
            schema.qualities[qualities[q]] = {
              code: q,
              name: qualityNames[q]
            };
          }
		  
          for(var i in items) {
            var itm = items[i];
            schema.items[itm.defindex] = itm;
          }
          
          // Store the attributes indexed by their names. This optimizes the search
          for(var a in attributes) {
            var att = attributes[a];
            schema.attributes[att.name] = att;
          }
          
          callback();
        });
      }
    };
        
    // Build the item name
    var buildName = function(defindex, quality) {
      var ret = '';
      
      if(schema) {
        var name = schema.items[defindex].item_name;
        
        // This will allow us to get default item data
        if(quality) {
          var title = schema.qualities[quality].name;
          // If we the quality has a title [not unique], use it
          if(title !== 'Unique') {
            // If the name is like "The Cloack and Dagger" we insert the title after "The "
            // We could use schema.items[itm.defindex].proper_name to check this, but it's buggy
            if(name.indexOf("The ") === 0) {
              ret += "The ";
              name = name.substr(4);
            }
            
            ret += title + ' ';
          }
        }
          
        ret +=  name;
      }
      
      return ret;
    };
    
    // Get the list of item attributes
    var parseAttributes = function(defindex, extra) {
      var ret = [];
      
      if(schema) {
        // If the item has default attributes, parse them
        if(schema.items[defindex].attributes) {
          var attributes = schema.items[defindex].attributes.attribute;        
          for(var a in attributes) {
            var att = attributes[a];
            var data = schema.attributes[att.name];
            if(validAttribute(data.defindex, att)) {
              ret.push({
                name: buildAttribute({
                  string: data.description_string || null,
                  format: data.description_format || null,
                  value: att.value,
                  float_value: att.float_value
                }),
                type: data.effect_type
              });
            }
          }
        }
        // Read extras attributes, if any
        if(extra) {
          var n = 0;
          for(var e in extra) {
            var att = extra[e];
            // Bypass the crate series from the item
            if(validAttribute(att.defindex, att) && att.defindex != 187) {
              var data = searchAttribute(att.defindex);
              ret.push({
                name: buildAttribute({
                  string: data.description_string || null,
                  format: data.description_format || null,
                  value: att.value,
                  float_value: att.float_value
                }),
                type: data.effect_type
              });
            }
          }
        }
      }
      return ret;
    };
    
    // Check if the attribute info matches with any bad one
    var validAttribute = function(defindex, data) {
      if(!(data.value || data.float_value)) {
        return false;
      }
      for(var i in attBlackList) {
        if(attBlackList[i] == defindex) {
          return false;
        }     
      }
      return true;
    }
    
    // Get the attribute by its defindex
    var searchAttribute = function(defindex) {
      for(var a in schema.attributes) {
        if(schema.attributes[a].defindex == defindex){
          return schema.attributes[a];
        }
      }
    };
    
    // Build the attribute value string
    var buildAttribute = function(data) {
      var ret = '';
      
      if(data.format) {
        var value;
        
        switch(data.format) {
          case 'value_is_percentage':
            value = Math.round((data.value*100) - 100);
          break;
          case 'value_is_inverted_percentage':
            value = Math.round((100 - (data.value*100)));
          break;
          case 'value_is_additive':
            value = data.value;
          break;
          case 'value_is_additive_percentage':
            value = Math.round(data.value*100);
          break;
          case 'value_is_date':
            var date = new Date(data.value*1000);
            value = date.toLocaleDateString();
          break;
          case 'value_is_account_id':
            value = 'STEAM_0:'+(data.value%2)+':'+(data.value/2);
          break;
          case 'value_is_particle_index':
            value = particles[data.float_value];
          break;
          default:
            value = "V:"+data.value+"F:"+data.format;
        }
        
        ret = data.string.replace("%s1", value);
      }
      else {
        ret = data.string;
      }
            
      return ret;
    };
    
    // Check and get the color of a painted item
    var itemPainted = function(itm) {
      var data = schema.items[itm.defindex];
      var attributes = data.attributes ? data.attributes.attribute : null;
      for(var a in attributes) {
        var att = attributes[a];
        if(att.name == 'set item tint RGB') {
          return parseInt(att.value).toString(16);
        }
      }
      var extra = itm.attributes ? itm.attributes.attribute : null;
      for(var e in extra) {
        var att = extra[e];
        if(att.defindex == 142) {
          return parseInt(att.float_value).toString(16);
        }
      }
      
      return false;
    };
    
    // Check and get who gifted the item
    var itemGifted = function(itm) {
      var attributes = itm.attributes ? itm.attributes.attribute : null;
      for(var a in attributes) {
        var att = attributes[a];
        if(att.defindex == 186) {
          return att.value + 76561197960265728;
        }
      }
      
      return false;
    };
    
    var itemLimited = function(defindex) {
      for(var i in limitedItems) {
        if(limitedItems[i] == defindex) {
          return true;
        }
      }
      return false;
    };
    
    var fixString = function(str) {
      if(unstraslated[str]) {
        return unstraslated[str];
      }
      
      return str;
    }
    
    return {
      // Get and parse the items for a specific backpack
      getItems: function(id, callback) {
        $.steam.webapi.tf2.playerItems(id, function(data){
          var items = data.result.items.item;
          // Ensure that our schema is loaded
          loadSchema(function() {
            var ret = [];
            // Parse the item data, to be readable
            var a = 0;
            for(var i in items) {
              var itm = items[i];
              var inv = parseInventory(itm.inventory);
              var data = schema.items[itm.defindex];
              var att = itm.attributes ? itm.attributes.attribute : null;
              var cur = {
                position: inv.position,
                name: buildName(itm.defindex, itm.quality),
                custom_name: itm.custom_name,
                type: fixString(data.item_type_name),
                level: itm.level,
                quality: schema.qualities[itm.quality].code,
                quantity: itemLimited(itm.defindex) ? itm.quantity : null,
                equipped: inv.equipped,
                // Itens for all classes dont have 'used_by_classes', so use the classes array
                used_by: data.used_by_classes || classes,
                // Check and negate if something block the item from be traded 
                tradable: !(itm.flag_cannot_trade || (typeof data.tradable === 'undefined' ? false : !data.tradable)),
                // Hardcoded: get the name of the image
                image: data.image_url.substr(46),
                // Parse some usefull data from the attributes
                color: itemPainted(itm),
                gifted: itemGifted(itm),
                attributes: parseAttributes(itm.defindex, att)
              };
              
              ret.push(cur);
            }
            
            callback(ret);
          });
        });  
      },
      getItemList: function(callback) {
        // Get the schema
        loadSchema(function() {
          var items = schema.items;
          var ret = [];
          // Parse the item data, to be readable
          var a = 0;
          for(var i in items) {
            var itm = items[i];
            var att = itm.attributes;
            var cur = {
              name: buildName(itm.defindex),
              type: fixString(itm.item_type_name),
              // Itens for all classes dont have 'used_by_classes', so use the classes array
              used_by: itm.used_by_classes || classes,
              // Check and negate if something block the item from be traded 
              tradable: !(itm.flag_cannot_trade),
              // Hardcoded: get the name of the image
              image: itm.image_url.substr(46),
              // Parse some usefull data from the attributes
              attributes: parseAttributes(itm.defindex)
            };
            
            ret.push(cur);
          }
          
          callback(ret);
        });
      },
      // Allow us to use multiple languages
      setLanguage: function(_language){
        if(_language === null || (_language && typeof _language === 'string')) {
          language = _language;
          // Clear the itemData cache, since it has language specific stuff
          if(schema !== null) {
            schema = null;
          }
        }
      }
    }
  })();  
  
  // Create the steam object on jQuery and expose the tf2items
  if(!$.steam || typeof $.steam !== 'object') {
    $.steam = {};
  }  
  $.steam.tf2items = tf2items;
})(jQuery);