#!/bin/bash
# ./_update.sh から find 経由で呼ばれる。

# $1=/tmp/_update.sh.8522/prerender-beta.starship.jp/layout-search-left.html    古いパス
# $2=/tmp/_update.sh.8522/prerender-beta.starship.jp                            古いプロジェクトディレクトリ
# $3=/tmp/_update.sh.8522/prerender-dev.starship.jp                             新しいプロジェクトディレクトリ
# または
# $1=/tmp/_update.sh.8522/prerender-dev.starship.jp/layout-search-left.html     古いパス
# $2=/tmp/_update.sh.8522/prerender-dev.starship.jp                             古いプロジェクトディレクトリ
# $3=/tmp/_update.sh.8522/prerender-beta.starship.jp                            新しいプロジェクトディレクトリ

function echo2() {
    echo "$*" 1>&2
}

_verbose=0
if [ "$1" = '--verbose' ]; then
    _verbose=1
    shift
fi

older_path="$1"
older_dir="$2"
newer_dir="$3"
older_dir_len=${#older_dir}
let older_dir_len++
path="${older_path:$older_dir_len}"
newer_path="$newer_dir/$path"
older_path_relative="`basename $older_dir`/$path"
newer_path_relative="`basename $newer_dir`/$path"

if [ ! -e "$newer_path" ]; then
    echo "<<<<<<< $older_path_relative => $newer_path_relative >>>>>>>"
    echo "$newer_path_relative deleted"
    exit 0
fi

diff --ignore-space-change "$older_path" "$newer_path" > /dev/null
if [ $? -eq 0 ]; then
    if [ $_verbose -eq 1 ]; then
        echo2 "<<<<<<< $older_path_relative => $newer_path_relative >>>>>>>"
        echo2 'Unchanged'
    fi
    exit 0
fi
echo "<<<<<<< $older_path_relative => $newer_path_relative >>>>>>>"
if [ $_verbose -eq 1 ]; then
    echo2 "<<<<<<< $older_path_relative => $newer_path_relative >>>>>>>"
    diff --ignore-space-change "$older_path" "$newer_path" 1>&2
fi
diff --ignore-space-change "$older_path" "$newer_path"
exit 0
