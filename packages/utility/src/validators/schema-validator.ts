import { ValidationResult, ValidationSchema } from "@scramjet/types";

export class SchemaValidator {
    protected schema: ValidationSchema;

    constructor(schema: ValidationSchema) {
        this.schema = schema;
    }

    /**
     * Validate object
     * @param obj input object for validation
     * @returns ValidationResult[] with validation info
     */
    validate(obj: Record<string, any>): ValidationResult[] {
        const results: ValidationResult[] = [];

        for (const key in this.schema) {
            const result = this.validateEntry(key, obj[key as keyof Object]);

            if (result === false) continue;

            if (typeof result === "string") {
                results.push({
                    isValid: false,
                    name: key,
                    message: result,
                });
            }
        }

        return results;
    }

    /**
     * Validate entry
     * @param key entry key
     * @param value entry value
     * @returns for valid entry returns true if validation should continue
     * or false if validation should be stopped.
     * Returns string with error message when validation error occurs.
     */
    validateEntry(key: string, value: any): string | boolean {
        const validators = this.schema[key];

        if (!validators) {
            console.warn(`No ${key} property in schema. No validation performed.`);
            return false;
        }

        for (const validator of validators) {
            if (typeof validator === "function") {
                const result = validator(value);

                if (result) {
                    return result;
                }
            } else {
            }
        }

        return false;
    }
}
