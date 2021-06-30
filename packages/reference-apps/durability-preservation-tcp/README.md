Sequence downloads following files every second:
```
[
    "https://repo.int.scp.ovh/repository/scp-store/durability-test/file1.bin",
    "https://repo.int.scp.ovh/repository/scp-store/durability-test/file2.bin",
    "https://repo.int.scp.ovh/repository/scp-store/durability-test/file3.bin"
]
```

build everything:
```
yarn install && yarn build && yarn prepack && yarn packseq
```

## Run test
(from bdd dir)
```
yarn install
```

### Test variations

At least 5 sequences for 15 minutes, check after 6 minutes.
```
yarn test:bdd --name "PT-003 TC-001"
```

At least 25 sequences for 2 hours, check after 1 hour
```
yarn test:bdd --name "PT-003 TC-002"
```

At least 25 sequences for 25 hours, check after 24 hour
```
yarn test:bdd --name "PT-003 TC-003"
```

## Run sequence standalone

prepare sequence
```
✘-INT ~/github/scramjet-csi-dev/packages/reference-apps/durability-preservation
$ yarn build && yarn prepack && yarn packseq
```

start host
```
✘-INT ~/github/scramjet-csi-dev
$ ts-node packages/host/src/bin/start.ts
```

send sequence
```
✘-INT ~/github/scramjet-csi-dev/packages/reference-apps/durability-preservation
$ SEQ_ID=$( \
    curl --location --request POST "http://localhost:8000/api/v1/sequence" \
    --header 'content-type: application/octet-stream' \
    --data-binary '@../durability-preservation.tar.gz' | jq ".id" -r \
)
```

args meaning:
```
60 - execution time (SECONDS)
128 - memory allocation size (MB),
[url, url, url] - list of urls of binary files to be downloaded every second
```

start sequence with args (replace ip with your machine ip)
```
$ INSTANCE_ID=$(curl --location --request POST "http://localhost:8000/api/v1/sequence/$SEQ_ID/start" \
--header 'content-type: application/json' \
--data-raw '{
    "appConfig": {},
    "args": [60, 128, ["https://repo.int.scp.ovh/repository/scp-store/durability-test/file1.bin","https://repo.int.scp.ovh/repository/scp-store/durability-test/file2.bin","https://repo.int.scp.ovh/repository/scp-store/durability-test/file3.bin"]]
}' | jq ".id" -r)
```

send event
```
curl --location --request POST "http://localhost:8000/api/v1/instance/$INSTANCE_ID/_event" \
--header 'Content-Type: application/json' \
--data-raw '[5001,{"eventName":"alive","message":"1234"}]'
```

get last event
```
curl --location --request GET "http://localhost:8000/api/v1/instance/$INSTANCE_ID/event" --header 'Transfer-Encoding: chunked' \
--header 'content-type: application/octet-stream'
```

Response should contains message sent in last event
