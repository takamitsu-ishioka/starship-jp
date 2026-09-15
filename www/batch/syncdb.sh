#!/bin/bash
# syncdb.sh - DB を PayPal サーバーのデータと同期する node.js スクリプトを実行する bash スクリプト

source ~/bin/config.sh

# daemon から実行されている（制御端末が存在しない）場合
if [ $_isTty -eq 0 ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
fi

cd "`dirname $0`"

source ../config/main.sh

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script (loop|once)"
    exit 1
}

_cwd="`pwd`"
_doc_root="`dirname $_cwd`"

: <<___
/*
QuerySyncDB():

syncdbs テーブルからデータを取得する

返却値：全カラムの値の配列

 next_index | per_minutes | updated_by    |         created_at         |         updated_at         
------------+-------------+---------------+----------------------------+----------------------------
          0 |         360 | not_syncdb.sh | 2023-03-30 00:26:11.184884 | 2023-03-30 00:26:11.184884
(1 row)

psql（postgresql のクライアントの CUI コマンド）で csv 形式で出力する方法
psql -t -A -F , ...
-t      ヘッダーを出力しない（タプルのみ。t は多分 tuple の t）
-A      出力のカラムの位置を合わせない
-F ,    出力のカラムを '|' ではなく ',' で区切る
0,360,not_syncdb.sh,2023-03-30 00:26:11.184884,2023-03-30 00:26:11.184884
*/
___

function QuerySyncDB() {
    local fields=($(cat <<SQL | psql -t -A -F , -h "$_db_host" "$_db_name" "$_db_user"
SELECT * FROM syncdbs;
SQL
))
    local csv="${fields[@]}"
    csv="${csv// /T}"
    csv="${csv//,/ }"
    echo "$csv"
}

: <<___
/*
CanUpdateSyncDB():

syncdbs テーブルの更新を試みる。
前回の更新から per_minutes 分以上経過しており、かつ、今回の更新が自分の番なら更新が成功する。

返却値：
    0 更新成功
    1 まだ時間ではないか、自分の番ではない
    2 SQL エラー？
*/
___

function CanUpdateSyncDB() {
    local host_count=${#_hostnames[@]}
    local result=($(cat <<SQL | psql -h "$_db_host" "$_db_name" "$_db_user"
UPDATE syncdbs SET
next_index = next_index + 1,
updated_by = '$_hostname',
updated_at = NOW()
WHERE next_index % $host_count = $_local_host_index
--#テスト用 AND updated_at + ('1 minutes')::INTERVAL <= NOW()
AND updated_at + (per_minutes || ' minutes')::INTERVAL <= NOW()
SQL
))
    if [ ${#result[@]} -ne 2 ]; then
        return 2
    fi
    local updated_record_count=${result[1]}
    if [ $updated_record_count -ne 1 ]; then
        return 1;
    fi
    return 0
}

function UpdateSyncDB() {
    if [ $_isTty -eq 1 ]; then
        log "node ./syncdb.js $_isDev $_isTty |& cat"
        node ./syncdb.js $_isDev $_isTty |& cat
    else
        log "node ./syncdb.js $_isDev $_isTty"
        node ./syncdb.js $_isDev $_isTty
    fi
    return $?
}

syncdb_csv=(`QuerySyncDB`)
_per_minutes=${syncdb_csv[1]}
let _sleep_seconds=$_syncdb_check_interval*60

function UpdateSyncDBLoop() {
    local status
    while [ 0 -eq 0 ]
    do
        CanUpdateSyncDB
        status=$?
        if [ $status -eq 0 ]; then
            UpdateSyncDB
        elif [ $status -eq 1 ]; then
            [ $_isTty -eq 1 ] && log "The time hasn't come or it's not my turn."
        else
            local now="`date +'%Y-%m-%d %H:%M:%S'`"
            log 'Probably an SQL error.'
            local body="$(cat <<BODY
$_script reported a probable SQL error.
where: $_hostname:$_doc_root
when: $now
BODY
)"
            send_alert_mail2 "no-reply@$_hostname" 'ishioka@starship.jp' "$_script ERROR" "$body"
        fi
        [ $_isTty -eq 1 ] && log "sleeping $_sleep_seconds seconds"
        sleep $_sleep_seconds
    done
}

function main() {
    local argv=($*)
    local argc=${#argv[@]}
    if [ 0 -eq $argc ]; then
        usage 'too few arguments'
    fi
    local command="${argv[0]}"
    if [ "$command" = 'loop' ]; then
        :
    elif [ "$command" = 'once' ]; then
        :
    else
        usage "command $command unknown"
    fi
    log "_isDev=$_isDev"
    log "_isTty=$_isTty"
    log "_syncdb_check_interval=$_syncdb_check_interval"
    log "_per_minutes=$_per_minutes"
    log "_sleep_seconds=$_sleep_seconds"
    if [ "$command" = 'loop' ]; then
        UpdateSyncDBLoop    # This function never returns.
    else
        UpdateSyncDB
    fi
    return $?
}

main $*

exit $?
