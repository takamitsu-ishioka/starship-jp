#!/bin/bash

# ログファイルのパス
LOG_FILE="./log.txt"

# 日付の取得
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# リクエストボディを取得
BODY=$(cat)

# ログに書き込み
echo "[$DATE] $BODY" >> "$LOG_FILE"

# レスポンスを返す
#echo "Status: 201 Created"         # この行を挿入
echo "Content-Type: text/plain"
echo ""
echo "Webhook received"
