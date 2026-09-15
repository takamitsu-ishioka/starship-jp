#!/bin/bash

source ~/bin/config.sh

cd "`dirname $0`"

_prerender_api='http://prerender-dev1.starship.jp/'

function usage() {
    echo2 "$_script: $*"
    echo2 "usage1: $_script list account password"
    echo2 "usage2: $_script download <web page id> account password"
    exit 1
}

function ListPages() {
    local account="$1"
    local password="$2"
    curl -s -X POST "$_prerender_api" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "_account=$account" \
        -d "_password=$password" \
        -d "_command=list_pages" \
    | php -r '{
        $json_response = fgets(STDIN);
        $response = json_decode($json_response);
        if (!isset($response) || !is_object($response)) {
            fprintf(STDERR, "invalid response received from prerender API server\n");
            exit(1);
        } else if ($response->status != "success") {
            $pretty_response = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            fprintf(STDERR, "%s\n", $pretty_response);
            exit(1);
        } else {
            /*
            {
                "web_pages": [
                    {
                        "id": "1",
                        "user_id": "3",
                        "uri": "http://www-dev1.tcpdetective.com/",
                        "html": "216KB",
                        "created_at": "2023-06-05 22:22:47.378731"
                    }
                ],
                "status": "success"
            }
            */
            foreach ($response->web_pages as $web_page) {
                printf("%d %s %s %s\n", $web_page->id, $web_page->uri, $web_page->html, $web_page->updated_at);
            }
            exit(0);
        }
    }'
    return $?
}

function PrintPrerenderHead() {
    php -r '{
        $script = FALSE;
        for (; $line = fgets(STDIN); ) {
            if ($line == "<script>\n") {
                $script = TRUE;
                continue;
            } else if ($line == "</script>\n") {
                $script = FALSE;
                echo file_get_contents("./init.js");
                continue;
            }
            if ($script) {
                continue;
            }
            echo $line;
            if ($line == "<body>\n") {
                exit(0);
            }
        }
    }' < ../index.html
}

function PrintPrerenderTail() {
    cat <<TAIL

</body>
</html>
TAIL
}

function DownloadPage() {
    local web_page_id="$1"
    local account="$2"
    local password="$3"
    curl -s -X POST "$_prerender_api" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "_account=$account" \
        -d "_password=$password" \
        -d "_command=download_page" \
        -d "web_page_id=$web_page_id" \
    | php -r '{
        $json_response = fgets(STDIN);
        $response = json_decode($json_response);
        if (!isset($response) || !is_object($response)) {
            fprintf(STDERR, "invalid response received from prerender API server\n");
            exit(1);
        } else if ($response->status != "success") {
            $pretty_response = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            fprintf(STDERR, "%s\n", $pretty_response);
            exit(1);
        } else {
            /*
            {
                "web_page": {
                    "id": "1",
                    "user_id": "3",
                    "uri": "http://www-dev1.tcpdetective.com/",
                    "html": <html string>,
                    "created_at": "2023-06-05 22:22:47.378731"
                },
                "status": "success"
            }
            */
            echo $response->web_page->html;
            exit(0);
        }
    }'
    return $?
}

function main() {
    local argv=($*)
    local argc=${#argv[@]}

    # パラメータチェック
    if [ $argc -lt 3 ]; then
        usage 'too few arguments'
    fi
    local command="${argv[0]}"
    local web_page_id
    local account
    local password
    if [ "$command" = 'list' ]; then
        account="${argv[1]}"
        password="${argv[2]}"
    elif [ "$command" = 'download' ]; then
        if [ $argc -eq 4 ]; then
            web_page_id="${argv[1]}"
            if [[ "$web_page_id" =~ ^[0-9]+$ ]]; then
                account="${argv[2]}"
                password="${argv[3]}"
            else
                usage "invalid argument to command \"$command\""
            fi
        else
            usage "illegal number of arguments to command \"$command\""
        fi
    else
        usage "command $command unknown"
    fi

    # 関数呼び出し
    if [ "$command" = 'list' ]; then
        ListPages "$account" "$password"
    elif [ "$command" = 'download' ]; then
        PrintPrerenderHead
        DownloadPage $web_page_id "$account" "$password"
        PrintPrerenderTail
    else
        usage 'あり得へん！'
    fi

    return $?
}

main $*

exit $?
