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

import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import bodyParser from 'body-parser'
config()


const app = express();
app.use(cors())
app.use(bodyParser.json())
app.use(cors(), express.static(__dirname + '/dist'))

// app.get("/", cors(), (req, res) => {
//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//     console.log(ip);
//     res.sendFile(__dirname, '/dist/index.html');
// })

app.listen(3214, () => {
    console.log("bybit position bot server started on port 3214")
})