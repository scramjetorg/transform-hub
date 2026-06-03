module.exports = async function lifecycleCallsSequence(input) {
    this.keepAlive(250);

    if (input.some((item) => item.command === "stop")) {
        this.end();
    }

    return input.map((item) => ({ command: item.command, handled: true }));
};
