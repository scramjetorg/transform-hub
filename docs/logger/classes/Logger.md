[@scramjet/logger](../README.md) / [Exports](../modules.md) / Logger

# Class: Logger

## Implements

- `Console`

## Table of contents

### Properties

- [Console](Logger.md#console)
- [dirxml](Logger.md#dirxml)
- [groupCollapsed](Logger.md#groupcollapsed)

### Methods

- [assert](Logger.md#assert)
- [clear](Logger.md#clear)
- [count](Logger.md#count)
- [countReset](Logger.md#countreset)
- [debug](Logger.md#debug)
- [dir](Logger.md#dir)
- [error](Logger.md#error)
- [exception](Logger.md#exception)
- [group](Logger.md#group)
- [groupEnd](Logger.md#groupend)
- [info](Logger.md#info)
- [log](Logger.md#log)
- [memory](Logger.md#memory)
- [profile](Logger.md#profile)
- [profileEnd](Logger.md#profileend)
- [table](Logger.md#table)
- [time](Logger.md#time)
- [timeEnd](Logger.md#timeend)
- [timeLog](Logger.md#timelog)
- [timeStamp](Logger.md#timestamp)
- [trace](Logger.md#trace)
- [warn](Logger.md#warn)

### Constructors

- [constructor](Logger.md#constructor)

## Properties

### Console

• **Console**: `ConsoleConstructor`

#### Implementation of

Console.Console

#### Defined in

[index.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L43)

___

### dirxml

• **dirxml**: (...`args`: `any`[]) => `void`

#### Type declaration

▸ (`...args`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

##### Returns

`void`

#### Implementation of

Console.dirxml

#### Defined in

[index.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L118)

___

### groupCollapsed

• **groupCollapsed**: (...`_label`: `any`[]) => `void`

#### Type declaration

▸ (`..._label`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `..._label` | `any`[] |

##### Returns

`void`

#### Implementation of

Console.groupCollapsed

#### Defined in

[index.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L119)

## Methods

### assert

▸ **assert**(`_value`, `_message?`, `..._optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_value` | `any` |
| `_message?` | `string` |
| `..._optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.assert

#### Defined in

[index.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L54)

___

### clear

▸ **clear**(): `void`

#### Returns

`void`

#### Implementation of

Console.clear

#### Defined in

[index.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L57)

___

### count

▸ **count**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.count

#### Defined in

[index.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L60)

___

### countReset

▸ **countReset**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.countReset

#### Defined in

[index.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L63)

___

### debug

▸ **debug**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.debug

#### Defined in

[index.ts:108](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L108)

___

### dir

▸ **dir**(`obj`, `options?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `any` |
| `options?` | `InspectOptions` |

#### Returns

`void`

#### Implementation of

Console.dir

#### Defined in

[index.ts:105](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L105)

___

### error

▸ **error**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.error

#### Defined in

[index.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L99)

___

### exception

▸ **exception**(): `void`

#### Returns

`void`

#### Defined in

[index.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L97)

___

### group

▸ **group**(`..._label`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `..._label` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.group

#### Defined in

[index.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L66)

___

### groupEnd

▸ **groupEnd**(): `void`

#### Returns

`void`

#### Implementation of

Console.groupEnd

#### Defined in

[index.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L69)

___

### info

▸ **info**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.info

#### Defined in

[index.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L111)

___

### log

▸ **log**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.log

#### Defined in

[index.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L102)

___

### memory

▸ **memory**(): `void`

#### Returns

`void`

#### Defined in

[index.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L96)

___

### profile

▸ **profile**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.profile

#### Defined in

[index.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L87)

___

### profileEnd

▸ **profileEnd**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.profileEnd

#### Defined in

[index.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L90)

___

### table

▸ **table**(`_tabularData`, `_properties?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_tabularData` | `any` |
| `_properties?` | readonly `string`[] |

#### Returns

`void`

#### Implementation of

Console.table

#### Defined in

[index.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L72)

___

### time

▸ **time**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.time

#### Defined in

[index.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L75)

___

### timeEnd

▸ **timeEnd**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.timeEnd

#### Defined in

[index.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L78)

___

### timeLog

▸ **timeLog**(`_label?`, `..._data`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |
| `..._data` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.timeLog

#### Defined in

[index.ts:81](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L81)

___

### timeStamp

▸ **timeStamp**(`_label?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_label?` | `string` |

#### Returns

`void`

#### Implementation of

Console.timeStamp

#### Defined in

[index.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L93)

___

### trace

▸ **trace**(`_message?`, `..._optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_message?` | `any` |
| `..._optionalParams` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.trace

#### Defined in

[index.ts:84](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L84)

___

### warn

▸ **warn**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `any`[] |

#### Returns

`void`

#### Implementation of

Console.warn

#### Defined in

[index.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L114)

## Constructors

### constructor

• **new Logger**(`reference`, `_options`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `reference` | `any` | A reference passed to logger (log4j style) |
| `_options` | `LoggerOptions` | Logger options |

#### Defined in

[index.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L49)
