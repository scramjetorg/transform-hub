[@scramjet/utility](../README.md) / [Exports](../modules.md) / JsonFile

# Class: JsonFile

## Hierarchy

- [`TextFile`](TextFile.md)

  ↳ **`JsonFile`**

## Table of contents

### Methods

- [checkAccess](JsonFile.md#checkaccess)
- [create](JsonFile.md#create)
- [exists](JsonFile.md#exists)
- [extname](JsonFile.md#extname)
- [fullname](JsonFile.md#fullname)
- [isReadWritable](JsonFile.md#isreadwritable)
- [isReadable](JsonFile.md#isreadable)
- [name](JsonFile.md#name)
- [read](JsonFile.md#read)
- [remove](JsonFile.md#remove)
- [write](JsonFile.md#write)

### Constructors

- [constructor](JsonFile.md#constructor)

### Properties

- [path](JsonFile.md#path)

## Methods

### checkAccess

▸ `Protected` **checkAccess**(`path`, `mode`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `mode` | `number` |

#### Returns

`boolean`

#### Inherited from

[TextFile](TextFile.md).[checkAccess](TextFile.md#checkaccess)

#### Defined in

[packages/utility/src/file/textFile.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L15)

___

### create

▸ **create**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[TextFile](TextFile.md).[create](TextFile.md#create)

#### Defined in

[packages/utility/src/file/textFile.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L29)

___

### exists

▸ **exists**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[TextFile](TextFile.md).[exists](TextFile.md#exists)

#### Defined in

[packages/utility/src/file/textFile.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L39)

___

### extname

▸ **extname**(): `string`

#### Returns

`string`

extension name

#### Inherited from

[TextFile](TextFile.md).[extname](TextFile.md#extname)

#### Defined in

[packages/utility/src/file/textFile.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L49)

___

### fullname

▸ **fullname**(): `string`

#### Returns

`string`

filename with extension

#### Inherited from

[TextFile](TextFile.md).[fullname](TextFile.md#fullname)

#### Defined in

[packages/utility/src/file/textFile.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L45)

___

### isReadWritable

▸ **isReadWritable**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[TextFile](TextFile.md).[isReadWritable](TextFile.md#isreadwritable)

#### Defined in

[packages/utility/src/file/textFile.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L26)

___

### isReadable

▸ **isReadable**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[TextFile](TextFile.md).[isReadable](TextFile.md#isreadable)

#### Defined in

[packages/utility/src/file/textFile.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L23)

___

### name

▸ **name**(): `string`

#### Returns

`string`

filename without extension

#### Inherited from

[TextFile](TextFile.md).[name](TextFile.md#name)

#### Defined in

[packages/utility/src/file/textFile.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L53)

___

### read

▸ **read**(): `any`

#### Returns

`any`

#### Overrides

[TextFile](TextFile.md).[read](TextFile.md#read)

#### Defined in

[packages/utility/src/file/jsonFile.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/jsonFile.ts#L7)

___

### remove

▸ **remove**(): `void`

#### Returns

`void`

#### Inherited from

[TextFile](TextFile.md).[remove](TextFile.md#remove)

#### Defined in

[packages/utility/src/file/textFile.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L36)

___

### write

▸ **write**(`value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

`void`

#### Overrides

[TextFile](TextFile.md).[write](TextFile.md#write)

#### Defined in

[packages/utility/src/file/jsonFile.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/jsonFile.ts#L4)

## Constructors

### constructor

• **new JsonFile**(`path`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Inherited from

[TextFile](TextFile.md).[constructor](TextFile.md#constructor)

#### Defined in

[packages/utility/src/file/textFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L8)

## Properties

### path

• `Readonly` **path**: `string`

#### Inherited from

[TextFile](TextFile.md).[path](TextFile.md#path)

#### Defined in

[packages/utility/src/file/textFile.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L6)
