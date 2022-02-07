import { LogLevel } from "@scramjet/types";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";

import { DataStream } from "scramjet";

import { SequenceCreateConfig } from "../types";

import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

export class SequenceCreator {
    static create(opts: SequenceCreateConfig, logLevel?: LogLevel) {
        const logger = new ObjLogger("SequenceCreator", {}, logLevel);

        const prettyLog = new DataStream().map(prettyPrint({ colors: true }));

        logger.addOutput(prettyLog);
        prettyLog.pipe(process.stdout);

        logger.info("Creating sequence", opts);

        const workDir = process.cwd();
        const targetDir = path.join(workDir, opts.name);
        const templatesDir = path.join(__dirname, "..", "..", "templates");

        if (!this.checkDirExists(path.join(templatesDir, opts.lang))) {
            logger.error("Template not found", opts.lang);

            return;
        }

        logger.debug("Working directory", workDir);
        logger.debug("Templates directory", templatesDir);

        if (opts.overwrite) {
            SequenceCreator.removeDir(targetDir);
        } else if (SequenceCreator.checkDirExists(targetDir)) {
            logger.error("Sequence already exists. Use --overwrite to overwrite");

            return;
        }

        SequenceCreator.copyDir(path.join(templatesDir, opts.lang), targetDir);
        SequenceCreator.updatePackageJSON(path.join(targetDir, "package.json"), opts);

        logger.info("Sequence created", opts.name);
    }

    static removeDir(dir: string) {
        if (SequenceCreator.checkDirExists(dir)) {
            execSync(`rm -rf ${dir}`);
        }
    }

    static checkDirExists(dir: string) {
        return fs.existsSync(dir);
    }

    static copyDir(src: string, dest: string) {
        execSync(`cp -R ${src} ${dest}`);
    }

    static readJson(filepath: string) {
        return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }

    static updatePackageJSON(packageFilepath: string, opts: SequenceCreateConfig) {
        const packageJson = SequenceCreator.readJson(packageFilepath);

        packageJson.name = opts.name;

        fs.writeFileSync(packageFilepath, JSON.stringify(packageJson, null, 2));
    }
}
