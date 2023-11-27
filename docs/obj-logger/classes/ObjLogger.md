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

[obj-logger/src/obj-logger.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L91)

## Properties

### baseLog

• **baseLog**: `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\>

Default log object.

#### Defined in

[obj-logger/src/obj-logger.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L63)

___

### ended

• **ended**: `boolean` = `false`

Identifies if you can still write messages.

#### Defined in

[obj-logger/src/obj-logger.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L33)

___

### inputLogStream

• **inputLogStream**: `PassThrough`

Input log stream in object mode.

#### Implementation of

IObjectLogger.inputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L43)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

Input log stream in string mode.

#### Implementation of

IObjectLogger.inputStringifiedLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L48)

___

### logLevel

• **logLevel**: `LogLevel`

Log level.

#### Defined in

[obj-logger/src/obj-logger.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L68)

___

### name

• **name**: `string`

Name used to indicate the source of the log.

#### Defined in

[obj-logger/src/obj-logger.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L58)

___

### output

• **output**: `DataStream`

Output stream in object mode.

#### Implementation of

IObjectLogger.output

#### Defined in

[obj-logger/src/obj-logger.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L53)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Implementation of

IObjectLogger.outputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L38)

___

### outputs

• **outputs**: `Writable`[] = `[]`

Additional output streams.

#### Defined in

[obj-logger/src/obj-logger.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L73)

___

### sources

• **sources**: `Set`<`Readable` \| `IObjectLogger`\>

Other logger sources

#### Defined in

[obj-logger/src/obj-logger.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L78)

___

### levels

▪ `Static` **levels**: `LogLevel`[] = `LogLevelStrings`

Logging levels hierarchy.

#### Defined in

[obj-logger/src/obj-logger.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L83)

## Accessors

### stringifiedOutput

• `get` **stringifiedOutput**(): `StringStream`

#### Returns

`StringStream`

#### Defined in

[obj-logger/src/obj-logger.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L193)

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

[obj-logger/src/obj-logger.ts:209](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L209)

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

[obj-logger/src/obj-logger.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L159)

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

[obj-logger/src/obj-logger.ts:216](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L216)

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

[obj-logger/src/obj-logger.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L175)

___

### end

▸ **end**(): `void`

#### Returns

`void`

#### Implementation of

IObjectLogger.end

#### Defined in

[obj-logger/src/obj-logger.ts:281](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L281)

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

[obj-logger/src/obj-logger.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L171)

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

[obj-logger/src/obj-logger.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L179)

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

[obj-logger/src/obj-logger.ts:167](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L167)

___

### pipe

▸ **pipe**(`target`, `options?`): `Writable` \| `IObjectLogger`

Pipes output logger to provided target. The target can be a writable stream
or an Instance of class fulfilling IObjectLogger interface.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `Writable` \| `IObjectLogger` | Target for log stream. |
| `options` | `Object` | Pipe options. If option `stringified` is set to true, the output will be stringified. |
| `options.end?` | `boolean` | - |
| `options.stringified?` | `boolean` | - |

#### Returns

`Writable` \| `IObjectLogger`

Piped stream

#### Implementation of

IObjectLogger.pipe

#### Defined in

[obj-logger/src/obj-logger.ts:231](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L231)

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

[obj-logger/src/obj-logger.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L163)

___

### unpipe

▸ **unpipe**(`target`, `options?`): `undefined` \| `DataStream`

Pipes output logger to provided target. The target can be a writable stream
or an instance of class fulfiling IObjectLogger interface.

**`See`**

ObjectLogger.pipe

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `undefined` \| `Writable` \| `IObjectLogger` | Target for log stream. |
| `options?` | `ObjLogPipeOptions` | Pipe options. Should be the same as passed to |

#### Returns

`undefined` \| `DataStream`

Unpiped stream

#### Implementation of

IObjectLogger.unpipe

#### Defined in

[obj-logger/src/obj-logger.ts:259](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L259)

___

### updateBaseLog

▸ **updateBaseLog**(`baseLog`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseLog` | `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |

#### Returns

`void`

#### Implementation of

IObjectLogger.updateBaseLog

#### Defined in

[obj-logger/src/obj-logger.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L187)

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

[obj-logger/src/obj-logger.ts:183](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L183)

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

[obj-logger/src/obj-logger.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L114)
