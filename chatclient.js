// WebSocket and WebRTC based multi-user chat sample with two-way video
// calling, including use of TURN if applicable or necessary.
//
// This file contains the JavaScript code that implements the client-side
// features for connecting and managing chat and video calls.
//
// To read about how this sample works:  http://bit.ly/webrtc-from-chat
//
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

"use strict";

// Get our hostname

var myHostname = window.location.hostname;
if (!myHostname) {
    myHostname = "localhost";
}
log("Hostname: " + myHostname);

// WebSocket chat/signaling channel variables.

var connection = null;
var clientID = 0;

// The media constraints object describes what sort of stream we want
// to request from the local A/V hardware (typically a webcam and
// microphone). Here, we specify only that we want both audio and
// video; however, you can be more specific. It's possible to state
// that you would prefer (or require) specific resolutions of video,
// whether to prefer the user-facing or rear-facing camera (if available),
// and so on.
//
// See also:
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
//

var mediaConstraints = {
    audio: true,            // We want an audio track
    video: {
        aspectRatio: {
            ideal: 1.333333     // 3:2 aspect is preferred
        }
    }
};

var myUsername = null;
var targetUsername = null;      // To store username of other peer
var myPeerConnection = null;    // RTCPeerConnection
var transceiver = null;         // RTCRtpTransceiver
var webcamStream = null;        // MediaStream from webcam

// Output logging information to console.

function log(text) {
    var time = new Date();

    console.log("[" + time.toLocaleTimeString() + "] " + text);
}

// Output an error message to console.

function log_error(text) {
    var time = new Date();

    console.trace("[" + time.toLocaleTimeString() + "] " + text);
}

// Send a JavaScript object by converting it to JSON and sending
// it as a message on the WebSocket connection.

function sendToServer(msg) {
    var msgJSON = JSON.stringify(msg);

    log("Sending '" + msg.type + "' message: " + msgJSON);
    connection.send(msgJSON);
}

// Called when the "id" message is received; this message is sent by the
// server to assign this login session a unique ID number; in response,
// this function sends a "username" message to set our username for this
// session.
function setUsername() {
    myUsername = document.getElementById("name").value;

    sendToServer({
        name: myUsername,
        date: Date.now(),
        id: clientID,
        type: "username"
    });
}

// Open and configure the connection to the WebSocket server.

function connect() {
    var serverUrl;
    var scheme = "ws";

    // If this is an HTTPS connection, we have to use a secure WebSocket
    // connection too, so add another "s" to the scheme.

    if (document.location.protocol === "https:") {
        scheme += "s";
    }
    serverUrl = scheme + "://" + myHostname + ":3000";

    log(`Connecting to server: ${serverUrl}`);
    connection = new WebSocket(serverUrl, "json");

    connection.onopen = function(evt) {
        document.getElementById("text").disabled = false;
        document.getElementById("send").disabled = false;
    };

    connection.onerror = function(evt) {
        console.dir(evt);
    }

    connection.onmessage = function(evt) {
        var chatBox = document.querySelector(".chatbox");
        var text = "";
        var msg = JSON.parse(evt.data);
        log("Message received: ");
        console.dir(msg);
        var time = new Date(msg.date);
        var timeStr = time.toLocaleTimeString();

        switch(msg.type) {
            case "id":
                clientID = msg.id;
                setUsername();
                break;

            case "username":
                text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
                break;

            case "message":
                text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                break;

            case "rejectusername":
                myUsername = msg.name;
                text = "<b>Your username has been set to <em>" + myUsername +
                    "</em> because the name you chose is in use.</b><br>";
                break;

            case "userlist":      // Received an updated user list
                handleUserlistMsg(msg);
                break;

            // Signaling messages: these messages are used to trade WebRTC
            // signaling information during negotiations leading up to a video
            // call.

            case "video-offer":  // Invitation and offer to chat
                handleVideoOfferMsg(msg);
                break;

            case "video-answer":  // Callee has answered our offer
                handleVideoAnswerMsg(msg);
                break;

            case "new-ice-candidate": // A new ICE candidate has been received
                handleNewICECandidateMsg(msg);
                break;

            case "hang-up": // The other peer has hung up the call
                handleHangUpMsg(msg);
                break;

            // Unknown message; output to console for debugging.

            default:
                log_error("Unknown message received:");
                log_error(msg);
        }

        // If there's text to insert into the chat buffer, do so now, then
        // scroll the chat panel so that the new text is visible.

        if (text.length) {
            chatBox.innerHTML += text;
            chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
        }
    };
}

