[@scramjet/utility](../README.md) / [Exports](../modules.md) / SchemaValidator

# Class: SchemaValidator

Validates objects using schema and stores validation errors inside

**`Export`**

## Table of contents

### Properties

- [\_errors](SchemaValidator.md#_errors)
- [schema](SchemaValidator.md#schema)

### Constructors

- [constructor](SchemaValidator.md#constructor)

### Accessors

- [errors](SchemaValidator.md#errors)
- [validators](SchemaValidator.md#validators)

### Methods

- [validate](SchemaValidator.md#validate)
- [validateEntry](SchemaValidator.md#validateentry)
- [validateSchema](SchemaValidator.md#validateschema)
- [validateSchemaElement](SchemaValidator.md#validateschemaelement)

## Properties

### \_errors

• `Protected` **\_errors**: `ValidationResult`[]

#### Defined in

[packages/utility/src/validators/schema-validator.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L12)

___

### schema

• `Protected` **schema**: `ValidationSchema`

#### Defined in

[packages/utility/src/validators/schema-validator.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L11)

## Constructors

### constructor

• **new SchemaValidator**(`schema`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `ValidationSchema` |

#### Defined in

[packages/utility/src/validators/schema-validator.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L14)

## Accessors

### errors

• `get` **errors**(): `ValidationResult`[]

#### Returns

`ValidationResult`[]

#### Defined in

[packages/utility/src/validators/schema-validator.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L19)

___

### validators

• `get` **validators**(): `ValidationSchema`

#### Returns

`ValidationSchema`

#### Defined in

[packages/utility/src/validators/schema-validator.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L23)

## Methods

### validate

▸ **validate**(`obj`): `boolean`

Validates object

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `obj` | `Record`<`string`, `any`\> | input object for validation |

#### Returns

`boolean`

true if objech is valid with schema, false otherwise

#### Defined in

[packages/utility/src/validators/schema-validator.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L87)

___

### validateEntry

▸ **validateEntry**(`key`, `value`): `boolean`

Validate entry

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | entry key |
| `value` | `any` | entry value |

#### Returns

`boolean`

true if entry is valid with schema, false otherwise

#### Defined in

[packages/utility/src/validators/schema-validator.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L99)

___

### validateSchema

▸ **validateSchema**(`obj`): `ValidationResult`[]

Validates object

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `obj` | `Record`<`string`, `any`\> | input object for validation |

#### Returns

`ValidationResult`[]

with validation info

#### Defined in

[packages/utility/src/validators/schema-validator.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L32)

___

### validateSchemaElement

▸ **validateSchemaElement**(`key`, `value`): `string` \| `boolean`

Validates property using defined schema

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | property key |
| `value` | `any` | property value |

#### Returns

`string` \| `boolean`

for valid entry returns true if validation should continue
or false if validation should be stopped.
Returns string with error message when validation error occurs.

#### Defined in

[packages/utility/src/validators/schema-validator.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/validators/schema-validator.ts#L60)
