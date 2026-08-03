import { Given } from "@cucumber/cucumber";

Given("I sleep for {int} ms", async (milliseconds: number) => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
});
