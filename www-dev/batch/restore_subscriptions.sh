#!/bin/bash
# restore_subscriptions.sh - DB に保存し損ねたサブスクリプションを半自動（ID 指定）で保存する

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
    echo2 "usage: $_script <paypal subscription id 1> [<paypal subscription id 2> ...]"
    exit 1
}

_cwd="`pwd`"
_doc_root="`dirname $_cwd`"

function main() {
    local argv=($*)
    local argc=${#argv[@]}
    if [ 0 -eq $argc ]; then
        usage 'too few arguments'
    fi
    log "_isDev=$_isDev"
    log "_isTty=$_isTty"
    node ./restore_subscriptions.js $_isDev $_isTty ${argv[@]}
    return $?
}

main $*

exit $?
