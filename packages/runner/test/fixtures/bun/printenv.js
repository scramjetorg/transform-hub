for (const key of Object.keys(process.env).sort()) {
    console.log(`${key}=${process.env[key]}`);
}
