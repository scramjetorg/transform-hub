export function processCommanderRunnerEnvs(envString: string): Record<string, string> {
    const pairs = envString.split(";").map(pair => pair.split("="));

    const transformedObject = pairs.reduce((acc, [key, value]) => {
        if (!key || key === "" || !value || value === "") {
            throw new Error("Invalid format for ENV variables. Please use the format key1=value1;key2=value2.");
        }

        return { ...acc, [key]: value };
    }, {});

    return transformedObject;
}
