#!/bin/bash

cd "`dirname $0`"

source ~/bin/config.sh

#find . -maxdepth 2 -type f -exec sed -i -e 's/TCPDetective/Starship.jp/g' {} \;
#find . -maxdepth 2 -type f -exec sed -i -e 's/tcpdetective.com/starship.jp/g' {} \;
#find . -maxdepth 2 -name \*.html -exec grep -wH 'tcpdetective' {} \; | grep -v '^./_static/'
find . -maxdepth 2 -name \*.html -exec grep -wH 'TCPDetective' {} \; | grep -v '^./_static/'
