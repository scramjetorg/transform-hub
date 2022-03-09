[@scramjet/obj-logger](../README.md) / ObjLogger

# Class: ObjLogger

## Implements

- `IObjectLogger`

## Table of contents

### Constructors

- [constructor](ObjLogger.md#constructor)

### Properties

- [baseLog](ObjLogger.md#baselog)
- [inputLogStream](ObjLogger.md#inputlogstream)
- [inputStringifiedLogStream](ObjLogger.md#inputstringifiedlogstream)
- [logLevel](ObjLogger.md#loglevel)
- [name](ObjLogger.md#name)
- [output](ObjLogger.md#output)
- [outputLogStream](ObjLogger.md#outputlogstream)
- [outputs](ObjLogger.md#outputs)
- [levels](ObjLogger.md#levels)

### Methods

- [addOutput](ObjLogger.md#addoutput)
- [debug](ObjLogger.md#debug)
- [error](ObjLogger.md#error)
- [fatal](ObjLogger.md#fatal)
- [info](ObjLogger.md#info)
- [pipe](ObjLogger.md#pipe)
- [trace](ObjLogger.md#trace)
- [updateBaseLog](ObjLogger.md#updatebaselog)
- [warn](ObjLogger.md#warn)
- [write](ObjLogger.md#write)

## Constructors

### constructor

• **new ObjLogger**(`reference`, `baseLog?`, `logLevel?`)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `reference` | `any` | `undefined` | Used to obtain a name for the logger. |
| `baseLog` | `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> | `{}` | Default log object. |
| `logLevel` | `LogLevel` | `"TRACE"` | Log level. |

#### Defined in

[obj-logger/src/obj-logger.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L59)

## Properties

### baseLog

• **baseLog**: `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\>

Default log object.

#### Defined in

[obj-logger/src/obj-logger.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L36)

___

### inputLogStream

• **inputLogStream**: `PassThrough`

Input log stream in object mode.

#### Implementation of

IObjectLogger.inputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L16)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

Input log stream in string mode.

#### Implementation of

IObjectLogger.inputStringifiedLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L21)

___

### logLevel

• **logLevel**: `LogLevel`

Log level.

#### Defined in

[obj-logger/src/obj-logger.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L41)

___

### name

• **name**: `string`

Name used to indicate the source of the log.

#### Defined in

[obj-logger/src/obj-logger.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L31)

___

### output

• **output**: `DataStream`

Output stream in object mode.

#### Implementation of

IObjectLogger.output

#### Defined in

[obj-logger/src/obj-logger.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L26)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Implementation of

IObjectLogger.outputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L11)

___

### outputs

• **outputs**: `Writable`[] = `[]`

Additional output streams.

#### Defined in

[obj-logger/src/obj-logger.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L46)

___

### levels

▪ `Static` **levels**: `LogLevel`[]

Logging levels chierarchy.

#### Defined in

[obj-logger/src/obj-logger.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L51)

## Methods

### addOutput

▸ **addOutput**(`output`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `output` | `Writable` |

#### Returns

`void`

#### Implementation of

IObjectLogger.addOutput

#### Defined in

[obj-logger/src/obj-logger.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L121)

___

### debug

▸ **debug**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.debug

#### Defined in

[obj-logger/src/obj-logger.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L137)

___

### error

▸ **error**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.error

#### Defined in

[obj-logger/src/obj-logger.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L133)

___

### fatal

▸ **fatal**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.fatal

#### Defined in

[obj-logger/src/obj-logger.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L141)

___

### info

▸ **info**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.info

#### Defined in

[obj-logger/src/obj-logger.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L129)

___

### pipe

▸ **pipe**(`target`, `options?`): `Writable`

Pipes output logger to provided target. The target can be a writable stream
or an instance of class fulfiling IObjectLogger interface.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `Writable` \| `IObjectLogger` | Target for log stream. |
| `options` | `Object` | Pipe options. If option `stringified` is set to true, the output will be stringified. |
| `options.stringified?` | `boolean` | - |

#### Returns

`Writable`

Piped stream

#### Implementation of

IObjectLogger.pipe

#### Defined in

[obj-logger/src/obj-logger.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L161)

___

### trace

▸ **trace**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.trace

#### Defined in

[obj-logger/src/obj-logger.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L125)

___

### updateBaseLog

▸ **updateBaseLog**(`baseLog`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseLog` | `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |

#### Returns

`void`

#### Defined in

[obj-logger/src/obj-logger.ts:149](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L149)

___

### warn

▸ **warn**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.warn

#### Defined in

[obj-logger/src/obj-logger.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L145)

___

### write

▸ **write**(`level`, `entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | `LogLevel` |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.write

#### Defined in

[obj-logger/src/obj-logger.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L89)
