[@scramjet/types](../README.md) / APIError

# Interface: APIError

## Hierarchy

- *Error*

  ↳ **APIError**

## Table of contents

### Properties

- [cause](apierror.md#cause)
- [code](apierror.md#code)
- [httpMessage](apierror.md#httpmessage)
- [message](apierror.md#message)
- [name](apierror.md#name)
- [stack](apierror.md#stack)

## Properties

### cause

• `Optional` **cause**: Error

Defined in: [packages/types/src/api-expose.ts:53](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/api-expose.ts#L53)

___

### code

• **code**: *number*

Http status code to be outputted

Defined in: [packages/types/src/api-expose.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/api-expose.ts#L45)

___

### httpMessage

• **httpMessage**: *string*

The message that will be sent in reason line

Defined in: [packages/types/src/api-expose.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/api-expose.ts#L49)

___

### message

• **message**: *string*

Inherited from: Error.message

Defined in: node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Inherited from: Error.name

Defined in: node_modules/typescript/lib/lib.es5.d.ts:973

___

### stack

• `Optional` **stack**: *string*

Inherited from: Error.stack

Defined in: node_modules/typescript/lib/lib.es5.d.ts:975
