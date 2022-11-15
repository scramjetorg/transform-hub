import { ValidationResult, ValidationSchema } from "@scramjet/types";

/**
 * Validates objects using schema and stores validation errors inside
 *
 * @export
 * @class SchemaValidator
 * @typedef {SchemaValidator}
 */
export class SchemaValidator {
    protected schema: ValidationSchema;
    protected _errors: ValidationResult[];

    constructor(schema: ValidationSchema) {
        this.schema = schema;
        this._errors = [];
    }

    get errors() {
        return this._errors;
    }

    get validators() {
        return this.schema;
    }

    /**
     * Validates object
     * @param {Record} obj input object for validation
     * @returns {ValidationResult[]} with validation info
     */
    validateSchema(obj: Record<string, any>): ValidationResult[] {
        this._errors = [];

        for (const key of Object.keys(this.schema)) {
            const result = this.validateSchemaElement(key, obj[key as keyof Object]);

            if (result === false) continue;

            if (typeof result === "string") {
                this._errors.push({
                    isValid: false,
                    name: key,
                    message: result,
                });
            }
        }

        return this._errors;
    }

    /**
     * Validates property using defined schema
     * @param {string} key property key
     * @param {any} value property value
     * @returns {string | boolean} for valid entry returns true if validation should continue
     * or false if validation should be stopped.
     * Returns string with error message when validation error occurs.
     */
    validateSchemaElement(key: string, value: any): string | boolean {
        const validators = this.schema[key];

        if (!validators) {
            return false;
        }

        for (const validator of validators) {
            const result = validator(value);

            if (!result) {
                break;
            }

            if (typeof result === "string") {
                return result;
            }
        }

        return false;
    }

    /**
     * Validates object
     * @param {Record} obj input object for validation
     * @returns {boolean} true if objech is valid with schema, false otherwise
     */
    validate(obj: Record<string, any>): boolean {
        this.validateSchema(obj);

        return this._errors.length === 0;
    }

    /**
     * Validate entry
     * @param {string} key entry key
     * @param {any} value entry value
     * @returns {boolean} true if entry is valid with schema, false otherwise
     */
    validateEntry(key: string, value: any): boolean {
        return typeof this.validateSchemaElement(key, value) === "boolean";
    }
}
