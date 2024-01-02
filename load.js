var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);

var environment = process.env.NODE_ENV || 'development';
console.log(`Running express backend in environment: ${environment}`);

if (environment == 'production') {
	app.use(express.static(__dirname + '/build'));
	app.get('*', (req, res) => {
		res.sendFile(__dirname + '/build/index.html');
	});
}

let options =
	environment == 'development'
		? {
				cors: {
					// origin: 'http://localhost:3000/',
					origin: '*',
					methods: ['GET', 'POST'],
				},
		  }
		: {};

console.log(`Socket.io options: ${JSON.stringify(options)}`);

const io = require('socket.io')(server, options);

module.exports = {
	server: server,
	io: io,
};
