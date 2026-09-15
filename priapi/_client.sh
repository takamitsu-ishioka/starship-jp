#!/bin/bash
# このサーバー（公開 API）をテストするクライアント。何とか言う GUI のツールより bash + node の方が、断然自由度が大きくて使いやすい。

source ~/bin/config.sh

_server_uri='http://www-dev1.tcpdetective.com'

# 指定のページを取得してみる（HTTP サーバースクリプトの動作確認など）
function Fetch() {
    local path="$1"
    local uri
    if [[ "$path" =~ ^/ ]]; then
        uri="$_server_uri$path"
    else
        uri="$_server_uri/$path"
    fi
    local verbose
    if [ $_verbose -eq 1 ]; then
        verbose='-v'
    else
        verbose=''
    fi
    curl $verbose -D - -X POST "$uri" \
        -d '_command=download_tarball' \
        -d '_account=ishioka@starship.jp' \
        -d '_password=garakame6'
}

Fetch '/api/'
