// Dependencies
import {Server as WebSocketServer} from 'ws';

// Enums
import {INIT, ICE_CANDIDATE, OFFER, ANSWER, PEERS_LIST, RANDOM_PEER, PEER_DISCONNECTION} from '../messages';

// Config
const {SERVER_PORT} = process.env;

const webSocketServer = new WebSocketServer({port: SERVER_PORT});
const connectedPeersWebSockets = new Map();

// Web socket server
webSocketServer.on('connection', webSocket => {
    console.log('New client connection');
    webSocket.on('message', message => {
        const parsedMessage = JSON.parse(message);
        messageHandler(webSocket, parsedMessage);
    });
    webSocket.on('close',() => {
        console.log(`Client disconnected ${webSocket.id}`);
        connectedPeersWebSockets.delete(webSocket.id);
        for (let [peerId, socket] of connectedPeersWebSockets) {
            socket.send(JSON.stringify({
                type: PEER_DISCONNECTION,
                [PEER_DISCONNECTION]: webSocket.id
            }));
        }
    });
});

// Message dispatcher
const messageHandler = (webSocket, message) => {
    const {type} = message;
    switch (type) {
        case INIT:
            initHandler(webSocket, message);
            break;
        default:
            transitHandler(message);
            break;
    }
}

// Init handler
const initHandler = (webSocket, message) => {
    const {source, question} = message;
    console.log(`Init from peer ${source}`);
    webSocket.id = source;

    const peersList = [];
    for (let peerId of connectedPeersWebSockets.keys()) {
        peersList.push(peerId);
    }

    if (question === 1) {
        // Question 1 : send all the connected peers list
        webSocket.send(JSON.stringify({
            type: PEERS_LIST,
            destination: source,
            [PEERS_LIST]: peersList
        }));
    } else {
        // Question 2 : send a random connected peer
        webSocket.send(JSON.stringify({
            type: RANDOM_PEER,
            destination: source,
            [RANDOM_PEER]: peersList[Math.floor(Math.random() * peersList.length)]
        }));
    }

    connectedPeersWebSockets.set(source, webSocket);
}

const transitHandler = message => {
    console.log(`Transiting message from source ${message.source} to destination ${message.destination}, of type ${message.type}`);
    const destinationWebSocket = connectedPeersWebSockets.get(message.destination);
    destinationWebSocket.send(JSON.stringify(message));
}

console.log(`WebSocket server started on port ${SERVER_PORT}`);
