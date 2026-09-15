#!/bin/bash
# ../. と ../backup/. の *.html の差を表示する。

source ~/bin/config.sh

_proj_root_dir="`dirname $_absolute_script_dir`"

function Diff() {
    local html
    for html in *.html
    do
        echo "<<<<<<< $_proj_root_dir/backup/$html => $_proj_root_dir/$html >>>>>>>"
        diff --ignore-space-change "$_proj_root_dir/backup/$html" "$_proj_root_dir/$html"
    done
}

cd "$_proj_root_dir/backup"
if [ $? -ne 0 ]; then
    log "can't cd to $_proj_root_dir/backup"
    exit 1
fi
Diff
cd "$_cwd"
