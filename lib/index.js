"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const crypto_1 = __importDefault(require("crypto"));
const discord_js_1 = require("discord.js");
const axios_1 = __importDefault(require("axios"));
const twitch_bot_1 = __importDefault(require("twitch-bot"));
const secure_db_1 = __importDefault(require("secure-db"));
const uuid_1 = require("uuid");
(0, dotenv_1.config)();
setInterval(() => {
    const used = process.memoryUsage();
    for (let key in used) {
        console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
}, 1000 * 60);
secure_db_1.default.security(process.env.SECURE_DB);
const users = new secure_db_1.default.Database('users');
if (!users.all().some(([id, user]) => user.TWITCH_CHANNEL === '#Lmvdzande')) {
    let userID = (0, uuid_1.v4)();
    users.set(userID, {
        ID: userID,
        TWITCH_CHANNEL: '#Lmvdzande',
        TWITCH_ENABLED: true,
        TWITCH_TIMEOUT: true,
        TWITCH_TIMEOUT_EXPIRE: 5,
        BYBIT_API_KEY: process.env.BYBIT_API_KEY,
        BYBIT_API_SECRET: process.env.BYBIT_API_SECRET,
        DISCORD_ENABLED: true,
        DISCORD_CHANNEL: process.env.DISCORD_CHANNEL_ID,
        DISCORD_MESSAGE: '1044459814492844082'
    });
}
// invite discord bot to server: https://discord.com/api/oauth2/authorize?client_id=1044389854236127262&permissions=2048&scope=bot
class BybitPostingBot {
    constructor() {
        // map<user.ID, map<symbol, map<side, position>>>
        this.positions = new Map();
        // map<user, map<symbol, map<side, order>>>
        this.orders = new Map();
        //map<category, map<symbol, ticker>>
        this.tickers = new Map();
        this.twitchCommandTimeouts = { position: {} };
        this.bybitFetchTimeouts = {};
    }
    async loadTwitchBot() {
        this.twitchBot = new twitch_bot_1.default({
            username: 'BybitPositionBot',
            oauth: process.env.TWITCH_BOT_OAUTH,
            channels: [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY)
        });
        console.log('twitch bot loaded');
        this.twitchBot.on('join', (channel) => {
            console.log(`Joined channel: ${channel}`);
        });
        this.twitchBot.on('error', (err) => {
            console.log(err);
        });
        this.twitchBot.on('message', (chatter) => {
            let user = users.all().find(([id, user]) => user.TWITCH_CHANNEL.toLowerCase() === chatter.channel.toLowerCase())[1];
            if (user !== undefined && user.TWITCH_ENABLED) {
                if (chatter.message === '!position' || chatter.message === '!positions') {
                    if (this.twitchCommandTimeouts['position'][chatter.channel] === undefined) {
                        this.twitchCommandTimeouts['position'][chatter.channel] = {
                            timedout: false,
                            expires: Date.now()
                        };
                    }
                    if (!this.twitchCommandTimeouts['position'][chatter.channel].timedout) {
                        if (user.TWITCH_TIMEOUT) {
                            this.twitchCommandTimeouts['position'][chatter.channel].timedout = true;
                            this.twitchCommandTimeouts['position'][chatter.channel].expires = Date.now() + (user.TWITCH_TIMEOUT_EXPIRE * 1000 * 60);
                            setTimeout(() => {
                                this.twitchCommandTimeouts['position'][chatter.channel].timedout = false;
                            }, user.TWITCH_TIMEOUT_EXPIRE * 1000 * 60);
                        }
                        let updateTime = new Date().toUTCString();
                        let formattedMessage = [`Positions (Last Update: ${updateTime})`];
                        let positions = this.positions.get(user.ID);
                        if (positions) {
                            this.positions.get(user.ID).forEach((symbolMap, symbol) => {
                                // console.log(symbol)
                                formattedMessage.push(` ${symbol} `);
                                symbolMap.forEach((position, side) => {
                                    // console.log(position)
                                    formattedMessage.push(`${position.side === 'Buy' ? '🟩 LONG ' : position.side === 'Sell' ? '🟥 SHORT ' : ''} ${position.size} @ ${position.entryPrice} uPnL: ${position.unrealisedPnl} liq @ ${position.liqPrice}`);
                                });
                            });
                            if (formattedMessage.length > 1) {
                                formattedMessage.forEach((message, index) => {
                                    setTimeout(() => this.twitchBot.say(message, chatter.channel), index * 250);
                                });
                            }
                            else {
                                this.twitchBot.say(`No Positions Open (${updateTime})`, chatter.channel);
                            }
                        }
                        else {
                            this.twitchBot.say(`Positions haven't been loaded yet. (${updateTime})`, chatter.channel);
                        }
                    }
                    else {
                        this.twitchBot.say(`Please try again in ${Math.floor((this.twitchCommandTimeouts['position'][chatter.channel].expires - Date.now()) / 1000)} seconds.`);
                    }
                }
            }
        });
        [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY).forEach(channel => {
            this.twitchBot.join(channel.toLowerCase());
        });
    }
    async load() {
        await this.loadDiscordBot();
        await this.discordBotLogin();
        await this.loadTwitchBot();
        await this.fetchTickers();
    }
    async restart() {
        console.log('restarting');
        this.discordClient.destroy();
        await this.start();
    }
    async updateDiscord(user) {
        if (user.DISCORD_ENABLED) {
            let updateTime = new Date().toUTCString();
            let formattedMessage = `Positions (Last Update: ${updateTime})\n`;
            let positions = this.positions.get(user.ID);
            let messageToSend = `Positions haven't been loaded yet. (${updateTime})`;
            if (positions) {
                positions.forEach((symbolMap, symbol) => {
                    // console.log(symbol)
                    formattedMessage += `\n${symbol}\n\n`;
                    symbolMap.forEach((position, side) => {
                        // console.log(position)
                        formattedMessage += `${position.side === 'Buy' ? '🟩 LONG\t\t' : position.side === 'Sell' ? '🟥 SHORT\t\t' : ''} ${position.size} @ ${position.entryPrice}\t\tuPnL: ${position.unrealisedPnl}\t\tliq @ ${position.liqPrice}\n`;
                    });
                });
                if (formattedMessage !== `Positions (Last Update: ${updateTime})\n`) {
                    messageToSend = formattedMessage;
                }
                else {
                    messageToSend = `No Positions Open (${updateTime})`;
                }
            }
            if (user.DISCORD_MESSAGE === undefined) {
                this.discordClient.channels.cache.get(user.DISCORD_CHANNEL).send(messageToSend).then((message) => {
                    user.DISCORD_MESSAGE = message.id;
                    users.set(user.ID, user);
                }).catch(error => {
                    console.error(error);
                });
            }
            else {
                this.getMessageToEdit(user).then(message => {
                    message.edit(messageToSend);
                });
            }
        }
    }
    async fetchPositionsAndOrdersForUser(user) {
        await this.fetchPositionsAndOrders(user);
        await this.updateDiscord(user);
    }
    async loopFetch(user, index) {
        if (this.bybitFetchTimeouts[user.ID]) {
            clearTimeout(this.bybitFetchTimeouts);
        }
        this.bybitFetchTimeouts[user.ID] = setTimeout(() => {
            this.fetchPositionsAndOrdersForUser(user).then(() => {
                setTimeout(() => {
                    this.loopFetch(user, index);
                }, 5 * 60 * 1000);
            });
        }, index * 1000);
    }
    async start() {
        try {
            await this.load();
            users.all().forEach(([id, user], index) => {
                this.loopFetch(user, index);
            });
        }
        catch (error) {
            console.error(error);
            await this.restart();
        }
    }
    getMessageToEdit(user) {
        return new Promise((resolve, reject) => {
            this.discordClient.channels.fetch(user.DISCORD_CHANNEL).then((channel) => {
                if (channel !== null) {
                    channel.messages.fetch().then((messages) => {
                        resolve(messages.find(message => {
                            return message.id === user.DISCORD_MESSAGE;
                        }));
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    });
                }
                else {
                    console.error('no channel found with id: ' + user.DISCORD_CHANNEL);
                    reject('no channel found with id: ' + user.DISCORD_CHANNEL);
                }
            });
        });
    }
    async loadDiscordBot() {
        this.discordClient = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
        this.discordClient.on('close', () => {
            this.loadDiscordBot();
        });
        this.discordClient.on('ready', () => {
            console.log("discord bot loaded");
            // this.loadBybitWebsocket();
        });
    }
    async discordBotLogin() {
        await this.discordClient.login(process.env.DISCORD_BOT_TOKEN);
    }
    getSignature(user, timestamp, recvWindow, data) {
        return crypto_1.default.createHmac('sha256', user.BYBIT_API_SECRET).update(timestamp + user.BYBIT_API_KEY + recvWindow + data).digest('hex');
    }
    async bybitAuthenticatedHttpRequest(user, endpoint, method, data) {
        var recvWindow = 100000;
        var timestamp = Date.now().toString();
        const config = {
            headers: {
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-SIGN': this.getSignature(user, timestamp, recvWindow, data),
                'X-BAPI-API-KEY': user.BYBIT_API_KEY,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow.toString(),
                'Content-Type': 'application/json; charset=utf-8'
            },
            method: method,
            url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
        };
        if (data !== '') {
            config.data = data;
        }
        return (0, axios_1.default)(config);
    }
    async bybitHttpRequest(endpoint, method, data) {
        const config = {
            method: method,
            url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
        };
        if (data !== '') {
            config.data = data;
        }
        return (0, axios_1.default)(config);
    }
    fetchTickers(symbol) {
        return new Promise((resolve, reject) => {
            console.log('fetching tickers');
            Promise.allSettled(['linear', 'inverse'].map((category) => {
                return new Promise((resolve, reject) => {
                    this.bybitHttpRequest('/derivatives/v3/public/tickers', 'GET', `category=${category}`).then(response => {
                        console.log(`fetched ${category} tickers`);
                        response.data.result.list.forEach((ticker) => {
                            let map = this.tickers.get(category);
                            if (!map) {
                                map = new Map();
                            }
                            map.set(ticker.symbol, ticker);
                            this.tickers.set(category, map);
                        });
                        resolve();
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    });
                });
            })).then(() => {
                resolve();
            });
        });
    }
    fetchPositions(symbol, user) {
        return new Promise((resolve, reject) => {
            this.bybitAuthenticatedHttpRequest(user, '/contract/v3/private/position/list', 'GET', `symbol=${symbol}`).then(response => {
                let userPositions = this.positions.get(user.ID);
                if (!userPositions) {
                    this.positions.set(user.ID, new Map());
                }
                if (response.data.result.list !== undefined) {
                    if (response.data.result.list.length > 0)
                        response.data.result.list.forEach((position) => {
                            if (Number.parseFloat(position.size) > 0) {
                                let map = this.positions.get(user.ID).get(position.symbol);
                                if (!map) {
                                    map = new Map();
                                }
                                map.set(position.side, position);
                                this.positions.get(user.ID).set(position.symbol, map);
                            }
                        });
                }
                resolve();
            }).catch(error => {
                reject(error);
            });
        });
    }
    fetchOrders(symbol, user) {
        return new Promise((resolve, reject) => {
            this.bybitAuthenticatedHttpRequest(user, '/contract/v3/private/order/list', 'GET', `symbol=${symbol}`).then(response => {
                let userOrders = this.orders.get(user.ID);
                if (!userOrders) {
                    this.orders.set(user.ID, new Map());
                }
                if (response.data.result.list !== undefined) {
                    if (response.data.result.list.length > 0)
                        response.data.result.list.forEach((order) => {
                            if (Number.parseFloat(order.size) > 0) {
                                let map = this.orders.get(user.ID).get(order.symbol);
                                if (!map) {
                                    map = new Map();
                                }
                                map.set(order.orderId, order);
                                this.orders.get(user.ID).set(order.symbol, map);
                            }
                        });
                }
                resolve();
            }).catch(error => {
                reject(error);
            });
        });
    }
    async fetchPositionsAndOrders(user) {
        await Promise.allSettled([...this.tickers.keys()].map((category) => {
            return new Promise((resolve, reject) => {
                var _a;
                console.log('fetching positions & orders for ' + `${user.TWITCH_CHANNEL} ${category} tickers`);
                Promise.allSettled([...(_a = this.tickers.get(category)) === null || _a === void 0 ? void 0 : _a.values()].map((ticker, index) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            Promise.allSettled([this.fetchOrders(ticker.symbol, user), this.fetchPositions(ticker.symbol, user)]).then(() => {
                                resolve();
                            });
                        }, 400 * index);
                    });
                })).then(() => {
                    console.log(`finished fetching ${user.TWITCH_CHANNEL} ${category} positions & orders`);
                    resolve();
                });
            });
        }));
    }
}
const bot = new BybitPostingBot();
bot.start();
//# sourceMappingURL=index.js.map