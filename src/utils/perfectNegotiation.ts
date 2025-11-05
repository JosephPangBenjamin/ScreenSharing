/**
 * 完美协商
 * 1. 通过makingOffer标志，判断当前端是否进入协商流程，信令状态改变是promise的，所以通过标志位判断
 * 2. 协商过程：
 *  无碰撞邀约（即我方发过offer，通过收到对端offer），setRemoteDescription(offer)
 *  有碰撞邀约
 *   1. 我方是有礼方： 此时信令状态是have-local-offer，要抛弃我方offer，此时设置setRemoteDescription(对端offer)
 *                  会自动进行回滚到stable状态，然后设置remote-sdp，然后通过判断当前是offer的话，设置setLocalDescription()，无参数设置会自动根据当前状态设置合适的sdp，
 *                  然后将pc.localDescription发送给对端
 *   2. 我方是无礼方： 直接return掉，让对方接受我方的offer
 *
 * 3. ice状态报错，通过调用pc.restartICE()，发送ice带上restart标志
 */

const constraints = { audio: true, video: true};
const selfVideo: HTMLVideoElement = document.querySelector("#video-selfview");
const remoteVideo: HTMLVideoElement = document.querySelector("#video-remoteview");
const pc: RTCPeerConnection;
const ws: WebSocket;
// 两端都随意调用 获取本地的媒体信息
const start = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // const displayStream = await navigator.mediaDevices.getDisplayMedia();

        if (!stream) {
            alert("can't get local mediaDevices.");
            return;
        }
        //
        stream.getTracks().forEach(track => {
            //将得到的媒体轨道通过传入 addTrack() 添加到 RTCPeerConnection 中
            // 给连接添加轨道，后面的流表示当前track属于后面这个stream，也就是当前track关联到后面这个stream
            pc.addTrack(track, stream); // addTrack(track, ...a: MediaStream[])
        });
        selfVideo.srcObject = stream;
    } catch (err: any) {
        alert(err.message);
    }
};

// 处理传入的轨道
// 处理该对等连接协商接收的入站视频和音频轨迹
pc.ontrack = (evt: RTCTrackEvent) => {
    const {track, streams} = evt;
    // track 接收到的视频/音频轨道
    // streams ReadonlyArray<MediaStream> 媒体流对象数组，每个对象包含一个该轨道的流（极少情况下，一个轨道可能属于多个流）
    // 所以streams数组对象中的第一个，位于0号索引
    track.onunmute = () => {
        if (remoteVideo.srcObject) {
            return
        }
        remoteVideo.srcObject = streams[0];
        // 我们为轨道添加一个取消静音事件处理器，因为轨道一旦开始接收数据包，就会取消静音。我们将接收代码的其余部分放在这里
        // 如果我们已经从远程对等方接收到视频（我们可以通过远程视图的 <video> 元素的 srcObject 属性已经有值来判断），
        // 我们不做任何操作。否则，我们将 srcObject 设置为 streams 数组中索引 0 处的流。
    }
}

// 完美协商逻辑，功能独立于应用程序的其他部分

// 表示我方正在准备邀约
let makingOffer = false;


/**
 * onnegotiationneeded 事件的触发有严格的状态约束，
 * 只有当连接的 signalingState 为 stable（无正在进行的协商）时，才会因媒体配置变化（如添加轨道）而触发，
 * 从而启动新的协商流程。这是为了避免协商冲突，保证信令交互的有序性
 *
 *
 * 我们将布尔变量 makingOffer 设为 true，表示我们正在准备邀约。
 * 为了避免竞态条件，我们稍后将使用该值而不是信令状态来确定是否正在处理邀约，
 * 因为 signalingState 的值是异步变化的，这引入了产生干扰（glare）的机会。
 *
 * 一旦邀约创建、设置和发送完成（或发生错误），makingOffer 就会被设回 false。
 */
pc.onnegotiationneeded = async () => {
    try {
        makingOffer = true;
        // 不带参数的 setLocalDescription() 会根据当前的 signalingState 自动创建和设置适当的描述。
        // 所设置的描述是对远程对等方最新邀约的回应，或是一个新创建的邀约（如果没有正在进行的协商）。
        // 在这里，它将始终是一个 offer，因为需要协商的事件只在 stable 状态下触发
        await pc.setLocalDescription(); // 1.当前正在进行协商，自动创建answer
        // 2.当前没有进行协商，自动创建offer。在这里它将始终是offer，因为需要协商的事件只在stable状态下触发
        const json = JSON.stringify({ description: pc.localDescription});
        ws.send(json);
    } catch (e: any) {
        alert(e.message);
    } finally {
        makingOffer = false;
    }
};

pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") {
        //ICE 重新启动
        pc.restartIce();
    }
};


/**
 * 在new PeerConnection(constraint)初始化ice框架
 * 在setLocalDescription后开始触发收集ice候选
 * @param evt
 */
