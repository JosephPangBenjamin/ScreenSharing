import React, {useRef, useState} from 'react';
// import VideoCall from './components/VideoCall';
import Chat from './components/Chat';
import Button from './components/common/Button';
import Input from './components/common/Input';
import './App1.scss';
import {handleOnOpen, handleOnError} from "./utils/test.ts";

// 信令协议
// interface Message {
//     type: "video-offer" | "video-answer";
//     name: string;
//     target: string;
//     sdp: string; // 媒体格式
// }
// // ICE候选协商具体如何连接
// // 每个ICE候选描述发送者使用的通信方法
// // 每个节点按照他们被发现的顺序发送候选并且保持发送直到退出，即使媒体数据流已经开始传递也要如此
// // 候选信息
// interface Candidate {
//     type: "new-ice-candidate";
//     target: string;
//     sdp: string; // SDP候选字符串，描述了计划的连接方法，通常不需要查看此字符串的内容。你需要做的所有代码都是使用信令服务器将其路由到远程对等机。
// }
const config = {
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
const mediaConstraints = {
    audio: true,            // We want an audio track
    video: {
        aspectRatio: {
            ideal: 1.333333     // 3:2 aspect is preferred
        }
    }
};
const wss_url = "wss://www.qtai.net.cn:3000/";
function App1() {
    const myUsername = useRef("");
    const targetUsername = useRef("");
    const [roomId, setRoomId] = useState("1");
    const [userList, setUserList] = useState<string[]>([]);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const websocket = useRef<WebSocket | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const webCamStream = useRef<MediaStream | null>(null);
    // 新增状态管理手动播放按钮
    const [showPlayButton, setShowPlayButton] = useState(false);
    const clientID = useRef("");

    function reportError(errMessage: any) {
        log_error(`Error ${errMessage.name}: ${errMessage.message}`);
    }
    // 日志
    const log = (text: any) => {
        const time = new Date();
        console.log("[" + time.toLocaleTimeString() + "]" + text);
    };
    const log_error = (text: any) => {
        const time = new Date();
        console.trace("[" + time.toLocaleTimeString() + "]" + text);
    };
    // 手动播放函数
    const handleManualPlay = () => {
        const remoteVideo = remoteVideoRef.current;
        if (remoteVideo) {
            remoteVideo.play().then(() => {
                setShowPlayButton(false);
            }).catch(err => {
                console.error("手动播放失败:", err);
            });
        }
    };

    const sendUserName = () => {
        sendToServer({
            name: myUsername.current,
            date: Date.now(),
            id: clientID.current,
            type: "username"
        });
    };

    const sendToServer = (msg: any)=> {
        const msgJSON = JSON.stringify(msg);
        log("Sending '" + msg.type + "' message: " + msgJSON);
        websocket.current?.send(msgJSON);
    }

    const closeVideoCall = () => {
        log("Closing the call");
        if (peerConnection.current) {
            log("--> Closing the peer connection");
            peerConnection.current.ontrack = null;
            peerConnection.current.onicecandidate = null;
            peerConnection.current.oniceconnectionstatechange = null;
            peerConnection.current.onsignalingstatechange = null;
            peerConnection.current.onicegatheringstatechange = null;
            peerConnection.current.onnegotiationneeded = null;

            // Stop all transceivers on the connection
            peerConnection.current.getTransceivers().forEach(transceiver => {
                transceiver.stop();
            });

            if (webCamStream.current && localVideoRef.current && localVideoRef.current.srcObject) {
                localVideoRef.current.pause();
                // localVideoRef.current.getTracks().forEach(track => {
                //     track.stop();
                // });
                webCamStream.current?.getTracks().forEach(track => {
                    track.stop();
                });
            }

            peerConnection.current.close();
            peerConnection.current = null;
            webCamStream.current = null;
        }
    }
    const handleICECandidateEvent = (event:  RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
            log("*** Outgoing ICE candidate: " + event.candidate.candidate);
            sendToServer({
                type: "new-ice-candidate",
                target: targetUsername.current,
                candidate: event.candidate,
            })
        } else {
            // 为null表示收集完成
            console.log("所有候选者收集完毕");
        }
    };

    const handleICEConnectionStateChangeEvent = (event: Event) => {
        // @ts-ignore
        log(`*** ICE connection state changed to ${event}` + peerConnection.current.iceConnectionState);
        switch (peerConnection.current?.iceConnectionState) {
            case "closed":
            case "failed":
            case "disconnected":
                closeVideoCall();
                break;
            case "new":
                // console.log("ice连接状态-new");
                break;
            case "checking":
                // console.log("ice连接状态-checking");
                break;
            case "connected":
                // console.log("ice连接状态-connected-部分连接成功");
                break;
            case "completed":
                // console.log("ice连接状态-completed-完全连接成功")
        }
    };

    const handleICEGatheringStateChangeEvent = (event: Event) => {
        log(`*** ICE gathering state changed to: ${event}` + peerConnection?.current?.iceGatheringState);
    };

    const handleSignalingStateChangeEvent = (event: Event) => {
        log(`*** WebRTC signaling state changed to: ${event}` + peerConnection?.current?.signalingState);

        switch (peerConnection.current?.signalingState) {
            case "closed":
                // console.log("信令状态-关闭连接");
                closeVideoCall();
                break;
            case "stable":
                // console.log("稳定");
                break;
            case "have-local-offer":
                // console.log("有本地offer");
                break;
            case "have-remote-offer":
                // console.log("有远程offer");
                break;
            case "have-local-pranswer":
                // console.log("有本地临时应答");
                break;
            case "have-remote-pranswer":
                // console.log("有远程临时应答");
                break;
            default:
                console.log("default");
        }
    };

    const handleNegotiationNeededEvent = async (event: Event) => {
        log(`*** Negotiation needed${event}`);
        try {

            log("---> Creating offer");
            const offer = await peerConnection?.current?.createOffer();

            if (peerConnection.current?.signalingState !== 'stable') {
                // 说明已经有local-offer或者remote-offer
                // 只处理发起或者应答就行
                log("     -- The connection isn't stable yet; postponing...")
                return;
            }
            log("---> Setting local description to the offer");
            await peerConnection.current.setLocalDescription(offer);

            log("---> Sending the offer to the remote peer");
            sendToServer({
                name: myUsername.current,
                target: targetUsername.current,
                type: "video-offer",
                sdp: peerConnection.current.localDescription,
            });
        } catch (err) {
            log("*** The following error occurred while handling the negotiationneeded event:");
            reportError(err);
        }
    };

    const handleTrackEvent = (event: RTCTrackEvent) => {
        log("*** Track event");
        if (!remoteVideoRef.current) {
            console.error("remotevideoref错误");
            return
        }
        remoteVideoRef.current.srcObject = event.streams[0];
    };
    const createPeerConnection = () => {
        // const officeConfig = {
        //     iceServers: [     // Information about ICE servers - Use your own!
        //         {
        //             urls: "turn:" + "qtai.net.cn",  // A TURN server
        //             username: "webrtc",
        //             credential: "turnserver"
        //         }
        //     ]
        // };
        log("Setting up a connection...");
        const officeConfig = config;
        peerConnection.current = new RTCPeerConnection(officeConfig);

        // 初始化ice收集等方法

        /**
         * 不管哪端收集到本地+远程描述后，ice框架正式启动候选者收集
         * 本地ip、公网ip、中继地址等
         * 每收集一个候选者就会触发onicecandidate
         * 当候选者收集完毕，触发最后一个，此时事件参数的candidate为null
         */
        peerConnection.current.onicecandidate = handleICECandidateEvent;

        /**
         * 当RTCPeerConnection的ICE连接状态iceConnectionState发生变化时触发
         * 常见状态：
         * new：初始、checking：正在检查连接、connected：部分连接成功、completed：完全连接成功、failed：连接失败、disconnected：连接断开、closed：连接关闭
         * 监听ice连接状态的变化，判断连接是否成功或断开
         */
        peerConnection.current.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;

        /**
         * 本地RTCPeerConnection的 ICE 候选者收集状态（iceGatheringState）发生变化时触发。
         * 常见状态包括：new（未开始收集）、gathering（正在收集候选者）、complete（候选者收集完成）。
         */
        peerConnection.current.onicegatheringstatechange = handleICEGatheringStateChangeEvent;

        /**
         * 当本地RTCPeerConnection的信令状态（signalingState）发生变化时触发。
         * 信令状态反映会话描述（SDP）的协商阶段
         * 常见状态包括：stable（稳定状态，无需协商）、have-local-offer（已生成本地 offer）、have-remote-offer（已收到远程 offer）、have-local-pranswer（已生成本地临时应答）、have-remote-pranswer（已收到远程临时应答）、closed（连接关闭）。
         * 触发者：本地的RTCPeerConnection实例（通常由createOffer、setLocationDescription、setRemoteDescription等信令操作触发状态变化）。
         */
        peerConnection.current.onsignalingstatechange = handleSignalingStateChangeEvent;

        /**
         * 媒体配置或传输规则发生改变会重新触发
         * 当本地RTCPeerConnection检测到会话需要重新协商时触发。
         * 例如：首次建立连接时、添加 / 移除媒体轨道（track）、网络状况剧烈变化等，导致当前会话描述（SDP）无法满足需求。
         * 自动触发的吗，建立连接是什么时候触发，添加/移除媒体轨道由代码掌控触发，网络呢自动触发吗
         */
        peerConnection.current.onnegotiationneeded = handleNegotiationNeededEvent;

        /**
         * 当有新的媒体轨道（音频 / 视频）通过远程端添加并被本地RTCPeerConnection接收时触发。
         * 例如：远程端通过addTrack添加了一个视频轨道，本地收到后会触发该事件。
         * 触发者：本地的RTCPeerConnection实例（由远程端的媒体轨道传输触发）。
         * 触发方向：本地触发本
         */
        peerConnection.current.ontrack = handleTrackEvent;
    };

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

    const handleConnect = async () => {
        log("Starting to prepare an invitation");
        if (peerConnection.current) {
            alert("You can't start a call because you already have one open!");
        } else {
            if (myUsername.current === targetUsername.current) {
                alert("I'm afraid I can't let you talk to yourself. That would be weird.");
                return
            } else if (myUsername.current && targetUsername.current) {
                log("Inviting user " + targetUsername.current);
                log("Setting up connection to invite user: " + targetUsername.current);
                createPeerConnection();

                // 获取设备许可
                try {
                    webCamStream.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);

                    localVideoRef.current && (localVideoRef.current.srcObject = webCamStream.current);
                } catch (err: any) {
                    handleGetUserMediaError(err);
                }

                // 将媒体流所有轨道添加到连接中
                try {
                    if (!webCamStream.current) return;
                    webCamStream.current && webCamStream.current.getTracks().forEach(
                        track => {
                            webCamStream.current && peerConnection.current && (peerConnection.current.addTransceiver(track, {streams: [webCamStream.current]}));
                        }
                    );
                } catch (err: any) {
                    handleGetUserMediaError(err);
                }

            } else {
                alert("未登录或需连接的用户不存在")
            }
        }
    };

    const handleVideoOfferMsg = async (msg: any)=> {
        targetUsername.current = msg.name;
        log("Received video chat offer from " + targetUsername.current);
        if (!peerConnection.current) {
            // 本地是被动方，主动方给被动方发起邀请，此时需要初始化本地内容
            createPeerConnection();
        }

        // 本地已经有连接了
        const desc = new RTCSessionDescription(msg.sdp);

        // 判断信令状态是否稳定
        // 非稳定状态
        if (peerConnection.current?.signalingState !== "stable") {
            log("  - But the signaling state isn't stable, so triggering rollback");
            // @ts-ignore

            if (peerConnection.current) {
                await Promise.all([
                    peerConnection?.current.setLocalDescription({ type: "rollback" }), // 回滚到稳定状态，回滚后是什么状态？，不需要应答了吗？？？
                    peerConnection?.current.setRemoteDescription(desc),
                ]);
                return;
            }

        } else {
            log ("  - Setting remote description");
            await peerConnection.current.setRemoteDescription(desc);
        }

        // 若本地收到邀请了，还没初始化媒体流
        if (!webCamStream.current) {
            try {
                webCamStream.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            } catch (err: any) {
                handleGetUserMediaError(err);
                return;
            }

            localVideoRef.current && (localVideoRef.current.srcObject = webCamStream.current);

            try {
                webCamStream.current.getTracks().forEach(
                    track => {
                        webCamStream.current && peerConnection.current?.addTransceiver(track, { streams: [webCamStream.current]});
                    }
                )
            } catch (err: any) {
                handleGetUserMediaError(err);
            }
        }

        log("---> Creating and sending answer to caller");

        peerConnection.current && (await peerConnection.current.setLocalDescription(await peerConnection.current.createAnswer()));

        sendToServer({
            name: myUsername.current,
            target: targetUsername.current,
            type: "video-answer",
            sdp: peerConnection.current?.localDescription,
        });
    }

    const handleVideoAnswerMsg = async (msg: any) => {
        log("*** Call recipient has accepted our call");

        const desc = new RTCSessionDescription(msg.sdp);
        // @ts-ignore
        await peerConnection.current.setRemoteDescription(desc).catch(reportError);
    };

    const handleNewICECandidateMsg = async (msg: any) => {
        const candidate = new RTCIceCandidate(msg.candidate);

        log("*** Adding received ICE candidate: " + JSON.stringify(candidate));

        try {
            await peerConnection.current?.addIceCandidate(candidate);
        } catch (err: any) {
            reportError(err);
        }
    }

    const ConnectionWss = () => {
        log(`Connecting to server: ${wss_url}`);
        websocket.current = new WebSocket(wss_url, "json");

        if (websocket.current) {
            websocket.current.onopen = handleOnOpen;
            websocket.current.onmessage = (event: MessageEvent) => {

                if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
                    const msg = JSON.parse(event.data);
                    log("Message received: ");
                    console.dir(msg);
                    switch (msg.type) {
                        case "id":
                            clientID.current = msg.id;
                            sendUserName();
                            break;
                        case "username":
                            break;
                        case "userlist":
                            setUserList(msg.users);
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
                    }

                }
            };
            websocket.current.onerror = handleOnError;
        }
    };





    return (
        <div className="app-container">
            <header className="app-header">
                {roomId && (
                    <div className="app-room-info">
                        <span className="app-room-label">在线用户:</span>
                        {
                            userList.map(item => (
                                <span className="app-room-info" key={item}>
                                    { item }
                                </span>
                            ))
                        }
                        <span className="app-room-label">用户名:</span>
                        <input className="app-room-id" value={myUsername.current} type="text" placeholder="请输入用户名" onChange={(event) => {myUsername.current = event.target.value;console.log(event.target.value)}}></input>
                        <span className="app-room-label">连接的用户名:</span>
                        <input className="app-room-id" value={targetUsername.current} type="text" placeholder="请输入用户名" onChange={(event) => {targetUsername.current = event.target.value}}></input>
                    </div>
                )}
            </header>

            <div className="all-buttons">
                <Button
                    onClick={ConnectionWss}
                    variant="primary"
                    size="large"
                    fullWidth
                >
                    登录
                </Button>
                <Button
                    onClick={handleConnect}
                    variant="primary"
                    size="large"
                    fullWidth
                >
                    连接
                </Button>
                {showPlayButton && (
                    <button
                        className="manual-play-btn"
                        onClick={handleManualPlay}
                    >
                        点击播放远程视频
                    </button>
                )}
            </div>

            {/*{errorMessage && (*/}
            {/*    <div className="app-error">*/}
            {/*        {errorMessage}*/}
            {/*    </div>*/}
            {/*)}*/}

            <main className="app-main">
                {!roomId ? (
                    // 房间创建/加入界面
                    <div className="room-setup">
                        <div className="room-setup__form">
                            <h2 className="room-setup__title">创建或加入房间</h2>

                            <div className="room-setup__options">
                                <Button
                                    onClick={() => {}}
                                    variant="primary"
                                    size="large"
                                    fullWidth
                                >
                                    创建新房间
                                </Button>

                                <div className="room-setup__divider">
                                    <span>或者</span>
                                </div>

                                <div className="room-setup__join">
                                    <Input
                                        placeholder="输入房间ID"
                                        value={roomId}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomId(e.target.value)}
                                        fullWidth
                                    />
                                    <Button
                                        onClick={() => {}}
                                        variant="secondary"
                                        size="large"
                                        fullWidth
                                    >
                                        加入房间
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 视频通话界面
                    <div className="video-call-layout">
                        {/* 视频区域 */}
                        <div className="video-call-layout__video">
                            {/*<VideoCall roomId={roomId} />*/}
                            <div className="local-video">
                                <span>local</span>
                                <video
                                    id="local_video"
                                    ref={localVideoRef}
                                    className="video-call__video video-call__video--remote"
                                    autoPlay
                                    muted
                                />
                            </div>
                            <div className="remote-video">
                                <span>remote</span>
                                <video
                                    id="received_video"
                                    ref={remoteVideoRef}
                                    className="video-call__video video-call__video--remote"
                                    autoPlay
                                />
                            </div>
                        </div>

                        {/* 聊天区域 */}
                        <div className="video-call-layout__chat">
                            <h3 className="video-call-layout__section-title">聊天</h3>
                            <Chat />
                        </div>
                    </div>
                )}
            </main>

            {/* 控制按钮区域 */}
            {/*{roomId && (*/}
            {/*    <footer className="app-footer">*/}
            {/*        {"connected" === 'disconnected' ? (*/}
            {/*            // 未连接状态的按钮*/}
            {/*            <div className="control-buttons">*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant="success"*/}
            {/*                    size="large"*/}
            {/*                >*/}
            {/*                    发起通话*/}
            {/*                </Button>*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant="secondary"*/}
            {/*                    size="medium"*/}
            {/*                >*/}
            {/*                    检测局域网信令*/}
            {/*                </Button>*/}
            {/*            </div>*/}
            {/*        ) : (*/}
            {/*            // 通话状态的控制按钮*/}
            {/*            <div className="control-buttons control-buttons--calling">*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant={1 ? 'outline' : 'secondary'}*/}
            {/*                    size="medium"*/}
            {/*                >*/}
            {/*                    {1 ? '静音' : '取消静音'}*/}
            {/*                </Button>*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant={1 ? 'outline' : 'secondary'}*/}
            {/*                    size="medium"*/}
            {/*                >*/}
            {/*                    {1 ? '关闭摄像头' : '开启摄像头'}*/}
            {/*                </Button>*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant={1 ? 'secondary' : 'outline'}*/}
            {/*                    size="medium"*/}
            {/*                >*/}
            {/*                    {1 ? '停止共享' : '共享屏幕'}*/}
            {/*                </Button>*/}
            {/*                <Button*/}
            {/*                    onClick={() => {}}*/}
            {/*                    variant="danger"*/}
            {/*                    size="large"*/}
            {/*                >*/}
            {/*                    结束通话*/}
            {/*                </Button>*/}
            {/*            </div>*/}
            {/*        )}*/}
            {/*    </footer>*/}
            {/*)}*/}
        </div>
    );
}

export default App1;