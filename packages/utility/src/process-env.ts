export function processCommanderEnvs(env: string[]) {
    const keyValuePairs = env.map((item: string) => {
        const [key, value] = item.split(":");

        if (!key || key === "" || !value || value === "") {
            throw new Error("Wrong ENV syntax");
        }

        return [key, value];
    });

    keyValuePairs.forEach((e) => {
        const name = e[0];

        process.env[name] = e[1];
    });
}
