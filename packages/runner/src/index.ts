import { Runner } from "./mock/runner";

const options = {
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || "", 10)
};
const runner = new Runner(options);

runner.start();
