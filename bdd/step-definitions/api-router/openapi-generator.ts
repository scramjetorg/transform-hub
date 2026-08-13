import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { CustomWorld } from "../world";

type GeneratorResult = { code: number | null; stdout: string; stderr: string };

type GeneratorState = {
    binary: string;
    schema: string;
    result?: GeneratorResult;
    outputPath?: string;
};

function state(world: CustomWorld): GeneratorState {
    if (!world.resources.apiRouterGenerator) {
        world.resources.apiRouterGenerator = {
            binary: resolve(__dirname, "../../../dist/api-router/bin/generate.js"),
            schema: resolve(__dirname, "../../fixtures/api-router-openapi/schema.cjs")
        } as GeneratorState;
    }
    return world.resources.apiRouterGenerator as GeneratorState;
}

async function runGenerator(world: CustomWorld, args: string[]): Promise<GeneratorResult> {
    const current = state(world);
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before invoking the API router generator");
    const child = spawn(process.execPath, [current.binary, ...args], {
        cwd: process.cwd(),
        env: isolation.environment()
    });
    world.scenarioLifecycle.ownChild(child, `api-router generator: ${args.join(" ")}`, { group: true });
    world.scenarioLifecycle.expect(child);

    return await collect(child);
}

async function collect(child: ChildProcessWithoutNullStreams): Promise<GeneratorResult> {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    return await new Promise<GeneratorResult>((resolveResult, reject) => {
        child.once("error", reject);
        child.once("close", code => resolveResult({ code, stdout, stderr }));
    });
}

function assertOpenApiFixture(output: string): void {
    const document = JSON.parse(output);
    assert.equal(document.openapi, "3.1.0");
    assert.ok(document.paths["/api/v2/health"]?.get, "schema fixture health route must be generated");
}

Given("the built API router generator and schema fixture are available", function(this: CustomWorld) {
    const current = state(this);
    assert.ok(existsSync(current.binary), `Built API router generator is unavailable at ${current.binary}; run npm --prefix packages/api-router run build.`);
    assert.ok(existsSync(current.schema), `API router schema fixture is unavailable at ${current.schema}`);
});

When("I run the built API router generator with the schema fixture", async function(this: CustomWorld) {
    const current = state(this);
    current.result = await runGenerator(this, [current.schema]);
});

When("I run the built API router generator with the schema fixture and an output file", async function(this: CustomWorld) {
    const current = state(this);
    const artifactDir = this.scenarioIsolation?.createArtifactDirectory("api-router-openapi");
    assert.ok(artifactDir, "ScenarioIsolation must provide an output directory");
    current.outputPath = join(artifactDir, "openapi.json");
    current.result = await runGenerator(this, [current.schema, current.outputPath]);
});

When("I run the built API router generator help", async function(this: CustomWorld) {
    const current = state(this);
    current.result = await runGenerator(this, ["--help"]);
});

Then("the generator stdout is an OpenAPI document containing the fixture health route", function(this: CustomWorld) {
    const result = state(this).result;
    assert.equal(result?.code, 0, result?.stderr);
    assertOpenApiFixture(result?.stdout || "");
});

Then("the generator output file is an OpenAPI document containing the fixture health route", function(this: CustomWorld) {
    const current = state(this);
    assert.equal(current.result?.code, 0, current.result?.stderr);
    assert.ok(current.outputPath && existsSync(current.outputPath), "generator must write its requested output file");
    assertOpenApiFixture(readFileSync(current.outputPath!, "utf8"));
});

Then("the generator help describes its schema argument and optional output file", function(this: CustomWorld) {
    const result = state(this).result;
    assert.equal(result?.code, 0, result?.stderr);
    assert.match(result?.stdout || "", /api-definition/);
    assert.match(result?.stdout || "", /output\.json/);
});
