import express from 'express'
import cors from 'cors'
import { Circle, CircleEnvironments, PaymentIntent, GetPaymentResponseData } from "@circle-fin/circle-sdk";
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
    console.log(ip);
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
})

app.get('/:userID/getDepositAddress', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(ip);
    let payment = payments.get(req.params.userID);
    let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent((payment.paymentIntent.data as PaymentIntent).id)
    payment.paymentIntent.data = paymentIntentRes.data.data;
    payments.set(req.params.userID, payment)

    res.send(paymentIntentRes.data.data.paymentMethods)
})

app.get("/:userID/getPayment", async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(ip);

    let payment = payments.get(req.params.userID);
    let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent((payment.paymentIntent.data as PaymentIntent).id)
    payment.paymentIntent.data = paymentIntentRes.data.data;
    payments.set(req.params.userID, payment)
    
    if ((payment.paymentIntent.data as PaymentIntent).paymentIds.length > 0) {
        res.send(await Promise.allSettled<GetPaymentResponseData>((payment.paymentIntent.data as PaymentIntent).paymentIds.map(async (paymentID: string) : Promise<GetPaymentResponseData> => {
            return (await circleSandbox.payments.getPayment(paymentID)).data.data
        })))
    } else {
        res.send([])
    }
})

app.listen(3215, () => {
    console.log("bybit position bot server started on port 3215")
})
