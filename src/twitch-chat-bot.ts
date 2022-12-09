import tmi from 'tmi.js'

export default class TwitchChatBot {
    client: tmi.Client;

    constructor(config: { username: string, password: string, channels?: Array<string> }, autoConnect: boolean = true) {
        this.client = new tmi.Client({
            identity: {
                username: config.username,
                password: config.password
            },
            channels: config.channels || []
        })


        if (autoConnect) {
            this.client.connect().catch(error => console.error(error));
        }
    }

    addEventListener(event: keyof tmi.Events, listener: (...args: never) => any) {
        this.client.on(event, listener)
    }

    removeEventListeners(event?: keyof tmi.Events) {
        this.client.removeAllListeners(event)
    }
}