"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const CryptoPositionsBot_1 = __importDefault(require("../CryptoPositionsBot"));
const body_parser_1 = __importDefault(require("body-parser"));
(0, dotenv_1.config)();
const bot = new CryptoPositionsBot_1.default();
bot.addUser([{ 'API_KEY': 'M4WjFXob7u3jeGgTyg', 'API_SECRET': 'wijY1CoUYf6KJwPNwy5eorTIvIXFNp7pjReC', 'EXCHANGE_ID': 'bybit' }], '1044457746680004728', '#Lmvdzande');
bot.addUser([{ 'API_KEY': 'Dfv0YiiuJuz7Y5aIp1', 'API_SECRET': '3teMGGWmcARkm5y9ryOehwx6mWqqqQm6J37H', 'EXCHANGE_ID': 'bybit' }], '1044690741424836732', '#bearkingeth');
bot.start();
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.post("/addUser", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.exchangeKeys === undefined) {
                res.send('missing exchangeKeys');
            }
            else if (req.body.discord_channel_id === undefined) {
                res.send('missing discord_channel_id');
            }
            else if (req.body.twitch_channel === undefined) {
                res.send('missing twitch_channel');
            }
            else {
                bot.addUser(req.body.exchangeKeys, req.body.discord_channel_id, req.body.twitch_channel).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false);
                });
            }
        }
        else {
            res.send('missing bybit_api_key, bybit_api_secret, discord_channel_id, twitch_channel');
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.post('/removeUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID');
            }
            else {
                bot.removeUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false);
                });
            }
        }
        else {
            res.send('missing userID');
        }
    }
    else {
        res.status(300).send("Access Denied");
    }
});
app.post('/enableUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID');
            }
            else {
                bot.enableUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false);
                });
            }
        }
        else {
            res.send('missing userID');
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.post('/disableUser', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID');
            }
            else {
                bot.disableUser(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false);
                });
            }
        }
        else {
            res.send('missing userID');
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.post('/connectToTwitchChannel', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        if (req.body !== undefined) {
            if (req.body.userID === undefined) {
                res.send('missing userID');
            }
            else {
                bot.connectToTwitchChannel(req.body.userID).then(() => {
                    res.send(true);
                }).catch(error => {
                    res.send(false);
                });
            }
        }
        else {
            res.send('missing userID');
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.listen(3216, () => {
    console.log("bybit position bot server started on port 3216");
});
//# sourceMappingURL=bot.js.map