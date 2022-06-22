export const envs = {
    nodeEnv: process.env.NODE_ENV,
    siConfigEnv:  process.env.SI_CONFIG,
    siConfigPathEnv:  process.env.SI_CONFIG_PATH,
};

export const isDevelopment = () => envs.nodeEnv === "development";