pc.onicecandidate = (evt: RTCPeerConnectionIceEvent) => {
    const { candidate } = evt;
    const json = JSON.stringify({ candidate });
    ws.send(json);
}


// 是否忽略offer
let ignoreOffer = false;

let polite = true;
/**
 *
 * @param description 如果传入的消息有description，要么是对方发出的邀约，要么是对方发出的答复
 * @param candidate 如果包含candidate，那么它就是作为渐进式ICE的一部分，从远程收到对等方收到的ICE候选信息
 */
ws.onmessage = async ({ data: {description, candidate}}) => {
    try {
        // 在任何其他情况下，我们将尝试处理传入的消息。
        // 这从将远程描述设置为接收到的 description 开始，
        // 通过将其传递给 setRemoteDescription() 来实现。
        // 这将在需要时自动执行回滚，因此无论我们是在处理提议还是回复，都可以正常工作
        if (description) {
            // 如果收到了description，准备对收到的邀约或答复做出回应
            // 首先，我们要检查是否处于可以接受邀约的状态，如果连接的信令状态不是stable，或者连接的我们这一段已经开始发出自己的邀约，
            const offerCollision = description.type === "offer" && (makingOffer || pc.signalingState !== "stable"); // 是否有邀约冲突，即这是碰撞邀约
            // 那么就要注意邀约冲突
            // 邀约冲突开始：
            // 如果我方是无礼的对等方，并且正在接收一个碰撞邀约，我们将不设置描述而返回，并将ignoreOffer设置为true，以确保我们也忽略对方可能在属于
            // 该邀约的信令通道上发送给我们的所有候选信息。
            // 这样做可以避免错误噪声，因为我们从未将此邀约通知我方。
            ignoreOffer = !polite && offerCollision; // 若我方是无礼的并且当前邀约是碰撞邀约
            if (ignoreOffer) { // 此时条件： 我方正在准备邀约/信令状态非stable && 我方是无礼方
                // 我方是不礼貌方，忽略对方发送的offer，继续尝试使用我方已经在发送过程中的提议
                return;
            }
            // 礼貌方 B 初始状态：stable → 发自己的 offer → 状态变为 have-local-offer。
            // 收到 A 的冲突 offer → 调用 setRemoteDescription(A的offer) → 底层自动回滚 → 状态变回 stable。
            // 调用 setLocalDescription() → 生成 answer → 状态变为 have-local-answer。
            // 发送 answer 给 A → 收到 A 的 ICE 候选 + 自己的 ICE 候选交互 → 连接成功。
            // 回滚变成了 setRemoteDescription() 调用的基本原子部分
            // 如果我方是有礼貌的对等点，而我们正在接收一个碰撞邀约，我们不需要做任何特别的事情，因为我们现有的邀约会在下一步自动回滚。
            if (polite && offerCollision) {
                console.log(`[${Date.now().toLocaleString()}]: 我方礼貌 + 碰撞邀约，此时我方`);
            }

            // 在确定要接受邀约后，我们将通过调用setRemoteDescription为传入的邀约设置远程描述，这会让webrtc知道对方的建议配置是什么
            // 如果我们是礼貌的对等点，就会放弃我们的邀约，接受新的邀约。

            // 这里如果是无碰撞冲突的情况下，那么此时type必定是offer
            // 如果是碰撞冲突的情况下，我方是无礼的话，直接return，继续我方提出的邀约（因为走到return，必定是因为自己发出邀约同时收到了对方的offer）
            // 如果是碰撞冲突的情况下，我方是有礼的话，此时我方信令状态肯定是have-local-offer，然后收到了对端的offer（此时我方是自己发过offer，收到的是offer，而非answer）
            // 然后执行setRemoteDescription收到一个offer，此时我方本地和远程sdp都是offer，会自动会滚到stable状态（因为期待的remote是answer），同时废弃自己之前的offer
            // 这一步由底层api自动完成，不用手动rollback，手动调用反而多余
            await pc.setRemoteDescription(description);

            if (description.type === "offer") {
                // 如果新设置的远程描述是一个邀约，我们就会要求webrtc通过调用RTCPeerConnection方法setLocalDescription来选择合适的本地配置，而无需参数
                // 这样，setLocalDescription就会自动生成适当的应答，以回应收到的邀约，然后通过信令信道将应答发送回第一个对等点
                await pc.setLocalDescription();
                const json = JSON.stringify({ description: pc.localDescription });
                ws.send(json);
            }

        }

        if (candidate) {
            try {
                await pc.addIceCandidate(candidate);
            } catch (err: any) {
                // 也就是如果添加的这个ice是忽略的ice，
                // 添加失败就添加失败了无所谓，反正也不用，
                // 但是如果不是忽略的ice，添加失败就要报错
                if (!ignoreOffer) {
                    throw err;
                }
            }
        }
    } catch (err: any) {

    }
};



















