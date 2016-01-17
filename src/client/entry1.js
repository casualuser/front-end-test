import {sourceId} from './sourceId';
import peerChannels from './peerChannels';
import {INIT} from '../messages';
import messageHandler from './messageHandler';
import {registerDomListeners} from './dom';

// TODO : with more time available, organise the mess with Redux :)

const webSockerURI = `ws://localhost:${__SERVER_PORT__}/`;

document.addEventListener('DOMContentLoaded', () => {
    registerDomListeners();
    console.log(`%cI am ${sourceId}`, `color: #${sourceId.substr(0, 6)}; font-size: 2em; font-weight: bold`);
    const webSocket = new WebSocket(webSockerURI);
    webSocket.onopen = () => {
        webSocket.send(JSON.stringify({
            type: INIT,
            source: sourceId,
            question: 1
        }));
    };
    webSocket.onmessage = ({data}) => {
        const message = JSON.parse(data);
        messageHandler(message, webSocket);
    }

    window.onbeforeunload = () => {
        Object.keys(peerChannels).map(peerId => {
            peerChannels[peerId].close();
        });
    }
});
