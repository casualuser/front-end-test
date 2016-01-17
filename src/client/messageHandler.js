import {sourceId} from './sourceId';
import peerChannels from './peerChannels';
import peerConnections from './peerConnections';
import {createPeerConnectionFromNothing, createPeerConnectionFromOffer} from './peerConnectionFactory';
import {INIT, ICE_CANDIDATE, OFFER, ANSWER, PEERS_LIST, CHAT, RANDOM_PEER} from '../messages';
import {RTCIceCandidate, RTCSessionDescription} from './rtcApi';
import {addChatMessage} from './dom';

const relayMessage = (message, channel) => {
    peerChannels[message.destination].send(JSON.stringify(message));
    console.groupCollapsed(`Relayed message of type ${message.type} from %c${message.source} to %c${message.destination}`, `color: #${message.source.substr(0, 6)}`, `color: #${message.destination.substr(0, 6)}`);
    console.log('Channel : ', channel);
    console.groupEnd();
}

const onPeersList = (message, signalingChannel) => {
    const peersList = message[PEERS_LIST];
    peersList.forEach(destination => createPeerConnectionFromNothing(destination, false, signalingChannel));
    console.groupCollapsed(`Received peers list from %c${message.source ? message.source : 'server'}`, `color: #${message.source ? message.source.substr(0, 6) : 'black'}`);
    console.log('Channel : ', signalingChannel);
    console.log('Peers list : ', peersList);
    console.groupEnd();
}

const onIceCandidate = (message, channel) => {
    const peerConnection = peerConnections[message.source];
    const ICECandidate = message[ICE_CANDIDATE];
    peerConnection.addIceCandidate(new RTCIceCandidate(ICECandidate));
    console.groupCollapsed(`Received ICE Candidate from %c${message.source}`, `color: #${message.source.substr(0, 6)}`);
    console.log('Channel : ', channel);
    console.groupEnd();
}

const onOffer = (message, signalingChannel) => {
    const offer = message[OFFER];
    const peerConnection = createPeerConnectionFromOffer(message.source, offer, message.usePeerAsSignalingRelay, signalingChannel);
    peerConnection.createAnswer(answer => {
        peerConnection.setLocalDescription(answer);
        signalingChannel.send(JSON.stringify({
            type: ANSWER,
            source: sourceId,
            destination: message.source,
            [ANSWER]: answer
        }));
        console.groupCollapsed(`Sent answer to %c${message.source}`, `color: #${message.source.substr(0, 6)}`);
        console.log('Channel : ', signalingChannel);
        console.groupEnd();
    }, err => {
        console.error(err);
    });
    console.groupCollapsed(`Received offer from %c${message.source}`, `color: #${message.source.substr(0, 6)}`);
    console.log('Channel : ', signalingChannel);
    console.groupEnd();
}

const onAnswer = (message, signalingChannel) => {
    const peerConnection = peerConnections[message.source];
    const answer = message[ANSWER];
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.groupCollapsed(`Received answer from %c${message.source}`, `color: #${message.source.substr(0, 6)}`);
    console.log('Channel : ', signalingChannel);
    console.groupEnd();
}

const onChat = (message, channel) => {
    const {source} = message;
    const text = message[CHAT];
    addChatMessage(source, text);
    console.groupCollapsed(`Received chat from %c${source}`, `color: #${source.substr(0, 6)}`);
    console.log('Channel : ', channel);
    console.log('Text : ', text);
    console.groupEnd();
}

const onRandomPeer = (message, signalingChannel) => {
    const destination = message[RANDOM_PEER];
    if (destination) createPeerConnectionFromNothing(destination, true, signalingChannel);
    console.groupCollapsed(`Received random peer from server`);
    console.log('Channel : ', signalingChannel);
    console.log(`Random peer : %c${destination || 'none'}`, `color: #${destination ? destination.substr(0, 6) : 'black'}`);
    console.groupEnd();
}

const messageHandler = (message, signalingChannel) => {
    if (message.destination === sourceId) {
        switch (message.type) {
            case ICE_CANDIDATE:
                onIceCandidate(message, signalingChannel);
                break;
            case OFFER:
                onOffer(message, signalingChannel);
                break;
            case ANSWER:
                onAnswer(message, signalingChannel);
                break;
            case PEERS_LIST:
                onPeersList(message, signalingChannel);
                break;
            case CHAT:
                onChat(message, signalingChannel);
                break;
            case RANDOM_PEER:
                onRandomPeer(message, signalingChannel);
                break;
        }
    } else {
        relayMessage(message, signalingChannel);
    }
}

export default messageHandler;
