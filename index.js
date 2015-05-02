var wsClient = require('./ws-client');
var Promise = require('promise');
var http = require('http');

var AlfredClient = function (param) {
    
    var parameters = param || {};
    var name = parameters.name || 'Alfred-node-client';
    var host = parameters.host || 'localhost';
    var port = parameters.port || 13100;
    var login = parameters.login || 'login';
    var password = parameters.password || 'password';
    var onConnect = parameters.onConnect;
    var onDisconnect = parameters.onDisconnect;
    
    var postJson = function(path, param, callback){
        var paramString = JSON.stringify(param);
        var headers = {
          'Content-Type': 'application/json',
          'Content-Length': paramString.length
        };
        
        var options = {
          host: host,
          port: 80,
          path: path,
          method: 'POST',
          headers: headers
        };
        
		var req = http.request(options, function(res) {
          res.setEncoding('utf-8');
        
          var responseString = '';
        
          res.on('data', function(data) {
            responseString += data;
          });
        
          res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            callback(resultObject);
          });
        });
        
        req.on('error', function(e) {
          callback(e);
        });
        
        req.write(paramString);
        req.end();
    }
    
    var websocket = new WsClient(
        name, 
	    host, 
	    port, 
	    login, 
	    password, 
	    onConnect, 
	    onDisconnect);
    
    var Service = {};    
    
    Service.subscribe = function (callback) {
        websocket.subscribe(function (data) {
            callback(data);
        });
    };
    
    var events = {};
    Service.on = function (names, handler) {
        names.split(' ').forEach(function (name) {
            if (!events[name]) {
                events[name] = [];
            }
            events[name].push(handler);
        });
        return this;
    };
    
    var trigger = function (name, args) {
        for (var name in events) {
            for (var j in events[name]) {
                var handler = events[name][j];
                handler.call(null, args);
            }
        }
        return this;
    };
    
    websocket.subscribe(function (data) {
        if(data.Event){
            trigger(data.Event, data.Arguments);
        }
    });
    
    Service.Lights = {
        lightCommand: function (id, on, bri, hue, sat) {
            var arguments = {
                id: id
            };
            
            if (on != null)
                arguments.on = on;
            if (bri != null)
                arguments.bri = bri;
            if (hue != null)
                arguments.hue = hue;
            if (sat != null)
                arguments.sat = sat;
            
            websocket.send('Device_LightCommand', arguments);
        },
        
        getAll: function () {
            websocket.send("Device_BroadcastLights");
            
            var promise = new Promise(function (resolve, reject) {
              var callback = function(data){
                if (data != null
                    && data.Arguments != null
                    && typeof(data.Arguments.lights) != 'undefined') {
                    var lights = JSON.parse(data.Arguments.lights);
                    websocket.unsubscribe(callback);
                    resolve(lights);
                }
              };
              
              websocket.subscribe(callback);
            });
            
            return promise;
        },
        
        allumeTout: function () {
            websocket.send("Device_AllumeTout");
        },
        
        eteinsTout: function () {
            websocket.send("Device_EteinsTout");
        },
        
        allume: function (piece) {
            websocket.send("Device_Allume",
			{
                piece: piece
            });
        },
        
        eteins: function (piece) {
            websocket.send("Device_Eteins",
			{
                piece: piece
            });
        },
        
        turnUp: function (piece) {
            websocket.send("Device_TurnUp",
			{
                piece: piece
            });
        },
        
        turnDown: function (piece) {
            websocket.send("Device_TurnDown",
			{
                piece: piece
            });
        }
    };
    
    Service.Sensors = {
        getAll: function () {
            websocket.send("Sensor_BroadcastSensors");
            
            var promise = new Promise(function (resolve, reject) {
              var callback = function(data){
                if(typeof(data.Arguments.sensors) != 'undefined') {
                    var sensors = JSON.parse(data.Arguments.sensors).filter(function(s){
                        return !isNaN(parseFloat(s.Value))
                            && parseFloat(s.Value) != 0
                            && !s.IsActuator;
                    }); 
                    websocket.unsubscribe(callback);
                    resolve(sensors);
                }
              };
              
              websocket.subscribe(callback);
            });
            
            return promise;
        },
        
        getHistory: function (id) {
            websocket.send("Sensor_BroadcastSensorHistory", {
                'id': id
            });
            
            var promise = new Promise(function (resolve, reject) {
              var callback = function(data){
                if(typeof(data.Arguments.history) != 'undefined') {
                    websocket.unsubscribe(callback);
                    resolve(data.Arguments.history);
                }
              };
              websocket.subscribe(callback);
            });
            
            return promise;
        }
    };
    
    Service.TextToSpeech = {
        speak: function (text) {
            websocket.send("Alfred_PlayTempString", {
                'sentence': text
            });
        }
    };
    
    Service.Chat = {
        send: function (text) {
            websocket.send("Chat_Send", {
                'text': text
            });
        }
    };
    
    Service.Scenario = {
        run: function(name){
            websocket.send("Scenario_LaunchScenario", {
                'mode': name
            });
        },
    
        getAll: function(){
            websocket.send("Scenario_BroadcastScenarios");
            
            var promise = new Promise(function (resolve, reject) {
              var callback = function(data){
                if (data != null
                  && data.Arguments != null
                  && typeof(data.Arguments.scenarios) != 'undefined') {
                  var scenarios = JSON.parse(data.Arguments.scenarios);
                  websocket.unsubscribe(callback);
                  resolve(scenarios);
                }
              };
              
              websocket.subscribe(callback);
            });
            
            return promise;
        },
    
        save: function(scenario, callback){
            postJson('/scenario/save', scenario, callback);
        }
    };
    
    Service.Torrent = {
        search: function(term, callback){
            http.get('https://yts.to/api/v2/list_movies.json?query_term=' + term, callback);
        },
    
        download: function(torrentHash, torrentName, callback){
            var tracker = 'udp://open.demonii.com:1337';
            var magnet = 'magnet:?xt=urn:btih:' + torrentHash + '&dn=' + encodeURI(torrentName) + '&tr=' + tracker;
            http.get("http://"+host+"/torrent/download?magnet=" + magnet, callback);
        }
    };
    
    Service.People = {
        getAll: function(){
            websocket.send("People_Broadcast");
            
            var promise = new Promise(function (resolve, reject) {
              var callback = function(data){
                if (data != null
                  && data.Arguments != null
                  && data.Command == 'People_List'
                  && typeof(data.Arguments.people) != 'undefined') {
                  var people = JSON.parse(data.Arguments.people);
                  websocket.unsubscribe(callback);
                  resolve(people);
                }
              };
              
              websocket.subscribe(callback);
            });
            
            return promise;
        }
    };
    
    Service.Player = {
        register: function (name) {
            websocket.send("Player_Register", {
                'name': name
            });
        },
        
        unregister: function (name) {
            websocket.send("Player_Unregister");
        },
        
        sendReadyToPlaySignal : function () {
            websocket.send("Player_ReadyToPlay");
        },
    
        sendPlayPauseSignal : function () {
            websocket.send("MediaManager_PlayPause");
        },
    
        sendNextSongSignal : function () {
            websocket.send("MediaManager_Next");
        },
        
        sendPreviousSongSignal : function () {
            websocket.send("MediaManager_Previous");
        },		
		
		volume: function(volume, channel) {
			websocket.send("Common_Volume", {
				volume: volume,
				channel: channel || 0
			});
		},
    
        sendUpdateStatusSignal : function (status, duration, position, volume) {
            var args = {};
    
            if (status != '')
                args.status = status;
    
            if (!isNaN(duration))
                args.length = ('' + duration).replace('.', ',');
    
            if (!isNaN(position))
                args.position = ('' + position).replace('.', ',');
    
            if (!isNaN(volume))
                args.volume = ('' + volume).replace('.', ',');
    
            websocket.send("MediaManager_UpdateStatus", args);
        },
    };
    
    Service.ping = function(){
        websocket.sendRaw('ping');
    };
    
    return Service;
};

module.exports = AlfredClient;