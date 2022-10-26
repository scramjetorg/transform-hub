import { IdString } from "@scramjet/types";

/**
 * Basic pattern used in modules id checks
 */
const idPattern = /^[a-zA-z0-9_-]+$/;

/**
 * Function to check for valid id pattern
 * 
 * @param id Id to validate
 * @returns true if id is in valid format
 */
export const isIdString = (id: string): id is IdString => {
    if (id.length > 50) return false;
    return idPattern.test(id);
};

