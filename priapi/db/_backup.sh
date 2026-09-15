#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script"
    exit 1
}

function main() {
    # パラメータチェック
    local argv=($*)
    local argc="${#argv[@]}"

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
    local now="`TZ='Asia/Tokyo' date +'%Y-%m-%d_%H:%M:%S'`"
    echo2 "pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -a -t syncdbs -t paypal_accounts -t paypal_apps -t paypal_access_tokens -t paypal_products -t paypal_plan_templates -t users -t subscriptions -t subscription_logs -t request_logs -t command_logs -t support_cases -t support_case_messages -t support_case_attachments -t console_access_logs > _tcpdetective_$DB_NAME_$now.sql"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -a -t syncdbs -t paypal_accounts -t paypal_apps -t paypal_access_tokens -t paypal_products -t paypal_plan_templates -t users -t subscriptions -t subscription_logs -t request_logs -t command_logs -t support_cases -t support_case_messages -t support_case_attachments -t console_access_logs > "_tcpdetective_$DB_NAME_$now.sql"
}

main $*

exit $?
