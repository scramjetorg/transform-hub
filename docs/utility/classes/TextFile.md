[@scramjet/utility](../README.md) / [Exports](../modules.md) / TextFile

# Class: TextFile

## Hierarchy

- **`TextFile`**

  ↳ [`JsonFile`](JsonFile.md)

  ↳ [`YamlFile`](YamlFile.md)

## Implements

- [`File`](../interfaces/File.md)

## Table of contents

### Methods

- [checkAccess](TextFile.md#checkaccess)
- [create](TextFile.md#create)
- [exists](TextFile.md#exists)
- [extname](TextFile.md#extname)
- [fullname](TextFile.md#fullname)
- [isReadWritable](TextFile.md#isreadwritable)
- [isReadable](TextFile.md#isreadable)
- [name](TextFile.md#name)
- [read](TextFile.md#read)
- [remove](TextFile.md#remove)
- [write](TextFile.md#write)

### Constructors

- [constructor](TextFile.md#constructor)

### Properties

- [path](TextFile.md#path)

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

#### Defined in

[packages/utility/src/file/textFile.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L15)

___

### create

▸ **create**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[File](../interfaces/File.md).[create](../interfaces/File.md#create)

#### Defined in

[packages/utility/src/file/textFile.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L29)

___

### exists

▸ **exists**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[File](../interfaces/File.md).[exists](../interfaces/File.md#exists)

#### Defined in

[packages/utility/src/file/textFile.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L39)

___

### extname

▸ **extname**(): `string`

#### Returns

`string`

extension name

#### Implementation of

[File](../interfaces/File.md).[extname](../interfaces/File.md#extname)

#### Defined in

[packages/utility/src/file/textFile.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L49)

___

### fullname

▸ **fullname**(): `string`

#### Returns

`string`

filename with extension

#### Implementation of

[File](../interfaces/File.md).[fullname](../interfaces/File.md#fullname)

#### Defined in

[packages/utility/src/file/textFile.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L45)

___

### isReadWritable

▸ **isReadWritable**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[File](../interfaces/File.md).[isReadWritable](../interfaces/File.md#isreadwritable)

#### Defined in

[packages/utility/src/file/textFile.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L26)

___

### isReadable

▸ **isReadable**(): `boolean`

#### Returns

`boolean`

#### Implementation of

[File](../interfaces/File.md).[isReadable](../interfaces/File.md#isreadable)

#### Defined in

[packages/utility/src/file/textFile.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L23)

___

### name

▸ **name**(): `string`

#### Returns

`string`

filename without extension

#### Implementation of

[File](../interfaces/File.md).[name](../interfaces/File.md#name)

#### Defined in

[packages/utility/src/file/textFile.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L53)

___

### read

▸ **read**(): `string`

#### Returns

`string`

#### Implementation of

[File](../interfaces/File.md).[read](../interfaces/File.md#read)

#### Defined in

[packages/utility/src/file/textFile.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L13)

___

### remove

▸ **remove**(): `void`

#### Returns

`void`

#### Implementation of

[File](../interfaces/File.md).[remove](../interfaces/File.md#remove)

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

#### Implementation of

[File](../interfaces/File.md).[write](../interfaces/File.md#write)

#### Defined in

[packages/utility/src/file/textFile.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L12)

## Constructors

### constructor

• **new TextFile**(`path`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Defined in

[packages/utility/src/file/textFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L8)

## Properties

### path

• `Readonly` **path**: `string`

#### Implementation of

[File](../interfaces/File.md).[path](../interfaces/File.md#path)

#### Defined in

[packages/utility/src/file/textFile.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/textFile.ts#L6)
