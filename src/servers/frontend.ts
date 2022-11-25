import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import bodyParser from 'body-parser'
config()


const app = express();
app.use(cors())
app.use(bodyParser.json())
app.use(express.static(__dirname + '/dist'))

// app.get("/", cors(), (req, res) => {
//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//     console.log(ip);
//     res.sendFile(__dirname, '/dist/index.html');
// })

app.listen(3214, () => {
    console.log("bybit position bot server started on port 3214")
})