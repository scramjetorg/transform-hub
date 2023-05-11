import { Agent } from "http";
import { Socket, createConnection, createServer } from "net";
import { PassThrough } from "stream";

const instance = new PassThrough({ highWaterMark: 0 })
    .on("pause", () => console.log("Pause a"))
    .on("resume", () => console.log("Resume a"))
    .on("drain", () => console.log("Drain a"));

const instancesServerPort = 8000;
const instanceServerHost = "";

const socketServer = createServer();

socketServer.listen(instancesServerPort, instanceServerHost);

const socket = createConnection(instancesServerPort, instanceServerHost);

await new Promise<void>(res => { socket.on("connect", () => res()); });

// const agent = new Agent();

// socketServer.on("connection", (socket: Socket) => {

// });

const upstream = new PassThrough({ highWaterMark: 10 })
    .on("pause", () => console.log("Pause d"))
    .on("resume", () => console.log("Resume D"))
    .on("drain", () => console.log("Drain D"));
