export const envs = {
    nodeEnv: process.env.NODE_ENV,
    siConfigEnv:  process.env.SI_CONFIG,
    siConfigPathEnv:  process.env.SI_CONFIG_PATH,
};

export const isDevelopment = () => envs.nodeEnv === "development";
export const isCompletionScript = () => envs.nodeEnv === "completion";
export const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];

