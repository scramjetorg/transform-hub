#!/usr/bin/env node

import { createServer } from "@scramjet/api-server";
import { Host } from "../lib/host";

import { SocketServer } from "../lib/socket-server";

const apiServerConfig = {};
const apiServer = createServer(apiServerConfig);
const tcpServer = new SocketServer("./socket-server-path");
//
const host = new Host(apiServer, tcpServer);

host.main();
