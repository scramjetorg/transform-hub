import { LogLevel } from "@scramjet/types";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";

import { checkDirExists, copyDir, isNameValid, readJSON, removeDir, saveJSON } from "./utils";
import { SequenceCreateConfig } from "../types";

import { DataStream } from "scramjet";
import * as path from "path";

const SUPPORTED_LANGUAGES = ["js", "ts"];

/**
 * Sequence creator.
 * Generates sequence from template for specified language.
 *
 */
export class SequenceCreator {
    /**
     * Creates sequence.
     *
     * @param {SequenceCreateConfig} opts Configuration object.
     * @param {LogLevel} logLevel Log level.
     */
    static create(opts: SequenceCreateConfig, logLevel?: LogLevel) {
        const logger = new ObjLogger("SequenceCreator", {}, logLevel);
        const prettyLog = new DataStream().map(prettyPrint({ colors: true }));

        logger.addOutput(prettyLog);
        prettyLog.pipe(process.stdout);

        if (!isNameValid(opts.name)) {
            logger.error("Sequence name is invalid");

            return;
        }

        if (!SUPPORTED_LANGUAGES.includes(opts.lang)) {
            logger.error("Sequence language not recognized", opts.lang, SUPPORTED_LANGUAGES);

            return;
        }

        logger.debug("Creating sequence", opts);

        const workDir = process.cwd();
        const targetDir = path.join(workDir, opts.name);
        const templatesDir = path.join(path.dirname(require.resolve("@scramjet/sequence-creator")), "templates");

        logger.debug("Working directory", workDir);
        logger.debug("Templates directory", templatesDir);

        if (!checkDirExists(path.join(templatesDir, opts.lang))) {
            logger.error("Template not found", opts.lang);

            return;
        }

        if (opts.overwrite) {
            removeDir(targetDir);
        } else if (checkDirExists(targetDir)) {
            logger.error("Sequence already exists. Use --overwrite to overwrite");

            return;
        }

        copyDir(path.join(templatesDir, opts.lang), targetDir);
        SequenceCreator.updatePackageJSON(path.join(targetDir, "package.json"), opts);

        logger.info("Sequence created", opts.name);
    }

    /**
     * Reads package.json and updates it with given options.
     *
     * @param {string} packageFilepath Path to package.json.
     * @param {SequnceCreateConfig} opts Configuration object.
     */
    static updatePackageJSON(packageFilepath: string, opts: SequenceCreateConfig) {
        const packageJson = readJSON(packageFilepath);

        packageJson.name = opts.name;

        saveJSON(packageFilepath, packageJson);
    }
}
