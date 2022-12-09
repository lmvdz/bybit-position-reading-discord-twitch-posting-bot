"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const circle_sdk_1 = require("@circle-fin/circle-sdk");
const uuid_1 = require("uuid");
const dotenv_1 = require("dotenv");
const secure_db_1 = __importDefault(require("secure-db"));
const body_parser_1 = __importDefault(require("body-parser"));
(0, dotenv_1.config)();
secure_db_1.default.security(process.env.SECURE_DB);
const payments = new secure_db_1.default.Database('payments');
const circleSandbox = new circle_sdk_1.Circle(process.env.CIRCLE_API_KEY_SANDBOX, circle_sdk_1.CircleEnvironments.sandbox // API base url
);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.post('/:userID/createPaymentIntent', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let idempotencyKey = (0, uuid_1.v4)();
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
        });
        res.send(true);
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.get('/:userID/getDepositAddress/:paymentIntentID', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        if (payment) {
            if (payment.paymentIntent.data.id === req.params.paymentIntentID) {
                let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent(req.params.paymentIntentID);
                payment.paymentIntent.data = paymentIntentRes.data.data;
                payments.set(req.params.userID, payment);
                res.send(paymentIntentRes.data.data.paymentMethods);
            }
            else {
                res.send(null);
            }
        }
        else {
            res.send(null);
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.get("/:userID/getPayment/:paymentID", async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        let paymentIntentRes = await circleSandbox.cryptoPaymentIntents.getPaymentIntent(payment.paymentIntent.data.id);
        payment.paymentIntent.data = paymentIntentRes.data.data;
        payments.set(req.params.userID, payment);
        if (payment.paymentIntent.data.paymentIds.length > 0) {
            if (payment.paymentIntent.data.paymentIds.some(id => id === req.params.paymentID))
                res.send((await circleSandbox.payments.getPayment(req.params.paymentID)).data.data);
            else
                res.send(null);
        }
        else {
            res.send(null);
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.post('/:userID/confirmPayment/:paymentID', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip === '::1') {
        let payment = payments.get(req.params.userID);
        if (payment.paymentIntent.data.paymentIds.some(str => str === req.params.paymentID)) {
            res.send((await circleSandbox.payments.getPayment(req.params.paymentID)).data.data.status === 'paid');
        }
        else {
            res.send(false);
        }
    }
    else {
        res.status(300).send(ip + " Access Denied");
    }
});
app.listen(3215, () => {
    console.log("bybit position bot server started on port 3215");
});
//# sourceMappingURL=payment.js.map