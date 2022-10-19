import { ApiVersion } from "@scramjet/types";

const apiVersionPattern = /^v[0-9]+([.][0-9]+)*$/;

/**
 * Function checking proper version format
 * 
 * Example valid formats: v1, v2.13, v3.333.111
 * @param version version to check
 * @returns true if valid version format
 */
export const isApiVersion = (version: string): version is ApiVersion => apiVersionPattern.test(version);
