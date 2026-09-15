#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script [-y]"
    echo2 "-y: Executes the sql without asking for your confirmation."
    exit 1
}

if [ 0 -lt ${#_options[@]} ]; then
    if [[ ! "${_options[@]}" =~ -y ]]; then
        usage "unknown option ${_options[@]}"
    fi
fi

db_specs=($(
php -r '{
    require_once(__DIR__ . "/../lib/config.php");
    printf("%s %d %s %s %s\n", DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS);
}'
))

DB_HOST="${db_specs[0]}"
DB_PORT="${db_specs[1]}"
DB_NAME="${db_specs[2]}"
DB_USER="${db_specs[3]}"
DB_PASS="${db_specs[4]}"

echo2 "psql -x -h $DB_HOST -p $DB_PORT -f ./prerender.sql $DB_NAME $DB_USER"

if [[ ! "${_options[@]}" =~ -y ]]; then
    read -p 'OK? (Y/n): ' answer
    if [ $? -ne 0 ]; then
        exit 1
    elif [ "$answer" = '' ]; then
        echo -n
    elif [[ ! "$answer" =~ ^[Yy] ]]; then
        exit 1
    fi
fi

psql -x -h $DB_HOST -p $DB_PORT -f ./prerender.sql $DB_NAME $DB_USER
