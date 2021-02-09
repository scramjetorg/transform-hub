mkdir -p /tmp/docker-tmp/src/runner

cp -r . /tmp/docker-tmp/src/runner
cp -r ../types /tmp/docker-tmp/src
cp -r ../symbols /tmp/docker-tmp/src

cp -r ../../conf /tmp/docker-tmp/

cp -r /tmp/docker-tmp ./docker-tmp/

docker build . -t scramjet/runner:latest

rm -rf /tmp/docker-tmp
rm -rf ./docker-tmp
