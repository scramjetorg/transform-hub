[@scramjet/symbols](../README.md) / [Exports](../modules.md) / APIErrorCode

# Enumeration: APIErrorCode

## Table of contents

### Enumeration Members

- [INSUFFICIENT\_RESOURCES](APIErrorCode.md#insufficient_resources)
- [NOT\_AUTHORIZED](APIErrorCode.md#not_authorized)
- [UNPROCESSABLE\_ENTITY](APIErrorCode.md#unprocessable_entity)

## Enumeration Members

### INSUFFICIENT\_RESOURCES

• **INSUFFICIENT\_RESOURCES** = ``1002``

There is not enough space to perform the operation. 
Usually this is caused by the user exceeding the disk quota.
It may be thrown when sending a Sequence to the STH.

#### Defined in

[api-error-codes.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/api-error-codes.ts#L13)

___

### NOT\_AUTHORIZED

• **NOT\_AUTHORIZED** = ``1001``

A user is not authorized to access a particular Space.

#### Defined in

[api-error-codes.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/api-error-codes.ts#L6)

___

### UNPROCESSABLE\_ENTITY

• **UNPROCESSABLE\_ENTITY** = ``1003``

The Sequence package sent to the STH was not processed by the Pre-Runner.
It may be caused by the Sequence package not following the package requirements:
https://github.com/scramjetorg/scramjet-cloud-docs#31-review-the-package

#### Defined in

[api-error-codes.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/api-error-codes.ts#L20)
