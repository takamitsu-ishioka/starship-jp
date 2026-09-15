#!/bin/bash

source ~/bin/config.sh

server_uri='https://api-m.sandbox.paypal.com/v1/billing/plans?product_id=PROD-0WW27358MA1869522&page_size=2&page=1&total_required=true'

curl -v -X GET "$server_uri" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer A21AAJJ5VGhgvGLWojuNqmSa89MzuwtEWDC2i9bUoWFqhjbGLGxSlB8v2UZ5gP8M-BZrO57WwqcJppM7DWQz5NqYK7XszK9BA"
