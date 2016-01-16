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
                const peersList = Object.keys(peerConnections).filter(peerId => (peerId !== sourceId && peerId !== source));
                channel.send(JSON.stringify({
                    type: PEERS_LIST,
                    destination: source,
                    source: sourceId,
                    [PEERS_LIST]: peersList
                }));
            }
        }
        channel.onmessage = ({data}) => {
            messageHandler(JSON.parse(data), channel);
        };
        channel.onclose = () => cleanPeerDisconnection(source);
        console.log(`Received communication channel from ${source}`);
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
        messageHandler(JSON.parse(data), signalingChannel);
    };

    channel.onopen = () => {
        peerChannels[destination] = channel;
        addPeer(destination);
        console.log(`Created communication channel with ${destination}`);
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
        console.log(`Sent offer to ${destination}${usePeerAsSignalingRelay ? ', asked it to be my future signaling channel' : ''}`);
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
    console.log(`Sent ICE Candidate to ${destination}`);
}

const cleanPeerDisconnection = id => {
    delete peerChannels[id];
    delete peerConnections[id];
    removePeer(id);
}
