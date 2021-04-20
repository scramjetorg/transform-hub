import { When, Then } from "cucumber";


When("calculate avereage delay time of first {string} function calls starting {string}", async (numberOfProbes, startFromProbe) => {
    console.log(numberOfProbes, startFromProbe);
    return "pending";
});

Then("calculated avereage delay time is lower than {string} ns", async (acceptedDelayInNs) => {
    console.log(acceptedDelayInNs);
    return "pending";
});
