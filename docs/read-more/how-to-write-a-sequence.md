
Sequence is a program that produces, consumes or transforms data. It’s a function or an array of functions. They typically look somewhat like this:

```ts
/** The function parameters are
* input stream
* ...params passed to instance on start
*/
export default function(input, param1, param2) {
    const out = new PassThrough()

    input.on('data', (data) => {
        out.write('Hello ' + data.toString())
    })

    input.on('end', () => {
        this.logger.debug('Input stream ended')
    })

    // it returns an output stream
    return out
}
```

## Producing data (output stream)
To stream data from a sequence we need it to return values over time. Some constructs in JavaScript that enable that are NodeJS streams, Generators and Iterables. Whatever you return from your sequence will be your ***output*** stream. We can choose whatever the solution is right for us. Here are some examples of a sequence producing a stream of integers every second.  
Using a stream:
```ts
export default function() {
    const out = new PassThrough()

    let i = 0
    setInterval(() => {
        out.write(i++)
    }, 1000)

    return out
}
```
Using an async generator:
```ts
export default async function*() {
    let i = 0
    while(true) {
        await sleep(1000)
        yield i++
    }
}


```
### Typescript
Sequences that only produce data should be typed as [ReadableApp](https://hub.scramjet.org/docs/types/modules#readableapp).  
[Here's an example](https://github.com/scramjetorg/scramjet-cloud-docs/blob/main/samples/scraping/app.ts).

### Reading from output stream
You could read this stream using our CLI, REST API, or API Clients.

## Consuming data (input stream)
Reading data from a sequence is easy as the input stream conforms to the Readable protocol from NodeJS. There’s a bunch of ways that allow you to read data from streams. Here are some examples of a sequence that reads a stream of weather data objects and saves them to DB.  
Using stream events:

```ts
export default function(input) {
    input.on('data', (data) => {
        saveWeatherData(data.time, data.temperature)
    })
}
```
Using a for loop:
```ts
export default async function*(input) {
    for await (const data of input) {
        saveWeatherData(data.time, data.temperature)
    }
}
```
### Input stream encoding
Note that input stream is special in a way it already encodes your stream using a specified contentType.
In this case if you wanted to send the stream using our CLI it would look like this:
```bash
si inst input <instance-id> --content-type "application/x-ndjson"
```
Then you can send it JSON strings separated by newline characters.  

### Typescript
Sequences that only consumes data should be typed as [WritableApp](https://hub.scramjet.org/docs/types/modules#writableapp).

### Writing to input stream

You can write to instance input stream using our CLI or API.

## Transforming data
Transforming data is really a combination of consuming and producing, usually with some logic in between. Let’s filter the incoming input stream of numbers to include only the even ones. 

Using streams:
```ts
export default function(input) {
    const out = new PassThrough()

    input.on('data', (num) => {
        if(num % 2 === 0) {
            out.write(num)
        }
    })

    return out
}
```
```ts
export default async function*(input) {
    for await (const num of input) {
        if(num % 2 === 0) {
            yield num
        }
    }
}
```
### Typescript
Sequences that transform data should be typed as [TransformApp](https://hub.scramjet.org/docs/types/modules#transformapp).  
[Here's an example](https://github.com/scramjetorg/scramjet-cloud-docs/blob/main/samples/transform-string-stream/src/index.ts).

## Sending data between sequences (topics)
Sometimes you need a bunch of sequences to talk to each other. Topics are the solution. It’s a PubSub system that allows for many writing and reading instances to exchange data. 
Topics are either attached to the input stream or routed from the output stream.
### Writing to a topic 
To have your output stream routed to a topic, it needs to have a property `topic` with a topic name and `contentType` for proper consumer encoding. 
```ts
export default function() {
    const out = new PassThrough()

    temparatureSensor.on('update', (data) => {
        out.write(data)
    })

    out.topic = 'temperature-readouts'
    out.contentType = 'text/plain'

    return out
}
```
### Reading from a topic 
To send topic as input stream we specify a topic config object with two properites: `requires` - with a name of topic, and `contentType` for ensuring proper encoding.
```ts
const CRITICAL_TEMP_CELCIUS = 40

const app = [
    {
        requires: 'temperature-readouts',
        contentType: 'text/plain'
    },
    async function* (input) {
        for await (const data of input) {
            if(+data > CRITICAL_TEMP_CELCIUS) {
                this.logger.trace('Temparature exceeded critical level')
            }
        } 
    }
]

export default app
```
### Typescript
Writing to a topic requires specifying two additional properties that might not be present on your output stream. You can extend the type of your output stream by [HasTopicInformation](https://hub.scramjet.org/docs/types/modules#hastopicinformation) type.  
Reading from a topic would require you to type your app as a tuple similar to this example:
```ts
const app: [{requires: string, contentType: string}, ReadableApp] = [
    { requires: 'hello', contentType: 'text/plain' },
    function(input) { ... }
]
```

### Interacting with topics
Apart from sequences communicating between each other you can also feed/consume a topic using our CLI or API. 

## Standard streams (stdin/stdout/stderr)
Every sequence has access to standard streams of a program. You can read data from stdin. Send additional information to stdout and to stderr. These are separate from input/output streams.

```ts
export default function() {
    process.stdin.on('data', (dataBuf) => {
        process.stdout.write('Echo: ' + dataBuf.toString('utf-8'))
    })

    process.stdin.on('error', (err) => {
        process.stderr.write('Error: ' + err)
    })
}
```

These streams are also accessible through CLI or API.
## Debugging (logger)
If you need to see what’s going on inside of your sequence while it executes, you can use the logger for that. It’s attached to the `this` context of a sequence. 

```ts
export default function(input) {
    input.on('error', (err) => {
        this.logger.error('Something went wrong', err)
    })
}
```
### Typescript
If you typed your sequence using appropriate "App" type (ReadableApp, WritableApp, TransformApp), then the `this` context should be already typed.
Alternatively, you can use [AppContext](https://hub.scramjet.org/docs/types/AppContext#interface-appcontextappconfigtype-state) to maunally type the `this` context of your sequence.
```ts
export default function(this: AppContext) { ... }
```

### Reading logs
You can read the logs using CLI or API.

@TODO typescript
@TODO parameters
@TODO make sure you know how to read numbers
@TODO test the samples
@TODO scope of topics
@TODO api/cli urls
@TODO what else should be described?
