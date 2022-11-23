import WebSocket from 'ws';
import {config} from 'dotenv';
import crypto from 'crypto';
import { Channel, Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import axios, { AxiosRequestConfig, Method } from 'axios';
import TwitchBot from 'twitch-bot';
import db from 'secure-db';
import { v4 as uuidv4 } from 'uuid';

config();

db.security(process.env.SECURE_DB);
const users = new db.Database('users');

interface User {
    ID: string
    BYBIT_API_KEY: string
    BYBIT_API_SECRET: string
    DISCORD_CHANNEL: string
    DISCORD_MESSAGE: string
    TWITCH_CHANNEL: string
    TWITCH_ENABLED: boolean
    TWITCH_TIMEOUT: boolean
    TWITCH_TIMEOUT_EXPIRE: number
    DISCORD_ENABLED: boolean
    LAST_UPDATE: string
    ENABLED: boolean
}


// invite discord bot to server: https://discord.com/api/oauth2/authorize?client_id=1044389854236127262&permissions=2048&scope=bot

export default class BybitPositionBot {

    //@ts-ignore
    bybitWebsocket: WebSocket

    //@ts-ignore
    discordClient: Client

    //@ts-ignore
    twitchBot: TwitchBot

    twitchCommandTimeouts: { position: any }
    
    bybitFetchTimeouts: any

    // map<user.ID, map<symbol, map<side, position>>>
    positions: Map<string, Map<string, Map<any, any>>> = new Map<string, Map<string, Map<any, any>>>();
    
    // map<user, map<symbol, map<side, order>>>
    orders: Map<any, any> = new Map<any, any>();
    
    //map<category, map<symbol, ticker>>
    tickers: Map<string, Map<string, any>> = new Map<string, Map<string, any>>();

    //@ts-ignore
    positionFetchLoop: NodeJS.Timer;

    constructor() {
        this.twitchCommandTimeouts = {position: {}}
        this.bybitFetchTimeouts = {}
    }

    async loadTwitchBot() {
        

        this.twitchBot = new TwitchBot({
            username: 'BybitPositionBot',
            oauth: process.env.TWITCH_BOT_OAUTH,
            channels: [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY)
        })

        console.log('twitch bot loaded');

        this.twitchBot.on('join', (channel: string) => {
            console.log(`Joined channel: ${channel}`)
        })
        
        this.twitchBot.on('error', (err: any) => {
            console.log(err)
        })
        
        this.twitchBot.on('message', (chatter: any) => {
            let user = (users.all() as Array<any>).find(([id, user]) => user.TWITCH_CHANNEL.toLowerCase() === chatter.channel.toLowerCase())[1];
            if (user !== undefined && user.TWITCH_ENABLED) {
                let target = null
                
                if(chatter.message === '!position' || chatter.message === '!positions') {
                    target = chatter.channel.toLowerCase()
                } else if ((chatter.message.startsWith('!position @') || chatter.message.startsWith('!positions @')) && chatter.message.includes("@")) {
                    target = "#"+chatter.message.substring(chatter.message.indexOf("@")+1).split(" ")[0].toLowerCase()
                }

                if (target !== null) {

                    let targetUser = (users.all() as Array<any>).find(([id, user]) => user.TWITCH_CHANNEL.toLowerCase() === target.toLowerCase())[1];
                    if (targetUser) {
                        if (this.twitchCommandTimeouts['position'][chatter.channel] === undefined) {
                            this.twitchCommandTimeouts['position'][chatter.channel] = {}
                        }
                        if (this.twitchCommandTimeouts['position'][chatter.channel][target] === undefined) {
                            this.twitchCommandTimeouts['position'][chatter.channel][target] = {
                                timedout: false,
                                expires: Date.now()
                            }
                        }
                        if(!this.twitchCommandTimeouts['position'][chatter.channel][target].timedout) {
        
                            if (user.TWITCH_TIMEOUT) {
                                this.twitchCommandTimeouts['position'][chatter.channel][target].timedout = true;
                                this.twitchCommandTimeouts['position'][chatter.channel][target].expires = Date.now() + (user.TWITCH_TIMEOUT_EXPIRE * 1000 * 60);
        
                                setTimeout(() => {
                                    this.twitchCommandTimeouts['position'][chatter.channel][target].timedout = false;
                                }, user.TWITCH_TIMEOUT_EXPIRE * 1000 * 60)
                            }
        
                            let updateTime = user.LAST_UPDATE;
                            let formattedMessage = [`[${target}] Positions (${updateTime})`]
                            
                            let positions = this.positions.get(user.ID);
                            if (positions) {
                                this.positions.get(user.ID).forEach((symbolMap, symbol) => {
                                    // console.log(symbol)
                                    symbolMap.forEach((position, side) => {
                                        // console.log(position)
                                        formattedMessage.push(`${position.side === 'Buy' ? '🟩 LONG ' : position.side === 'Sell' ? '🟥 SHORT ' : ''} ${symbol} ${position.size} @ ${position.entryPrice} uPnL: ${position.unrealisedPnl} liq @ ${position.liqPrice}`)
                                    })
                                });
                                
                                if (formattedMessage.length > 1) {
                                    formattedMessage.forEach((message, index) => {
                                        setTimeout(() => {
                                            this.twitchBot.say(message, chatter.channel)
                                        }, index * 2500)
                                    })
                                } else {
                                    this.twitchBot.say(`[${target}] No Positions Open (${updateTime})`, chatter.channel)
                                } 
                            } else {
                                this.twitchBot.say(`[${target}] Positions haven't been loaded yet. (${updateTime})`, chatter.channel)
                            }
                        } else {
                            this.twitchBot.say(`[${target}] Please try again in ${Math.floor((this.twitchCommandTimeouts['position'][chatter.channel][target].expires - Date.now()) / 1000)} seconds.`, chatter.channel)
                        }
                    } else {
                        this.twitchBot.say('User: @' + target.substring(1) + ' not found in DB.', chatter.channel)
                    }
                } else {
                    this.twitchBot.say('Command failed target is null', chatter.channel)
                }
            }
        });

        [...users.all().map(([id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY).forEach(channel => {
            this.twitchBot.join(channel.toLowerCase())
            console.log('twitchbot joined: ' + channel.toLowerCase())
        })

        
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
        await this.loadDiscordBot();
        await this.discordBotLogin();
        await this.start();
    }

    async updateDiscord(userID: string) {
        let user = users.get(userID);
        if ((user as User).DISCORD_ENABLED) {
            let updateTime = user.LAST_UPDATE;
            let formattedMessage = `Positions (Last Update: ${updateTime})\n`
            let positions = this.positions.get(user.ID)
            let messageToSend = `Positions haven't been loaded yet. (${updateTime})`

            if (positions) {
                positions.forEach((symbolMap, symbol) => {
                    // console.log(symbol)
                    formattedMessage += `\n${symbol}\n\n`
                    symbolMap.forEach((position, side) => {
                        // console.log(position)
                        formattedMessage += `${position.side === 'Buy' ? '🟩 LONG\t\t' : position.side === 'Sell' ? '🟥 SHORT\t\t' : ''} ${position.size} @ ${position.entryPrice}\t\tuPnL: ${position.unrealisedPnl}\t\tliq @ ${position.liqPrice}\n`
                    })
                });

                if (formattedMessage !== `Positions (Last Update: ${updateTime})\n`) {
                    messageToSend = formattedMessage
                } else {
                    messageToSend = `No Positions Open (${updateTime})`;
                }
            }

            let channel = (this.discordClient.channels.cache.get(user.DISCORD_CHANNEL!)! as TextChannel);

            if (channel) {
                if (user.DISCORD_MESSAGE === null) {
                    await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend)
                    console.log("sent new message to discord channel for " + user.TWITCH_CHANNEL)
                } else {
                    this.getMessageToEdit(user.ID).then(async message => {
                        try {
                            if (message !== undefined) {
                                await message.edit(messageToSend)
                            } else {
                                await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend)
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    })
                }
            } else {
                console.error('failed to load channel from cache');
            }
        }
    }

    sendDiscordMessageForUserInChannel(userID: string, channel: TextChannel, messageToSend: string) {
        return new Promise((resolve, reject) => {
            channel.send(messageToSend).then((message: Message<boolean>) => {
                this.updateUserDiscordMessage(userID, message).then(() => {
                    resolve(message)
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
            }).catch(error => {
                console.error(error);
                reject(error);
            });
        })
    }

    async updateUserDiscordMessage(userID: string, message: Message<boolean>) {
        let user = users.get(userID);
        user.DISCORD_MESSAGE = message.id
        users.set(user.ID, user)
        return true;
    }

    async fetchPositionsAndOrdersForUser(userID: string) {
        await this.fetchPositionsAndOrders(userID);
        await this.updateDiscord(userID);
    }

    async loopFetch(userID: string, index: number) {
        let user = users.get(userID)
        if (user.ENABLED) {
            if (this.bybitFetchTimeouts[userID]) {
                clearTimeout(this.bybitFetchTimeouts)
            }
            this.bybitFetchTimeouts[userID] = setTimeout(() => {
                this.fetchPositionsAndOrdersForUser(userID).then(() => {
                    setTimeout(() => {
                        this.loopFetch(userID, index)
                    }, 5*60*1000)
                })
            }, index * 1000)
        } else {
            console.log('user ' + (user as User).TWITCH_CHANNEL + ' not Enabled, stopping loop.');
        }
    }

    async start() {
        try {
            await this.load();
            (users.all() as Array<any>).forEach(([id, user], index) => {
                this.loopFetch(user.ID, index)
            })
        } catch (error) {
            console.error(error);
            await this.restart();
        }
        
    }

    getMessageToEdit(userID: string) : Promise<Message<boolean>> {
        let user = users.get(userID);
        if (user) {
            return new Promise((resolve, reject) => {
                this.discordClient.channels.fetch(user.DISCORD_CHANNEL).then((channel: Channel | null) => {
                    if (channel !== null) {
                        (channel as TextChannel).messages.fetch().then((messages) => {
                            resolve(messages.get(user.DISCORD_MESSAGE))
                        }).catch(error => {
                            console.error(error);
                            reject(error);
                        })
                    } else {
                        console.error('no channel found with id: ' + user.DISCORD_CHANNEL);
                        reject('no channel found with id: ' + user.DISCORD_CHANNEL)
                    }
                })
            })
        } else {
            return null;
        }
    }
    
    async loadDiscordBot() {
        this.discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

        this.discordClient.on('close', () => {
            this.loadDiscordBot();
        })

        this.discordClient.on('ready', () => {
            console.log("discord bot loaded");
            // this.loadBybitWebsocket();
        })
        
    }

    async discordBotLogin() {
        await this.discordClient.login(process.env.DISCORD_BOT_TOKEN);
     }

    getSignature(userID: string, timestamp: any, recvWindow: any, data: any) {

        let user = users.get(userID);

        return crypto.createHmac('sha256', user.BYBIT_API_SECRET!).update(timestamp + user.BYBIT_API_KEY! + recvWindow + data).digest('hex');

    }

    async bybitAuthenticatedHttpRequest(userID: string, endpoint: string, method: Method, data: any) : Promise<any> {
        let user = users.get(userID);
        var recvWindow = 100000;
        var timestamp = Date.now().toString();

        const config = {
            headers: {
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-SIGN': this.getSignature(userID, timestamp, recvWindow, data),
                'X-BAPI-API-KEY': user.BYBIT_API_KEY,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow.toString(),
                'Content-Type': 'application/json; charset=utf-8'
            },
            method: method,
            url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
        } as AxiosRequestConfig

        if (data !== '') {
            config.data = data
        }

        return axios(config)
    }

    async bybitHttpRequest(endpoint: string, method: Method, data: any) : Promise<any> {
        const config = {
            method: method,
            url: method === 'POST' ? process.env.BYBIT_REST_ENDPOINT + endpoint : process.env.BYBIT_REST_ENDPOINT + endpoint + (data.length > 0 ? '?' + data : '')
        } as AxiosRequestConfig

        if (data !== '') {
            config.data = data
        }

        return axios(config)
    }

    fetchTickers(symbol?:string) : Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('fetching tickers');
            Promise.allSettled(['linear', 'inverse'].map((category: string) : Promise<void> => {
                return new Promise((resolve, reject) => {
                    
                    this.bybitHttpRequest('/derivatives/v3/public/tickers', 'GET', `category=${category}`).then(response => {
                        console.log(`fetched ${category} tickers`);
                        response.data.result.list.forEach((ticker: any) => {
                            let map = this.tickers.get(category);
                            if (!map) {
                                map = new Map<string, any>();
                            }
        
                            map.set(ticker.symbol, ticker)
                            
                            this.tickers.set(category, map)
                        });

                        resolve();
        
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    })
                })
            })).then(() => {
                resolve()
            })
        })
    }

    fetchPositions(symbol:string, userID: string) : Promise<void> {
        
            return new Promise((resolve, reject) => {
                let user = users.get(userID);
                if (user) {
                    this.bybitAuthenticatedHttpRequest(user.ID, '/contract/v3/private/position/list', 'GET', `symbol=${symbol}`).then(response => {
                        let userPositions = this.positions.get(user.ID);
                        if (!userPositions) {
                            this.positions.set(user.ID, new Map<any, any>())
                        }
                        if (response.data.result.list !== undefined) {
                            if (response.data.result.list.length > 0)
                                response.data.result.list.forEach((position: any) => {
                                    if (Number.parseFloat(position.size) > 0) {
                                        let map = this.positions.get(user.ID).get(position.symbol);
                                        if (!map) {
                                            map = new Map<any, any>();
                                        }
                                        map.set(position.side, position)
                                        this.positions.get(user.ID).set(position.symbol, map)
                                    }
                                });
                        }
                        resolve();
                    }).catch(error => {
                        reject(error);
                    })
                } else {
                    console.error('user not found ' + userID)
                    reject()
                }
                
            })
        
        
        
    }

    fetchOrders(symbol: string, userID: string) : Promise<void> {  
        return new Promise((resolve, reject) => {
            let user = users.get(userID);
            if (user) {
                this.bybitAuthenticatedHttpRequest(user.ID, '/contract/v3/private/order/list', 'GET', `symbol=${symbol}`).then(response => {
                    let userOrders = this.orders.get(user.ID);
                    if (!userOrders) {
                        this.orders.set(user.ID, new Map<any, any>())
                    }
                    if (response.data.result.list !== undefined) {
                        if (response.data.result.list.length > 0)
                            response.data.result.list.forEach((order: any) => {
                                if (Number.parseFloat(order.size) > 0) {
                                    let map = this.orders.get(user.ID).get(order.symbol);
                                    if (!map) {
                                        map = new Map<any, any>();
                                    }
                                    map.set(order.orderId, order)
                                    this.orders.get(user.ID).set(order.symbol, map)
                                }
                            });
                    }
                    resolve();
                }).catch(error => {
                    reject(error);
                })
            } else {
                console.error('user not found ' + userID)
                reject()
            }
        })
    }

    async fetchPositionsAndOrders(userID: string) {
        let user = users.get(userID);
        if (user) {
            await Promise.allSettled([...this.tickers.keys()].map((category) : Promise<void> => {
                return new Promise((resolve, reject) => {
                    console.log('fetching positions & orders for '+ `${user.TWITCH_CHANNEL} ${category} tickers`);
            
                    Promise.allSettled([...this.tickers.get(category)?.values()!].map((ticker: any, index: number) : Promise<void> => {
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                Promise.allSettled([this.fetchOrders(ticker.symbol, user.ID), this.fetchPositions(ticker.symbol, user.ID)]).then(() => {
                                    resolve()
                                })
                            }, 400 * index)
                        })
                    })).then(() => {
                        console.log(`finished fetching ${user.TWITCH_CHANNEL} ${category} positions & orders`);
                        resolve();
                    })
                })
            }));
            let userFromDB = users.get(user.ID)
            userFromDB.LAST_UPDATE = new Date().toUTCString()
            users.set(userFromDB.ID, userFromDB)
            return;
        } else {
            console.error('user not found ' + userID)
            return;
        }
        
        
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

    async addUser(bybit_api_key: string, bybit_api_secret: string, discord_channel_id: string, twitch_channel: string) {
        if (!twitch_channel.startsWith("#")) {
            twitch_channel = '#' + twitch_channel
        }
        if (!users.all().some(([id, user]) => user.TWITCH_CHANNEL === twitch_channel)) {
            let userID = uuidv4();
            users.set(userID, { 
                ID: userID,
                TWITCH_CHANNEL: twitch_channel, 
                TWITCH_ENABLED: true,
                TWITCH_TIMEOUT: true,
                TWITCH_TIMEOUT_EXPIRE: 5,
                BYBIT_API_KEY: bybit_api_key, 
                BYBIT_API_SECRET: bybit_api_secret, 
                DISCORD_ENABLED: true,
                DISCORD_CHANNEL: discord_channel_id, 
                DISCORD_MESSAGE: null,
                ENABLED: false
            } as User);
            console.log('added user ' + twitch_channel)
            return true;
        } else {
            return false;
        }
    }

    async removeUser(userID: string) {
        if (users.all().some(([id, user]) => id === userID)) {
            users.delete(userID)
            console.log('removed user ' + userID)
            return true;
        } else {
            return false;
        }
    }

    async disableUser(userID: string) {
        let user = users.get(userID)
        if (user) {
            user.ENABLED = false;
            users.set(userID, user)
            console.log('user disabled ' + (user as User).TWITCH_CHANNEL)
            return true;
        } else {
            return false;
        }
    }

    async enableUser(userID: string) {
        let user = users.get(userID)
        if (user) {
            user.ENABLED = true;
            users.set(userID, user)
            console.log('user enabled ' + (user as User).TWITCH_CHANNEL)
            return true;
        } else {
            return false;
        }
    }

    async connectToTwitchChannel(userID: string) {
        let user = users.get(userID)
        if (user && user.ENABLED) {
            this.twitchBot.join(user.TWITCH_CHANNEL.toLowerCase())
            console.log('connected to twitch channel ' + (user as User).TWITCH_CHANNEL)
            return true;
        } else {
            return false;
        }
    }
}

// const bot = new BybitPositionBot();

// bot.start();