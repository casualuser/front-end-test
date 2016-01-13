import {sourceId} from './sourceId';
import peerChannels from './peerChannels';
import peerConnections from './peerConnections';
import {signalingChannel} from './signalingChannel';
import {createPeerConnectionFromNothing, createPeerConnectionFromOffer} from './peerConnectionFactory';
import {INIT, ICE_CANDIDATE, OFFER, ANSWER, PEERS_LIST, CHAT} from '../messages';
import {RTCIceCandidate, RTCSessionDescription} from './rtcApi';
import {addChatMessage} from './dom';

const transitMessage = message => {
    peerChannels[message.destination].send(JSON.stringify(message));
}

const onPeersList = message => {
    const peersList = message[PEERS_LIST];
    peersList.forEach(destination => createPeerConnectionFromNothing(destination));
}

const onIceCandidate = message => {
    const peerConnection = peerConnections[message.source];
    const ICECandidate = message[ICE_CANDIDATE];
    peerConnection.addIceCandidate(new RTCIceCandidate(ICECandidate));
    console.log(`Received ICE Candidate from ${message.source}`);
}

const onOffer = message => {
    const offer = message[OFFER];
    const peerConnection = createPeerConnectionFromOffer(message.source, offer);
    peerConnection.createAnswer(answer => {
        peerConnection.setLocalDescription(answer);
        signalingChannel.send(JSON.stringify({
            type: ANSWER,
            source: sourceId,
            destination: message.source,
            [ANSWER]: answer
        }));
        console.log(`Sent answer to ${message.source}`);
    }, err => {
        console.error(err);
    });
    console.log(`Received offer from ${message.source}`);
}

const onAnswer = message => {
    const peerConnection = peerConnections[message.source];
    const answer = message[ANSWER];
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log(`Received answer from ${message.source}`);
}

const onChat = message => {
    const {source} = message;
    const text = message[CHAT];
    addChatMessage(source, text);
    console.log(`Received chat from ${source} : ${text}`);
}

const messageHandler = message => {
    if (message.destination === sourceId) {
        switch (message.type) {
            case ICE_CANDIDATE:
                onIceCandidate(message);
                break;
            case OFFER:
                onOffer(message);
                break;
            case ANSWER:
                onAnswer(message);
                break;
            case PEERS_LIST:
                onPeersList(message);
                break;
            case CHAT:
                onChat(message);
                break;
        }
    } else {
        transitMessage(message);
    }
}

export default messageHandler;
