#!/bin/bash
# control.sh - syncdb.sh を起動／停止／状態表示

source ~/bin/config.sh

cd "`dirname $0`"

cwd="`pwd`"
_syncdb_sh="$cwd/syncdb.sh"

function usage() {
    echo2 "$_script: $*"
    echo2 "$_script starts, stops, shows status of, or immediately runs syncdb.sh."
    echo2 "usage: $_script (start|stop|status|run)"
    exit 255
}

function start() {
    local pids=(`pgrep -f $_syncdb_sh`)
    local pid_count=${#pids[@]}
    if [ 0 -lt $pid_count ]; then
        log "$_syncdb_sh already started"
        return 1
    fi
    if [ -e './syncdb.log' ]; then
        if [ ! -e './syncdb.logs' ]; then
            mkdir './syncdb.logs'
            if [ $? -ne 0 ]; then
                log "can't create ./syncdb.logs"
                return 1
            fi
        fi
        local now="`date +'%Y-%m-%d_%H:%M:%S'`"
        mv './syncdb.log' "./syncdb.logs/$now"
    fi
    "$_syncdb_sh" 'loop' > './syncdb.log' 2>&1 &
    status 'verbose'
    if [ $? -ne 0 ]; then
        log "can't start $_syncdb_sh"
        return 1
    fi
    return 0
}

function stop() {
    local pids=(`pgrep -f $_syncdb_sh`)
    local pid_count=${#pids[@]}
    if [ $pid_count -eq 0 ]; then
        log "process of $_syncdb_sh not found"
        return 1
    fi
    kill -SIGHUP ${pids[@]}
    local slept=0
    local max_sleep=3
    while [ $slept -lt $max_sleep ]
    do
        sleep 1
        local pids_=(`pgrep -f $_syncdb_sh`)
        local pid_count_=${#pids_[@]}
        if [ $pid_count_ -eq 0 ]; then
            log "${pids[@]} killed"
            return 0
        fi
        let slept++
    done
    log "can't kill ${pids[@]}"
    return 1
}

function status() {
    local verbose
    if [ "$1" = '' ]; then
        verbose=0
    else
        verbose=1
    fi
    local pids=(`pgrep -f $_syncdb_sh`)
    local pid_count=${#pids[@]}
    if [ $pid_count -eq 0 ]; then
        if [ $verbose -eq 1 ]; then
            echo2 "process of $_syncdb_sh not found"
        fi
        return 1
    fi
    if [ $verbose -eq 1 ]; then
        local pids_str="${pids[@]}"
        local pids_csv="${pids_str// /,}"
        ps -p "$pids_csv" -o "$_ps_columns"
    fi
    return 0
}

function run() {
    "$_syncdb_sh" 'once'
    return $?
}

if [ "$#" -lt 1 ]; then
    usage 'too few arguments'
fi

command="$1"

shift

case "$command" in
    star*)
    start
    ;;
    sto*)
    stop
    ;;
    stat*)
    status 'verbose'
    ;;
    r*)
    run
    ;;
    *)
    usage "command \"$command\" unknown"
    ;;
esac

exit $?
