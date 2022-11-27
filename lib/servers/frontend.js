"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const body_parser_1 = __importDefault(require("body-parser"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)(), express_1.default.static(__dirname + '/dist'));
// app.get("/", cors(), (req, res) => {
//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//     console.log(ip);
//     res.sendFile(__dirname, '/dist/index.html');
// })
app.listen(3214, () => {
    console.log("bybit position bot server started on port 3214");
});
//# sourceMappingURL=frontend.js.map