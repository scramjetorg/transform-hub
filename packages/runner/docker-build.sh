yarn build
NO_INSTALL=true OUT_DIR=docker-tmp LOCAL_PKGS=true node ../../scripts/publish.js

cd ../model

yarn build
NO_INSTALL=true OUT_DIR=docker-tmp LOCAL_PKGS=true node ../../scripts/publish.js

cd ../runner

mkdir -p docker-tmp

cp -r ../../docker-tmp ./docker-tmp/

echo "Building image"
docker build -t scramjet/runner:latest .

rm -rf docker-tmp
rm -rf ../../docker-tmp
