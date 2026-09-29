"use strict";

module.exports = async function* caller(_input) {
  const contract = {
    "native.compose.echo": {
      request: value => Boolean(value && Object.getPrototypeOf(value) === Object.prototype && Reflect.ownKeys(value).length === 0),
      response: value => Boolean(value && value.ready === true && typeof value.value === "string")
    }
  };
  const result = await this.hubClient().instance(this.config.providerId).rpc(contract).call(
    "native.compose.echo",
    {}
  );
  yield result;
};
