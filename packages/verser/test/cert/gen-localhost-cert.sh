#!/bin/bash

# Private key for root CA
openssl genrsa -des3 -out myCA.key -passout pass:test 2048

#  root CA
openssl req -x509 -new -nodes -key myCA.key -sha256 -days 825 -out myCA.pem -passin pass:test -subj '/CN=www.mydom.com/O=My Company Name LTD./C=US'

# key for cert
openssl genrsa -out localhost.key 2048

# cert
openssl req -new -key localhost.key -out localhost.csr -subj '/CN=localhost/O=My Company Name LTD./C=US'

>localhost.ext cat <<-EOF
authorityKeyIdentifier = keyid,issuer
basicConstraints = CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF

# sign cert
openssl x509 -req -in localhost.csr -CA myCA.pem -CAkey myCA.key -passin pass:test -CAcreateserial -out localhost.crt -days 825 -sha256 -extfile localhost.ext

