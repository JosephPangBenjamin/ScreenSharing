const mediaConstraints = {
    audio: true, // We want an audio track
    video: true, // ...and we want a video track
};
class Signaler {
    ws;
    wsUrl = null;
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
        this.wsUrl = url;
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
    handleVideoAnswerMsg = async (msg) => {
        if (!this.myPeerConnection) {
            console.error("收到answer但未初始化PeerConnection");
            return;
        }
        try {
            const desc = new RTCSessionDescription(msg.sdp);
            await this.myPeerConnection.setRemoteDescription(desc); // 仅设置answer，无多余逻辑
        } catch (e) {
            console.error("处理answer失败：", e);
        }
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
            const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            this.webcamStream = localStream;
            document.getElementById("local_video").srcObject = localStream;
            // 严格按顺序添加：先音频后视频
            if (this.myPeerConnection.getSenders().length === 0) {
                localStream.getAudioTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream));
                localStream.getVideoTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream));
            }

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
        if (!this.myPeerConnection) {
            console.warn("收到ICE候选但未初始化PeerConnection，忽略");
            return;
        }
        const candidate = new RTCIceCandidate(msg.candidate);
        try {
            await this.myPeerConnection.addIceCandidate(candidate);
        } catch (e) {
            if (!this.ignoreOffer) {
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
        if (this.ws.readyState === WebSocket.OPEN) {
            const msgJSON = JSON.stringify(msg)
            this.ws.send(msgJSON);
        }
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

    invite = async (evt) => {
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

            // 同步获取流并添加轨道
            const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            this.webcamStream = localStream;
            document.getElementById("local_video").srcObject = localStream;
            localStream.getAudioTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream));
            localStream.getVideoTracks().forEach(track => this.myPeerConnection.addTrack(track, localStream));
        }
    }

    // 简单实现closeVideoCall（根据需求扩展）
    closeVideoCall = () => {
        if (this.myPeerConnection) {
            this.myPeerConnection.close();
            this.myPeerConnection = null;
        }
        // 释放媒体流等其他资源
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
        document.getElementById("received_video").srcObject = null;
        document.getElementById("hangup-button").disabled = true;
    };

    // 在类中引用时需绑定this（或改为类方法）
    handleGetUserMediaError = (e) => {
        // ...（错误处理不变）
        closeVideoCall.call(this); // 绑定当前实例
    }
    createPeerConnection = () => {
        if (this.myPeerConnection) {
            this.myPeerConnection.close();
        }
        const pcConfig = {
            iceServers: [
                {
                    urls: 'stun:8.140.237.167:3478'  // 仅STUN
                },
                {
                    urls: 'turn:8.140.237.167:3478?transport=udp',  // 优先UDP中继
                    username: 'webrtc',
                    credential: '123456'
                },
                {
                    urls: 'turn:8.140.237.167:3478?transport=tcp',  // 备用TCP中继（应对UDP封锁）
                    username: 'webrtc',
                    credential: '123456'
                }
            ],
            iceTransportPolicy: 'relay',  // 测试阶段强制使用TURN中继，验证是否因NAT类型导致问题
            iceConnectionTimeout: 20000  // 延长超时时间
        };
        this.myPeerConnection = new RTCPeerConnection(pcConfig);

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
        const remoteVideo = document.getElementById("received_video");
        const remoteStream = evt.streams[0];
        const videoTracks = remoteStream.getVideoTracks();

        // 仅在流未绑定且包含有效轨道时处理
        if (remoteVideo.srcObject !== remoteStream && videoTracks.length > 0 && videoTracks[0].enabled) {
            remoteVideo.srcObject = remoteStream;
            console.log("远程流已绑定到视频元素（仅一次）");

            remoteVideo.play()
                .then(() => console.log("远程视频播放成功（仅一次）"))
                .catch(err => {
                    if (err.name === "AbortError") {
                        console.warn("play()被打断，1秒后重试");
                        setTimeout(() => remoteVideo.play().catch(/* 处理逻辑 */), 1000);
                    }
                });
        }
        document.getElementById("hangup-button").click = this.closeVideoCall;
        document.getElementById("hangup-button").disabled = false;
    }
    // 新增：显示用户交互播放按钮
    showPlayButton = (remoteVideo) => {
        const playBtn = document.getElementById("remote-play-btn");
        // 若按钮已存在，无需重复创建
        if (playBtn) return;

        const btn = document.createElement("button");
        btn.id = "remote-play-btn";
        btn.textContent = "点击播放远程视频";
        btn.style.position = "absolute";
        btn.style.top = "50%";
        btn.style.left = "50%";
        btn.style.transform = "translate(-50%, -50%)";
        btn.onclick = () => {
            remoteVideo.play()
                .then(() => btn.remove()) // 播放成功后移除按钮
                .catch(err => alert("播放失败：" + err.message));
        };
        // 将按钮添加到视频元素父容器（确保覆盖在视频上）
        remoteVideo.parentNode.appendChild(btn);
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
    // 新增：监控链路质量（可选，用于定位丢包问题）
    monitorLinkQuality = () => {
        // 直接调用原生getStats，绕开适配器
        const nativeGetStats = this.myPeerConnection.webkitGetStats || this.myPeerConnection.mozGetStats || this.myPeerConnection.getStats;
        setInterval(() => {
            nativeGetStats.call(this.myPeerConnection).then(stats => {
                let videoLost = 0;
                let videoTotal = 0;

                // 遍历stats，统计视频丢包（根据浏览器差异调整字段）
                stats.forEach(stat => {
                    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                        videoLost = stat.packetsLost || 0;
                        videoTotal = stat.packetsReceived + videoLost;
                    }
                });

                const result = {
                    videoLossRate: 0,    // 视频丢包率
                    audioLossRate: 0,    // 音频丢包率
                    videoBitrate: 0,     // 视频接收码率（bps）
                    rtt: 0               // 往返延迟（ms）
                };

                stats.forEach(stat => {
                    // 视频丢包率
                    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                        const total = (stat.packetsReceived || 0) + (stat.packetsLost || 0);
                        result.videoLossRate = total > 0 ? (stat.packetsLost / total) * 100 : 0;
                        // 视频码率（通过字节差计算）
                        if (stat.bytesReceived && stat.timestamp) {
                            const now = Date.now();
                            const bytesDiff = stat.bytesReceived - (window.lastVideoBytes || 0);
                            const timeDiff = (now - (window.lastVideoTime || 0)) / 1000; // 秒
                            result.videoBitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff : 0;
                            window.lastVideoBytes = stat.bytesReceived;
                            window.lastVideoTime = now;
                        }
                    }
                    // 往返延迟（RTT）
                    if (stat.type === 'transport') {
                        result.rtt = stat.roundTripTime || 0;
                    }
                });

                console.log('网络状况：', result);

                const lossRate = videoTotal > 0 ? (videoLost / videoTotal) * 100 : 0;
                console.log('视频丢包率：', lossRate.toFixed(2) + '%');

                const videoSender = this.myPeerConnection.getSenders().find(s => s.track.kind === 'video');
                // console.log('当前视频发送参数：', videoSender.getParameters());
                // if (lossRate > 5) { // 丢包率>6%，降低码率
                //     videoSender.setParameters({ encodings: [{ maxBitrate: 300000 }] });
                // } else if (lossRate < 2) { // 丢包率<2%，提高码率
                //     videoSender.setParameters({ encodings: [{ maxBitrate: 1500000 }] });
                // }
            }).catch(err => {
                console.error('获取丢包率失败:', err);
            });
        }, 3000);

    }
    initWebSocket = () => {
        this.ws = new WebSocket(this.wsUrl, "json");
        if (this.ws.readyState === WebSocket.OPEN) {

        }
        this.ws.onopen = (evt) => {
            document.getElementById("text").disabled = false;
            document.getElementById("send").disabled = false;
            this.localUUID = this.generateUUID();
            this.ws.onmessage = this.onmessage;
        }
        // 关闭时自动重连
        this.ws.onclose = () => {
            console.log('WebSocket关闭，3秒后重连...');
            setTimeout(this.initWebSocket, 3000);
        };
    }
    // 新增：重建PeerConnection（ICE failed时调用）
    recreatePeerConnection = async () => {
        this.closeVideoCall(); // 先关闭旧连接
        this.initWebSocket();
        if (this.ws.readyState === WebSocket.OPEN) {
            this.createPeerConnection(); // 重建连接
            // 重新添加媒体轨道（复用之前的localStream，避免重复调用getUserMedia）
            if (this.webcamStream && this.myPeerConnection.getSenders().length === 0) {
                this.webcamStream.getAudioTracks().forEach(track => this.myPeerConnection.addTrack(track, this.webcamStream));
                this.webcamStream.getVideoTracks().forEach(track => this.myPeerConnection.addTrack(track, this.webcamStream));
            }
            // 重新发起offer协商
            await this.handleNegotiationNeededEvent();
        }

    }
    handleICEConnectionStateChangeEvent = async (evt) => {
        const iceState = this.myPeerConnection.iceConnectionState;
        console.log("=== ICE 连接状态 ===", iceState);
        switch (iceState) {
            case "checking":
                console.log("正在交换 ICE 候选，尝试连接...");
                break;
            case "connected":
                console.log("ICE 连接成功，媒体流开始传输");
                // 连接成功后，可开启链路质量监控
                this.monitorLinkQuality();
                break;
            case "disconnected":
                console.warn(`ICE 连接断开，尝试重连... 断开原因${evt}`);
                console.log("通过断开原因尝试不同解决方法，如网络切换导致就重启收集，主动放弃就断开");
                // 延迟1秒重启ICE（避免频繁重试）
                setTimeout(() => {
                    if (this.myPeerConnection && this.myPeerConnection.signalingState !== "closed") {
                        this.myPeerConnection.restartIce(); // 重启ICE，重新收集候选
                    }
                }, 5000);
                break;
            case "failed":
                console.error("ICE 连接彻底失败，尝试重建PeerConnection...");
                await this.recreatePeerConnection(); // 彻底重建连接（需重新协商offer/answer）
                break;
        }
    }
    handleICEGatheringStateChangeEvent(evt) { }
    handleSignalingStateChangeEvent(evt) { }

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
                    await this.handleVideoAnswerMsg(msg);
                    break;
                case "new-ice-candidate":
                    await this.handleNewICECandidateMsg(msg);
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
signaler.initWebSocket();

