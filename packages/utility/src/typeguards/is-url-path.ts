import { UrlPath } from "@scramjet/types";

const urlPathPartPattern = /^[\b/](([a-z0-9]+(?:-[a-z0-9]+)*)[\b/]{0,1})*$/;

/**
 * Function checking slugs in url
 * 
 * Example valid paterns: /xx /xx/ /xxx/aa /xxx-ddd/ /xxx/aaa-ddd/ /xx-cc/aaa-ddd etc.
 * @param url url to check
 * @returns true if valid slug format
 */
export const isUrlPath = (url: string): url is UrlPath => urlPathPartPattern.test(url);
