import {useCallback, useRef, useState} from 'react';
/**
 * ICE服务器配置，用于NAT穿透
 * 配置STUN服务器、TURN服务器
 */
const ICE_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, // 主STUN
        { urls: "stun:stun.mozilla.org:3478" },    // 备用STUN（提高可靠性）
        // 添加TURN服务器以提高在复杂网络环境下的连接成功率
        {
            urls: "turn:qtai.net.cn",
            username: "webrtc",
            credential: "turnserver"
        }
    ]
};

// 信令服务器地址
const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || "wss://localhost:3000"


export const useWeb = () => {
    // ui更新
    // 连接状态
    // const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
    // const [localAudioEnabled] = useAtom(localAudioEnabledAtom);
    // const [localVideoEnabled] = useAtom(localVideoEnabledAtom);
    // const [screenSharingEnabled, setScreenSharingEnabled] = useAtom(screenSharingEnabledAtom);
    // const [message, setMessages] = useAtom(messagesAtom);
    // const [roomId, setRoomId] = useAtom(roomIdAtom);
    const [userName, setUserName] = useState("");
    const [targetUserName, setTargetUserName] = useState("");
    const clientId = useRef("");
    const myUsername = useRef("");
    const targetUsername = useRef("");

    // 引用类型
    // 连接ref
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteSteam = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const wsConnectionRef = useRef<WebSocket | null>(null);

    const handleGetUserMediaError = (err: Error) => {
        switch (err.name) {
            case "NotFoundError":
                alert("无摄像头或麦克风");
                break;
            case "SecurityError":
            case "PermissionDeniedError":
                // Do nothing; this is the same as the user canceling the call.
                break;
            default:
                alert("打开摄像头麦克风错误");
                break;
        }
    };
    const reportError = (errMessage: any) => {
        log_error(`Error ${errMessage.name}: ${errMessage.message}`);
    }
    const log = (text: any) => {
        const time = new Date();
        console.log("[" + time.toLocaleTimeString() + "]" + text);
    };
    const log_error = (text: any) => {
        const time = new Date();
        console.trace("[" + time.toLocaleTimeString() + "]" + text);
    };
    const closeVideoCall = useCallback(() => {
        log("closing the call");
        if (peerConnectionRef.current) {
            log("closing the peer connection.");
            peerConnectionRef.current.ontrack = null;
            peerConnectionRef.current.onicecandidate = null;
            peerConnectionRef.current.oniceconnectionstatechange = null;
            peerConnectionRef.current.onsignalingstatechange = null;
            peerConnectionRef.current.onicegatheringstatechange = null;
            peerConnectionRef.current.onnegotiationneeded = null;

            // Stop all transceivers on the connection
            // getTransceivers啥意思
            peerConnectionRef.current.getTransceivers().forEach(transceiver => {
                transceiver.stop();
            });

            if (remoteSteam.current && remoteVideoRef.current && remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.pause();

                remoteSteam.current.getTracks().forEach(track => {
                    track.stop();
                })
            }
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
            remoteSteam.current = null;
        }
    }, []);

    const sendToServer = (msg: any) => {
        const msgJSON = JSON.stringify(msg);
        log(`Sending ${msg.type} message ${msgJSON}`);
        wsConnectionRef.current?.send(msgJSON);
    };

    // 初始化本地媒体流
    const initializeLocalMediaStream = useCallback(async (audio = true) => {
        try {
            // 检查浏览器是否支持媒体设备API
            if (!navigator.mediaDevices || !await navigator.mediaDevices.getUserMedia()) {
                const errMsg = "您的浏览器不支持媒体设备API。请使用现代浏览器如Chrome、Firefox或Edge。";
                console.error(errMsg);
            }

            try {
                const mediaConstraints = {
                    audio: true,            // We want an audio track
                    video: {
                        aspectRatio: {
                            ideal: 1.333333     // 3:2 aspect is preferred
                        }
                    }
                };
                localStreamRef.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                localVideoRef.current && (localVideoRef.current.srcObject = localStreamRef.current);
            } catch (err: any) {
                handleGetUserMediaError(err);
            }

            // 将媒体流所有轨道添加到连接中
            try {
                localStreamRef.current && localStreamRef.current?.getTracks().forEach(track => {
                    // addTransceiver
                    // addTrack
                    localStreamRef.current && peerConnectionRef.current && (peerConnectionRef.current.addTransceiver(track, { streams: [localStreamRef.current]}))
                })
            } catch (err: any) {
                handleGetUserMediaError(err);
            }


        } catch (err: any) {
            console.error("获取本地媒体流失败：", err, audio);

            let errorMessage = "无法访问摄像头或麦克风";
            if (err instanceof Error) {
                switch (err.name) {
                    case "NotAllowedError":
                    case "SecurityError":
                        errorMessage = "您拒绝了媒体设备访问权限，请在浏览器设置中允许访问摄像头和麦克风。";
                        break;
                    case "NotFoundError":
                        errorMessage = "未找到摄像头和麦克风设备。";
                        break;
                    case "NotReadableError":
                        errorMessage = "摄像头或麦克风被其他应用占用，请先关闭占用设备的应用";
                        break;
                    default:

                }
            }
            reportError(errorMessage);
            throw err;
        }
    }, []);

    // 创建对等连接
    const createPeerConnection = useCallback(() => {
        log("Setting up a peer connection...");
        peerConnectionRef.current = new RTCPeerConnection(ICE_CONFIG);

        peerConnectionRef.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                log(`*** Outgoing ICE candidate: ${event.candidate.candidate}`);
                sendToServer({
                    type: "new-ice-candidate",
                    target: targetUsername.current,
                    candidate: event.candidate,
                })
            } else {
                // 为null表示收集完成
                log("所有候选者收集完毕。");
            }
        };

        peerConnectionRef.current.oniceconnectionstatechange = (event: Event) => {
            log(`*** ICE connection status changed to [ ${peerConnectionRef.current?.iceConnectionState} ] | ${ event }`);
            switch (peerConnectionRef.current?.iceConnectionState) {
                case "closed":
                case "failed":
                case "disconnected":
                    closeVideoCall();
                    break;
                case "new":
                    break;
                case "checking":
                    break;
                case "connected":
                    break;
                case "completed":
                    break;
                default:

            }
        };

        peerConnectionRef.current.onicegatheringstatechange = (event: Event) => {
            log(`*** ICE gathering state changed to: [ ${peerConnectionRef.current?.iceGatheringState} ] ${event}`)
        };

        peerConnectionRef.current.onsignalingstatechange = (event: Event) => {
            log(`*** WebRTC signaling state changed to: [ ${peerConnectionRef.current?.signalingState} ] ${event}`);

            switch (peerConnectionRef.current?.signalingState) {
                case "closed":
                    closeVideoCall();
                    break;
                case "stable":
                    break;
                case "have-local-offer":
                    log("有本地offer");
                    break;
                case "have-local-pranswer":
                    log("有本地临时应答");
                    break;
                case "have-remote-offer":
                    log("有远程offer");
                    break;
                case "have-remote-pranswer":
                    log("有远程临时应答");
                    break;
                default:
                    log("signalingState - default");
            }
        };

        peerConnectionRef.current.onnegotiationneeded = async (event: Event) => {
            log(`*** Negotiation needed ${event}`);

            try {
                if (peerConnectionRef.current?.signalingState !== "stable") {
                    // 这个方法是创建对等连接
                    // 若此时非stable状态，表示当前是sdp无法满足会话要求
                    // 此时只能是收到呼叫邀请后，添加/移除媒体轨道触发的
                    // 还有网络状态引起或者关闭摄像头/麦克风引起的后续和首次连接是一样的，如果只关闭一个呢，全部关闭呢
                    // 官网好像说的是一样的
                    log("The connection isn't stable yet");
                    return;
                }

                // 此时表明本地发起的呼叫
                log("creating offer");
                const offer = await peerConnectionRef.current?.createOffer();
                log("set local description to the offer");
                await peerConnectionRef.current.setLocalDescription(offer);

                log("sending the offer to the remote peer");
                sendToServer({
                    type: "video-offer",
                    name: myUsername.current,
                    target: targetUsername.current,
                    sdp: peerConnectionRef.current.localDescription,
                });
            } catch (err: any) {
                log(`*** The following error occurred while handling the negotiationneeded event: ${err}`);
            }
        };

        peerConnectionRef.current.ontrack = (event: RTCTrackEvent) => {
            log(`*** Track event ${event}`);
            if (!remoteVideoRef.current) {
                console.error("remote-video-ref错误");
                return;
            }
            remoteVideoRef.current.srcObject = event.streams[0];

            const audioTracks = localStreamRef.current?.getAudioTracks();
            const videoTracks = localStreamRef.current?.getVideoTracks();
            log(`audio-videoTracks:${audioTracks} - ${ videoTracks }`);

            // addTrack addTransceiver
        };

        peerConnectionRef.current.ondatachannel = (event: RTCDataChannelEvent) => {
            log(`处理远程数据通道 ${event}`);
        };
    }, []);

    const handleVideoOfferMsg = async (msg: any) => {
        targetUsername.current = msg.name;
        setTargetUserName(msg.name);
        log(`Received video chat offer from ${targetUsername.current}`);
        if (!peerConnectionRef.current) {
            createPeerConnection();
        }

        // 设置remote sdp
        const desc = new RTCSessionDescription(msg.sdp);

        if (peerConnectionRef.current?.signalingState !== "stable") {
            log("  - But the signaling state isn't stable, so triggering rollback");

            if (peerConnectionRef.current) {
                await Promise.all([
                    peerConnectionRef.current.setLocalDescription({ type: "rollback" }),
                    peerConnectionRef.current.setRemoteDescription(desc),
                ]);
                return;
            }
        } else {
            log("Setting remote description");
            await peerConnectionRef.current.setRemoteDescription(desc);
        }

        if (!localStreamRef.current) {
            try {
                const mediaConstraints = {
                    audio: true,            // We want an audio track
                    video: {
                        aspectRatio: {
                            ideal: 1.333333     // 3:2 aspect is preferred
                        }
                    }
                };
                localStreamRef.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);

            } catch (err: any) {
                handleGetUserMediaError(err);
                return;
            }

            localVideoRef.current && ( localVideoRef.current.srcObject = localStreamRef.current);

            try {
                localStreamRef.current.getTracks().forEach(track => {
                    localStreamRef.current && peerConnectionRef.current?.addTransceiver(track, { streams: [localStreamRef.current]});
                })
            } catch (err: any) {
                handleGetUserMediaError(err);
            }
        }

        log("creating and sending answer to caller");

        peerConnectionRef.current && (await peerConnectionRef.current.setLocalDescription(await peerConnectionRef.current.createAnswer()));

        sendToServer({
            type: "video-answer",
            name: myUsername.current,
            target: targetUsername.current,
            sdp: peerConnectionRef.current?.localDescription,
        })

    };

    const handleVideoAnswerMsg = async (msg: any) => {
        log("call recipient has accepted out call");

        const desc = new RTCSessionDescription(msg.sdp);
        await peerConnectionRef.current?.setRemoteDescription(desc).catch(reportError);
    };

    const handleNewICECandidateMsg = async (msg: any) => {
        const candidate = new RTCIceCandidate(msg.candidate);
        log(`adding received ICE candidate: ${JSON.stringify(candidate)}`);

        try {
            await peerConnectionRef.current?.addIceCandidate(candidate);
        } catch (err: any) {
            reportError(err);
        }
    };

    const handleHangUpMsg = (msg: any) => {
        log(`received hang up notification from other peer ${msg}`);
        closeVideoCall();
    };

    const hangUpCall = () => {
        closeVideoCall();

        sendToServer({
            name: myUsername,
            target: targetUsername,
            type: "hang-up"
        });
    }

    // 初始化websocket连接
    const initializeWebSocket = useCallback(() => {
        log(`Connecting to server: ${ SIGNALING_SERVER_URL }`);
        wsConnectionRef.current = new WebSocket(SIGNALING_SERVER_URL, "json");

        if (wsConnectionRef.current) {
            wsConnectionRef.current.onopen = (event: Event) => {
                log(`onopen-event: ${event}`);
            };

            wsConnectionRef.current.onmessage = (event: MessageEvent) => {
                if (wsConnectionRef.current && wsConnectionRef.current.readyState === WebSocket.OPEN) {
                    const msg = JSON.parse(event.data);
                    log("Message received: ");
                    console.dir(msg);
                    switch (msg.type) {
                        case "id":
                            clientId.current = msg.id;
                            setUserName(myUsername.current);
                            sendToServer({
                               type: "username",
                               name: myUsername.current,
                               date: Date.now(),
                               id: clientId.current,
                            });
                            break;
                        case "username":
                            break;
                        case "userlist":
                            log(`userlist: ${msg.users}`);
                            break;
                        case "video-offer":
                            handleVideoOfferMsg(msg);
                            break;
                        case "video-answer":
                            handleVideoAnswerMsg(msg);
                            break;
                        case "new-ice-candidate":
                            handleNewICECandidateMsg(msg);
                            break;
                        case "message":
                            const text = "(" + Date.now().toLocaleString() + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                            log(text);
                            break;
                        case "rejectusername":
                            myUsername.current = msg.name;
                            setUserName(msg.name);
                            const text1 = "<b>Your username has been set to <em>" + myUsername +
                                "</em> because the name you chose is in use.</b><br>";
                            log(text1);
                            break;
                        case "hang-up":
                            handleHangUpMsg(msg);
                            break;
                        default:
                            log("Unknow message received:");
                    }
                }
            };
        }
    }, []);

    const handleConnect = async () => {
        log("starting to prepare an invitation");
        if (peerConnectionRef.current) {
            alert("you can't start a call because you already have one open!");
        } else {
            if (myUsername.current === targetUsername.current) {
                alert("I'm afraid I can't let you talk to yourself. That would be weird.");
                return;
            } else if (myUsername.current && targetUsername.current) {
                log(`Inviting user ${targetUsername.current}`);
                log(`setting up connection to invite user ${targetUsername.current}`);
                createPeerConnection();

                await initializeLocalMediaStream();
            } else {
                alert("未登录或需连接的用户不存在");
            }
        }
    };

    return {
        userName,
        myUsername,
        setUserName,
        targetUserName,
        setTargetUserName,
        targetUsername,

        handleConnect,
        initializeWebSocket,
        hangUpCall,
        handleHangUpMsg,
    }
};












