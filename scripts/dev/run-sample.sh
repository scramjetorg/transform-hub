set -e

# build example to dist
lerna run build
lerna run build:docker

# tar example
cd $(git rev-parse --show-toplevel)
cd packages/pre-runner

yarn prepare-sample-tar

# copy to dist
lerna run prepack

# start hostOne - package.json simulates config file
cd $(git rev-parse --show-toplevel)
node dist/host-one/bin/start-host-one.js packages/pre-runner/sample-package/package.tar.gz package.json /package/data.json output.txt
