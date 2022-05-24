[@scramjet/obj-logger](../README.md) / ObjLogger

# Class: ObjLogger

## Implements

- `IObjectLogger`

## Table of contents

### Constructors

- [constructor](ObjLogger.md#constructor)

### Properties

- [baseLog](ObjLogger.md#baselog)
- [ended](ObjLogger.md#ended)
- [inputLogStream](ObjLogger.md#inputlogstream)
- [inputStringifiedLogStream](ObjLogger.md#inputstringifiedlogstream)
- [logLevel](ObjLogger.md#loglevel)
- [name](ObjLogger.md#name)
- [output](ObjLogger.md#output)
- [outputLogStream](ObjLogger.md#outputlogstream)
- [outputs](ObjLogger.md#outputs)
- [sources](ObjLogger.md#sources)
- [levels](ObjLogger.md#levels)

### Accessors

- [stringifiedOutput](ObjLogger.md#stringifiedoutput)

### Methods

- [addObjectLoggerSource](ObjLogger.md#addobjectloggersource)
- [addOutput](ObjLogger.md#addoutput)
- [addSerializedLoggerSource](ObjLogger.md#addserializedloggersource)
- [debug](ObjLogger.md#debug)
- [end](ObjLogger.md#end)
- [error](ObjLogger.md#error)
- [fatal](ObjLogger.md#fatal)
- [info](ObjLogger.md#info)
- [pipe](ObjLogger.md#pipe)
- [trace](ObjLogger.md#trace)
- [unpipe](ObjLogger.md#unpipe)
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

[obj-logger/src/obj-logger.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L74)

## Properties

### baseLog

• **baseLog**: `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\>

Default log object.

#### Defined in

[obj-logger/src/obj-logger.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L46)

___

### ended

• **ended**: `boolean` = `false`

Identifies if you can still write messages.

#### Defined in

[obj-logger/src/obj-logger.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L16)

___

### inputLogStream

• **inputLogStream**: `PassThrough`

Input log stream in object mode.

#### Implementation of

IObjectLogger.inputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L26)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

Input log stream in string mode.

#### Implementation of

IObjectLogger.inputStringifiedLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L31)

___

### logLevel

• **logLevel**: `LogLevel`

Log level.

#### Defined in

[obj-logger/src/obj-logger.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L51)

___

### name

• **name**: `string`

Name used to indicate the source of the log.

#### Defined in

[obj-logger/src/obj-logger.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L41)

___

### output

• **output**: `DataStream`

Output stream in object mode.

#### Implementation of

IObjectLogger.output

#### Defined in

[obj-logger/src/obj-logger.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L36)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Implementation of

IObjectLogger.outputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L21)

___

### outputs

• **outputs**: `Writable`[] = `[]`

Additional output streams.

#### Defined in

[obj-logger/src/obj-logger.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L56)

___

### sources

• **sources**: `Set`<`IObjectLogger` \| `Readable`\>

Other logger sources

#### Defined in

[obj-logger/src/obj-logger.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L61)

___

### levels

▪ `Static` **levels**: `LogLevel`[]

Logging levels hierarchy.

#### Defined in

[obj-logger/src/obj-logger.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L66)

## Accessors

### stringifiedOutput

• `get` **stringifiedOutput**(): `StringStream`

#### Returns

`StringStream`

#### Defined in

[obj-logger/src/obj-logger.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L165)

## Methods

### addObjectLoggerSource

▸ **addObjectLoggerSource**(`source`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `IObjectLogger` |

#### Returns

`void`

#### Implementation of

IObjectLogger.addObjectLoggerSource

#### Defined in

[obj-logger/src/obj-logger.ts:170](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L170)

___

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

[obj-logger/src/obj-logger.ts:132](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L132)

___

### addSerializedLoggerSource

▸ **addSerializedLoggerSource**(`source`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `Readable` |

#### Returns

`void`

#### Implementation of

IObjectLogger.addSerializedLoggerSource

#### Defined in

[obj-logger/src/obj-logger.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L177)

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

[obj-logger/src/obj-logger.ts:148](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L148)

___

### end

▸ **end**(): `void`

#### Returns

`void`

#### Implementation of

IObjectLogger.end

#### Defined in

[obj-logger/src/obj-logger.ts:235](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L235)

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

[obj-logger/src/obj-logger.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L144)

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

[obj-logger/src/obj-logger.ts:152](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L152)

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

[obj-logger/src/obj-logger.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L140)

___

### pipe

▸ **pipe**(`target`, `options?`): `IObjectLogger` \| `Writable`

Pipes output logger to provided target. The target can be a writable stream
or an Instance of class fulfilling IObjectLogger interface.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `IObjectLogger` \| `Writable` | Target for log stream. |
| `options` | `Object` | Pipe options. If option `stringified` is set to true, the output will be stringified. |
| `options.end?` | `boolean` | - |
| `options.stringified?` | `boolean` | - |

#### Returns

`IObjectLogger` \| `Writable`

Piped stream

#### Implementation of

IObjectLogger.pipe

#### Defined in

[obj-logger/src/obj-logger.ts:192](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L192)

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

[obj-logger/src/obj-logger.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L136)

___

### unpipe

▸ **unpipe**(`target`, `options?`): `DataStream`

Pipes output logger to provided target. The target can be a writable stream
or an instance of class fulfiling IObjectLogger interface.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `undefined` \| `IObjectLogger` \| `Writable` | Target for log stream. |
| `options` | `ObjLogPipeOptions` | Pipe options. Should be the same as passed to @see ObjectLogger.pipe |

#### Returns

`DataStream`

Unpiped stream

#### Implementation of

IObjectLogger.unpipe

#### Defined in

[obj-logger/src/obj-logger.ts:219](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L219)

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

[obj-logger/src/obj-logger.ts:160](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L160)

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

[obj-logger/src/obj-logger.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L156)

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

[obj-logger/src/obj-logger.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L97)
