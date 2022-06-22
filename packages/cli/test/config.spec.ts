import { ProfileConfig } from "../src";

import test from "ava";
import { defaultConfigProfileFile } from "../src/lib/paths";

test("CliConfig validation test", t => {
    const cliConfig = new ProfileConfig(defaultConfigProfileFile);

    const testConfigValidation = (key: string, validData: any[], invalidData: any[]) => {
        validData.forEach(valid => {
            t.truthy(cliConfig.validateConfigValue(key, valid), `${key} ${valid} truthy failed`);
        });
        invalidData.forEach(invalid => {
            t.falsy(cliConfig.validateConfigValue(key, invalid), `${key} ${invalid} falsy failed`);
        });
    };

    const validEnv = ["production", "development"];
    const validToken = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBLb3dhbHNraSIsImlhdCI6MTUxNjIzOTAyMn0.tgHyqtA_hPO94mvcY_zLpHBwvQeaYK7_9mgqjgFlZvQ"];
    const validUrl = ["http://127.0.0.1:8000/api/v1", "http://www.scramjet.org"];

    const middlewareInvalidUrl = ["127.0.0", "someText", 123];
    const invalidUrl = [...middlewareInvalidUrl, ""];
    const invalidData = ["someText", " ", 123, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBLb3dhbHNraSIsImlhdCI6MTUxNjIzOTAyMn0tgHyqtA_hPO94mvcY_zLpHBwvQeaYK7_9mgqjgFlZv"];
    const invalidDataWithEmpty = [...invalidData, ""];

    testConfigValidation("apiUrl", validUrl, invalidUrl);
    testConfigValidation("middlewareApiUrl", [...validUrl, ""], middlewareInvalidUrl);
    testConfigValidation("env", validEnv, invalidDataWithEmpty);
    testConfigValidation("token", validToken, invalidData);
});
