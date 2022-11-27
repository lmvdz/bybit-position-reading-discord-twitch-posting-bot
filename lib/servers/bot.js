"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const CryptoPositionsBot_1 = __importDefault(require("../CryptoPositionsBot"));
const body_parser_1 = __importDefault(require("body-parser"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
(0, dotenv_1.config)();
const bot = new CryptoPositionsBot_1.default();
// bot.addUser([{'KEY_ID': '09bd38bb-5317-450a-900b-ac72ee181565', 'API_KEY': 'M4WjFXob7u3jeGgTyg', 'API_SECRET': 'wijY1CoUYf6KJwPNwy5eorTIvIXFNp7pjReC', 'EXCHANGE_ID': 'bybit'}], '1044457746680004728', '#Lmvdzande', true, true, true, 5, true).then((userID) => {
//     if (userID !== null) {
//         bot.enableUser(userID);
//         bot.connectToTwitchChannel(userID);
//     }
// });
bot.addUser([{ 'KEY_ID': '30ba7142-3c04-4720-9577-8b1c656bb6ab', 'API_KEY': 'Dfv0YiiuJuz7Y5aIp1', 'API_SECRET': '3teMGGWmcARkm5y9ryOehwx6mWqqqQm6J37H', 'EXCHANGE_ID': 'bybit', 'DESCRIPTION': 'Challange Account' }], '1044690741424836732', '#bearkingeth', true, true, true, 5, true).then((userID) => {
    if (userID !== null) {
        bot.enableUser(userID);
        bot.connectToTwitchChannel(userID);
    }
});
bot.startAll();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.post("/addUser", (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.exchangeKeys === undefined) {
            res.send('missing exchangeKeys');
        }
        else if (req.body.discord_channel_id === undefined) {
            res.send('missing discord_channel_id');
        }
        else if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.addUser(req.body.exchangeKeys, req.body.discord_channel_id, data.display_name).then(() => {
                    res.send(true);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing exchange_keys, discord_channel_id, access_token');
    }
});
app.post('/removeUser', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.removeUser(data.display_name).then(() => {
                    res.send(true);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/enableUser', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.enableUser(data.display_name).then(() => {
                    res.send(true);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/disableUser', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.disableUser(data.display_name).then(() => {
                    res.send(true);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/connectToTwitchChannel', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.connectToTwitchChannel(data.display_name).then(() => {
                    res.send(true);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.get('/userInfo', (0, cors_1.default)(), (req, res) => {
    if (req.query !== undefined) {
        if (req.query.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.query.access_token).then((data) => {
                bot.getUserInfo(data.display_name).then((keys) => {
                    res.send(keys);
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                });
            }).catch(error => {
                console.error(error);
                res.send(false);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/userExchangeKeys', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.updateUserExchangeKeys(data.display_name, req.body.exchangeKeys).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/userDiscordInfo', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.updateUserDiscordInfo(data.display_name, req.body.discordInfo).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/userTwitchInfo', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.updateUserTwitchInfo(data.display_name, req.body.twitchInfo).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/start', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.start(data.display_name).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/stop', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.stop(data.display_name).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.post('/userEnabled', (0, cors_1.default)(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.updateUserEnabled(data.display_name, req.body.enabled).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                });
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
const getTwitchUserInfo = (access_token) => {
    return new Promise((resolve, reject) => {
        axios_1.default.get('https://api.twitch.tv/helix/users', { headers: { "Authorization": `Bearer ${access_token}`, "Client-Id": process.env.TWITCH_APP_CLIENT_ID } }).then((response) => {
            resolve(response.data.data[0]);
        }).catch(error => {
            console.error(error);
            reject(error);
        });
    });
};
app.get('/twitchUserInfo', (0, cors_1.default)(), (req, res) => {
    if (req.query !== undefined) {
        if (req.query.access_token === undefined) {
            res.send('missing access_token');
        }
        else {
            getTwitchUserInfo(req.query.access_token).then((data) => {
                res.send(data);
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            });
        }
    }
    else {
        res.send('missing access_token');
    }
});
app.listen(3216, () => {
    console.log("bybit position bot server started on port 3216");
});
//# sourceMappingURL=bot.js.map