import express from 'express'
import cors from 'cors'
import { Circle, CircleEnvironments, PaymentIntent, GetPaymentResponseData, CryptoPayment } from "@circle-fin/circle-sdk";
import { v4 as uuidv4 } from 'uuid'
import { config } from 'dotenv'
import db from 'secure-db'
import bodyParser from 'body-parser'
config()

db.security(process.env.SECURE_DB)
const payments = new db.Database('payments')

const circleSandbox = new Circle(
    process.env.CIRCLE_API_KEY_SANDBOX,
    CircleEnvironments.sandbox // API base url
);

const app = express();
app.use(cors())
app.use(bodyParser.json())
app.post('/:userID/createPaymentIntent', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let idempotencyKey = uuidv4();
        let paymentIntent = await circleSandbox.cryptoPaymentIntents.createPaymentIntent({
            idempotencyKey: idempotencyKey,
            amount: {
                amount: "14.99",
                currency: "USD"
            },
            settlementCurrency: "USD",
            paymentMethods: [
                {
                    chain: "ETH",
                    type: "blockchain"
                },
                {
                    chain: "SOL",
                    type: "blockchain"
                },
                {
                    chain: "TRX",
                    type: "blockchain"
                },
                {
                    chain: "MATIC",
                    type: "blockchain"
                },
                {
                    chain: "ALGO",
                    type: "blockchain"
                },
                {
                    chain: "AVAX",
                    type: "blockchain"
                },
                {
                    chain: "BTC",
                    type: "blockchain"
                },
                {
                    chain: "XLM",
                    type: "blockchain"
                }
            ]
        });

        payments.set(req.params.userID, {
            paymentIntent: {
                idempotencyKey: idempotencyKey,
                data: paymentIntent.data.data
            }
        })

        res.send(true)
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.get('/:userID/getDepositAddress/:paymentIntentID', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        if (payment) {
            if ((payment.paymentIntent.data as PaymentIntent).id === req.params.paymentIntentID) {
                let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent(req.params.paymentIntentID)
                payment.paymentIntent.data = paymentIntentRes.data.data;
                payments.set(req.params.userID, payment)
                res.send(paymentIntentRes.data.data.paymentMethods)
            } else {
                res.send(null)
            }
        } else {
            res.send(null)
        }
        
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.get("/:userID/getPayment/:paymentID", async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent((payment.paymentIntent.data as PaymentIntent).id)
        payment.paymentIntent.data = paymentIntentRes.data.data;
        payments.set(req.params.userID, payment)
        
        if ((payment.paymentIntent.data as PaymentIntent).paymentIds.length > 0) {
            if ((payment.paymentIntent.data as PaymentIntent).paymentIds.some(id => id === req.params.paymentID))
                res.send((await circleSandbox.payments.getPayment(req.params.paymentID)).data.data)
            else
                res.send(null)
        } else {
            res.send(null)
        }
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.post('/:userID/confirmPayment/:paymentID', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        if ((payment.paymentIntent.data as PaymentIntent).paymentIds.some(str => str === req.params.paymentID)) {
            res.send(((await circleSandbox.payments.getPayment(req.params.paymentID)).data.data as CryptoPayment).status === 'paid');
        } else {
            res.send(false);
        }
        
    } else {
        res.status(300).send(ip +  " Access Denied")
    }
})

app.listen(3215, () => {
    console.log("bybit position bot server started on port 3215")
})
