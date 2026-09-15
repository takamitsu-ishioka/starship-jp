#!/bin/bash
# コードから文字列を探す。

source ~/bin/config.sh

_proj_root_dir="`dirname $_absolute_script_dir`"

function usage() {
    echo2 "$_script: $*"
    echo2 "usage: $_script <regex>"
    exit 1
}

if [ $# -lt 1 ]; then
    usage 'too few arguments';
fi

regex="$1"

find $_proj_root_dir -maxdepth 2 -type f -exec egrep -wH "$regex" {} \;
