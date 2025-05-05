# bpmux&nbsp;&nbsp;&nbsp;[![Build Status](https://github.com/davedoesdev/bpmux/workflows/ci/badge.svg)](https://github.com/davedoesdev/bpmux/actions) [![Coverage Status](https://coveralls.io/repos/davedoesdev/bpmux/badge.png?branch=master&service=github)](https://coveralls.io/r/davedoesdev/bpmux?branch=master) [![NPM version](https://badge.fury.io/js/bpmux.png)](http://badge.fury.io/js/bpmux)

Node stream multiplexing with back-pressure on each stream.

- Run more than one [`stream.Duplex`](https://nodejs.org/api/stream.html#stream_class_stream_duplex) over a carrier `Duplex`.
- Exerts back-pressure on each multiplexed stream and the underlying carrier stream.
- Each multiplexed stream's back-pressure is handled separately while respecting the carrier's capacity. [This prevents a slow or paused stream affecting other streams](#comparison). This does incur an overhead so if you don't care about this feature you might want to look elsewhere.
- Unit tests with 100% coverage.
- Tested with TCP streams. You'll get better performance if you [disable Nagle](https://nodejs.org/dist/latest-v10.x/docs/api/net.html#net_socket_setnodelay_nodelay).
- Works in the browser!
  - Tested with [Primus](https://github.com/primus/primus) (using [primus-backpressure](https://github.com/davedoesdev/primus-backpressure)).
  - Tested with HTTP/2 streams (using [browser-http2-duplex](https://github.com/davedoesdev/browser-http2-duplex)). Also tested Node-to-Node using `http2`.
  - Browser unit tests using [webpack](http://webpack.github.io/) and [nwjs](http://nwjs.io/).
- **See the [errors](#errors) section for information on why multiplexed streams error when their carrier stream closes before they do.**

The API is described [here](#api).

## Example

Multiplexing multiple streams over a single TCP stream:

```javascript
var net = require('net'),
    crypto = require('crypto'),
    assert = require('assert'),
    BPMux = require('bpmux').BPMux,
    sent = [];

net.createServer(function (c)
{
    var received = [], ended = 0;

    new BPMux(c).on('handshake', function (duplex)
    {
        var accum = '';

        duplex.on('readable', function ()
        {
            var data = this.read();
            if (data)
            {
                accum += data.toString('hex');
            }
        });

        duplex.on('end', function ()
        {
            received.push(accum);

            ended += 1;
            assert(ended <= 10);
            if (ended === 10)
            {
                assert.deepEqual(received.sort(), sent.sort());
            }
        });
    });
}).listen(7000, function ()
{
    var mux = new BPMux(net.createConnection(7000)), i;

    function multiplex(n)
    {
        var data = crypto.randomBytes(n * 100);
        mux.multiplex().end(data);
        sent.push(data.toString('hex'));
    }

    for (i = 1; i <= 10; i += 1)
    {
        multiplex(i);
    }
});
```

## Another Example

Multiple return pipes to the browser, multiplexed over a single Primus connection:

```javascript
var PrimusDuplex = require('primus-backpressure').PrimusDuplex,
    BPMux = require('bpmux').BPMux,
    http = require('http'),
    path = require('path'),
    crypto = require('crypto'),
    stream = require('stream'),
    assert = require('assert'),
    finalhandler = require('finalhandler'),
    serve_static = require('serve-static'),
    Primus = require('primus'),
    serve = serve_static(__dirname);

http.createServer(function (req, res)
{
    serve(req, res, finalhandler(req, res));
}).listen(7500, function ()
{
    var primus = new Primus(this);

    primus.on('connection', function (spark)
    {
        var mux = new BPMux(new PrimusDuplex(spark)), ended = 0, i;

        function multiplex(n)
        {
            var buf = crypto.randomBytes(10 * 1024),
                buf_stream = new stream.PassThrough(),
                bufs = [],
                duplex = mux.multiplex({ handshake_data: Buffer.from([n]) });

            buf_stream.end(buf);
            buf_stream.pipe(duplex);

            duplex.on('readable', function ()
            {
                var data;

                while (true)
                {
                    data = this.read();
                    if (data === null)
                    {
                        break;
                    }
                    bufs.push(data);
                }
            });

            duplex.on('end', function ()
            {
                console.log('end', n);
                ended += 1;
                assert(ended <= 10);
                assert.deepEqual(Buffer.concat(bufs), buf);
            });
        }

        for (i = 0; i < 10; i += 1)
        {
            multiplex(i);
        }
    });
    
    console.log('Point your browser to http://localhost:7500/loader.html');
});
```

The HTML (`loader.html`) for the browser-side of this example:

```html
<html>
  <head>
    <title>BPMux Test Runner</title>
    <script type="text/javascript" src="/primus/primus.js"></script>
    <script type="text/javascript" src="bundle.js"></script>
    <script type="text/javascript" src="loader.js"></script>
  </head>
  <body onload='doit()'>
  </body>
</html>
```

The browser-side code (`loader.js`):

```javascript
function doit()
{
    var mux = new BPMux(new PrimusDuplex(new Primus({ strategy: false })));

    mux.on('handshake', function (duplex, handshake_data)
    {
        console.log("handshake", handshake_data[0]);
        duplex.pipe(duplex);

        duplex.on('end', function ()
        {
            console.log('end', handshake_data[0]);
        });
    });
}
```

The browser-side dependencies (`bundle.js`) can be produced by webpack from:

```javascript
PrimusDuplex = require('primus-backpressure').PrimusDuplex;
BPMux = require('bpmux').BPMux;
```

## Comparison

### [multiplex](https://github.com/maxogden/multiplex) library

Multiplexing libraries which don't exert backpressure on individual streams
suffer from starvation. A stream which doesn't read its data stops other streams
on the multiplex getting their data.

Here's a test using the [multiplex](https://github.com/maxogden/multiplex)
library:

```javascript
// Uses https://github.com/maxogden/multiplex (npm install multiplex)
// Backpressure is exerted across the multiplex as a whole, not individual streams.
// This means a stream which doesn't read its data starves the other streams.

const fs = require('fs');
const net = require('net');
const multiplex = require('multiplex');

require('net').createServer(c => {
    c.pipe(multiplex((stream, id) => {
        stream.on('data', function(d) {
            console.log('data', id, d.length);
            if (id === '0') {
                this.pause();
            }
        });
    }));
}).listen(7000, () => {
    const plex = multiplex();
    plex.pipe(net.createConnection(7000));

    const stream1 = plex.createStream();
    const stream2 = plex.createStream();

    fs.createReadStream('/dev/urandom').pipe(stream1);
    fs.createReadStream('/dev/urandom').pipe(stream2);
});
```

When the first stream is paused, backpressure is applied to the second stream
too, even though it hasn't been paused. If you run this example, you'll see:

```bash
$ node multiplex.js 
data 0 65536
data 1 65536
```

bpmux doesn't suffer from this problem since backpressure is exerted on each
stream separately. Here's the same test:

```javascript
// BPMux exerts backpressure on individual streams so a stream which doesn't
// read its data doesn't starve the other streams.

const fs = require('fs');
const net = require('net');
const { BPMux } = require('bpmux');

require('net').createServer(c => {
    new BPMux(c).on('handshake', stream => {
        stream.on('data', function (d) {
            console.log('data', stream._chan, d.length);
            if (stream._chan === 0) {
                this.pause();
            }
        });
    });
}).listen(7000, () => {
    const mux = new BPMux(net.createConnection(7000));

    const stream1 = mux.multiplex();
    const stream2 = mux.multiplex();

    fs.createReadStream('/dev/urandom').pipe(stream1);
    fs.createReadStream('/dev/urandom').pipe(stream2);
});
```

The second stream continues to receive data when the first stream is paused:

```bash
data 0 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
data 1 16384
...
```

### HTTP/2 sessions

[HTTP/2 sessions](https://nodejs.org/dist/latest-v16.x/docs/api/http2.html#class-http2session)
do exert backpressure on individual streams, as this test shows:

```javascript
const fs = require('fs');
const http2 = require('http2');

const server = http2.createServer();
server.on('stream', (stream, headers) => {
    stream.on('data', function (d) {
        console.log('data', headers[':path'], d.length);
        if (headers[':path'] === '/stream1') {
            this.pause();
        }
    });
});
server.listen(8000);

const client = http2.connect('http://localhost:8000');

const stream1 = client.request({ ':path': '/stream1' }, { endStream: false });
const stream2 = client.request({ ':path': '/stream2' }, { endStream: false });

fs.createReadStream('/dev/urandom').pipe(stream1);
fs.createReadStream('/dev/urandom').pipe(stream2);
```

```
data /stream1 16384
data /stream2 16384
data /stream2 16348
data /stream2 35
data /stream2 16384
data /stream2 16384
data /stream2 1
data /stream2 16384
data /stream2 16366
data /stream2 18
data /stream2 16384
data /stream2 16382
data /stream2 2
data /stream2 16384
...
```

If you pass a pair of sessions (one client, one server) to [`BPMux()`](#bpmuxcarrier-options),
they will be used for multiplexing streams, with no additional overhead. This is useful if
you want to use the bpmux API.

## Errors

bpmux will emit `error` events on multiplexed streams if their underlying
(carrier) stream closes before they have closed. The error object will have one
of the following messages:

```
carrier stream finished before duplex finished
carrier stream ended before end message received
```

and have a property `carrier_done` set to `true`.

As this is an `error` event, you must register an event listener on multiplexed
streams [if you don't want the Node process to exit](https://nodejs.org/dist/latest-v13.x/docs/api/events.html#events_error_events).

The reasoning behind emitting `error` events on open multiplexed streams when
their carrier closes is:

- If you're reading from a stream and it hasn't ended before the carrier closes then there may be some data that you'll never receive. This is an error state.

- If you're writing to a stream and it hasn't finished before the carrier closes then your application should be informed about it straight away. If it's performing some heavy calculation, for example, then it has a chance to cancel it before writing the result to the stream.

If you do register `error` event listeners, make sure you do so for streams
you multiplex using [`multiplex()`](#bpmuxprototypemultiplexoptions) _and_
for streams you receive using the [`handshake`](#bpmuxeventshandshakeduplex-handshake_data-delay_handshake) or [`peer_multiplex`](#bpmuxeventspeer_multiplexduplex) events.

`BPMux` objects will also re-emit any `error` events their carrier stream emits.

## Installation

```shell
npm install bpmux
```

## Licence

[MIT](LICENCE)

## Test

Over TCP (long test):

```shell
grunt test
```

Over TCP (quick test):

```shell
grunt test-fast
```

Over Primus (using nwjs to run browser- and server-side):

```shell
grunt test-browser
```

The examples at the top of this page:

```shell
grunt test-examples
```

## Code Coverage

```shell
grunt coverage
```

[c8](https://github.com/bcoe/c8) results are available [here](http://rawgit.davedoesdev.com/davedoesdev/bpmux/master/coverage/lcov-report/index.html).

Coveralls page is [here](https://coveralls.io/r/davedoesdev/bpmux).

## Lint

```shell
grunt lint
```

# API

<a name="tableofcontents"></a>

- <a name="toc_new-http2sessionsclient-server"></a>[new Http2Sessions](#new-http2sessionsclient-server)
- <a name="toc_bpmuxcarrier-options"></a>[BPMux](#bpmuxcarrier-options)
- <a name="toc_bpmuxprototypemultiplexoptions"></a><a name="toc_bpmuxprototype"></a>[BPMux.prototype.multiplex](#bpmuxprototypemultiplexoptions)
- <a name="toc_bpmuxeventspeer_multiplexduplex"></a><a name="toc_bpmuxevents"></a>[BPMux.events.peer_multiplex](#bpmuxeventspeer_multiplexduplex)
- <a name="toc_bpmuxeventshandshakeduplex-handshake_data-delay_handshake"></a>[BPMux.events.handshake](#bpmuxeventshandshakeduplex-handshake_data-delay_handshake)
- <a name="toc_bpmuxeventshandshake_sentduplex-complete"></a>[BPMux.events.handshake_sent](#bpmuxeventshandshake_sentduplex-complete)
- <a name="toc_bpmuxeventsdrain"></a>[BPMux.events.drain](#bpmuxeventsdrain)
- <a name="toc_bpmuxeventsend"></a>[BPMux.events.end](#bpmuxeventsend)
- <a name="toc_bpmuxeventsfinish"></a>[BPMux.events.finish](#bpmuxeventsfinish)
- <a name="toc_bpmuxeventsfull"></a>[BPMux.events.full](#bpmuxeventsfull)
- <a name="toc_bpmuxeventsremovedduplex"></a>[BPMux.events.removed](#bpmuxeventsremovedduplex)
- <a name="toc_bpmuxeventskeep_alive"></a>[BPMux.events.keep_alive](#bpmuxeventskeep_alive)

## new Http2Sessions(client, server)

> Class for holding a pair of HTTP/2 sessions.

Pass this to [BPMux()](#bpmuxcarrier-options) and it will use the sessions'
existing support for multiplexing streams. Both [client](https://nodejs.org/dist/latest-v16.x/docs/api/http2.html#class-clienthttp2session) and [server](https://nodejs.org/dist/latest-v16.x/docs/api/http2.html#class-serverhttp2session) sessions
are required because HTTP/2 push streams are unidirectional.

**Parameters:**

- `{ClientHttp2Session} client` Client session
- `{ServerHttp2Session} server` Server session

<sub>Go: [TOC](#tableofcontents)</sub>

## BPMux(carrier, [options])

> Constructor for a `BPMux` object which multiplexes more than one [`stream.Duplex`](https://nodejs.org/api/stream.html#stream_class_stream_duplex) over a carrier `Duplex`.

**Parameters:**

- `{Duplex | Http2Sessions} carrier` The `Duplex` stream over which other `Duplex` streams will be multiplexed.
- `{Object} [options]` Configuration options. This is passed down to [`frame-stream`](https://github.com/davedoesdev/frame-stream). It also supports the following additional properties:
  - `{Object} [peer_multiplex_options]` When your `BPMux` object detects a new multiplexed stream from the peer on the carrier, it creates a new `Duplex` and emits a [`peer_multiplex`](#bpmuxeventspeer_multiplexduplex) event. When it creates the `Duplex`, it uses `peer_multiplex_options` to configure it with the following options:

    - `{Integer} [max_write_size]` Maximum number of bytes to write to the `Duplex` at once, regardless of how many bytes the peer is free to receive. Defaults to 0 (no limit).

    - `{Boolean} [check_read_overflow]` Whether to check if more data than expected is being received. If `true` and the `Duplex`'s high-water mark for reading is exceeded then the `Duplex` emits an `error` event. This should not normally occur unless you add data yourself using [`readable.unshift`](http://nodejs.org/api/stream.html#stream_readable_unshift_chunk) &mdash; in which case you should set `check_read_overflow` to `false`. Defaults to `true`.

  - `{Function} [parse_handshake_data(handshake_data)]` When a new stream is multiplexed, the `BPMux` objects at each end of the carrier exchange a handshake message. You can supply application-specific handshake data to add to the handshake message (see [`BPMux.prototype.multiplex`](#bpmuxprototypemultiplexoptions) and [`BPMux.events.handshake`](#bpmuxeventshandshakeduplex-handshake_data-delay_handshake)). By default, when handshake data from the peer is received, it's passed to your application as a raw [`Buffer`](https://nodejs.org/api/buffer.html#buffer_buffer). Use `parse_handshake_data` to specify a custom parser. It will receive the `Buffer` as an argument and should return a value which makes sense to your application.

  - `{Boolean} [coalesce_writes]` Whether to batch together writes to the carrier. When the carrier indicates it's ready to receive data, its spare capacity is shared equally between the multiplexed streams. By default, the data from each stream is written separately to the carrier. Specify `true` to write all the data to the carrier in a single write. Depending on the carrier, this can be more performant.

  - `{Boolean} [high_channels]` `BPMux` assigns unique channel numbers to multiplexed streams. By default, it assigns numbers in the range [0..2^31). If your application can synchronise the two `BPMux` instances on each end of the carrier stream so they never call [`multiplex`](https://github.com/davedoesdev/bpmux#bpmuxprototypemultiplexoptions) at the same time then you don't need to worry about channel number clashes. For example, one side of the carrier could always call [`multiplex`](https://github.com/davedoesdev/bpmux#bpmuxprototypemultiplexoptions) and the other listen for [`handshake`](https://github.com/davedoesdev/bpmux#bpmuxeventshandshakeduplex-handshake_data-delay_handshake) events. Or they could take it in turns. If you can't synchronise both sides of the carrier, you can get one side to use a different range by specifying `high_channels` as `true`. The `BPMux` with `high_channels` set to `true` will assign channel numbers in the range [2^31..2^32).

  - `{Integer} [max_open]` Maximum number of multiplexed streams that can be open at a time. Defaults to 0 (no maximum).

  - `{Integer} [max_header_size]` `BPMux` adds a control header to each message it sends, which the receiver reads into memory. The header is of variable length &mdash; for example, handshake messages contain handshake data which can be supplied by the application. `max_header_size` is the maximum number of header bytes to read into memory. If a larger header is received, `BPMux` emits an `error` event. Defaults to 0 (no limit).

  - `{Integer|false}` `keep_alive` Send a single byte keep-alive message every N milliseconds. Defaults to 30000 (30 seconds). Pass `false` to disable.

<sub>Go: [TOC](#tableofcontents)</sub>

<a name="bpmuxprototype"></a>

## BPMux.prototype.multiplex([options])

> Multiplex a new `stream.Duplex` over the carrier.

**Parameters:**

- `{Object} [options]` Configuration options:
  - `{Buffer} [handshake_data]` Application-specific handshake data to send to the peer. When a new stream is multiplexed, the `BPMux` objects at each end of the carrier exchange a handshake message. You can optionally supply handshake data to add to the handshake message here. The peer application will receive this when its `BPMux` object emits a [`handshake`](#bpmuxeventshandshakeduplex-handshake_data-delay_handshake) event. Defaults to a zero-length `Buffer`.

  - `{Integer} [max_write_size]` Maximum number of bytes to write to the `Duplex` at once, regardless of how many bytes the peer is free to receive. Defaults to 0 (no limit).

  - `{Boolean} [check_read_overflow]` Whether to check if more data than expected is being received. If `true` and the `Duplex`'s high-water mark for reading is exceeded then the `Duplex` emits an `error` event. This should not normally occur unless you add data yourself using [`readable.unshift`](http://nodejs.org/api/stream.html#stream_readable_unshift_chunk) &mdash; in which case you should set `check_read_overflow` to `false`. Defaults to `true`.

  - `{Integer} [channel]` Unique number for the new stream. `BPMux` identifies each multiplexed stream by giving it a unique number, which it allocates automatically. If you want to do the allocation yourself, specify a channel number here. It's very unlikely you'll need to do this but the option is there. `Duplex` objects managed by `BPMux` expose a `get_channel` method to retrieve their channel number. Defaults to automatic allocation.

**Return:**

`{Duplex}` The new `Duplex` which is multiplexed over the carrier. This supports back-pressure using the stream [`readable`](https://nodejs.org/dist/latest-v4.x/docs/api/stream.html#stream_event_readable) event and [`write`](https://nodejs.org/dist/latest-v4.x/docs/api/stream.html#stream_writable_write_chunk_encoding_callback) method.

**Throws:**

- `{Error}` If there are no channel numbers left to allocate to the new stream, the maximum number of open multiplexed streams would be exceeded or the carrier has finished or ended.

<sub>Go: [TOC](#tableofcontents) | [BPMux.prototype](#toc_bpmuxprototype)</sub>

<a name="bpmuxevents"></a>

## BPMux.events.peer_multiplex(duplex)

> `peer_multiplex` event

A `BPMux` object emits a `peer_multiplex` event when it detects a new multiplexed stream from its peer on the carrier stream.

**Parameters:**

- `{Duplex} duplex` The new stream.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.handshake(duplex, handshake_data, [delay_handshake])

> `handshake` event

A `BPMux` object emits a `handshake` event when it receives a handshake message from its peer on the carrier stream. This can happen in two cases: 

1. The `BPMux` object is processing a handshake message for a new multiplexed stream the peer created and it hasn't seen before. Note the `handshake` event is emitted after the [`peer_multiplex`](#bpmuxeventspeer_multiplexduplex) event.
2. Your application previously called [`multiplex`](#bpmuxprototypemultiplexoptions) on its `BPMux` object to multiplex a new stream over the carrier and now the peer has replied with a handshake message.

**Parameters:**

- `{Duplex} duplex` The multiplexed stream for which a handshake message has been received. **Please note that a `handshake` event is also emitted on `duplex` immediately after `BPMux`'s `handshake` event finishes processing**. `duplex`'s `handshake` event is passed the same `handshake_data` and `delay_handshake` parameters decribed below.
- `{Object} handshake_data` Application-specific data which the peer sent along with the handshake message. If you specified a `parse_handshake_data` function in the `BPMux` [constructor](#bpmuxcarrrier-options) then `handshake_data` will be the return value from calling that function.
- `{Function} [delay_handshake]` This parameter will be `null` in case 2 (your application previously created `duplex`). Otherwise (case 1), this parameter will be a function. By default, the `BPMux` object replies to the peer's handshake message as soon as your event handler returns and doesn't attach any application-specific handshake data. If you wish to delay the handshake message or provide handshake data, call `delay_handshake`. It returns another function which you can call at any time to send the handshake message. The returned function takes a single argument:


   - `{Buffer} [handshake_data]` Application-specific handshake data to attach to the handshake message sent to the peer. Defaults to a zero-length `Buffer`.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.handshake_sent(duplex, complete)

> `handshake_sent` event

A `BPMux` object emits a `handshake_sent` event after it sends a handshake message to its peer on the carrier stream.

**Parameters:**

- `{Duplex} duplex` The multiplexed stream for which a handshake has been sent. **Please note that a `handshake_sent` event is also emitted on `duplex` immediately after `BPMux`'s `handshake` event finishes processing**. `duplex`'s `handshake_sent` event is passed the same `complete` parameter described below.
- `{Boolean} complete` Whether the handshake message was completely sent (`true`) or the carrier stream buffered it (`false`). You can use this to apply back-pressure to stream multiplexing. For example, if `complete` is `false` then you could avoid calling [`multiplex`](https://github.com/davedoesdev/bpmux#bpmuxprototypemultiplexoptions) until a [`drain`](#bpmuxeventsdrain) event is emitted.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.drain()

> `drain` event

A `BPMux` object emits a `drain` event when its carrier stream emits a
[`drain`](https://nodejs.org/dist/latest-v4.x/docs/api/stream.html#stream_event_drain) event.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.end()

> `end` event

A `BPMux` object emits a `end` event after the carrier stream ends (will receive
no more data).

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.finish()

> `finish` event

A `BPMux` object emits a `finish` event after the carrier stream finishes (won't
write any more data).

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.full()

> `full` event

A `BPMux` object emits a `full` event when it wants to add a new multiplexed stream on the carrier stream but the number of multiplexed streams is at its maximum. It will remain at maximum until a [`removed`](#bpmuxeventsremovedduplex) event is emitted.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.removed(duplex)

> `removed` event

A `BPMux` object emits a `removed` event when a multiplexed stream has closed
(finished and ended) and been removed from the list of multiplexed streams.

**Parameters:**

- `{Duplex} duplex` The stream which has closed.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

## BPMux.events.keep_alive()

> `keep_alive` event

A `BPMux` object emits a `keep_alive` event when it receives a keep-alive
message from its peer.

<sub>Go: [TOC](#tableofcontents) | [BPMux.events](#toc_bpmuxevents)</sub>

_&mdash;generated by [apidox](https://github.com/codeactual/apidox)&mdash;_