// Handles a click on the Send button (or pressing return/enter) by
// building a "message" object and sending it to the server.
function handleSendButton() {
    var msg = {
        text: document.getElementById("text").value,
        type: "message",
        id: clientID,
        date: Date.now()
    };
    sendToServer(msg);
    document.getElementById("text").value = "";
}

// Handler for keyboard events. This is used to intercept the return and
// enter keys so that we can call send() to transmit the entered text
// to the server.
function handleKey(evt) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        if (!document.getElementById("send").disabled) {
            handleSendButton();
        }
    }
}

// Create the RTCPeerConnection which knows how to talk to our
// selected STUN/TURN server and then uses getUserMedia() to find
// our camera and microphone and add that stream to the connection for
// use in our video call. Then we configure event handlers to get
// needed notifications on the call.

async function createPeerConnection() {
    log("Setting up a connection...");

    // Create an RTCPeerConnection which knows to use our chosen
    // STUN server.

    myPeerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own!
            {
                urls: "turn:" + myHostname,  // A TURN server
                username: "webrtc",
                credential: "turnserver"
            }
        ]
    });

    // Set up event handlers for the ICE negotiation process.

    // ICE收集候选信息，当某一端都收集完local和remote描述后，即本地有local和remote的sdp后开始触发ice自动收集
    // 收集候选信息后发送到对端，对端通过wss接收并设置addIceCandidate
    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    myPeerConnection.ontrack = handleTrackEvent;
}

// Called by the WebRTC layer to let us know when it's time to
// begin, resume, or restart ICE negotiation.

async function handleNegotiationNeededEvent() {
    log("*** Negotiation needed", {
        text: "触发时机：当本地RTCPeerConnection检测到会话需要重新协商时触发。例如：首次建立连接时、添加 / 移除媒体轨道（track）、网络状况剧烈变化等，导致当前会话描述（SDP）无法满足需求。\n" +
            "触发者：本地的RTCPeerConnection实例。\n" +
            "触发方向：本地触发本地（本地应用通过该事件知晓需重新发起协商流程，例如调用createOffer生成新的 SDP 并发送给远程）。"
    });

    try {
        log("---> Creating offer");
        const offer = await myPeerConnection.createOffer();

        // If the connection hasn't yet achieved the "stable" state,
        // return to the caller. Another negotiationneeded event
        // will be fired when the state stabilizes.

        if (myPeerConnection.signalingState != "stable") {
            log("     -- The connection isn't stable yet; postponing...")
            return;
        }

        // Establish the offer as the local peer's current
        // description.

        log("---> Setting local description to the offer");
        await myPeerConnection.setLocalDescription(offer);

        // Send the offer to the remote peer.

        log("---> Sending the offer to the remote peer");
        sendToServer({
            name: myUsername,
            target: targetUsername,
            type: "video-offer",
            sdp: myPeerConnection.localDescription
        });
    } catch(err) {
        log("*** The following error occurred while handling the negotiationneeded event:");
        reportError(err);
    };
}

// Called by the WebRTC layer when events occur on the media tracks
// on our WebRTC call. This includes when streams are added to and
// removed from the call.
//
// track events include the following fields:
//
// RTCRtpReceiver       receiver
// MediaStreamTrack     track
// MediaStream[]        streams
// RTCRtpTransceiver    transceiver
//
// In our case, we're just taking the first stream found and attaching
// it to the <video> element for incoming media.

