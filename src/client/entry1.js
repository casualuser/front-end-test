import signalingChannelContainer from './signalingChannel';
import {sourceId} from './sourceId';
import peerChannels from './peerChannels';
import {INIT} from '../messages';
import messageHandler from './messageHandler';
import {registerDomListeners} from './dom';

// TODO : with more time available, organise the mess with Redux :)

const webSockerURI = `ws://localhost:${__SERVER_PORT__}/`;

document.onreadystatechange = () => {
    if (document.readyState === 'complete') {
        registerDomListeners();
        const webSocket = new WebSocket(webSockerURI);
        webSocket.onopen = () => {
            signalingChannelContainer.signalingChannel = webSocket;
            webSocket.send(JSON.stringify({
                type: INIT,
                source: sourceId
            }));
        };
        webSocket.onmessage = ({data}) => {
            const message = JSON.parse(data);
            messageHandler(message);
        }

        window.onbeforeunload = () => {
            Object.keys(peerChannels).map(peerId => {
                peerChannels[peerId].close();
            });
        }
    }
}
