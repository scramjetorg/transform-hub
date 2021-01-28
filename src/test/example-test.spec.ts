const test = require('ava');

test.before(async t => {
	t.context.letter = "g";
});

test('passing test', t => {
	t.pass();
});

test('context test', t => {
	t.is(t.context.letter, 'g');
});

test('async test', async t => {
	const bar = Promise.resolve('bar');
	t.is(await bar, 'bar');
});