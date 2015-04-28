var WebSocket = require('ws');

WsClient = function (name, host, port, login, password, onConnect, onDisconnect) {
    
    var Service = {};
    Service.callbacks = [];
    Service.callbacksOpen = [];
    
    var ws = new WebSocket('ws://' + host + ':' + port);
    var token;
    this.isConnected;
    
    ws.on('open', function () {
        if (!token)
            wsLogin(login, password);
        
        this.isConnected = true;
    });
    
    ws.on('close', function () {
        if (onDisconnect) {
            onDisconnect();
        }
        
        this.isConnected = false;
    });
    
    ws.on('message', function (message) {
        try {
            var task = JSON.parse(message);
            if (task.Command == "Authenticated") {
                token = task.Arguments.token;
                if (onConnect) {
                    onConnect();
                }
            }
            else {
                listener(task);
            }
        } catch (e) {
            listener(message);
        }
    });
    
    var wsLogin = function (login, password) {
        sendCommand({
            Command: "User_Login",
            Arguments: {
                "login": login,
                "password": password
            }
        });
    };
    
    var sendCommand = function (command) {
        ws.send(JSON.stringify(command));
    };
    
    
    function listener(data) {
        // If an object exists with callback_id in our callbacks object, resolve it
        for (var i = 0; i < Service.callbacks.length; i++) {
            Service.callbacks[i](data);
        }
    }
    
    Service.sendRaw = function(text){
        ws.send(text);
    };
    
    Service.send = function (baseCommand, args) {
        if (args == null)
            args = {};

        args.token = token;
        
        var request = {
            Command: baseCommand,
            Arguments: args
        }
        // Storing in a variable for clarity on what sendRequest returns
        sendCommand(request);
    }
    
    
    Service.subscribe = function (callback) {
        Service.callbacks.push(callback);
    }
    
    
    Service.unsubscribe = function (callback) {
        var index = Service.callbacks.indexOf(callback);
        if (index > -1) {
            Service.callbacks.splice(index, 1);
        }
    }

    return Service;
};

module.exports = WsClient;