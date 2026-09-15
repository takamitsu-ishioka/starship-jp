#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function DistributeToAllServers() {
    local path="$1"
    local servers=(
        '/var/www/priapi-dev.tcpdetective.com'
        '/var/www/priapi-beta.tcpdetective.com'
        '/var/www/pricgi-dev.tcpdetective.com'
        '/var/www/pricgi-beta.tcpdetective.com'
        '/var/www/pubapi-dev.tcpdetective.com'
        '/var/www/pubapi-beta.tcpdetective.com'
    )
    local server
    for server in ${servers[@]}
    do
        echo2 "cp -p $path $server/."
        cp -p "$path" "$server/."
    done
}

while [ 0 -lt $# ]
do
    DistributeToAllServers "$1"
    shift
done

exit 0
