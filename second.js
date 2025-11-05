const mediaConstraints = {
    audio: true, // We want an audio track
    video: true, // ...and we want a video track
};
class Signaler {
    ws
    localUUID = null;
    makingOffer = false
    polite = true
    clientID;
    myUsername = null;
    targetUsername = null;      // To store username of other peer
    myPeerConnection = null;    // RTCPeerConnection
    ignoreOffer = false;
    transceiver = null;         // RTCRtpTransceiver
    webcamStream = null;
    constructor(url) {
        this.ws = new WebSocket(url, "json");
        if (this.ws.readyState === WebSocket.OPEN) {

        }
        this.ws.onopen = (evt) => {
            document.getElementById("text").disabled = false;
            document.getElementById("send").disabled = false;
            this.localUUID = this.generateUUID();
            this.ws.onmessage = this.onmessage;
        }
        return this.ws;
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    isPolite = (remoteUUID) => {
        // uuid小为不礼貌端
        this.polite = this.localUUID > remoteUUID;
    }


    hangleHangUpMsg(msg) {

    }
    handleVideoOfferMsg = async (msg) => {
        this.isPolite(msg.UUID);
        this.targetUsername = msg.name;
        if (!this.myPeerConnection) {
            this.createPeerConnection();
        }

        try {
            // msg.type还是sdp.type
            const offerCollision = msg.sdp.type === "offer" && (this.makingOffer || this.myPeerConnection.signalingState !== "stable");
            this.ignoreOffer = !this.polite && offerCollision; // 我方无礼 & 存在碰撞邀约
            if (this.ignoreOffer) {
                return;
            }

            // 初始化媒体流
            navigator.mediaDevices
                .getUserMedia(mediaConstraints)
                .then( (localStream) => {
                    document.getElementById("local_video").srcObject = localStream;
                    // 本地和远程都先加音频，后加视频
                    localStream.getAudioTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream)); // 音频在前
                    localStream.getVideoTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream)); // 视频在后
                })
                .catch(this.handleGetUserMediaError);


            const desc = new RTCSessionDescription(msg.sdp);
            await this.myPeerConnection.setRemoteDescription(desc);
            if (msg.sdp.type === "offer") {
                await this.myPeerConnection.setLocalDescription();
                this.sendToServer({
                    type: "video-answer",
                    name: this.myUsername,
                    target: this.targetUsername,
                    sdp: this.myPeerConnection.localDescription,
                })
            }
        } catch (e) {

            console.error(`[${Date.now()}]:${e.message},${e}}`);
        }
    }
    handleNewICECandidateMsg = async (msg) => {
        const candidate = new RTCIceCandidate(msg.candidate);
        try {
            await this.myPeerConnection.addIceCandidate(candidate);
        } catch (e) {
            if (!ignoreOffer) {
                console.error("不能被忽略的offer的ice添加异常", e.message);
                throw e;
            }
        }
    }
    setUsername = () => {
        this.sendToServer({
            name: this.myUsername,
            date: Date.now(),
            id: this.clientID,
            type: "username"
        });
    }
    sendToServer = (msg) => {
        const msgJSON = JSON.stringify(msg)
        this.ws.send(msgJSON);
    }

    handleUserlistMsg = (msg) => {
        var i;
        var listElem = document.querySelector(".userlistbox");

        while (listElem.firstChild) {
            listElem.removeChild(listElem.firstChild);
        }

        msg.users.forEach((username) => {
            var item = document.createElement("li");
            item.appendChild(document.createTextNode(username));
            item.addEventListener("click", this.invite, false);

            listElem.appendChild(item);
        });
    }

    invite = (evt) => {
        if (this.myPeerConnection) {
            alert("You can't start a call because you already have one open!");
        } else {
            var clickedUsername = evt.target.textContent;

            if (clickedUsername === this.myUsername) {
                alert(
                    "I'm afraid I can't let you talk to yourself. That would be weird.",
                );
                return;
            }

            this.targetUsername = clickedUsername;

            this.createPeerConnection();

            navigator.mediaDevices
                .getUserMedia(mediaConstraints)
                .then((localStream) => {
                    document.getElementById("local_video").srcObject = localStream;
                    // 本地和远程都先加音频，后加视频
                    localStream.getAudioTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream)); // 音频在前
                    localStream.getVideoTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream)); // 视频在后
                })
                .catch(this.handleGetUserMediaError);
        }
    }

    handleGetUserMediaError = (e) => {
        switch (e.name) {
            case "NotFoundError":
                alert(
                    "Unable to open your call because no camera and/or microphone" +
                    "were found.",
                );
                break;
            case "SecurityError":
            case "PermissionDeniedError":
                // Do nothing; this is the same as the user canceling the call.
                break;
            default:
                alert("Error opening your camera and/or microphone: " + e.message);
                break;
        }

        closeVideoCall();
    }

    createPeerConnection = () => {
        this.myPeerConnection = new RTCPeerConnection({
            // host
            // srflx stun服务器
            // relay turn服务器
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, // 主STUN
                { urls: "stun:stun.mozilla.org:3478" },    // 备用STUN（提高可靠性
                { urls: "stun:stun.stunprotocol.org" },

                { urls: "stun:stun.l.google.com:19302" }, // 搭配 STUN 使用
                {
                    urls: "turns:openrelay.metered.ca:443", // 加密协议+端口
                    username: "openrelayproject",
                    credential: "openrelayproject"
                },
                {
                    urls: "turn:openrelay.metered.ca:443", // 备用非加密（若加密失败）
                    username: "openrelayproject",
                    credential: "openrelayproject"
                }
            ],
        });

        this.myPeerConnection.onicecandidate = this.handleICECandidateEvent;
        this.myPeerConnection.ontrack = this.handleTrackEvent;
        this.myPeerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent;
        // this.myPeerConnection.onremovetrack = this.handleRemoveTrackEvent;
        this.myPeerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
        this.myPeerConnection.onicegatheringstatechange =
            this.handleICEGatheringStateChangeEvent;
        this.myPeerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    }

    handleICECandidateEvent = (evt) => {
        if (evt.candidate) {
            console.log("ICE候选类型：", evt.candidate.type, "地址：", evt.candidate.address);

            this.sendToServer({
                type: "new-ice-candidate",
                target: this.targetUsername,
                candidate: evt.candidate,
            })
        } else {
            console.log("ice候选全部结束")
        }
    }
    handleTrackEvent = (evt) => {
        // RTCRtpReceiver       receiver
        // MediaStreamTrack     track
        // MediaStream[]        streams
        // RTCRtpTransceiver    transceiver
        document.getElementById("received_video").srcObject = evt.streams[0];
        document.getElementById("hangup-button").disabled = false;
    }
    handleNegotiationNeededEvent = async () => {
        try {
            this.makingOffer = true;
            await this.myPeerConnection.setLocalDescription();
            this.sendToServer({
                type: "video-offer",
                name: this.myUsername,
                target: this.targetUsername,
                sdp: this.myPeerConnection.localDescription,
                UUID: this.localUUID,
            });

        } catch (e) {
            alert(e.message);
        } finally {
            this.makingOffer = false;
        }
    }
    handleICEConnectionStateChangeEvent = (evt) => {
        if (this.myPeerConnection.iceConnectionState === "failed") {
            this.myPeerConnection.restartIce();
        }
    }
    handleICEGatheringStateChangeEvent(evt) {}
    handleSignalingStateChangeEvent(evt) {}

    onmessage = async (evt) => {
        var chatBox = document.querySelector(".chatbox");
        var text = "";
        const msg = JSON.parse(evt.data);
        var time = new Date(msg.date);
        var timeStr = time.toLocaleTimeString();
        if (msg) {

            switch (msg.type) {
                case "id":
                    this.clientID = msg.id;
                    this.myUsername = this.localUUID;
                    this.setUsername();
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

                    this.handleUserlistMsg(msg);
                    break;
                case "video-offer":
                    await this.handleVideoOfferMsg(msg);
                    break;
                case "video-answer":
                    await this.handleVideoOfferMsg(msg);
                    break;
                case "new-ice-candidate":
                    this.handleNewICECandidateMsg(msg);
                    break;
                case "hang-up":
                    this.hangleHangUpMsg(msg);
                    break;
                default:
            }
        }
    }
}

var signaler = new Signaler("wss://www.qtai.net.cn:3000/");

