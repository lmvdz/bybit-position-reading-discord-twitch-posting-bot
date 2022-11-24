"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const discord_js_1 = require("discord.js");
const axios_1 = __importDefault(require("axios"));
const twitch_bot_1 = __importDefault(require("twitch-bot"));
const secure_db_1 = __importDefault(require("secure-db"));
const uuid_1 = require("uuid");
const qs_1 = __importDefault(require("qs"));
const ccxt_1 = __importDefault(require("ccxt"));
(0, dotenv_1.config)();
secure_db_1.default.security(process.env.SECURE_DB);
const users = new secure_db_1.default.Database('users');
// invite discord bot to server: https://discord.com/api/oauth2/authorize?client_id=1044389854236127262&permissions=83968&scope=bot
class CryptoPositionsBot {
    constructor() {
        this.exchangeMap = new Map();
        // map<user.ID, map<exhange, map<symbol, map<side, position>>>>
        this.positions = new Map();
        // map<user, map<symbol, map<side, order>>>
        this.orders = new Map();
        //map<category, map<symbol, ticker>>
        this.tickers = new Map();
        this.twitch_token = { expires_at: 0 };
        this.twitchCommandTimeouts = { position: {} };
        this.fetchTimeouts = {};
    }
    async loadTwitchBot() {
        this.twitchBot = new twitch_bot_1.default({
            username: 'CryptoPositionBot',
            oauth: process.env.TWITCH_BOT_OAUTH,
            channels: [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY)
        });
        console.log('twitch bot loaded');
        this.twitchBot.on('join', (channel) => {
            console.log(`Joined channel: ${channel}`);
        });
        this.twitchBot.on('error', (err) => {
            console.error(err);
        });
        this.twitchBot.on('message', (chatter) => {
            let channelUser = users.all().find(([id, user]) => user.TWITCH_CHANNEL.toLowerCase() === chatter.channel.toLowerCase())[1];
            if (channelUser !== undefined && channelUser.TWITCH_ENABLED) {
                let target = null;
                if (chatter.message === '!position' || chatter.message === '!positions') {
                    target = chatter.channel.toLowerCase();
                }
                else if ((chatter.message.startsWith('!position @') || chatter.message.startsWith('!positions @'))) {
                    target = "#" + chatter.message.substring(chatter.message.indexOf("@") + 1).split(" ")[0].toLowerCase();
                }
                if (target !== null) {
                    let targetUser = users.all().find(([id, user]) => user.TWITCH_CHANNEL.toLowerCase() === target.toLowerCase())[1];
                    if (targetUser) {
                        if (this.twitchCommandTimeouts['position'][chatter.channel] === undefined) {
                            this.twitchCommandTimeouts['position'][chatter.channel] = {};
                        }
                        if (this.twitchCommandTimeouts['position'][chatter.channel][target] === undefined) {
                            this.twitchCommandTimeouts['position'][chatter.channel][target] = {
                                timedout: false,
                                expires: Date.now()
                            };
                        }
                        if (!this.twitchCommandTimeouts['position'][chatter.channel][target].timedout) {
                            // check for timeout enabled, and user sending the command isn't the channel owner
                            if (channelUser.TWITCH_TIMEOUT && channelUser.TWITCH_CHANNEL.toLowerCase().substring(1) !== chatter.username.toLowerCase()) {
                                this.twitchCommandTimeouts['position'][chatter.channel][target].timedout = true;
                                this.twitchCommandTimeouts['position'][chatter.channel][target].expires = Date.now() + (channelUser.TWITCH_TIMEOUT_EXPIRE * 1000 * 60);
                                setTimeout(() => {
                                    this.twitchCommandTimeouts['position'][chatter.channel][target].timedout = false;
                                }, channelUser.TWITCH_TIMEOUT_EXPIRE * 1000 * 60);
                            }
                            let updateTime = targetUser.LAST_UPDATE;
                            let formattedMessage = [`[${target}] Positions (${updateTime})`];
                            let positions = this.positions.get(targetUser.ID);
                            if (positions) {
                                positions.forEach((exchangePositionArray, exchangeId) => {
                                    exchangePositionArray.forEach((position, index) => {
                                        formattedMessage.push(`[${target}] [${exchangeId}] ${(position.side) === 'long' ? '🟩 LONG ' : (position.side) === 'short' ? '🟥 SHORT ' : ''} ${position.symbol} ${(position.contracts)} @ ${position.entryPrice} uPnL: ${position.unrealizedPnl} liq @ ${position.liquidationPrice}`);
                                    });
                                });
                                if (formattedMessage.length > 1) {
                                    formattedMessage.forEach((message, index) => {
                                        setTimeout(() => {
                                            this.twitchBot.say(message, chatter.channel);
                                        }, index * 2500);
                                    });
                                }
                                else {
                                    this.twitchBot.say(`[${target}] No Positions Open (${updateTime})`, chatter.channel);
                                }
                            }
                            else {
                                this.twitchBot.say(`[${target}] Positions haven't been loaded yet. (${updateTime})`, chatter.channel);
                            }
                        }
                        else {
                            this.twitchBot.say(`[${target}] Please try again in ${Math.floor((this.twitchCommandTimeouts['position'][chatter.channel][target].expires - Date.now()) / 1000)} seconds.`, chatter.channel);
                        }
                    }
                    else {
                        this.twitchBot.say('User: @' + target.substring(1) + ' not found in DB.', chatter.channel);
                    }
                }
            }
        });
        [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY).forEach(channel => {
            this.twitchBot.join(channel.toLowerCase());
            console.log('twitchbot joined: ' + channel.toLowerCase());
        });
    }
    async load() {
        await this.loadDiscordBot();
        await this.discordBotLogin();
        await this.loadTwitchBot();
        // await this.fetchTickers();
    }
    async restart() {
        console.log('restarting');
        this.discordClient.destroy();
        await this.loadDiscordBot();
        await this.discordBotLogin();
        await this.start();
    }
    async buildDiscordMessageEmbed(userID) {
        let user = users.get(userID);
        let updateTime = user.LAST_UPDATE;
        let positionsExchangeMap = this.positions.get(user.ID);
        let twitchUserInfo = await this.getTwitchUserInfo(userID);
        let embed = new discord_js_1.EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('twitch.tv/' + twitchUserInfo.display_name)
            .setURL('https://twitch.tv/' + twitchUserInfo.display_name)
            .setAuthor({
            name: `Positions haven't been loaded yet.`,
            // iconURL: 'https://i.imgur.com/AfFp7pu.png', 
            // url: 'https://discord.js.org'
        })
            .setDescription(updateTime)
            .setThumbnail(twitchUserInfo.profile_image_url)
            .setTimestamp()
            // .setFooter({ text: twitchUserInfo.display_name, iconURL: twitchUserInfo.profile_image_url })
            .setFooter({ text: 'CryptoPositionBot' });
        // map<user.ID, map<exhange, map<symbol, map<side, position>>>>
        if (positionsExchangeMap) {
            let flattenedFields = [...positionsExchangeMap.entries()].map(([exchangeId, exchangePositionsArray]) => {
                let fields = [];
                if (exchangePositionsArray.length > 0) {
                    let compiledFields = [{ name: exchangeId, value: '\u200B' }];
                    exchangePositionsArray.forEach(position => {
                        compiledFields.push(...[
                            {
                                name: position.symbol,
                                value: `${(position.side) === 'long' ? '🟩 LONG' : (position.side) === 'short' ? '🟥 SHORT' : ''}`
                            },
                            {
                                name: 'Size',
                                value: Number.parseFloat(position.contracts).toLocaleString("en-US"),
                                inline: true
                            },
                            {
                                name: "Entry Price",
                                value: Number.parseFloat(position.entryPrice).toLocaleString("en-US"),
                                inline: true
                            },
                            {
                                name: "Unrealised PnL",
                                value: Number.parseFloat(position.unrealizedPnl).toLocaleString("en-US"),
                                inline: true
                            },
                            {
                                name: "Liquidation Price",
                                value: Number.parseFloat(position.liquidationPrice).toLocaleString("en-US"),
                                inline: true
                            },
                            { name: '\u200B', value: '\u200B' }
                        ]);
                    });
                    return compiledFields;
                }
                else {
                    return fields;
                }
            }).flat(Number.POSITIVE_INFINITY);
            // console.log(flattenedFields);
            if (flattenedFields.length > 0) {
                embed = embed.setAuthor({ name: `Positions` }).addFields({ name: '\u200B', value: '\u200B' }, ...flattenedFields);
            }
            else {
                embed = embed.setAuthor({ name: `No Positions Open` });
            }
        }
        return embed;
    }
    async updateDiscord(userID) {
        let user = users.get(userID);
        if (user.DISCORD_ENABLED) {
            let messageToSend = { embeds: [await this.buildDiscordMessageEmbed(userID)] };
            let channel = this.discordClient.channels.cache.get(user.DISCORD_CHANNEL);
            if (channel) {
                if (user.DISCORD_MESSAGE === null) {
                    await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend);
                    console.log("sent new message to discord channel for " + user.TWITCH_CHANNEL);
                }
                else {
                    this.getMessageToEdit(user.ID).then(async (message) => {
                        try {
                            if (message !== undefined) {
                                await message.edit(messageToSend);
                                console.log("updated discord message for " + user.TWITCH_CHANNEL);
                            }
                            else {
                                await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend);
                                console.log("sent new message to discord channel for " + user.TWITCH_CHANNEL);
                            }
                        }
                        catch (error) {
                            console.error(error);
                        }
                    }).catch(error => {
                        console.error(error);
                    });
                }
            }
            else {
                console.error('failed to load channel from cache');
            }
        }
    }
    sendDiscordMessageForUserInChannel(userID, channel, messageToSend) {
        return new Promise((resolve, reject) => {
            channel.send(messageToSend).then((message) => {
                this.updateUserDiscordMessage(userID, message).then(() => {
                    resolve(message);
                }).catch(error => {
                    console.error(error);
                    reject(error);
                });
            }).catch(error => {
                console.error(error);
                reject(error);
            });
        });
    }
    async updateUserDiscordMessage(userID, message) {
        let user = users.get(userID);
        user.DISCORD_MESSAGE = message.id;
        users.set(user.ID, user);
        return true;
    }
    async fetchPositionsAndOrdersForUser(userID) {
        // await this.fetchPositionsAndOrders(userID);
        await this.fetchPositionsCCXT(userID);
        await this.updateDiscord(userID);
    }
    async loopFetch(userID, index) {
        let user = users.get(userID);
        if (user.ENABLED) {
            if (this.fetchTimeouts[userID]) {
                clearTimeout(this.fetchTimeouts);
            }
            this.fetchTimeouts[userID] = setTimeout(() => {
                this.fetchPositionsAndOrdersForUser(userID).then(() => {
                    setTimeout(() => {
                        this.loopFetch(userID, index);
                    }, 5 * 60 * 1000);
                });
            }, index * 2000);
        }
        else {
            console.log('user ' + user.TWITCH_CHANNEL + ' not Enabled, stopping loop.');
        }
    }
    async start() {
        try {
            await this.load();
            users.all().forEach(([id, user], index) => {
                this.loopFetch(user.ID, index);
            });
        }
        catch (error) {
            console.error(error);
            await this.restart();
        }
    }
    getMessageToEdit(userID) {
        let user = users.get(userID);
        if (user) {
            return new Promise((resolve, reject) => {
                this.discordClient.channels.fetch(user.DISCORD_CHANNEL).then((channel) => {
                    if (channel !== null) {
                        channel.messages.fetch().then((messages) => {
                            resolve(messages.get(user.DISCORD_MESSAGE));
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
        else {
            return null;
        }
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
    // getSignature(userID: string, timestamp: any, recvWindow: any, data: any) {
    //     let user = users.get(userID);
    //     return crypto.createHmac('sha256', user.BYBIT_API_SECRET!).update(timestamp + user.BYBIT_API_KEY! + recvWindow + data).digest('hex');
    // }
    // async bybitAuthenticatedHttpRequest(userID: string, endpoint: string, method: Method, data: any): Promise<any> {
    //     let user = users.get(userID);
    //     var recvWindow = 100000;
    //     var timestamp = Date.now().toString();
    //     const config = {
    //         headers: {
    //             'X-BAPI-SIGN-TYPE': '2',
    //             'X-BAPI-SIGN': this.getSignature(userID, timestamp, recvWindow, data),
    //             'X-BAPI-API-KEY': user.BYBIT_API_KEY,
    //             'X-BAPI-TIMESTAMP': timestamp,
    //             'X-BAPI-RECV-WINDOW': recvWindow.toString(),
    //             'Content-Type': 'application/json; charset=utf-8'
    //         },
    //         method: method,
    //         url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
    //     } as AxiosRequestConfig
    //     if (data !== '') {
    //         config.data = data
    //     }
    //     return axios(config)
    // }
    // async bybitHttpRequest(endpoint: string, method: Method, data: any): Promise<any> {
    //     const config = {
    //         method: method,
    //         url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
    //     } as AxiosRequestConfig
    //     if (data !== '') {
    //         config.data = data
    //     }
    //     return axios(config)
    // }
    // fetchTickers(symbol?: string): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         console.log('fetching tickers');
    //         Promise.allSettled(['linear', 'inverse'].map((category: string): Promise<void> => {
    //             return new Promise((resolve, reject) => {
    //                 this.bybitHttpRequest('/derivatives/v3/public/tickers', 'GET', `category=${category}`).then(response => {
    //                     console.log(`fetched ${category} tickers`);
    //                     response.data.result.list.forEach((ticker: any) => {
    //                         let map = this.tickers.get(category);
    //                         if (!map) {
    //                             map = new Map<string, any>();
    //                         }
    //                         map.set(ticker.symbol, ticker)
    //                         this.tickers.set(category, map)
    //                     });
    //                     resolve();
    //                 }).catch(error => {
    //                     console.error(error);
    //                     reject(error);
    //                 })
    //             })
    //         })).then(() => {
    //             resolve()
    //         })
    //     })
    // }
    // fetchPositions(symbol: string, userID: string): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         let user = users.get(userID);
    //         if (user) {
    //             this.bybitAuthenticatedHttpRequest(user.ID, '/contract/v3/private/position/list', 'GET', `symbol=${symbol}`).then(response => {
    //                 let userPositions = this.positions.get(user.ID);
    //                 if (!userPositions) {
    //                     this.positions.set(user.ID, new Map<any, any>())
    //                 }
    //                 if (response.data.result.list !== undefined) {
    //                     if (response.data.result.list.length > 0) {
    //                         let map = new Map<any, any>();
    //                         response.data.result.list.forEach((position: any) => {
    //                             if (Number.parseFloat(position.size) > 0) {
    //                                 map.set(position.side, position)
    //                                 this.positions.get(user.ID).set(position.symbol, map)
    //                             }
    //                         });
    //                     }
    //                 }
    //                 resolve();
    //             }).catch(error => {
    //                 reject(error);
    //             })
    //         } else {
    //             console.error('user not found ' + userID)
    //             reject()
    //         }
    //     })
    // }
    // fetchOrders(symbol: string, userID: string): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         let user = users.get(userID);
    //         if (user) {
    //             this.bybitAuthenticatedHttpRequest(user.ID, '/contract/v3/private/order/list', 'GET', `symbol=${symbol}`).then(response => {
    //                 let userOrders = this.orders.get(user.ID);
    //                 if (!userOrders) {
    //                     this.orders.set(user.ID, new Map<any, any>())
    //                 }
    //                 if (response.data.result.list !== undefined) {
    //                     let map = new Map<any, any>();
    //                     if (response.data.result.list.length > 0)
    //                         response.data.result.list.forEach((order: any) => {
    //                             if (Number.parseFloat(order.size) > 0) {
    //                                 map.set(order.orderId, order)
    //                                 this.orders.get(user.ID).set(order.symbol, map)
    //                             }
    //                         });
    //                 }
    //                 resolve();
    //             }).catch(error => {
    //                 reject(error);
    //             })
    //         } else {
    //             console.error('user not found ' + userID)
    //             reject()
    //         }
    //     })
    // }
    // async fetchPositionsAndOrders(userID: string) {
    //     let user = users.get(userID);
    //     if (user) {
    //         await Promise.allSettled([...this.tickers.keys()].map((category): Promise<void> => {
    //             return new Promise((resolve, reject) => {
    //                 console.log('fetching positions & orders for ' + `${user.TWITCH_CHANNEL} ${category} tickers`);
    //                 Promise.allSettled([...this.tickers.get(category)?.values()!].map((ticker: any, index: number): Promise<void> => {
    //                     return new Promise((resolve, reject) => {
    //                         setTimeout(() => {
    //                             Promise.allSettled([this.fetchOrders(ticker.symbol, user.ID), this.fetchPositions(ticker.symbol, user.ID)]).then(() => {
    //                                 resolve()
    //                             })
    //                         }, 400 * index)
    //                     })
    //                 })).then(() => {
    //                     console.log(`finished fetching ${user.TWITCH_CHANNEL} ${category} positions & orders`);
    //                     resolve();
    //                 })
    //             })
    //         }));
    //         let userFromDB = users.get(user.ID)
    //         userFromDB.LAST_UPDATE = new Date().toUTCString()
    //         users.set(userFromDB.ID, userFromDB)
    //         return;
    //     } else {
    //         console.error('user not found ' + userID)
    //         return;
    //     }
    // }
    async fetchPositionsCCXT(userID) {
        let user = users.get(userID);
        if (user) {
            if (user.EXCHANGE_KEYS.length > 0) {
                let userPositions = this.positions.get(user.ID);
                if (!userPositions) {
                    this.positions.set(user.ID, new Map());
                }
                await Promise.allSettled(user.EXCHANGE_KEYS.map(async (exchangeKey) => {
                    let exchange;
                    let userExchangePositions = this.positions.get(user.ID).get(exchangeKey.EXCHANGE_ID);
                    if (!userExchangePositions) {
                        let userPositions = this.positions.get(user.ID);
                        let updatedUserPositions = userPositions.set(exchangeKey.EXCHANGE_ID, new Array());
                        this.positions.set(user.ID, updatedUserPositions);
                    }
                    exchange = new ccxt_1.default[exchangeKey.EXCHANGE_ID]();
                    exchange.apiKey = exchangeKey.API_KEY;
                    exchange.secret = exchangeKey.API_SECRET;
                    if (exchange.hasPrivateAPI) {
                        try {
                            let fetchedPositions = await exchange.fetchPositions();
                            let userPositions = this.positions.get(user.ID);
                            let activePositions = [];
                            await Promise.allSettled(fetchedPositions.map(async (position) => {
                                if (Number.parseFloat(position.contracts) > 0) {
                                    activePositions.push(position);
                                }
                            }));
                            if (activePositions.length > 0) {
                                userPositions = this.positions.get(user.ID);
                                let updatedUserPositions = userPositions.set(exchangeKey.EXCHANGE_ID, activePositions);
                                this.positions.set(user.ID, updatedUserPositions);
                            }
                            console.log('user ' + user.TWITCH_CHANNEL + ' has ' + activePositions.length + ' active positions.');
                        }
                        catch (error) {
                            console.error(error);
                        }
                    }
                    else {
                        console.error('exchange has no private API');
                    }
                }));
            }
            else {
                console.log('user has no exchange keys ' + user.TWITCH_CHANNEL);
            }
        }
        else {
            console.error('no user found ' + userID);
        }
    }
    getTwitchToken() {
        return new Promise((resolve, reject) => {
            if (this.twitch_token.expires_at < Date.now() || this.twitch_token.access_token === undefined) {
                (0, axios_1.default)({
                    url: `https://id.twitch.tv/oauth2/token`,
                    method: 'POST',
                    data: qs_1.default.stringify({ client_id: process.env.TWITCH_APP_CLIENT_ID, client_secret: process.env.TWITCH_APP_CLIENT_SECRET, grant_type: 'client_credentials' }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }).then((response) => {
                    this.twitch_token = response.data;
                    this.twitch_token.expires_at = Date.now() + this.twitch_token.expires_in - 10000;
                    resolve(this.twitch_token.access_token);
                }).catch(error => {
                    console.error(error);
                    reject(error);
                });
            }
            else {
                resolve(this.twitch_token.access_token);
            }
        });
    }
    getTwitchUserInfo(userID) {
        return new Promise((resolve, reject) => {
            let user = users.get(userID);
            if (user) {
                this.getTwitchToken().then(access_token => {
                    axios_1.default.get(`https://api.twitch.tv/helix/users?login=${user.TWITCH_CHANNEL.substring(1)}`, { headers: { "Authorization": `Bearer ${access_token}`, 'Client-Id': process.env.TWITCH_APP_CLIENT_ID } }).then((response) => {
                        resolve(response.data.data[0]);
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    });
                }).catch(error => {
                    console.error(error);
                    reject(error);
                });
            }
            else {
                reject('user not found ' + userID);
            }
        });
    }
    // async loadBybitWebsocket() {
    //     const expires = new Date().getTime() + 100000;
    //     const signature = crypto.createHmac("sha256", process.env.BYBIT_API_SECRET!).update("GET/realtime" + expires).digest("hex");
    //     const auth_payload = {
    //         op: "auth",
    //         args: [process.env.BYBIT_API_KEY, expires.toFixed(0), signature],
    //     };
    //     this.bybitWebsocket = new WebSocket(process.env.BYBIT_WS_ENDPOINT! + `?api_key=${process.env.BYBIT_API_KEY}&expires=${expires}&signature=${signature}`);
    //     this.bybitWebsocket.on('open', () => {
    //         console.log('Bybit WebSocket Client Connected');
    //         this.bybitWebsocket.send(JSON.stringify(auth_payload));
    //         // ping every 30 seconds
    //         setInterval(() => {
    //             this.bybitWebsocket.ping()
    //         }, 20000);
    //         // send ping
    //         this.bybitWebsocket.ping();
    //         // subscribe to order
    //         this.bybitWebsocket.send(JSON.stringify({"op": "subscribe", "args": ['user.position.contractAccount']}));
    //     });
    //     // this.bybitWebsocket.on('message', async (data: any) => {
    //     //     let messageData = JSON.parse(Buffer.from(data).toString()) as any;
    //     //     // this.discordClient.channels.cache.forEach((channel, key) => {
    //     //     //     console.log((channel as TextChannel).name, key);
    //     //     // });
    //     //     let formattedMessage = ''
    //     //     if (messageData.topic === 'user.position.contractAccount') {
    //     //         messageData.data.forEach((position: any) => {
    //     //             let map = this.positions.get(position.symbol);
    //     //             if (!map) {
    //     //                 map = new Map<any, any>();
    //     //             }
    //     //             map.set(position.side, position)
    //     //             this.positions.set(position.symbol, map)
    //     //         })
    //     //         formattedMessage += 'Position Update:\n\n';
    //     //         messageData.data.forEach((position: any) => {
    //     //             formattedMessage += `${position.side === 'Buy' ? '🟩 LONG' : position.side === 'Sell' ? '🟥 SHORT' : ''} ${position.symbol}\t\t${position.size} @ ${position.entryPrice}\t\tSL @ ${position.stopLoss}\t\tTP @ ${position.takeProfit}\n`
    //     //         })
    //     //     } else if (messageData.topic === 'user.order.contractAccount') {
    //     //     } else if (messageData.topic === 'user.exection.contractAccount') {
    //     //     } else if (messageData.topic === 'user.wallet.contractAccount') {
    //     //     }
    //     //     if (formattedMessage.length > 0)
    //     //         (this.discordClient.channels.cache.get(process.env.DISCORD_CHANNEL_ID!)! as TextChannel).send(formattedMessage);
    //     // });
    //     this.bybitWebsocket.on('ping', (data: any, flags: any) => {
    //         console.log("ping received");
    //     });
    //     this.bybitWebsocket.on('pong', (data: any, flags: any) => {
    //         console.log("pong received");
    // const used = process.memoryUsage();
    // for (let key in used) {
    //     console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    // }
    //         // writeHeapSnapshot()
    //     });
    //     this.bybitWebsocket.on('close', () => {
    //         this.restart();
    //     });
    // }
    async addUser(exchangeKeys, discord_channel_id, twitch_channel) {
        if (!twitch_channel.startsWith("#")) {
            twitch_channel = '#' + twitch_channel;
        }
        if (!users.all().some(([id, user]) => user.TWITCH_CHANNEL === twitch_channel)) {
            let userID = (0, uuid_1.v4)();
            users.set(userID, {
                ID: userID,
                TWITCH_CHANNEL: twitch_channel,
                TWITCH_ENABLED: true,
                TWITCH_TIMEOUT: true,
                TWITCH_TIMEOUT_EXPIRE: 5,
                EXCHANGE_KEYS: exchangeKeys,
                DISCORD_ENABLED: true,
                DISCORD_CHANNEL: discord_channel_id,
                DISCORD_MESSAGE: null,
                ENABLED: false
            });
            console.log('added user ' + twitch_channel);
            return true;
        }
        else {
            return false;
        }
    }
    async removeUser(userID) {
        if (users.all().some(([id, user]) => id === userID)) {
            users.delete(userID);
            console.log('removed user ' + userID);
            return true;
        }
        else {
            return false;
        }
    }
    async disableUser(userID) {
        let user = users.get(userID);
        if (user) {
            user.ENABLED = false;
            users.set(userID, user);
            console.log('user disabled ' + user.TWITCH_CHANNEL);
            return true;
        }
        else {
            return false;
        }
    }
    async enableUser(userID) {
        let user = users.get(userID);
        if (user) {
            user.ENABLED = true;
            users.set(userID, user);
            console.log('user enabled ' + user.TWITCH_CHANNEL);
            return true;
        }
        else {
            return false;
        }
    }
    async connectToTwitchChannel(userID) {
        let user = users.get(userID);
        if (user && user.ENABLED) {
            this.twitchBot.join(user.TWITCH_CHANNEL.toLowerCase());
            console.log('connected to twitch channel ' + user.TWITCH_CHANNEL);
            return true;
        }
        else {
            return false;
        }
    }
}
exports.default = CryptoPositionsBot;
// const bot = new BybitPositionBot();
// bot.start();
//# sourceMappingURL=CryptoPositionsBot.js.map