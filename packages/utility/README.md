# `@scramjet/utility`

This package includes **domain agnostic** utility **functions**, meaning there shouldn't be any business use-case specific code here. It's important since a package like this one tends to be a very common dependency for other packages.
Ideally functions from this package should be written once, well tested and never changed.

## Functions

### Example of a **GOOD** function for this package
This function does not have any knowledge of business components in the system and it's simple. Thus it's pretty stable.
```ts
export const defer = (timeout: number): Promise<void> =>
    new Promise(res => setTimeout(res, timeout));
```

### Example of a **BAD** function for this package
Knowledge about different types of streams on our platform indicates that this function defines a business logic.
```ts
import { EncodedMonitoringMessage, WritableStream } from "@scramjet/types";

export class MessageUtils {
    public static writeMessageOnStream([code, data]: EncodedMonitoringMessage, streamToWrite?: WritableStream<any>){
        if (streamToWrite === undefined) {
            throw new Error("The Stream is not defined.");
        }

        streamToWrite.write(JSON.stringify([code, data]) + "\r\n");
    }
}
```
