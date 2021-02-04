
// .listen(8080);
var net = require("net");
// client
// var s = net.Socket({fd :'/tmp/socket5.sock'});
// s.connect();
// s.write('Hello');
// s.end();
client = net.connect({path: '/tmp/socket18.sock'})
.on('connect', ()=>{
    console.log("Connected.");
    // client.write('GET / HTTP/1.0');
// client.write(
// `HTTP/1.1 200 OK 
// Content-Type: text/plain
// Transfer-Encoding: chunked`
// 5\r\n
// Media\r\n`
// );
    client.write(
`POST /test HTTP/1.1
Host: foo.example
Content-Type: application/x-www-form-urlencoded
Content-Length: 27

field1=value1&field2=value2`);
    // client.end();
})
.on('data', function(data) {
    console.log("Data."+data);
})
.on('error', function(data) {
    console.error('Server not active.'); process.exit(1);
})
.on('connect', function(){
    console.log('connected');
    client.write('clinet has connected');
});
// client.emit('connect'); 

// var socket = new net.Socket({fd :'/tmp/socket5.sock'});

//     socket.connect();

//     socket.on('connect', function(){
//         console.log('connected');
//         socket.send('hi!'); 
//     });


//     socket.on('message', function(data){ 
//         console.log('message recived: ' + data);
//     });

//     socket.on('disconnect', function(){
//         console.log('disconected');
//     });

// var net = require("net");

// function createSocket(socket){
//     var s = socket || new net.Socket();
//     s.write("hello!");
// }

// exports.createSocket = createSocket;


//https://nodejs.org/api/net.html#net_net_createserver_options_connectionlistener

//https://stackoverflow.com/questions/7530709/does-node-js-new-socket-create-a-unix-file-socket