function handleTrackEvent(event) {
    log("*** Track event", {
        text: "触发时机：当有新的媒体轨道（音频 / 视频）通过远程端添加并被本地RTCPeerConnection接收时触发。例如：远程端通过addTrack添加了一个视频轨道，本地收到后会触发该事件。\n" +
            "触发者：本地的RTCPeerConnection实例（由远程端的媒体轨道传输触发）。\n" +
            "触发方向：本地触发本地（本地应用通过该事件获取远程发送的新轨道，并可将其绑定到<video>或<audio>元素播放）。"
    });
    document.getElementById("received_video").srcObject = event.streams[0];
    document.getElementById("hangup-button").disabled = false;
}

// Handles |icecandidate| events by forwarding the specified
// ICE candidate (created by our local ICE agent) to the other
// peer through the signaling server.

function handleICECandidateEvent(event) {
    if (event.candidate) {
        log("*** Outgoing ICE candidate: " + event.candidate.candidate, {
            text: "触发时机：当本地RTCPeerConnection通过 ICE 框架收集到一个新的本地 ICE 候选者（用于网络连接的地址 / 端口信息）时触发。\n" +
                "触发者：本地的RTCPeerConnection实例。\n" +
                "触发方向：本地触发本地（本地应用监听该事件，获取候选者后需通过信令服务器发送给远程端，以完成 ICE 连接协商）。"
        });

        sendToServer({
            type: "new-ice-candidate",
            target: targetUsername,
            candidate: event.candidate
        });
    } else {
        // 收集完成
        console.log("所有候选者收集完毕");
    }
}

// Handle |iceconnectionstatechange| events. This will detect
// when the ICE connection is closed, failed, or disconnected.
//
// This is called when the state of the ICE agent changes.

function handleICEConnectionStateChangeEvent(event) {
    log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState, {
        text: "触发时机：当本地RTCPeerConnection的 ICE 连接状态（iceConnectionState）发生变化时触发。常见状态包括：new（初始）、checking（正在检查连接）、connected（部分连接成功）、completed（完全连接成功）、failed（连接失败）、disconnected（连接断开）、closed（连接关闭）。\n" +
            "触发者：本地的RTCPeerConnection实例。\n" +
            "触发方向：本地触发本地（本地应用通过该事件监听 ICE 连接的状态变化，例如判断连接是否成功或断开）。"
    });

    switch(myPeerConnection.iceConnectionState) {
        case "closed":
        case "failed":
        case "disconnected":
            closeVideoCall();
            break;
    }
}

// Set up a |signalingstatechange| event handler. This will detect when
// the signaling connection is closed.
//
// NOTE: This will actually move to the new RTCPeerConnectionState enum
// returned in the property RTCPeerConnection.connectionState when
// browsers catch up with the latest version of the specification!

function handleSignalingStateChangeEvent(event) {
    log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState, {
        text: "触发时机：当本地RTCPeerConnection的信令状态（signalingState）发生变化时触发。信令状态反映会话描述（SDP）的协商阶段，常见状态包括：stable（稳定状态，无需协商）、have-local-offer（已生成本地 offer）、have-remote-offer（已收到远程 offer）、have-local-pranswer（已生成本地临时应答）、have-remote-pranswer（已收到远程临时应答）、closed（连接关闭）。\n" +
            "触发者：本地的RTCPeerConnection实例（通常由createOffer、setRemoteDescription等信令操作触发状态变化）。\n" +
            "触发方向：本地触发本地（本地应用通过该事件跟踪信令协商的阶段，确保流程正确执行）。"
    });
    switch(myPeerConnection.signalingState) {
        case "closed":
            closeVideoCall();
            break;
    }
}

// Handle the |icegatheringstatechange| event. This lets us know what the
// ICE engine is currently working on: "new" means no networking has happened
// yet, "gathering" means the ICE engine is currently gathering candidates,
// and "complete" means gathering is complete. Note that the engine can
// alternate between "gathering" and "complete" repeatedly as needs and
// circumstances change.
//
// We don't need to do anything when this happens, but we log it to the
// console so you can see what's going on when playing with the sample.

