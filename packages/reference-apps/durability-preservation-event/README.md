# durability-preservation-event

The sequence gets the file from the address given in the first parameter.
The file is downloaded periodically. The time interval is specified in the second parameter (with seconds).
After requesting file, the sequence emits an event with response status code and current date in ISO format (string).

## Prepare sequence

```
# in sequence directory
$ yarn build
```

## Send sequence
```
# in packages/reference-apps directory
$ SEQ_ID=$( \
    curl --location --request POST "http://localhost:8000/api/v1/sequence" \
    --header 'content-type: application/octet-stream' \
    --data-binary '@durability-preservation-event.tar.gz' | jq ".id" -r \
)
```

## Start sequence with args
```
[file address, interval in seconds]
```
replace ip with your STH ip
```
$ INSTANCE_ID=$(curl --location --request POST "http://localhost:8000/api/v1/sequence/$SEQ_ID/start" \
--header 'content-type: application/json' \
--data-raw '{
    "appConfig": {},
    "args": ["https://assets.scramjet.org/scp-store/durability-test/file1.bin", "60"]
}' | jq ".id" -r)
```
