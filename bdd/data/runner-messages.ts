export const runnerMessages = new Map([
    ["KILL", "[4002,{}]"],
    ["PING", "[4000,{}]"],
    ["PONG", "[3000,{}]"],
    ["ALIVE", "[3010,{}]"],
    ["ALIVE_RESPONSE", "[3004,{\"received\":3010}]"],
    ["HEALTHY", "[3010,{\"healthy\":true}]"],
    ["INCORRECT", "INCORRECT"],
    ["INCORRECT_MESSAGE_RESPONSE", "[3004,{\"received\":\"unknown message\"}]"],
]);