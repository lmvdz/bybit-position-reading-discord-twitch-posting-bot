"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tmi_js_1 = __importDefault(require("tmi.js"));
class TwitchChatBot {
    constructor(config, autoConnect = true) {
        this.client = new tmi_js_1.default.Client({
            identity: {
                username: config.username,
                password: config.password
            },
            channels: config.channels || []
        });
        if (autoConnect) {
            this.client.connect().catch(error => console.error(error));
        }
    }
    addEventListener(event, listener) {
        this.client.on(event, listener);
    }
    removeEventListeners(event) {
        this.client.removeAllListeners(event);
    }
}
exports.default = TwitchChatBot;
//# sourceMappingURL=twitch-chat-bot.js.map