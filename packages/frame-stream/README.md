# frame-stream

Length-prefixed message framing for Node.js streams.

[![NPM][npm]](https://npmjs.com/package/frame-stream) [![CI status][ci]](https://github.com/davedoesdev/frame-stream/actions)

Some protocols, e.g. TCP, do not not guarantee to keep message boundaries. One common approach to distinguish such messages is *Length Prefixing*, which prepends each message with its length. `frame-stream` accepts a stream with such length-prefixed messages and returns each frame on its own.

## Usage

Simply pipe an incoming (e.g. TCP) stream into `require('frame-stream').decode()` and pipe `require('frame-stream').encode()` into an outgoing stream:

```js
var net = require('net')
var frame = require('frame-stream')
var port = 30000

net.createServer(function(socket) {
  socket.pipe(frame.decode()).on('data', function(buf) {
    console.log(buf.toString())
  })
}).listen(port, function() {
  net.connect(port, function() {
    var encode = frame.encode()
    encode.pipe(this)
    encode.write('hello world')
    encode.end('cheerio!')
  })
})
```

## API

```js
var frame = require('frame-stream')
```

### frame.decode(opts)

This is an alias for `new frame.Decoder(opts)`. The following options are available:

- **lengthSize** (default: 4) - The length in bytes of the prepended message size.
- **getLength** - The function used to read the prepended message size. This function defaults to `readInt8()`, `readInt16BE()` or `readInt32BE()` according to the `lengthSize`.
- **maxSize** (default: 0) - The maximum allowed message size. This can be used to prevent denial-of-service attacks (`0` = turned off).
- **unbuffered** (default: `false`) - Return parts of a message as they arrive, rather than buffering them up until the last part arrives. Useful when you know messages will be large. Each part will be a `Buffer` with the following extra properties:
  - **framePos** - The index in the message where this part starts. Parts will be returned in order.
  - **frameLength** - The total message size.
  - **frameEnd** - A boolean indicating whether this is the last part of the message.

### frame.encode(opts)

This is an alias for `new frame.Encoder(opts)`. It prepends each chunk/message with its length. The following options are available:

- **lengthSize** (default: 4) - The length in bytes of the prepended message size.
- **setLength** - The function used to write the prepended message size. This function defaults to `writeInt8()`, `writeInt16BE()` or `writeInt32BE()` according to the `lengthSize`.

## MIT License

Copyright (c) 2014-2015 Markus Ast  
Copyright (c) 2020 David Halls

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm]: http://img.shields.io/npm/v/frame-stream.svg?style=flat-square
[ci]: https://github.com/davedoesdev/frame-stream/actions/workflows/ci.yml/badge.svg
