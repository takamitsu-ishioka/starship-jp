#!/bin/bash

source ~/bin/config.sh

cd "`dirname $0`"

_prerender_api='http://prerender-dev1.starship.jp/'

curl -v -D - -X POST "$_prerender_api" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "_account=ishioka@starship.jp" \
    -d "_password=garakame6" \
    -d "_command=list_pages"
