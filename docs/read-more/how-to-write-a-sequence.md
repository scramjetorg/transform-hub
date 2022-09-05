# Scramjet Sequence - how to write a program?

- [Producing data (output stream)](#producing-data-output-stream)
- [Consuming data (input stream)](#consuming-data-input-stream)
- [Transforming data](#transforming-data)
- [Sequence arguments](#sequence-arguments)
- [Sending data between Sequences (topics)](#sending-data-between-sequences-topics)
- [Standard streams (stdin/stdout/stderr)](#standard-streams-stdinstdoutstderr)
- [Debugging (logger)](#debugging-logger)

Sequence is a program that produces, consumes or transforms data. It’s a function or an array of functions. They typically look somewhat like this:

```ts
/** The function parameters are
 * input stream
 * ...params passed to Instance on start
 */
export default function (input, param1, param2) {
    const out = new PassThrough();

    input.on("data", data => {
        out.write("Hello " + data.toString());
    });

    input.on("end", () => {
        this.logger.debug("Input stream ended");
    });

    // it returns an output stream
    return out;
}
```

## Producing data (output stream)

To stream data from a Sequence, you need to return values over time. Some constructs in JavaScript which enable that are NodeJS streams, Generators and Iterables. Whatever you return from your Sequence will be your **_output_** stream. You can choose whichever solution is right for you.

### Flow control (backpressure)

Every streaming system needs to take backpressure problems into account. Every stream that you are writing to, can signalize that it's being overflown with incoming data. In this situation, if that's possible producing of data should be stopped, until the target stream signalizes that it is ok to write data again.
If you choose Generators or Iterables for your output stream, the backpressure will be handled for you by Scramjet framework (new values won't be produced if the target stream is overflown).

### Examples

Here are some examples of a Sequence producing a stream of integers every second.

#### Using an async generator:

```ts
export default async function* () {
    let i = 0;
    while (true) {
        await sleep(1000);
        yield i++;
    }
}
```

#### Using a stream:

With raw streams, you need to handle backpressure yourself.

```ts
export default function () {
    const out = new PassThrough();

    let i = 0;

    const fn = () => {
        const canWrite = out.write((i++).toString());

        if (!canWrite) {
            clearInterval(intervalRef);
        }
    };

    let intervalRef = setInterval(fn, 1000);

    // When the output stream is ready to accept new data you can start producing new values again
    out.on("drain", () => {
        intervalRef = setInterval(fn, 1000);
    });

    return out;
}
```

### Typescript

Sequences that only produce data should be typed as [ReadableApp](https://hub.scramjet.org/docs/types/modules#readableapp).
[Here's an example](https://github.com/scramjetorg/scramjet-cloud-docs/blob/main/samples/scraping/app.ts).

### Reading from output stream

You could read this stream using our [CLI](https://docs.scramjet.org/platform/cli-reference), [REST API](https://docs.scramjet.org/platform/api-reference).

## Consuming data (input stream)

Reading data from a Sequence is easy as the input stream conforms to the Readable protocol from NodeJS. There’s a bunch of ways that allow you to read data from streams. Here are some examples of a Sequence that reads a stream of weather data objects and saves them to DB.

#### Using a for loop:

```ts
export default async function* (input) {
    for await (const data of input) {
        saveWeatherData(data.time, data.temperature);
    }
}
```

#### Using stream events:

```ts
export default async function (input) {
    input.on("data", data => {
        saveWeatherData(data.time, data.temperature);
    });

    // Since we're only consuming input, we want to end our Sequence when it finishes
    await events.once(input, "end");
}
```

### Input stream encoding

Note that input stream is special in a way it already encodes your stream using a specified contentType.
In this case if you wanted to send the stream using our CLI it would look like this:

```bash
si inst input <instance-id> --content-type "application/x-ndjson"
```

Then you can send JSON strings separated by newline characters.

### Typescript

Sequences that only consumes data should be typed as [WritableApp](https://hub.scramjet.org/docs/types/modules#writableapp).

### Writing to input stream

You can write to Instance input stream using our [CLI](https://docs.scramjet.org/platform/cli-reference), [REST API](https://docs.scramjet.org/platform/api-reference).

## Transforming data

Transforming data is really a combination of consuming and producing, usually with some logic in between. Let’s filter the incoming input stream of numbers to include only the even ones. You will also have to consider backpressure when you are producing data.

#### Using async iteration and a generator:

```ts
export default async function* (input) {
    for await (const num of input) {
        if (num % 2 === 0) {
            yield num;
        }
    }
}
```

#### Using streams:

While using raw streams you need to handle backpressure yourself.

```ts
export default function (input) {
    const out = new PassThrough();

    input.on("data", num => {
        if (num % 2 === 0) {
            const canWrite = out.write(num.toString());
            if (!canWrite) input.pause();
        }
    });

    // When the output stream is ready to accept new data we can start consuming input again
    out.on("drain", () => input.resume());

    return out;
}
```

### Typescript

Sequences that transform data should be typed as [TransformApp](https://hub.scramjet.org/docs/types/modules#transformapp).
[Here's an example](https://github.com/scramjetorg/scramjet-cloud-docs/blob/main/samples/transform-string-stream/src/index.ts).

## Sequence arguments

Every Sequence can be spawned with arbitrary number of arguments

```bash
si seq start <sequence-id> --args '["Hello", 123, { "abc": 456 }]'
```

you can access this args using function parameters in your Sequence:

```ts
export default function (input, param1, param2, param3) {
    console.log(param1 + " " + param2 + " " + param3.abc);
    // Prints "Hello 123 456" to stdout

    // ...
}
```

## Sending data between Sequences (topics)

Sometimes you need a bunch of Sequences to talk to each other. Topics are the solution. It’s a PubSub system that allows for many writing and reading Instances to exchange data.
Topics are either attached to the input stream or routed from the output stream.

### Writing to a topic

To have your output stream routed to a topic, it needs to have a property `topic` with a topic name and `contentType` for proper consumer encoding.

```ts
export default function () {
    const out = new PassThrough();

    temperatureSensor.on("update", data => {
        out.write(data);
    });

    out.topic = "temperature-readouts";
    out.contentType = "text/plain";

    return out;
}
```

### Reading from a topic

To send topic as input stream you specify a topic config object with two properties: `requires` - with a name of topic, and `contentType` for ensuring proper encoding.

```ts
const CRITICAL_TEMP_CELSIUS = 40;

const app = [
    {
        requires: "temperature-readouts",
        contentType: "text/plain",
    },
    async function* (input) {
        for await (const data of input) {
            if (+data > CRITICAL_TEMP_CELSIUS) {
                this.logger.trace("Temperature exceeded critical level");
            }
        }
    },
];

export default app;
```

### Typescript

Writing to a topic requires specifying two additional properties that might not be present on your output stream. You can extend the type of your output stream by [HasTopicInformation](https://hub.scramjet.org/docs/types/modules#hastopicinformation) type.
Reading from a topic would require you to type your app as a tuple similar to this example:

```ts
const app: [{ requires: string; contentType: string }, ReadableApp] = [
    { requires: "hello", contentType: "text/plain" },
    function (input) {
        /*...*/
    },
];
```

### Interacting with topics

Apart from Sequences communicating between each other you can also feed/consume a topic using our [CLI](https://docs.scramjet.org/platform/cli-reference), [REST API](https://docs.scramjet.org/platform/api-reference), or [API Client](https://docs.scramjet.org/platform/api-reference/HostClient).

## Standard streams (stdin/stdout/stderr)

Every Sequence has access to standard streams of a program. You can read data from stdin. Send additional information to stdout and to stderr. These are separate from input/output streams.

```ts
export default async function () {
    process.stdin.on("data", dataBuf => {
        // console.log and process.stdout are writing to the same stdout stream
        process.stdout.write("Echo: " + dataBuf.toString("utf-8"));
    });

    process.stdin.on("error", err => {
        // console.error and process.stderr are writing to the same stderr stream
        process.stderr.write("Error: " + err);
    });

    await events.once(process.stdin, "end");
}
```

These streams are also accessible through our [CLI](https://docs.scramjet.org/platform/cli-reference), [REST API](https://docs.scramjet.org/platform/api-reference).

## Debugging (logger)

If you need to see what’s going on inside of your Sequence while it executes, you can use the logger for that. It’s attached to the `this` context of a Sequence.
Note that `logger` is separate from `console` object. `Logger` writes to the designated `log` stream, while `console` uses standard `stdout` and `stderr` streams.

```ts
export default function (input) {
    input.on("error", err => {
        this.logger.error("Something went wrong", err);
    });

    // ...
}
```

### Typescript

If you typed your Sequence using appropriate "App" type (ReadableApp, WritableApp, TransformApp), then the `this` context should be already typed.
Alternatively, you can use [AppContext](https://docs.scramjet.org/platform/app-reference) to do it manually.

```ts
export default function(this: AppContext<{}, void>) { ... }
```

### Reading logs

You can read the logs using our [CLI](https://docs.scramjet.org/platform/cli-reference), [REST API](https://docs.scramjet.org/platform/api-reference).