function handleICEGatheringStateChangeEvent(event) {
    log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState, {
        text: "触发时机：当本地RTCPeerConnection的 ICE 候选者收集状态（iceGatheringState）发生变化时触发。常见状态包括：new（未开始收集）、gathering（正在收集候选者）、complete（候选者收集完成）。\n" +
            "触发者：本地的RTCPeerConnection实例。\n" +
            "触发方向：本地触发本地（本地应用通过该事件了解 ICE 候选者的收集进度，例如收集完成后可通知远程端 “无需等待更多候选者”）。"
    });
}

// Given a message containing a list of usernames, this function
// populates the user list box with those names, making each item
// clickable to allow starting a video call.

function handleUserlistMsg(msg) {
    var i;
    var listElem = document.querySelector(".userlistbox");

    // Remove all current list members. We could do this smarter,
    // by adding and updating users instead of rebuilding from
    // scratch but this will do for this sample.

    while (listElem.firstChild) {
        listElem.removeChild(listElem.firstChild);
    }

    // Add member names from the received list.

    msg.users.forEach(function(username) {
        var item = document.createElement("li");
        item.appendChild(document.createTextNode(username));
        item.addEventListener("click", invite, false);

        listElem.appendChild(item);
    });
}

// Close the RTCPeerConnection and reset variables so that the user can
// make or receive another call if they wish. This is called both
// when the user hangs up, the other user hangs up, or if a connection
// failure is detected.

function closeVideoCall() {
    var localVideo = document.getElementById("local_video");

    log("Closing the call");

    // Close the RTCPeerConnection

    if (myPeerConnection) {
        log("--> Closing the peer connection");

        // Disconnect all our event listeners; we don't want stray events
        // to interfere with the hangup while it's ongoing.

        myPeerConnection.ontrack = null;
        myPeerConnection.onnicecandidate = null;
        myPeerConnection.oniceconnectionstatechange = null;
        myPeerConnection.onsignalingstatechange = null;
        myPeerConnection.onicegatheringstatechange = null;
        myPeerConnection.onnotificationneeded = null;

        // Stop all transceivers on the connection

        myPeerConnection.getTransceivers().forEach(transceiver => {
            transceiver.stop();
        });

        // Stop the webcam preview as well by pausing the <video>
        // element, then stopping each of the getUserMedia() tracks
        // on it.

        if (localVideo.srcObject) {
            localVideo.pause();
            localVideo.srcObject.getTracks().forEach(track => {
                track.stop();
            });
        }

        // Close the peer connection

        myPeerConnection.close();
        myPeerConnection = null;
        webcamStream = null;
    }

    // Disable the hangup button

    document.getElementById("hangup-button").disabled = true;
    targetUsername = null;
}

// Handle the "hang-up" message, which is sent if the other peer
// has hung up the call or otherwise disconnected.

function handleHangUpMsg(msg) {
    log("*** Received hang up notification from other peer");

    closeVideoCall();
}

// Hang up the call by closing our end of the connection, then
// sending a "hang-up" message to the other peer (keep in mind that
// the signaling is done on a different connection). This notifies
// the other peer that the connection should be terminated and the UI
// returned to the "no call in progress" state.

function hangUpCall() {
    closeVideoCall();

    sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "hang-up"
    });
}

// Handle a click on an item in the user list by inviting the clicked
// user to video chat. Note that we don't actually send a message to
// the callee here -- calling RTCPeerConnection.addTrack() issues
// a |notificationneeded| event, so we'll let our handler for that
// make the offer.

