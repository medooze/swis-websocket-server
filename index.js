'use strict';

process.title = 'swis-websocket-server';
process.env.DEBUG = '*swis-websocket-server* *ERROR*';

const debug = require('debug')('swis-websocket-server');
const debugerror = require('debug')('swis-websocket-server:ERROR');
const http = require('http');
const websocket = require('websocket');
const Room = require('./lib/Room');

const REGEXP_PATH = new RegExp(/^\/.*\/([a-zA-Z0-9]{6,20})$/);
const DEFAULT_IP = '0.0.0.0';
const DEFAULT_PORT = 8088;
const DEFAULT_PEER_WAIT = 30;

let options =
{
	ip       : DEFAULT_IP,
	port     : DEFAULT_PORT,
	peerWait : DEFAULT_PEER_WAIT
};

process.on('exit', (code) =>
{
	if (code)
		debugerror('error exit [code:%s]', code);
	else
		debug('normal exit [code:%s]', code);
});

// Map of rooms indexed by roomId
let rooms = new Map();

// HTTP server
let httpServer = http.createServer();

httpServer.listen(options.port, options.ip, 4096);
httpServer.on('listening', () =>
{
	debug('server listening [ip:"%s", port:%s]', options.ip, options.port);
});

// Run a websocket.Server instance
let wsServer = new websocket.server(
{
	httpServer          : httpServer,
	closeTimeout        : 2000,
	ignoreXForwardedFor : false
});

// WebSocket server events
wsServer.on('request', (request) =>
{
	handleRequest(request);
});

function handleRequest(request)
{
	debug('handleRequest() [path:%s | origin:%s | ip:%s]',
		request.resource, request.origin, request.remoteAddress);

	// Validate WS subprotocol
	// Validate WebSocket sub-protocol
	if (request.requestedProtocols.indexOf('swis') === -1)
	{
		debugerror('onRequest() | invalid WebSocket subprotocol');

		request.reject(500, 'Invalid WebSocket Sub-Protocol');
		return;
	}

	// Validate path
	let res = REGEXP_PATH.exec(request.resource);

	if (!res)
	{
		debugerror('onRequest() | invalid path: %s', request.resource);

		request.reject(500, 'Invalid Path');
		return;
	}

	// Get roomId
	let roomId = res[1];

	// Search for an existing room
	let room = rooms.get(roomId);

	// Room does not exist, create a new one
	if (!room)
	{
		debug('onRequest() | new room #%s', roomId);

		room = new Room(roomId, options.peerWait,
			{
				close: () => { rooms.delete(roomId); }
			});

		// Store the room in the map
		rooms.set(roomId, room);

		// Insert the pending request into the new room
		room.handleRequest(request);
	}
	// Room already exists
	else
	{
		room.handleRequest(request);
	}
}
