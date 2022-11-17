[@scramjet/load-check](../README.md) / [Exports](../modules.md) / LoadCheckConfig

# Class: LoadCheckConfig

## Hierarchy

- `ReadOnlyConfig`<`LoadCheckRequirements`\>

  ↳ **`LoadCheckConfig`**

## Table of contents

### Properties

- [configuration](LoadCheckConfig.md#configuration)
- [isValidConfig](LoadCheckConfig.md#isvalidconfig)

### Constructors

- [constructor](LoadCheckConfig.md#constructor)

### Methods

- [get](LoadCheckConfig.md#get)
- [getEntry](LoadCheckConfig.md#getentry)
- [has](LoadCheckConfig.md#has)
- [isValid](LoadCheckConfig.md#isvalid)
- [validate](LoadCheckConfig.md#validate)
- [validateEntry](LoadCheckConfig.md#validateentry)
- [validateEntry](LoadCheckConfig.md#validateentry-1)

### Accessors

- [instanceRequirements](LoadCheckConfig.md#instancerequirements)
- [safeOperationLimit](LoadCheckConfig.md#safeoperationlimit)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: `LoadCheckRequirements`

#### Inherited from

ReadOnlyConfig.configuration

#### Defined in

[utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

ReadOnlyConfig.isValidConfig

#### Defined in

[utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new LoadCheckConfig**(`configuration`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | `LoadCheckRequirements` |

#### Inherited from

ReadOnlyConfig<LoadCheckRequirements\>.constructor

#### Defined in

[utility/src/config/readOnlyConfig.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L10)

## Methods

### get

▸ **get**(): `LoadCheckRequirements`

#### Returns

`LoadCheckRequirements`

#### Inherited from

ReadOnlyConfig.get

#### Defined in

[utility/src/config/readOnlyConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L20)

___

### getEntry

▸ **getEntry**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `LoadCheckRequirements` |

#### Returns

`any`

#### Inherited from

ReadOnlyConfig.getEntry

#### Defined in

[utility/src/config/readOnlyConfig.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L38)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `LoadCheckRequirements` |

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.has

#### Defined in

[utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.isValid

#### Defined in

[utility/src/config/readOnlyConfig.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L30)

___

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Record`<`string`, `any`\> |

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.validate

#### Defined in

[utility/src/config/readOnlyConfig.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L24)

___

### validateEntry

▸ `Static` **validateEntry**(`key`, `value`): ``null`` \| `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

``null`` \| `boolean`

#### Defined in

[load-check/src/config/load-check-config.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/config/load-check-config.ts#L13)

___

### validateEntry

▸ `Protected` **validateEntry**(`key`, `value`): ``null`` \| `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

``null`` \| `boolean`

#### Overrides

ReadOnlyConfig.validateEntry

#### Defined in

[load-check/src/config/load-check-config.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/config/load-check-config.ts#L9)

## Accessors

### instanceRequirements

• `get` **instanceRequirements**(): `InstanceRequirements`

#### Returns

`InstanceRequirements`

#### Defined in

[load-check/src/config/load-check-config.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/config/load-check-config.ts#L7)

___

### safeOperationLimit

• `get` **safeOperationLimit**(): `number`

#### Returns

`number`

#### Defined in

[load-check/src/config/load-check-config.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/load-check/src/config/load-check-config.ts#L6)
