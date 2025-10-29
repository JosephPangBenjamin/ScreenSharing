
// 消息类型定义
export type SignalingMessageType =
    "id" | "username" | "message" | "rejectusername" | "userlist" | "video-offer"
    | "video-answer" | "new-ice-candidate" | "hang-up";

// 信令消息
export interface SignalingMessage {
    type: SignalingMessageType;
    date?: Date;
    id?: string;
    name?: string;
    target?: string;
    sdp?: string;
    candidate?: string;
}