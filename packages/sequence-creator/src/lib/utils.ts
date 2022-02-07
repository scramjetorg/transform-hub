import { execSync } from "child_process";
import * as fs from "fs";

/**
 * Checks if directory exists.
 * @param {string} dir Directory to be checked.
 * @returns {boolean} True if directory exists, false otherwise.
 */
export const checkDirExists = (dir: string) => fs.existsSync(dir);

/**
 * Removes directory.
 * @param {string} dir Directory to be removed.
 */
export const removeDir = (dir: string) => {
    if (checkDirExists(dir)) {
        execSync(`rm -rf ${dir}`);
    }
};

/**
 * Validates name.
 * @param {string} name Name to be validated.
 * @returns {boolean} True if name is valid, false otherwise.
 */
export const isNameValid = (name: string): boolean => (/[^\w\s]/gi).test(name);

/**
 * Reads JSON file.
 * @param {string} filepath File to be read.
 * @returns {Object} JSON object.
 */
export const readJSON = (filepath: string) => JSON.parse(fs.readFileSync(filepath, "utf8"));

/**
 * Copies directory.
 * @param {string} src Source directory.
 * @param {string} dest Destination directory.
 */
export const copyDir = (src: string, dest: string) => {
    execSync(`cp -R ${src} ${dest}`);
};

/**
 * Saves JSON to file.
 * @param {string} filapath File to be saved.
 * @param {Object} obj File contents.
 */
export const saveJSON = (filapath: string, obj: Object) => {
    fs.writeFileSync(filapath, JSON.stringify(obj, null, 2));
};
