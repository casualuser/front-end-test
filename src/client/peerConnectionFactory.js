import {sourceId} from './sourceId';
import peerConnections from './peerConnections';
import peerChannels from './peerChannels';
import messageHandler from './messageHandler';
import {ICE_CANDIDATE, OFFER, PEERS_LIST} from '../messages';
import {RTCPeerConnection, RTCSessionDescription} from './rtcApi';
import {addPeer, removePeer} from './dom';

const iceServers = {iceServers: [{urls: 'stun:stun.1.google.com:19302'}]};

export const createPeerConnectionFromOffer = (source, offer, usePeerAsSignalingRelay = false, signalingChannel) => {
    const peerConnection = new RTCPeerConnection(iceServers, {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    });

    peerConnections[source] = peerConnection;

    peerConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            onNewIceCandidate(source, candidate, signalingChannel);
        }
    };

    peerConnection.ondatachannel = ({channel}) => {
        peerChannels[source] = channel;
        addPeer(source);
        if (usePeerAsSignalingRelay) {
            channel.onopen = () => {
                const peersList = Object.keys(peerChannels).filter(peerId => (peerId !== sourceId && peerId !== source));
                channel.send(JSON.stringify({
                    type: PEERS_LIST,
                    destination: source,
                    source: sourceId,
                    [PEERS_LIST]: peersList
                }));
                console.groupCollapsed(`Sent peers list to %c${source}`, `color: #${source.substr(0, 6)}`);
                console.log('Peers list : ', peersList);
                console.log('Channel : ', channel);
                console.groupEnd();
            }
        }
        channel.onmessage = ({data}) => {
            messageHandler(JSON.parse(data), channel);
        };
        channel.onclose = () => cleanPeerDisconnection(source);
        console.groupCollapsed(`Received communication channel from %c${source}`, `color: #${source.substr(0, 6)}`);
        console.log('Channel : ', channel);
        console.groupEnd();
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    return peerConnection;
}

export const createPeerConnectionFromNothing = (destination, usePeerAsSignalingRelay = false, signalingChannel) => {
    const peerConnection = new RTCPeerConnection(iceServers, {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    });

    const channel = peerConnection.createDataChannel('communication', {
        reliable: false
    });

    peerConnections[destination] = peerConnection;

    channel.onmessage = ({data}) => {
        messageHandler(JSON.parse(data), channel);
    };

    channel.onopen = () => {
        peerChannels[destination] = channel;
        addPeer(destination);
        console.groupCollapsed(`Created communication channel with %c${destination}`, `color: #${destination.substr(0, 6)}`);
        console.log('Channel : ', channel);
        console.groupEnd();
    };

    channel.onclose = () => cleanPeerDisconnection(destination);

    peerConnection.createOffer(offer => {
        peerConnection.setLocalDescription(offer);
        signalingChannel.send(JSON.stringify({
            type: OFFER,
            source: sourceId,
            destination,
            [OFFER]: offer,
            usePeerAsSignalingRelay
        }));
        console.groupCollapsed(`Sent offer to %c${destination}`, `color: #${destination.substr(0, 6)}`);
        console.log('Channel : ', signalingChannel);
        console.log(`Source : %c${sourceId}`, `color: #${sourceId.substr(0, 6)}`);
        console.log('Use peer as signaling relay : ', usePeerAsSignalingRelay);
        console.groupEnd();
    }, console.error.bind(console));

    peerConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            onNewIceCandidate(destination, candidate, signalingChannel);
        }
    };
}

const onNewIceCandidate = (destination, candidate, signalingChannel) => {
    signalingChannel.send(JSON.stringify({
        type: ICE_CANDIDATE,
        source: sourceId,
        destination,
        [ICE_CANDIDATE]: candidate
    }));
    console.groupCollapsed(`Sent ICE Candidate to %c${destination}`, `color: #${destination.substr(0, 6)}`);
    console.log('Channel : ', signalingChannel);
    console.groupEnd();
}

export const cleanPeerDisconnection = id => {
    delete peerChannels[id];
    delete peerConnections[id];
    removePeer(id);
    console.log(`Received a disconnection notification, farewell ${id}...`);
}
