set -e

DOCKER=false
TS=false
INSTALL=false
PREINSTALL=false

echo "DEPRECATED: This isn't the script you're looking for."

exit 10

show_help () {
    printf \
"
-t, --typescript            use ts-node
-i, --install               yarn install
-d, --docker                builds images: lerna run build:docker
-pi, --pre-install          lerna run prepack, lerna run prepare-sample-tar
"
    exit 0
}

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
        case $arg in
            -pi|--pre-install)
            PREINSTALL=true
            shift
            ;;
        esac
        case $arg in
            -h|--help)
            show_help
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
if [ "$TS" = false ] ; then
    yarn bic
fi

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

# start hostOne - package.json simulates config file
if [ "$TS" = true ] ; then

    cd $(git rev-parse --show-toplevel)/packages/host-one/src/bin
    ts-node start-host-one.ts ../../../pre-runner/sample-package/package.tar.gz ../../package.json /package/data.json output.txt
else
    cd $(git rev-parse --show-toplevel)
    node dist/host-one/bin/start-host-one.js packages/pre-runner/sample-package/package.tar.gz package.json /package/data.json output.txt
fi

