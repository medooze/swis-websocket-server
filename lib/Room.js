'use strict';

const debug = require('debug');

class Room
{
	constructor(roomId, peerWait, events)
	{
		// Debugs
		this._debug = debug('swis-websocket-server:Room:' + roomId);
		this._debugerror = debug('swis-websocket-server:ERROR:Room:' + roomId);

		this._debug('constructor() [roomId:%s, peerWait:%s]', roomId, peerWait);

		// Attributes
		this._roomId = roomId;

		// Events
		this._events = events || {};

		// Peers.
		this._peerA = null;
		this._peerB = null;

		// Flags
		this._closed = false;

		// Timer to wait for peerB
		this._peerWaitTimer = null;
		this._peerWait = peerWait;  // Seconds
	}

	dump()
	{
		let peerA_status = 'missing';
		let peerB_status = 'missing';

		if (this._peerA)
		{
			if (!this._peerA.connection)
				peerA_status = 'waiting';
			else
				peerA_status = this._peerA.connection.connected ? 'connected' : 'disconnected';
		}

		if (this._peerB)
		{
			if (!this._peerB.connection)
				peerB_status = 'pending';
			else
				peerB_status = this._peerB.connection.connected ? 'connected' : 'disconnected';
		}

		this._debug('dump: [peerA:%s | peerB:%s]', peerA_status, peerB_status);
	}

	handleRequest(request)
	{
		this._debug('handleRequest()');

		if (this._peerA && this._peerB)
		{
			this._debugerror('handleRequest() | room already full, rejecting WebSocket request');

			request.reject(403, 'Room Full');
			return;
		}

		let peer =
		{
			name       : null,     // Name of the peer
			request    : request,  // websocket.Request instance
			connection : null,     // websocket.Connection instance
			pairedPeer : null      // Paired peer
		};

		// First peer in the room
		if (!this._peerA)
		{
			this._debug('handleRequest() | peerA joined, waiting for peerB');

			this._peerA = peer;
			this._peerA.name = 'peerA';

			// If peerA disconnects at TCP level even before peerA connects,
			// then react on it
			this._peerA.request.httpRequest.socket.on('end', () =>
			{
				this.onPeerADisconnectsSoon();
			});

			// Set a timeout for peerB to connect
			this._peerWaitTimer = setTimeout(() =>
			{
				this._debugerror('peerA locally disconnected after %d seconds waiting for peerB to join',
					this._peerWait);

				this._closeRoom();
			}, this._peerWait * 1000);
		}
		// Second peer in the room
		else
		{
			this._debug('handleRequest() | peerB joined, accepting connections from both peers');

			this._peerB = peer;
			this._peerB.name = 'peerB';

			// Pair peers
			this._peerA.pairedPeer = this._peerB;
			this._peerB.pairedPeer = this._peerA;

			// Accept both peers' connections
			this._acceptConnections();
		}
	}

	_acceptConnections()
	{
		this._debug('_acceptConnections()');

		let peerA = this._peerA;
		let peerB = this._peerB;

		clearTimeout(this._peerWaitTimer);

		peerA.connection = peerA.request.accept(peerA.request.requestedProtocols[0], peerA.request.origin);
		peerB.connection = peerB.request.accept(peerB.request.requestedProtocols[0], peerB.request.origin);

		this._setConnectionEvents(peerA);
		this._setConnectionEvents(peerB);

		this._debug('room ready [peerA:%s | peerB:%s]', peerA.connection.remoteAddress, peerB.connection.remoteAddress);
	}

	_setConnectionEvents(peer)
	{
		this._debug('_setConnectionEvents() [peer:%s]', peer.name);

		let connection = peer.connection;
		let numMsg = 0;

		connection.on('message', (data) =>
		{
			if (this._closed)
				return;

			if (data.type !== 'binary')
			{
				this._debugerror('ignoring non binary message from %s', peer.name);

				return;
			}

			if (++numMsg <= 5)
			{
				this._debug('message #%d from %s: %s', numMsg, peer.name,
					data.binaryData.toString('hex').substr(0, 20) + '...');
			}

			peer.pairedPeer.connection.sendBytes(data.binaryData);
		});

		connection.on('close', (code, reason) =>
		{
			if (this._closed)
				return;

			this._debug('socket closed by %s [code:%s, reason:"%s"]',
				peer.name, code, reason);

			this._closeRoom();
		});

		connection.on('error', (error) =>
		{
			if (this._closed)
				return;

			this._debugerror('socket error in %s: %s', peer.name, error);
		});
	}

	_closeRoom()
	{
		this._debug('_closeRoom()');

		let peerA = this._peerA;
		let peerB = this._peerB;

		clearTimeout(this._peerWaitTimer);

		this._closed = true;

		// Close peerA
		if (peerA && peerA.connection && peerA.connection.connected)
			try { peerA.connection.close(1000); } catch(error) {}

		// Close peerB
		if (peerB && peerB.connection && peerB.connection.connected)
			try { peerB.connection.close(1000); } catch(error) {}

		// Emit 'close' event
		if (this._events.close)
			this._events.close();
	}

	onPeerADisconnectsSoon()
	{
		if (this._peerA.pairedPeer || this._closed)
			return;

		this._debug('onPeerADisconnectsSoon() | peerA disconnects before peerB connects');

		this._closeRoom();
	}
}

module.exports = Room;
