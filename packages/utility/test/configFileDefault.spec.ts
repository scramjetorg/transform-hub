import avaTest, { TestFn } from "ava";
import { tmpdir } from "os";
import { resolve } from "path";
import { ConfigFileDefault } from "../src/config";
import { FileBuilder, File } from "../src/file";

const validTestFilePath = resolve(tmpdir(), "validTestFile.json");
const invalidTestFilePath = resolve(tmpdir(), "invalidTestFile.json");

const validConfig = {
    numericValue: 5,
    stringValue: "Lorem ipsum",
};
const invalidConfig = {
    numericValue: 42, // valid numericValue must be 1-9
    stringValue: "The Ultimate Question of Life, the Universe, and Everything",
};

const testDefaultConfig = {
    numericValue: 1,
    stringValue: "someString",
};

class TestConfigFileDefault extends ConfigFileDefault<typeof testDefaultConfig> {
    constructor(path: string) {
        super(path, testDefaultConfig);
    }

    protected validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "numericValue": {
                if (typeof value === "number" && value > 0 && value < 10)
                    return true;
                return false;
            }
            case "stringValue": {
                if (typeof value === "string") return true;
                return false;
            }
            default:
                return false;
        }
    }
}

const hasSameKeys = (obj1: Object, obj2: Object) => {
    const obj1Keys = Object.keys(obj1);
    const obj2Keys = Object.keys(obj2);

    if (obj1Keys.length !== obj2Keys.length) return false;
    for (const key1 of obj1Keys) {
        if (!obj2Keys.includes(key1)) return false;
    }
    return true;
};

const hasSameValues = (obj1: Object, obj2: Object) => {
    for (const [key, value] of Object.entries(obj1)) {
        if (obj2[key as keyof Object] !== value) return false;
    }
    return true;
};

const test = avaTest as TestFn<{ validTestFile: File, invalidTestFile: File }>;

test.before(t => {
    const validTestFile = FileBuilder(validTestFilePath);
    const invalidTestFile = FileBuilder(invalidTestFilePath);

    if (!validTestFile.exists())
        validTestFile.create();
    validTestFile.write(validConfig);
    if (!invalidTestFile.exists())
        invalidTestFile.create();
    invalidTestFile.write(invalidConfig);

    t.context.validTestFile = validTestFile;
    t.context.invalidTestFile = invalidTestFile;
    return;
});

test.skip("Default file returned on invalid file path", (t) => {
    const testConfig = new TestConfigFileDefault("");
    const defaultConfig = testConfig.getDefault();
    const config = testConfig.get();

    t.false(testConfig.fileExist());
    t.false(testConfig.isValid());
    t.true(hasSameKeys(defaultConfig, config));
    t.true(hasSameValues(defaultConfig, config));
});

test("Default config returned on invalid config in file", (t) => {
    const testConfig = new TestConfigFileDefault(invalidTestFilePath);
    const defaultConfig = testConfig.getDefault();
    const config = testConfig.get();

    t.true(testConfig.fileExist());
    t.false(testConfig.isValid());
    t.true(hasSameKeys(defaultConfig, config));
    t.true(hasSameValues(defaultConfig, config));
});

test("Config returned on valid config in file", (t) => {
    const testConfig = new TestConfigFileDefault(validTestFilePath);
    const defaultConfig = testConfig.getDefault();
    const config = testConfig.get();

    t.true(testConfig.fileExist());
    t.true(testConfig.isValid());
    t.true(hasSameKeys(defaultConfig, config));
    t.false(hasSameValues(defaultConfig, config));
});

test("Restore default configuration", t => {
    const fixableTestFilePath = resolve(tmpdir(), "fixableTestFile.json");
    const fixableTestFile = FileBuilder(fixableTestFilePath);

    if (!fixableTestFile.exists())
        fixableTestFile.create();
    fixableTestFile.write(validConfig);

    const testConfig = new TestConfigFileDefault(fixableTestFilePath);
    const defaultConfig = testConfig.getDefault();
    let config = testConfig.get();

    t.true(testConfig.fileExist());
    t.true(testConfig.isValid());
    t.true(hasSameKeys(defaultConfig, config));
    t.false(hasSameValues(defaultConfig, config));

    testConfig.restoreDefault();
    config = testConfig.get();

    t.true(testConfig.fileExist());
    t.true(testConfig.isValid());
    t.true(hasSameKeys(defaultConfig, config));
    t.true(hasSameValues(defaultConfig, config));
});

test.after.always("Cleanup", t => {
    t.context.validTestFile.remove();
    t.context.invalidTestFile.remove();
});
