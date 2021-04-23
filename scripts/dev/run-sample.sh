set -e

DOCKER=false
TS=false
INSTALL=false

for arg in "$@"
    do
        case $arg in
            -d|--docker)
            DOCKER=true
            shift
            ;;
        esac
        case $arg in
            -t|--typescript)
            TS=true
            shift
            ;;
        esac
        case $arg in
            -i|--install)
            INSTALL=true
            shift
            ;;
        esac
    done

# init project
cd $(git rev-parse --show-toplevel)

if [ "$INSTALL" = true ] ; then
    yarn install
fi

# build example to dist
yarn bic

if [ "$DOCKER" = true ] ; then
    lerna run build:docker
fi

# copy to dist
if [ "$PREINSTALL" = true ] ; then
# tar example
    cd $(git rev-parse --show-toplevel)
    cd packages/pre-runner
    lerna run prepack
    yarn prepare-sample-tar
fi

# copy to dist
if [ "$INSTALL" = true ] ; then
    lerna run prepack
    yarn prepare-sample-tar
fi

# start hostOne - package.json simulates config file
if [ "$TS" = true ] ; then

    cd $(git rev-parse --show-toplevel)/packages/host-one/src/bin
    ts-node start-host-one.ts ../../../pre-runner/sample-package/package.tar.gz ../../package.json /package/data.json output.txt
else
    cd $(git rev-parse --show-toplevel)
    node dist/host-one/bin/start-host-one.js packages/pre-runner/sample-package/package.tar.gz package.json /package/data.json output.txt
fi

