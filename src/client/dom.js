import peerChannels from './peerChannels';
import {CHAT} from '../messages';
import {sourceId} from './sourceId';

// TODO : with more time available, use React :)

export const registerDomListeners = () => {
    document.getElementById('button').onclick = () => {
        const text = document.getElementById('textarea').value;
        const destination = document.getElementById('peer-select').value;
        if (destination) {
            peerChannels[destination].send(JSON.stringify({
                type: CHAT,
                source: sourceId,
                destination,
                [CHAT]: text
            }));
            document.getElementById('textarea').value = '';
        } else {
            alert('Please select a peer before sending a message.');
        }
    }
}

export const addChatMessage = (id, text) => {
    const liMessage = document.createElement('li');
    liMessage.innerHTML = text;
    document.getElementById(`chat-${id}`).appendChild(liMessage);
}

export const addPeer = id => {
    const chatId = `chat-${id}`;
    const peerDiv = document.createElement('div');
    peerDiv.innerHTML = `
<h3>${id}</h3>
<ul id="${chatId}">
</ul>
    `;
    peerDiv.id = id;
    document.getElementById('peers').appendChild(peerDiv);
    const option = document.createElement('option');
    option.id = `option-${id}`;
    option.text = id;
    option.value = id;
    document.getElementById('peer-select').add(option);
}

export const removePeer = id => {
    const peerDiv = document.getElementById(id);
    peerDiv.parentNode.removeChild(peerDiv);
    const select = document.getElementById('peer-select');
    const {options} = select;
    let targetOptionIndex;
    for (let i = 0; i < options.length; i++) {
        const candidate = options.item(i);
        if (candidate.id === `option-${id}`) {
            targetOptionIndex = i;
            break;
        }
    }
    if (targetOptionIndex !== undefined) options.remove(targetOptionIndex);
}
