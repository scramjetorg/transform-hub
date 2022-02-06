import * as path from "path";
import * as fs from "fs";
import { SequenceCreateConfig } from "../types";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import { execSync } from "child_process";

export class SequenceCreator {
    static create(opts: SequenceCreateConfig) {
        const workDir = process.cwd();
        const targetDir = path.join(workDir, opts.name);
        const templatesDir = path.join(__dirname, "..", "..", "templates");

        const logger = new ObjLogger("SequenceCreator");

        const prettyLog = new DataStream().map(prettyPrint({ colors: true }));

        logger.addOutput(prettyLog);
        prettyLog.pipe(process.stdout);

        logger.debug("Working directory", workDir);
        logger.debug("Templates directory", templatesDir);

        logger.info("Creating sequence", opts);

        SequenceCreator.copyDir(path.join(templatesDir, opts.lang), targetDir);
        SequenceCreator.updatePackageJSON(path.join(targetDir, "package.json"), opts);
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
