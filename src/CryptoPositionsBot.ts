/*
 Copyright (c) 2022 lmvdz

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


import { config } from 'dotenv';
import { Channel, Client, GatewayIntentBits, Message, TextChannel, EmbedBuilder, APIEmbedField } from 'discord.js';
import axios from 'axios';
import TwitchChatBot from './twitch-chat-bot';
import db from 'secure-db';
import { v4 as uuidv4 } from 'uuid';
import qs from 'qs'
import tmi from 'tmi.js'
import jsonwebtoken from 'jsonwebtoken'
//@ts-ignore
import ccxt, { Market } from 'ccxt'


config();

db.security(process.env.SECURE_DB);
const users = new db.Database('users');

interface User {
    ID: string
    EXCHANGE_KEYS: Array<ExchangeKey>
    DISCORD_CHANNEL: string
    DISCORD_MESSAGE: string
    TWITCH_CHANNEL: string
    TWITCH_ENABLED: boolean
    TWITCH_TIMEOUT: boolean
    TWITCH_TIMEOUT_EXPIRE: number
    DISCORD_ENABLED: boolean
    LAST_UPDATE: string
    ENABLED: boolean
    REF_LINK: string
    IS_RUNNING: boolean
}

interface ExchangeKey {
    KEY_ID: string
    EXCHANGE_ID: string
    API_KEY: string
    API_SECRET: string
    DESCRIPTION: string
}

interface TwitchUserInfo {
    id: string
    ligin: string
    display_name: string
    type: string
    broadcaster_type: string
    description: string
    profile_image_url: string
    view_count: number
    email?: string
    created_at: string
}


// invite discord bot to server: https://discord.com/api/oauth2/authorize?client_id=1044389854236127262&permissions=83968&scope=bot

export default class CryptoPositionsBot {

    exchangeMap: Map<any, any> = new Map<any, any>();

    // //@ts-ignore
    // bybitWebsocket: WebSocket

    //@ts-ignore
    discordClient: Client

    //@ts-ignore
    twitchBot: TwitchChatBot

    twitchCommandTimeouts: { position: any }

    fetchTimeouts: any

    // map<user.ID, map<exhange, map<symbol, map<side, position>>>>
    positions: Map<string, Map<string, Array<any>>> = new Map<string, Map<string, Array<any>>>();

    // map<user, map<symbol, map<side, order>>>
    orders: Map<any, any> = new Map<any, any>();

    //map<category, map<symbol, ticker>>
    tickers: Map<string, Map<string, any>> = new Map<string, Map<string, any>>();

    //@ts-ignore
    positionFetchLoop: NodeJS.Timer;

    twitch_token: { access_token: string, expires_in: number, token_type: string, expires_at: number } = { expires_at: 0 } as any

    constructor() {
        this.twitchCommandTimeouts = { position: {} }
        this.fetchTimeouts = {}
    }

    async loadTwitchBot() {


        this.twitchBot = new TwitchChatBot({
            username: 'CryptoPositionBot',
            password: process.env.TWITCH_BOT_OAUTH
        }, false)

        console.log('twitch bot initialized');

        this.twitchBot.removeEventListeners('join');

        this.twitchBot.addEventListener('join', (...args: never) => {
            // check for self
            if (args[2]) console.log(`Joined channel: ${args[0]}`)
        })

        this.twitchBot.removeEventListeners('part');

        this.twitchBot.addEventListener('part', (...args: never) => {
            // check for self
            if (args[2]) console.log(`Left channel: ${args[0]}`)
        })


        this.twitchBot.removeEventListeners('message');

        this.twitchBot.addEventListener('message', (channel: string, userState: tmi.ChatUserstate, message: string, self: boolean) => {

            if (self) return;

            if (!this.twitchBot.client.getChannels().includes(channel)) {
                return;
            }

            let target = null
            

            if (message === '!position' || message === '!positions') {
                target = channel.toLowerCase()
            } else if ((message.startsWith('!position @') || message.startsWith('!positions @')) && (!message.startsWith('!position @<') || !message.startsWith('!positions @<'))) {
                target = "#" + message.substring(message.indexOf("@") + 1).split(" ")[0].toLowerCase()
            } else if (message.startsWith('!position help') || message.startsWith('!positions help') || message === ('@cryptopositionsbot').toLowerCase()) {
                this.twitchBot.client.say(channel, '!position(s) - get the current channel\'s positions. !position(s) @<user> - get the user\'s positions.')
            }

            if (target === null) {

                return;
            }

            let channelUser = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase() === channel.toLowerCase());

            if (!channelUser) {
                this.twitchBot.client.say(channel, 'User: @' + channelUser.TWITCH_CHANNEL.substring(1) + ' not found in DB.')
                return;
            }

            channelUser = channelUser[1]

            if (!(channelUser as User).ENABLED) {
                this.twitchBot.client.say(channel, `[${channelUser.TWITCH_CHANNEL}] Is not enabled.`)
                return;
            }

            if (!channelUser.TWITCH_ENABLED) {
                this.twitchBot.client.say(channel, `[${channelUser.TWITCH_CHANNEL}] Does not have twitch enabled.`)
                return;
            }

            let targetUser = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase() === target.toLowerCase());
            if (!targetUser) {
                this.twitchBot.client.say(channel, 'User: @' + target.substring(1) + ' not found in DB.', )
                return;
            }

            targetUser = targetUser[1]
            if (!targetUser.ENABLED) {
                this.twitchBot.client.say(channel, `[${target}] Is not enabled.`)
                return;

            }

            if (!targetUser.TWITCH_ENABLED) {
                this.twitchBot.client.say(channel, `[${target}] Does not have twitch enabled.`)
                return;
            }

            if (this.twitchCommandTimeouts['position'][channel] === undefined) {
                this.twitchCommandTimeouts['position'][channel] = {}
            }

            if (this.twitchCommandTimeouts['position'][channel][target] === undefined) {
                this.twitchCommandTimeouts['position'][channel][target] = {
                    timedout: false,
                    expires: Date.now()
                }
            }

            if (this.twitchCommandTimeouts['position'][channel][target].timedout) {
                this.twitchBot.client.say(channel, `[${target}] Please try again in ${Math.floor((this.twitchCommandTimeouts['position'][channel][target].expires - Date.now()) / 1000)} seconds.`)
                return;
            }

            // check for timeout enabled, and user sending the command isn't the channel owner
            if (channelUser.TWITCH_TIMEOUT && (channelUser as User).TWITCH_CHANNEL.toLowerCase().substring(1) !== userState.username.toLowerCase()) {
                this.twitchCommandTimeouts['position'][channel][target].timedout = true;
                this.twitchCommandTimeouts['position'][channel][target].expires = Date.now() + (Number.parseFloat(channelUser.TWITCH_TIMEOUT_EXPIRE) * 1000 * 60);

                setTimeout(() => {
                    this.twitchCommandTimeouts['position'][channel][target].timedout = false;
                }, Number.parseFloat(channelUser.TWITCH_TIMEOUT_EXPIRE) * 1000 * 60)
            }

            let updateTime = targetUser.LAST_UPDATE;

            let positions = this.positions.get(targetUser.ID);
            if (!positions) {
                this.twitchBot.client.say(channel, `[${target}] Positions haven't been loaded yet. (${updateTime})`)
                return;

            }

            let formattedMessage = [`[${target}] Positions (${updateTime})`]

            positions.forEach((exchangePositionArray, exchangeId) => {
                exchangePositionArray.forEach((position, index) => {
                    formattedMessage.push(`[${target}] [${exchangeId}] ${(position.side) === 'long' ? '🟩 LONG ' : (position.side) === 'short' ? '🟥 SHORT ' : ''} ${(position.contracts * position.contractSize)} ${position.symbol} @ ${Number.parseFloat(Number.parseFloat(position.entryPrice).toFixed(2)).toLocaleString('en-US')} uPnL: ${Number.parseFloat(Number.parseFloat(position.unrealizedPnl).toFixed(4)).toLocaleString('en-US')} liq @ ${Number.parseFloat(Number.parseFloat(position.liquidationPrice).toFixed(2)).toLocaleString('en-US')}`)
                });
            })

            if (!(formattedMessage.length > 1)) {
                this.twitchBot.client.say(channel, `[${target}] No Positions Open (${updateTime})`)
                return;

            }
            formattedMessage.forEach((message, index) => {
                setTimeout(() => {
                    this.twitchBot.client.say(channel, message)
                }, index * 2500)
            })
        });

        console.log('twitch bot listening to events');

        this.twitchBot.client.connect().then(([_host, _port]) => {
            [...users.all().filter(([_id, user]) => (user as User).TWITCH_ENABLED).map(([_id, user]) => user.TWITCH_CHANNEL)].flat(Number.POSITIVE_INFINITY).forEach(channel => {
                this.twitchBot.client.join(channel.toLowerCase());
            });
        }).catch(error => {
            console.error(error);
        })

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
        await this.startAll();
    }

    async buildDiscordMessageEmbed(userID: string): Promise<EmbedBuilder> {
        let user = users.get(userID);
        let updateTime = user.LAST_UPDATE;
        let positionsExchangeMap = this.positions.get(user.ID);
        let twitchUserInfo = await this.getTwitchUserInfo(userID)
        let embed = new EmbedBuilder()
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
            .setFooter({ text: 'CryptoPositionBot' })
        // map<user.ID, map<exhange, map<symbol, map<side, position>>>>
        if (!positionsExchangeMap) {
            return embed;
        }

        let flattenedFields = [...positionsExchangeMap.entries()].map(([exchangeId, exchangePositionsArray]): Array<APIEmbedField> => {
            let fields = []
            if (!(exchangePositionsArray.length > 0)) {
                return fields;
            }
            fields = [{ name: exchangeId, value: '\u200B' }] as Array<APIEmbedField>;
            exchangePositionsArray.forEach(position => {
                fields.push(...[
                    {
                        name: position.symbol,
                        value: `${(position.side) === 'long' ? '🟩 LONG' : (position.side) === 'short' ? '🟥 SHORT' : ''}`
                    },
                    {
                        name: 'Size',
                        value: Number.parseFloat((Number.parseFloat(position.contracts) * Number.parseFloat(position.contractSize)).toFixed(4)).toLocaleString("en-US"),
                        inline: true
                    },
                    {
                        name: "Entry Price",
                        value: Number.parseFloat(Number.parseFloat(position.entryPrice).toFixed(2)).toLocaleString("en-US"),
                        inline: true
                    },
                    {
                        name: "Mark Price",
                        value: Number.parseFloat(Number.parseFloat(position.markPrice).toFixed(2)).toLocaleString("en-US"),
                        inline: true
                    },
                    {
                        name: "Unrealised PnL",
                        value: Number.parseFloat(Number.parseFloat(position.unrealizedPnl).toFixed(4)).toLocaleString("en-US"),
                        inline: true
                    },
                    {
                        name: "Liquidation Price",
                        value: Number.parseFloat(Number.parseFloat(position.liquidationPrice).toFixed(2)).toLocaleString("en-US"),
                        inline: true
                    },
                    { name: '\u200B', value: '\u200B' }
                ])
            })
            return fields;
        }).flat(Number.POSITIVE_INFINITY) as Array<APIEmbedField>;
        // console.log(flattenedFields);
        if (flattenedFields.length > 0) {
            embed = embed.setAuthor({ name: `Positions` }).addFields({ name: '\u200B', value: '\u200B' }, ...flattenedFields);
        } else {
            embed = embed.setAuthor({ name: `No Positions Open` }).addFields({ name: '\u200B', value: '\u200B' });
        }
        return embed;
    }

    async updateDiscord(userID: string) {
        let user = users.get(userID);
        if (!(user as User).DISCORD_ENABLED) return;

        let messageToSend = { embeds: [await this.buildDiscordMessageEmbed(userID)] }
        let channel = (this.discordClient.channels.cache.get(user.DISCORD_CHANNEL!)! as TextChannel);

        if (!channel) {
            console.error('failed to load channel from cache');
            return;
        }
        if (user.DISCORD_MESSAGE === null) {
            await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend)
            console.log("sent new message to discord channel for " + user.TWITCH_CHANNEL)
            return;
        }

        try {
            let message = await this.getMessageToEdit(user.ID)
            
            if (message === undefined) {
                await this.sendDiscordMessageForUserInChannel(user.ID, channel, messageToSend)
                console.log("sent new message to discord channel for " + user.TWITCH_CHANNEL)
                return;
            }
            
            await message.edit(messageToSend)
            console.log("updated discord message for " + user.TWITCH_CHANNEL)

        } catch (error) {
            console.error(error);
        }
        
    }

    sendDiscordMessageForUserInChannel(userID: string, channel: TextChannel, messageToSend: any) {
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
        try {
            // await this.fetchPositionsAndOrders(userID);
            await this.fetchPositionsCCXT(userID);
            await this.updateDiscord(userID);
        } catch (error) {
            console.error(error);
        }
    }

    async loopFetch(userID: string, index: number) {
        let user = users.get(userID)
        if (!user) {
            console.log('user ' + userID + ' not found.');
            return;

        }
        if (!user.ENABLED) {
            console.log('user ' + (user as User).TWITCH_CHANNEL + ' not Enabled, stopping loop.');
            user.IS_RUNNING = false;
            users.set(user.ID, user);
            return;
        }

        if (!user.IS_RUNNING) {
            console.log('user ' + (user as User).TWITCH_CHANNEL + ' not Running, stopping loop.');
            return;
        }
        

        if (this.fetchTimeouts[userID]) {
            clearTimeout(this.fetchTimeouts)
        }

        this.fetchTimeouts[userID] = setTimeout(() => {

            this.fetchPositionsAndOrdersForUser(userID).then(() => {
                setTimeout(() => {
                    this.loopFetch(userID, index)
                }, 5 * 60 * 1000)
            }).catch(error => {
                console.error(error);
                user = users.get(userID);
                if (user) {
                    user.IS_RUNNING = false;
                    users.set(user.ID, user);
                }
            })
        }, index * 2000)

    }

    async startAll() {
        try {
            await this.load();
            (users.all() as Array<any>).forEach(([_id, user], index) => {
                this.loopFetch(user.ID, index)
            })
        } catch (error) {
            console.error(error);
            await this.restart();
        }
    }

    async start(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to start ' + twitchChannel + ' user not found')
            return false;
        }

        user = user[1]
        if (user.IS_RUNNING) {
            console.error('failed to start ' + twitchChannel + ' is already running')
            return false;
        }

        let userIndex = (users.all() as Array<any>).findIndex(([id, searchedUser], index) => {
            return searchedUser.ID === user.ID
        });

        if (userIndex === -1) {
            console.error('failed to start ' + twitchChannel + ' userIndex was -1')
            return false;
        }

        console.log('started ' + user.TWITCH_CHANNEL + '.')
        user.IS_RUNNING = true;
        users.set(user.ID, user);
        
        this.loopFetch(user.ID, userIndex);
        
        return true;
        
    }

    async stop(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to stop ' + twitchChannel + ' user not found')
            return false;
        }

        user = user[1]

        if (!user.IS_RUNNING) {
            console.error('failed to stop ' + twitchChannel + ' is already stopped')
            return false;
        }

        user.IS_RUNNING = false;
        users.set(user.ID, user);
        console.log('stopped ' + twitchChannel + '.')
        return true;
        
    }

    getMessageToEdit(userID: string): Promise<Message<boolean>> {
        let user = users.get(userID);
        if (!user) {
            return null;
        }
        return new Promise((resolve, reject) => {
            this.discordClient.channels.fetch(user.DISCORD_CHANNEL).then((channel: Channel | null) => {
                if (channel === null) {
                    console.error('no channel found with id: ' + user.DISCORD_CHANNEL);
                    reject('no channel found with id: ' + user.DISCORD_CHANNEL);
                    return;  
                }
                (channel as TextChannel).messages.fetch().then((messages) => {
                    resolve(messages.get(user.DISCORD_MESSAGE))
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
            })
        })
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

    async fetchPositionsCCXT(userID: string) {
        let user = users.get(userID);
        if (!user) {
            console.error('no user found ' + userID)
            return;
        }

        if (!user.ENABLED) {
            console.log('user not enabled ' + user.ID)
            return;

        }

        if (!((user as User).EXCHANGE_KEYS.length > 0)) {
            console.log('user has no exchange keys ' + (user as User).TWITCH_CHANNEL);
            return;
        }


        let userPositions = this.positions.get(user.ID);

        if (!userPositions) {
            this.positions.set(user.ID, new Map<any, any>())
        }

        await Promise.allSettled((user as User).EXCHANGE_KEYS.map(async exchangeKey => {
            let exchange: ccxt.Exchange;

            let userExchangePositions = this.positions.get(user.ID).get(exchangeKey.EXCHANGE_ID);
            if (!userExchangePositions) {
                let userPositions = this.positions.get(user.ID);
                let updatedUserPositions = userPositions.set(exchangeKey.EXCHANGE_ID, new Array<any>());
                this.positions.set(user.ID, updatedUserPositions);
            }

            exchange = new ccxt[exchangeKey.EXCHANGE_ID]();

            exchange.apiKey = exchangeKey.API_KEY;
            exchange.secret = exchangeKey.API_SECRET;

            if (!exchange.hasPrivateAPI) {
                console.error('exchange has no private API');
                return;
            }

            try {
                let fetchedPositions = await exchange.fetchPositions();
                let userPositions = this.positions.get(user.ID);
                let activePositions = [];
                await Promise.allSettled(fetchedPositions.map(async (position, index) => {
                    if (!(Number.parseFloat(position.contracts) > 0)) return;

                    if (position.markPrice === undefined) {
                        let ticker = await exchange.fetchTicker(position.info.symbol);
                        position.markPrice = Number.parseFloat(((ticker.bid + ticker.ask) / 2).toFixed(2))
                    }

                    if (position.contractSize === undefined) {
                        let market = exchange.market(position.info.symbol) as Market
                        position.contractSize = market.contractSize
                    }

                    if (position.unrealizedPnl === undefined) {
                        position.unrealizedPnl = Number.parseFloat(((position.contractSize * position.contracts) * (position.markPrice - position.entryPrice) * (position.side === 'short' ? -1 : 1)).toFixed(4))
                    }

                    activePositions.push(position);

                }));

                if (activePositions.length > 0) {
                    userPositions = this.positions.get(user.ID);
                    let updatedUserPositions = userPositions.set(exchangeKey.EXCHANGE_ID, activePositions)
                    // console.log(activePositions);
                    this.positions.set(user.ID, updatedUserPositions)
                }

                console.log('user ' + exchangeKey.EXCHANGE_ID + ' ' + (user as User).TWITCH_CHANNEL + ' has ' + activePositions.length + ' active positions.');
                user = users.get(user.ID);
                user.LAST_UPDATE = new Date().toUTCString();
                users.set(user.ID, user)
            } catch (error) {
                console.error(error);
            }
        }));
    }

    
    getTwitchToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!(this.twitch_token.expires_at < Date.now() || this.twitch_token.access_token === undefined)) {
                resolve(this.twitch_token.access_token)
                return;
            }
            axios({
                url: `https://id.twitch.tv/oauth2/token`,
                method: 'POST',
                data: qs.stringify({ client_id: process.env.TWITCH_APP_CLIENT_ID, client_secret: process.env.TWITCH_APP_CLIENT_SECRET, grant_type: 'client_credentials' }),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then((response) => {
                this.twitch_token = response.data;
                this.twitch_token.expires_at = Date.now() + this.twitch_token.expires_in - 10000;
                resolve(this.twitch_token.access_token)
            }).catch(error => {
                console.error(error)
                reject(error);
            })
        })
    }



    getTwitchUserInfo(userID: string): Promise<TwitchUserInfo> {
        return new Promise((resolve, reject) => {
            let user = users.get(userID);
            if (!user) {
                reject('user not found ' + userID);
                return;
            }
            this.getTwitchToken().then(access_token => {
                axios.get(`https://api.twitch.tv/helix/users?login=${(user as User).TWITCH_CHANNEL.substring(1)}`, { headers: { "Authorization": `Bearer ${access_token}`, 'Client-Id': process.env.TWITCH_APP_CLIENT_ID } }).then((response) => {
                    resolve(response.data.data[0])
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        })

    }

    async addUser(
        exchangeKeys: Array<ExchangeKey>,
        discord_channel_id: string,
        twitch_channel: string,
        discord_enabled: boolean = true,
        twitch_enabled: boolean = true,
        twitch_timeout_enabled: boolean = true,
        twitch_timeout_expire: number = 5,
        enabled: boolean = false
    ) {
        if (!twitch_channel.startsWith("#")) {
            twitch_channel = '#' + twitch_channel
        }
        if (users.all().some(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase() === twitch_channel.toLowerCase())) {
            console.log('user ' + twitch_channel + ' already exists');
            return null;
        }
        let userID = uuidv4();
        users.set(userID, {
            ID: userID,
            TWITCH_CHANNEL: twitch_channel,
            TWITCH_ENABLED: twitch_enabled,
            TWITCH_TIMEOUT: twitch_timeout_enabled,
            TWITCH_TIMEOUT_EXPIRE: twitch_timeout_expire,
            EXCHANGE_KEYS: exchangeKeys,
            DISCORD_ENABLED: discord_enabled,
            DISCORD_CHANNEL: discord_channel_id,
            DISCORD_MESSAGE: null,
            LAST_UPDATE: new Date().toUTCString(),
            ENABLED: enabled,
            IS_RUNNING: false
        } as User);
        console.log('added user ' + twitch_channel)
        return userID;
    }

    async removeUser(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to remove ' + twitchChannel + ' user not found')
            return false;
        }
        user = user[1]
        users.delete(user.ID)
        console.log('removed user ' + twitchChannel)
        return true;

    }

    async disableUser(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to disable ' + twitchChannel + ' user not found')
            return false;
        }
        user = user[1]
        user.ENABLED = false;
        users.set(user.ID, user)
        console.log('user disabled ' + (user as User).TWITCH_CHANNEL)
        return true;

    }

    async enableUser(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to enable ' + twitchChannel + ' user not found');
            return false;
        }
        user = user[1]
        user.ENABLED = true;
        users.set(user.ID, user)
        console.log('user enabled ' + (user as User).TWITCH_CHANNEL)
        return true;

    }

    async updateUserExchangeKeys(twitchChannel: string, exchangeKeys: Array<ExchangeKey>) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to update exhange keys for ' + twitchChannel + ' user not found');
            return false;
        }
        user = user[1]
        let updatedExchangeKeys = [];
        user.EXCHANGE_KEYS.forEach((existingExchangeKey: ExchangeKey) => {
            let updated = exchangeKeys.find(updatedExchangeKey => updatedExchangeKey.KEY_ID === existingExchangeKey.KEY_ID);
            if (updated) {
                if (!updated.API_KEY.startsWith("*")) {
                    existingExchangeKey.API_KEY = updated.API_KEY;
                }
                if (!updated.API_SECRET.startsWith("*")) {
                    existingExchangeKey.API_SECRET = updated.API_SECRET;
                }
                if (updated.DESCRIPTION !== existingExchangeKey.DESCRIPTION) {
                    existingExchangeKey.DESCRIPTION = updated.DESCRIPTION;
                }
                updatedExchangeKeys.push(existingExchangeKey);
            }
        });
        exchangeKeys.forEach(updatedExchangeKey => {
            if (!user.EXCHANGE_KEYS.some((currentExchangeKey: ExchangeKey) => currentExchangeKey.KEY_ID === updatedExchangeKey.KEY_ID)) {
                if ((!updatedExchangeKey.API_KEY.startsWith("*") && !updatedExchangeKey.API_SECRET.startsWith("*"))) {
                    updatedExchangeKeys.push(updatedExchangeKey)
                }
            }
        });
        user.EXCHANGE_KEYS = updatedExchangeKeys;
        users.set(user.ID, user);
        console.log('updated ' + user.TWITCH_CHANNEL + '\'s exchange keys info');
        return true;

    }

    async updateUserDiscordInfo(twitchChannel: string, discordInfo: { DISCORD_MESSAGE: string, DISCORD_CHANNEL: string, DISCORD_ENABLED: boolean }) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to update discord info for ' + twitchChannel + ' user not found')
            return false;
        }
        user = user[1]
        user.DISCORD_CHANNEL = discordInfo.DISCORD_CHANNEL;
        user.DISCORD_MESSAGE = discordInfo.DISCORD_MESSAGE;
        user.DISCORD_ENABLED = discordInfo.DISCORD_ENABLED;
        users.set(user.ID, user);
        console.log('updated ' + user.TWITCH_CHANNEL + '\'s discord info');
        return true;

    }

    async updateUserTwitchInfo(twitchChannel: string, twitchInfo: { TWITCH_ENABLED: boolean, TWITCH_TIMEOUT: boolean, TWITCH_TIMEOUT_EXPIRE: number }) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to update twitch info for ' + twitchChannel + ' user not found');
            return false;
        }
        user = user[1]
        user.TWITCH_ENABLED = twitchInfo.TWITCH_ENABLED;
        if (!user.TWITCH_ENABLED) {
            await this.connectToTwitchChannel(twitchChannel)
        } else {
            await this.disconnectFromTwitchChannel(twitchChannel)
        }
        user.TWITCH_TIMEOUT = twitchInfo.TWITCH_TIMEOUT;
        user.TWITCH_TIMEOUT_EXPIRE = Number.parseFloat(twitchInfo.TWITCH_TIMEOUT_EXPIRE.toString());
        users.set(user.ID, user);
        console.log('updated ' + user.TWITCH_CHANNEL + '\'s twitch info');
        return true;
    }

    async updateUserEnabled(twitchChannel: string, enabled: boolean) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.error('failed to update user enabled state for ' + twitchChannel + ' user not found');
            return false;
        }
        user = user[1]
        user.ENABLED = enabled;
        users.set(user.ID, user);
        console.log('updated ' + user.TWITCH_CHANNEL + '\'s enabled state: ' + enabled);
        return true;

    }

    async connectToTwitchChannel(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.log('Could not find user associated to twitch channel: ' + twitchChannel)
            return 'Could not find user associated to twitch channel ' + twitchChannel;

        }

        user = user[1]
        if (!user.ENABLED) {
            console.log('User not enabled ' + (user as User).TWITCH_CHANNEL)
            return 'User not enabled ' + (user as User).TWITCH_CHANNEL;
        }

        if (!user.TWITCH_ENABLED) {
            console.log('twitch setting not enabled ' + (user as User).TWITCH_CHANNEL)
            return 'twitch setting not enabled ' + (user as User).TWITCH_CHANNEL;
        }

        if (this.twitchBot.client.getChannels().some(channel => channel.toLowerCase() === user.TWITCH_CHANNEL.toLowerCase())) {
            console.log('already connected to twitch channel ' + (user as User).TWITCH_CHANNEL)
            return 'already connected to twitch channel ' + (user as User).TWITCH_CHANNEL;
        }

        const [response] = await this.twitchBot.client.join(user.TWITCH_CHANNEL.toLowerCase())
        console.log(response);
        console.log('connected to twitch channel ' + (user as User).TWITCH_CHANNEL)
        return true;
    }

    async disconnectFromTwitchChannel(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.log('Could not find user associated to twitch channel: ' + twitchChannel)
            return 'Could not find user associated to twitch channel ' + twitchChannel;
        }
        user = user[1]
        if (!user.ENABLED) {
            console.log('User not enabled ' + (user as User).TWITCH_CHANNEL)
            return 'User not enabled ' + (user as User).TWITCH_CHANNEL;
        }
        if (!user.TWITCH_ENABLED) {
            console.log('twitch setting not enabled ' + (user as User).TWITCH_CHANNEL)
            return 'twitch setting not enabled ' + (user as User).TWITCH_CHANNEL;

        }
        if (!this.twitchBot.client.getChannels().some((channel: string) => channel.toLowerCase() === user.TWITCH_CHANNEL.toLowerCase())) {
            console.log('not connected to twitch channel ' + (user as User).TWITCH_CHANNEL)
            return 'not connected to twitch channel ' + (user as User).TWITCH_CHANNEL;
        }
        const [response] = await this.twitchBot.client.part(user.TWITCH_CHANNEL.toLowerCase())
        console.log(response);
        console.log('disconnected from twitch channel ' + (user as User).TWITCH_CHANNEL)
        return true;
    }

    async isConnectedToTwitchChannel(twitchChannel: string): Promise<boolean> {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());

        if (!user) return false;

        user = user[1];
        return (this.twitchBot.client.getChannels().some((channel: string) => channel.toLowerCase() === user.TWITCH_CHANNEL.toLowerCase()))
    }

    async getUserInfo(twitchChannel: string) {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            return await this.createUser(twitchChannel)
        }
        user = user[1]
        user.EXCHANGE_KEYS = (user as User).EXCHANGE_KEYS.map(key => ({ KEY_ID: key.KEY_ID, EXCHANGE_ID: key.EXCHANGE_ID, API_KEY: new Array(key.API_KEY.length + 1).join("*"), API_SECRET: new Array(key.API_SECRET.length + 1).join("*"), DESCRIPTION: key.DESCRIPTION } as ExchangeKey));
        return user;
    }

    async createUser(twitchChannel: string) {
        try {
            let userID = await this.addUser([], '', '#' + twitchChannel, false, false, true, 5, false)

            if (userID === null) return null;

            let user = users.get(userID)

            if (!user) return null;

            return user;
        } catch (error) {
            return error;
        }
    }

    async trySetupRefLink(twitchChannel: string, refLink: string): Promise<string | boolean> {
        let user = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === twitchChannel.toLowerCase());
        if (!user) {
            console.log('User not found ' + twitchChannel)
            return 'User not found ' + twitchChannel

        }
        user = user[1];
        if (!(user.REF_LINK === null || user.REF_LINK === undefined)) {
            console.log("Failed to set referral for " + user.TWITCH_CHANNEL + ", ref link already set to: " + user.REF_LINK)
            return "Failed to set referral for " + user.TWITCH_CHANNEL + ", ref link already set to: " + user.REF_LINK;

        }

        let refLinkUser = (users.all() as Array<any>).find(([_id, user]) => user.TWITCH_CHANNEL.toLowerCase().substring(1) === refLink.toLowerCase());

        if (!refLinkUser) {
            console.log("Failed to set referral for " + user.TWITCH_CHANNEL + ", user with twitch channel not found: " + refLink)
            return 'Could not find user with twitch channel: ' + refLink;
        }

        refLinkUser = refLinkUser[1];
        if (refLinkUser.ID === user.ID) {
            console.log("Cannot refer yourself: " + user.TWITCH_CHANNEL);
            return "Cannot refer yourself: " + user.TWITCH_CHANNEL;
        }

        user.REF_LINK = refLinkUser.TWITCH_CHANNEL.toLowerCase().substring(1);
        users.set(user.ID, user);
        console.log("Successfully set referral for " + user.TWITCH_CHANNEL + " to " + refLink.toLowerCase())
        return true;
    }

    async getReferrals(twitchChannel: string) {
        return (users.all() as Array<any>).filter(([_id, user]) => {
            return user.TWITCH_CHANNEL.toLowerCase().substring(1) !== twitchChannel.toLowerCase() && user.REF_LINK === twitchChannel.toLowerCase()
        }).map(([_id, user]: [string, User]) => ({
            twitchChannel: user.TWITCH_CHANNEL
        }));
    }
}