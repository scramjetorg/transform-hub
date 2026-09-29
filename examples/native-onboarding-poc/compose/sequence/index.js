module.exports = async function* (input, { instance }) {
  const value = await instance.rpc("native.compose.echo").call({ value: String(input) });
  yield value.output;
};
