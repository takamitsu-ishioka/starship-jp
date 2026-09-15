#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script [-v] [-y] [-t] <sql_file>"
    echo2 "-v: Verbose mode."
    echo2 "-y: Executes the sql without asking for your confirmation."
    echo2 "-t: Test mode. Does not execute the sql."
    echo2 "sql_file: Must *NOT* include table schemas."
    exit 1
}

function main() {
    # パラメータチェック
    local argv=($*)
    local argc="${#argv[@]}"
    if [ $argc -lt 1 ]; then
        usage 'too few arguments'
    fi
    local sql_file="${argv[0]}"

    # オプション解釈
    local confirm=1
    local test_mode=0

    if [ 0 -lt ${#_options[@]} ]; then
        local option
        for option in ${_options[@]}
        do
            if [[ "$option" =~ -v ]]; then
                :
            elif [[ "$option" =~ -y ]]; then
                confirm=0
            elif [[ "$option" =~ -t ]]; then
                test_mode=1
            else
                usage "unknown option $option"
            fi
        done
    fi

    # 設定読み込み
    local db_specs=($(
        php -r '{
            require_once(__DIR__ . "/../lib/config.php");
            printf("%s %d %s %s %s\n", DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS);
        }'
    ))

    local DB_HOST="${db_specs[0]}"
    local DB_PORT="${db_specs[1]}"
    local DB_NAME="${db_specs[2]}"
    local DB_USER="${db_specs[3]}"
    local DB_PASS="${db_specs[4]}"

    # 実行
    echo2 "psql -x -h $DB_HOST -p $DB_PORT -f $sql_file $DB_NAME $DB_USER"

    if [ $test_mode -eq 1 ]; then
        echo2 'The -t option is specified. The process will terminate here.'
        return 0
    fi

    if [ $confirm -eq 1 ]; then
        read -p 'OK? (Y/n): ' answer
        if [ $? -ne 0 ]; then
            return 1
        elif [ "$answer" = '' ]; then
            :
        elif [[ ! "$answer" =~ ^[Yy] ]]; then
            return 1
        fi
    fi

    psql -x -h "$DB_HOST" -p "$DB_PORT" -f "$sql_file" "$DB_NAME" "$DB_USER"
}

main $*

exit $?
