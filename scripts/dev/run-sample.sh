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

# start supervisor
cd $(git rev-parse --show-toplevel)
cd dist/supervisor/bin

SEQUENCE_PATH=../../../packages/pre-runner/sample-package/package.tar.gz node supervisor
