"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tmi_js_1 = __importDefault(require("tmi.js"));
class TwitchChatBot {
    constructor(config, onJoin, onLeave, onSay, onMessage, autoConnnect = true) {
        this.client = new tmi_js_1.default.Client({
            identity: {
                username: config.username,
                // 'CryptoPositionsBot',
                password: config.password,
                // process.env.TWITCH_BOT_OAUTH
            },
            channels: config.channels
            // [ 'my_name' ]
        });
        this.onJoin = onJoin;
        this.onLeave = onLeave;
        this.onSay = onSay;
        this.onMessage = onMessage;
        this.client.on('message', this.onMessage);
        if (autoConnnect) {
            this.client.connect();
        }
    }
    join(channel, onJoin) {
        this.client.join(channel).then(onJoin || this.onJoin).catch(this.onError);
    }
    say(channel, message, onSay) {
        this.client.say(channel, message).then(onSay || this.onSay).catch(this.onError);
    }
    leave(channel, onLeave) {
        this.client.part(channel).then(onLeave || this.onLeave).catch(this.onError);
    }
    async connect() {
        return this.client.connect();
    }
    async disconnect() {
        return this.client.disconnect();
    }
    onJoin(response) {
        console.log(response);
    }
    onLeave(response) {
        console.log(response);
    }
    onSay(response) {
        console.log(response);
    }
    onMessage(channel, userstate, message, self) {
        console.log(channel, userstate, message, self);
    }
    addEventHandler(handler, listener) {
        this.client.on(handler, listener);
    }
    removeEventHandlers(handler) {
        this.client.removeAllListeners(handler);
    }
    onError(error) {
        console.error(error);
    }
}
exports.default = TwitchChatBot;
//# sourceMappingURL=index.js.map