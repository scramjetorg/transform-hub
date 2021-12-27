# Scramjet Transform Hub Verser Module <!-- omit in toc -->

This package provides a reverse server functionality.

```bash
npm install @scramjet/verser
```

The module is designed to forward incoming requests to the public HTTP server to the connected, inaccessible from the outside HTTP server.

This module consists of two main parts - Verser and VerserClient.

The Verser class is responsible for listening to incoming connections from VerserClients, maintaining these connections and transferring to them data coming from external sources (e.g. HTTP server requests)
It also allows the creation of identifiable communication channels carrying any data.

The VerserClient class provides methods for connecting to a Verser instance and handling traversing streams in that connection.

# example usage

## Verser
accessible by ip

```
const exposedServer = http.createServer()
const verser = new Verser(server);

exposedServer.listen(80);

let vc;

verser.on("connect", async (verserConnection: VerserConnection) => {
    vc = verserConnection;
    vc.respond(200);
});

exposedServer.on("request", (req, res) => {
    if (vc) {
        vc.forward(req, res);
    }
})

```

## VerserClient
inaccessible by ip

```
const localServer = http.createServer();
    server.on("request", (req, res) => {
        res.end("Hello World!");
    });

localServer.listen(8888);

verserClient = new VerserClient({
    remotePort: 80
    remoteHost: machine-with-ip
    headers: {},
    localServer
});

await verserClient.connect();
```

In the example above, the VerserClient connects to the Verser instance on the machine with the ip address.
All request to `exposedServer` will be forwarded by Verser to the `localServer`. Responses for these requests will be forwarded by VerserClient to the `exposedServer`.










