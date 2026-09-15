#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script [-v] [-y] [-t] [-i] [-c] <sql_file>"
    echo2 "-v: Verbose mode."
    echo2 "-y: Executes the sql without asking for your confirmation."
    echo2 "-t: Test mode. Does not execute the sql."
    echo2 "-i: Inserts records."
    echo2 "-c: Creates database."
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
    local cpp_file="$sql_file.cpp"

    # オプション解釈
    local confirm=1
    local test_mode=0
    local insert_records=0
    local create_database=0

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
            elif [[ "$option" =~ -i ]]; then
                insert_records=1    # いくつかのテーブルに最初のレコードを挿入（つまり、本当に最初の初期化。バックアップからのリストアは無し）
            elif [[ "$option" =~ -c ]]; then
                create_database=1
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

    # cpp による前処理
    if [ $confirm -eq 0 ]; then
        cpp "-D_DB_NAME_=$DB_NAME" "-D_INSERT_RECORDS_=$insert_records" "$sql_file" -o - | grep -v '^#' > "$cpp_file"
        if [ $? -ne 0 ]; then
            return $?
        fi
    else
        cpp "-D_DB_NAME_=$DB_NAME" "-D_INSERT_RECORDS_=$insert_records" "$sql_file" -o - | grep -v '^#' > "$cpp_file" |& less
        if [ $? -ne 0 ]; then
            return $?
        fi
        diff --ignore-space "$sql_file" "$cpp_file" | less
    fi

    # 確認
    echo2 "create_database: $create_database"
    echo2 "psql -x -h $DB_HOST -p $DB_PORT -f $cpp_file $DB_NAME $DB_USER"

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

    # DB 作成
    if [ $create_database -eq 1 ]; then
        cat <<SQL | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME WITH ENCODING = 'UTF8';
SQL
        if [ $? -ne 0 ]; then
            return 1
        fi
    fi

    # SQL 実行
    psql -x -h "$DB_HOST" -p "$DB_PORT" -f "$cpp_file" "$DB_NAME" "$DB_USER"

    return $?
}

main $*

exit $?