async function invite(evt) {
    log("Starting to prepare an invitation");
    if (myPeerConnection) {
        alert("You can't start a call because you already have one open!");
    } else {
        var clickedUsername = evt.target.textContent;

        // Don't allow users to call themselves, because weird.

        if (clickedUsername === myUsername) {
            alert("I'm afraid I can't let you talk to yourself. That would be weird.");
            return;
        }

        // Record the username being called for future reference

        targetUsername = clickedUsername;
        log("Inviting user " + targetUsername);

        // Call createPeerConnection() to create the RTCPeerConnection.
        // When this returns, myPeerConnection is our RTCPeerConnection
        // and webcamStream is a stream coming from the camera. They are
        // not linked together in any way yet.

        log("Setting up connection to invite user: " + targetUsername);
        createPeerConnection();

        // Get access to the webcam stream and attach it to the
        // "preview" box (id "local_video").

        try {
            webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            document.getElementById("local_video").srcObject = webcamStream;
        } catch(err) {
            handleGetUserMediaError(err);
            return;
        }

        // Add the tracks from the stream to the RTCPeerConnection

        try {
            webcamStream.getTracks().forEach(
                transceiver = track => myPeerConnection.addTransceiver(track, {streams: [webcamStream]})
            );
        } catch(err) {
            handleGetUserMediaError(err);
        }
    }
}

// Accept an offer to video chat. We configure our local settings,
// create our RTCPeerConnection, get and attach our local camera
// stream, then create and send an answer to the caller.

async function handleVideoOfferMsg(msg) {
    targetUsername = msg.name;

    // If we're not already connected, create an RTCPeerConnection
    // to be linked to the caller.

    log("Received video chat offer from " + targetUsername);
    if (!myPeerConnection) {
        createPeerConnection();
    }

    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.

    var desc = new RTCSessionDescription(msg.sdp);

    // If the connection isn't stable yet, wait for it...

    if (myPeerConnection.signalingState != "stable") {
        log("  - But the signaling state isn't stable, so triggering rollback");

        // Set the local and remove descriptions for rollback; don't proceed
        // until both return.
        await Promise.all([
            myPeerConnection.setLocalDescription({type: "rollback"}),
            myPeerConnection.setRemoteDescription(desc)
        ]);
        return;
    } else {
        log ("  - Setting remote description");
        await myPeerConnection.setRemoteDescription(desc);
    }

    // Get the webcam stream if we don't already have it

    if (!webcamStream) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        } catch(err) {
            handleGetUserMediaError(err);
            return;
        }

        document.getElementById("local_video").srcObject = webcamStream;

        // Add the camera stream to the RTCPeerConnection

        try {
            webcamStream.getTracks().forEach(
                transceiver = track => myPeerConnection.addTransceiver(track, {streams: [webcamStream]})
            );
        } catch(err) {
            handleGetUserMediaError(err);
        }
    }

    log("---> Creating and sending answer to caller");

    await myPeerConnection.setLocalDescription(await myPeerConnection.createAnswer());

    sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "video-answer",
        sdp: myPeerConnection.localDescription
    });
}

// Responds to the "video-answer" message sent to the caller
// once the callee has decided to accept our request to talk.

async function handleVideoAnswerMsg(msg) {
    log("*** Call recipient has accepted our call");

    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.

    var desc = new RTCSessionDescription(msg.sdp);
    await myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

// A new ICE candidate has been received from the other peer. Call
// RTCPeerConnection.addIceCandidate() to send it along to the
// local ICE framework.

async function handleNewICECandidateMsg(msg) {
    var candidate = new RTCIceCandidate(msg.candidate);

    log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
    try {
        await myPeerConnection.addIceCandidate(candidate)
    } catch(err) {
        reportError(err);
    }
}

// Handle errors which occur when trying to access the local media
// hardware; that is, exceptions thrown by getUserMedia(). The two most
// likely scenarios are that the user has no camera and/or microphone
// or that they declined to share their equipment when prompted. If
// they simply opted not to share their media, that's not really an
// error, so we won't present a message in that situation.

function handleGetUserMediaError(e) {
    log_error(e);
    switch(e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            // Do nothing; this is the same as the user canceling the call.
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    // Make sure we shut down our end of the RTCPeerConnection so we're
    // ready to try again.

    closeVideoCall();
}

// Handles reporting errors. Currently, we just dump stuff to console but
// in a real-world application, an appropriate (and user-friendly)
// error message should be displayed.

function reportError(errMessage) {
    log_error(`Error ${errMessage.name}: ${errMessage.message}`);
}