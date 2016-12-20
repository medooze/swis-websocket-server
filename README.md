# swis-websocket-server

WebSocket server for *swis*. It allows non-WebRTC capable browsers to use *swis*.

The server opens a plain WebSocket server on 0.0.0.0:8088 (use a firewall to block direct access to it).


## Installation

```bash
$git clone https://GITHUB_USER:GITHUB_TOKEN@github.com/eface2face/swis-websocket-server.git
```

where `GITHUB_USER` is a Github acount with read permission on this project and `GITHUB_TOKEN` a "Personal Access Token" for such a user.


## Usage

* Install dependencies:
`
```bash
$ npm install
```

* Run `node index.js` or manage it as daemon with [forever](https://www.npmjs.com/package/forever).


