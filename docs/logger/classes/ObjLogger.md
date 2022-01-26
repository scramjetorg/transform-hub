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
| `baseLog` | `DeepPartial`<`Object`\> | `{}` | Default log object. |
| `logLevel` | `LogLevel` | `"TRACE"` | Log level. |

#### Defined in

[obj-logger/src/obj-logger.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L58)

## Properties

### baseLog

• **baseLog**: `DeepPartial`<`Object`\>

Default log object.

#### Defined in

[obj-logger/src/obj-logger.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L35)

___

### inputLogStream

• **inputLogStream**: `PassThrough`

Input log stream in object mode.

#### Implementation of

IObjectLogger.inputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L15)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

Input log stream in string mode.

#### Implementation of

IObjectLogger.inputStringifiedLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L20)

___

### logLevel

• **logLevel**: `LogLevel`

Log level.

#### Defined in

[obj-logger/src/obj-logger.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L40)

___

### name

• **name**: `string`

Name used to indicate the source of the log.

#### Defined in

[obj-logger/src/obj-logger.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L30)

___

### output

• **output**: `DataStream`

Output stream in object mode.

#### Implementation of

IObjectLogger.output

#### Defined in

[obj-logger/src/obj-logger.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L25)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Implementation of

IObjectLogger.outputLogStream

#### Defined in

[obj-logger/src/obj-logger.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L10)

___

### outputs

• **outputs**: `Writable`[] = `[]`

Additional output streams.

#### Defined in

[obj-logger/src/obj-logger.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L45)

___

### levels

▪ `Static` **levels**: `LogLevel`[]

Logging levels chierarchy.

#### Defined in

[obj-logger/src/obj-logger.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L50)

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

[obj-logger/src/obj-logger.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L117)

___

### debug

▸ **debug**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.debug

#### Defined in

[obj-logger/src/obj-logger.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L133)

___

### error

▸ **error**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.error

#### Defined in

[obj-logger/src/obj-logger.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L129)

___

### fatal

▸ **fatal**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.fatal

#### Defined in

[obj-logger/src/obj-logger.ts:137](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L137)

___

### info

▸ **info**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.info

#### Defined in

[obj-logger/src/obj-logger.ts:125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L125)

___

### pipe

▸ **pipe**(`target`, `options?`): `Writable`

Pipes output logger to provided target. The target can be a writable stream or an ObjectLogger instance.

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

[obj-logger/src/obj-logger.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L156)

___

### trace

▸ **trace**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.trace

#### Defined in

[obj-logger/src/obj-logger.ts:121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L121)

___

### updateBaseLog

▸ **updateBaseLog**(`baseLog`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseLog` | `DeepPartial`<`Object`\> |

#### Returns

`void`

#### Defined in

[obj-logger/src/obj-logger.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L145)

___

### warn

▸ **warn**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.warn

#### Defined in

[obj-logger/src/obj-logger.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L141)

___

### write

▸ **write**(`level`, `entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | `LogLevel` |
| `entry` | `string` \| `DeepPartial`<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

IObjectLogger.write

#### Defined in

[obj-logger/src/obj-logger.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/obj-logger.ts#L85)
