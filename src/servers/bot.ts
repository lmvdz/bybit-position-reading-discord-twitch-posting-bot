import express from 'express'
import { config } from 'dotenv'
import BybitPostingBot from '../BybitPositionBot'
import bodyParser from 'body-parser'

config()

const bot = new BybitPostingBot();
bot.start();

const app = express();
app.use(bodyParser.json())

app.post("/addUser", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.bybit_api_key === undefined) {
                res.send('missing bybit_api_key')
            } else if (req.body.bybit_api_secret === undefined) {
                res.send('missing bybit_api_secret')
            } else if (req.body.discord_channel_id === undefined) {
                res.send('missing discord_channel_id')
            } else if (req.body.twitch_channel === undefined) {
                res.send('missing twitch_channel')
            } else {
                bot.addUser(req.body.bybit_api_key, req.body.bybit_api_secret, req.body.discord_channel_id, req.body.twitch_channel).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false)
                })
            }
        } else {
            res.send('missing bybit_api_key, bybit_api_secret, discord_channel_id, twitch_channel')
        }
        
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
    
})

app.post('/removeUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID')
            } else {
                bot.removeUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false)
                })
            }
        } else {
            res.send('missing userID')
        }
    } else {
        res.status(300).send("Access Denied")
    }
})

app.post('/enableUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID')
            } else {
                bot.enableUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false)
                })
            }
        } else {
            res.send('missing userID')
        }
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.post('/disableUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID')
            } else {
                bot.disableUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false)
                })
            }
        } else {
            res.send('missing userID')
        }
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.post('/connectToTwitchChannel', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID')
            } else {
                bot.connectToTwitchChannel(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false)
                })
            }
        } else {
            res.send('missing userID')
        }
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.listen(3216, () => {
    console.log("bybit position bot server started on port 3216")
})