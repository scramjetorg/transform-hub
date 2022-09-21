#!/bin/bash

testArgs='[2,{"nextKey":"nextValue"},"anotherString"]'

si="yarn start:dev"
siDeploy="$si seq deploy"
siDeployArgs="$si seq deploy --args '$testArgs'"
siStartArgs="$si seq start - --args '$testArgs'"

argsPackage="args_test.tar.gz"
noArgsPackage="no_args_test.tar.gz"

function exitOnFail {
    if [ $1 -ne 0 ]
    then
        exit 1;
    fi    
}

# # sequence and instance with no args
eval "$siDeploy $noArgsPackage"
exitOnFail $?

# instance with args from si send --args
eval "$siStartArgs"
exitOnFail $?

# # sequence and instance with args from si deploy --args
eval "$siDeployArgs $noArgsPackage"
exitOnFail $?

# # sequence and instance with args in package.json
eval "$siDeploy $argsPackage"
exitOnFail $?

# # instance with args from si send --args and in package.json
eval "$siStartArgs"
exitOnFail $?

# # instance with args from si deploy --args  and in package.json
eval "$siDeployArgs $noArgsPackage"
exitOnFail $?

echo "Instance and sequence creation succesfull"