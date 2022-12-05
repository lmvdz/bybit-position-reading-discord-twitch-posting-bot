import express from 'express'
import { config } from 'dotenv'
import CryptoPositionsBot from '../CryptoPositionsBot'
import bodyParser from 'body-parser'
import axios from 'axios'
import cors from 'cors'

config()

const bot = new CryptoPositionsBot();

// bot.addUser([{'KEY_ID': '09bd38bb-5317-450a-900b-ac72ee181565', 'API_KEY': 'M4WjFXob7u3jeGgTyg', 'API_SECRET': 'wijY1CoUYf6KJwPNwy5eorTIvIXFNp7pjReC', 'EXCHANGE_ID': 'bybit'}], '1044457746680004728', '#Lmvdzande', true, true, true, 5, true).then((userID) => {
//     if (userID !== null) {
//         bot.enableUser(userID);
//         bot.connectToTwitchChannel(userID);
//     }
// });

bot.addUser([{'KEY_ID': '30ba7142-3c04-4720-9577-8b1c656bb6ab', 'API_KEY': 'Dfv0YiiuJuz7Y5aIp1', 'API_SECRET': '3teMGGWmcARkm5y9ryOehwx6mWqqqQm6J37H', 'EXCHANGE_ID': 'bybit', 'DESCRIPTION': 'Challange Account'}], '1044690741424836732', '#bearkingeth', true, true, true, 5, true).then((userID) => {
    if (userID !== null) {
        bot.enableUser(userID);
        bot.connectToTwitchChannel(userID);
    }
});

bot.startAll();

const app = express();
app.use(cors())
app.use(bodyParser.json())

app.post("/addUser", cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.exchangeKeys === undefined) {
                res.send('missing exchangeKeys')
            } else if (req.body.discord_channel_id === undefined) {
                res.send('missing discord_channel_id')
            } else if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.addUser(req.body.exchangeKeys, req.body.discord_channel_id, (data as any).display_name).then(() => {
                        res.send(true);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
                
            }
        } else {
            res.send('missing exchange_keys, discord_channel_id, access_token')
        }
        
    
    
})

app.post('/removeUser', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.removeUser((data as any).display_name).then(() => {
                        res.send(true);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/enableUser', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.enableUser((data as any).display_name).then(() => {
                        res.send(true);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/disableUser', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.disableUser((data as any).display_name).then(() => {
                        res.send(true);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/connectToTwitchChannel', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.connectToTwitchChannel((data as any).display_name).then((isConnected) => {
                        res.send(isConnected);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})


app.post('/disconnectFromTwitchChannel', cors(), (req, res) => {
    
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token')
        } else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.disconnectFromTwitchChannel((data as any).display_name).then((isDisconnected) => {
                    res.send(isDisconnected);
                }).catch(error => {
                    console.error(error);
                    res.send(false)
                })
            }).catch(error => {
                console.error(error);
                res.send(false);
            })
        }
    } else {
        res.send('missing access_token')
    }

})


app.get('/isConnectedToTwitchChannel', cors(), (req, res) => {
    
    if (req.query !== undefined) {
        if (req.query.access_token === undefined) {
            res.send('missing access_token')
        } else {
            getTwitchUserInfo(req.query.access_token).then((data) => {
                bot.isConnectedToTwitchChannel((data as any).display_name).then((isConnected) => {
                    res.send(isConnected);
                }).catch(error => {
                    console.error(error);
                    res.send(false)
                })
            }).catch(error => {
                console.error(error);
                res.send(false);
            })
        }
    } else {
        res.send('missing access_token')
    }

})

app.get('/userInfo', cors(), (req, res) => {
    
        if (req.query !== undefined) {
            if (req.query.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.query.access_token).then((data) => {
                    bot.getUserInfo((data as any).display_name).then((info) => {
                        res.send(info);
                    }).catch(error => {
                        console.error(error);
                        res.send(false)
                    })
                }).catch(error => {
                    console.error(error);
                    res.send(false);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/trySetupRefLink', cors(), (req, res) => {
    if (req.body !== undefined) {
        if (req.body.access_token === undefined) {
            res.send('missing access_token')
        } else {
            getTwitchUserInfo(req.body.access_token).then((data) => {
                bot.getUserInfo((data as any).display_name).then((info) => {
                    if (req.body.refLink && (info.REF_LINK === null || info.REF_LINK === undefined)) {
                        bot.trySetupRefLink((data as any).display_name, req.body.refLink).then((response) => {
                            res.send(response);
                        }).catch(error => {
                            console.error(error);
                            res.send(false);
                        })
                    }
                }).catch(error => {
                    console.error(error);
                    res.send(false)
                })
            }).catch(error => {
                console.error(error);
                res.send(false);
            })
        }
    } else {
        res.send('missing access_token')
    }
})

app.get('/referrals', cors(), (req, res) => {
    if (req.query !== undefined) {
        if (req.query.access_token === undefined) {
            res.send('missing access_token')
        } else {
            getTwitchUserInfo(req.query.access_token).then((data) => {
                bot.getReferrals((data as any).display_name).then((response) => {
                    res.send(response);
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }).catch(error => {
                console.error(error);
                res.status(500).send(error);
            })
        }
    } else {
        res.send('missing access_token')
    }
})

app.post('/userExchangeKeys', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.updateUserExchangeKeys((data as any).display_name, req.body.exchangeKeys).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/userDiscordInfo', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.updateUserDiscordInfo((data as any).display_name, req.body.discordInfo).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/userTwitchInfo', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.updateUserTwitchInfo((data as any).display_name, req.body.twitchInfo).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/start', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.start((data as any).display_name).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/stop', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.stop((data as any).display_name).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.post('/userEnabled', cors(), (req, res) => {
    
        if (req.body !== undefined) {
            if (req.body.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.body.access_token).then((data) => {
                    bot.updateUserEnabled((data as any).display_name, req.body.enabled).then((response) => {
                        res.send(response);
                    }).catch(error => {
                        console.error(error);
                        res.status(500).send(error);
                    })
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

const getTwitchUserInfo = (access_token: string) => {
    return new Promise((resolve, reject) => {
        axios.get('https://api.twitch.tv/helix/users', { headers: { "Authorization": `Bearer ${access_token}`, "Client-Id": process.env.TWITCH_APP_CLIENT_ID}}).then((response) => {
            resolve(response.data.data[0])
        }).catch(error => {
            console.error(error);
            reject(error)
        })
    })
}

app.get('/twitchUserInfo', cors(), (req, res) => {
    
        if (req.query !== undefined) {
            if (req.query.access_token === undefined) {
                res.send('missing access_token')
            } else {
                getTwitchUserInfo(req.query.access_token).then((data) => {
                    res.send(data)
                }).catch(error => {
                    console.error(error);
                    res.status(500).send(error);
                })
            }
        } else {
            res.send('missing access_token')
        }
    
})

app.listen(3216, () => {
    console.log("bybit position bot server started on port 3216")
})