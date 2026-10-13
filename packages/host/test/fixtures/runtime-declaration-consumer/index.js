module.exports = {
    default(input) {
        this.keepAlive(60_000);
        const operation = this.hubClient().instance(this.config.producerInstanceId).getEvent;

        return operation.get({ params: { name: "runtime-declaration" } }).then((response) => {
            if (response.status !== 200) {
                throw new Error(`Expected HTTP 200 retrieving declaration, received ${response.status}`);
            }
            if (response.body?.event?.runId !== this.config.runId) {
                throw new Error("The producer declaration did not match the consumer run ID");
            }

            this.emit("runtime-declaration-observed", {
                operation: "instance.getEvent.get",
                producerInstanceId: this.config.producerInstanceId,
                consumerInstanceId: this.instanceId,
                status: response.status,
                response: response.body
            });

            return input;
        });
    }
};
