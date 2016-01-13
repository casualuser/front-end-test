import {sourceId} from './sourceId';
import peerConnections from './peerConnections';
import peerChannels from './peerChannels';
import messageHandler from './messageHandler';
import {signalingChannel} from './signalingChannel';
import {ICE_CANDIDATE, OFFER} from '../messages';
import {RTCPeerConnection, RTCSessionDescription} from './rtcApi';
import {addPeer, removePeer} from './dom';

const iceServers = {iceServers: [{urls: 'stun:stun.1.google.com:19302'}]};

export const createPeerConnectionFromOffer = (source, offer) => {
    const peerConnection = new RTCPeerConnection(iceServers, {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    });

    peerConnections[source] = peerConnection;

    peerConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            onNewIceCandidate(source, candidate);
        }
    };

    peerConnection.ondatachannel = ({channel}) => {
        peerChannels[source] = channel;
        addPeer(source);
        channel.onmessage = ({data}) => {
            messageHandler(JSON.parse(data));
        };
        channel.onclose = () => cleanPeerDisconnection(source);
        console.log(`Received communication channel from ${source}`);
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    return peerConnection;
}

export const createPeerConnectionFromNothing = destination => {
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
        messageHandler(JSON.parse(data));
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
            [OFFER]: offer
        }));
        console.log(`Sent offer to ${destination}`);
    }, console.error.bind(console));

    peerConnection.onicecandidate = ({candidate}) => {
        if (candidate) {
            onNewIceCandidate(destination, candidate);
        }
    };
}

const onNewIceCandidate = (destination, candidate) => {
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
