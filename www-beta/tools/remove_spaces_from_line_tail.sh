#!/bin/bash
# ../*.html から行末のスペースの連続を取り除く。

source ~/bin/config.sh

_proj_root_dir="`dirname $_absolute_script_dir`"

function RemoveSpacesFromLineTail() {
    local html
    for html in *.html
    do
        sed -r -e 's/ +$//' "$html" > "../$html"
        echo "<<<<<<< $html => ../$html >>>>>>>"
        diff "$html" "../$html"
        echo2 "<<<<<<< $html => ../$html >>>>>>>"
        diff --ignore-space-change "$html" "../$html" 1>&2
    done
}

cd "$_proj_root_dir/backup"
if [ $? -ne 0 ]; then
    log "can't cd to $_proj_root_dir/backup"
    exit 1
fi
RemoveSpacesFromLineTail
cd "$_cwd"
