Alfred Node Client
=========

A minimal client library to connect and interact with alfred servers.

## Installation

```shell
  npm install alfred-node-client --save
```

## Usage

```js
  var alfred = require('alfred-node-client');

  var AlfredClient = require('alfred-node-client');

  var client = new AlfredClient(
      {
        name: 'test_node',  // Your client's name (optional)
  	    host: 'localhost',  // Your server's host
  	    port: 13100,  // Your server's port
  	    login: 'login',  // Your server's username
  	    password: 'password', // Your server's password
  	    onConnect: function () {
              console.log('loginned !');
              client.Lights.getAll().then(function(lights){
                  console.log(lights);
              }, function(error){
                  console.log(error);
              });
          },
  	    onDisconnect: function () {
              console.log('disconnected !');
          }
      });
  
  client.subscribe(function (data) {
      console.log(data);
  });
```

## Tests

```shell
   npm test
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release
