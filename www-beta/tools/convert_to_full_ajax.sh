#!/bin/bash
# サーバーサイドスクリプトが存在しない複数のページから成るウェブサイトを full ajax（全く画面遷移の無いウェブサイト）に変換するスクリプト。
# full ajax サイトは、ユーザーから指定されたページのデータを $.ajax() で取得し、その body 部をカレントページの DOM の body 部に挿入することで表示内容と動作を変更する。
# 従って、「プロセス」（＝「状態遷移を行うための状態と手続きのデータ」）は、すべて常にローカルメモリ上に存在することになり、画面の変化とは全く関係が無くなる。
# 「プロセス」が OS のプロセスと一致するという、昔からあるスタンドアロンプログラムの状態に戻る。
# これまでのウェブアプリでリモートホスト上に「プロセス」を擬似的に実現するために施されていた諸々の工夫（疑似セッション、セッションクッキー、LB 制御など）は不要になり、リモートホストは単なるデータの置き場となる。

# ただし、このスクリプトは作業しながらアドホックに書き換えたものであり、上の「full ajax に変換するスクリプト」という記述は、現状では完全なる羊頭狗肉、看板倒れ、不当表示。

# 230607 TODO: まず、全ての html と js から相対パスを無くす。script とか href とか img とかの src="foo" → src="/foo"。これをやっておくと prerendering がしやすくなる。

source ~/bin/config.sh

# コメントを手がかりにして __INCLUDE__ を挿入するタイプ
function ConvertHTMLs_1() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's/^([ \t]*)<!-- END SCRIPTS -->[ \t]*$/\1<!-- __INCLUDE__ \/js\/tail.js -->\n\0/i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "<!-- END SCRIPTS --> not found in $html"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# <script ...></script> をコメントアウトするタイプ
function ConvertHTMLs_2() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's/^[ \t]*<script .*jquery.min.js.*<\/script>[ \t]*$/<!-- \0 -->/i' \
        -e 's/^[ \t]*<script .*jquery-ui.min.js.*<\/script>[ \t]*$/<!-- \0 -->/i' \
        -e 's/^[ \t]*<script .*bootstrap.min.js.*<\/script>[ \t]*$/<!-- \0 -->/i' \
        -e 's/^[ \t]*<script .*common.js.*<\/script>[ \t]*$/<!-- \0 -->/i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "$html doesn't include jquery, bootstrap, or common"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# 既存の __INCLUDE__ の位置を変更するタイプ（そもそも存在しなければ変更できないので、まず削除を試み、削除できなければファイルを更新しない）
function ConvertHTMLs_3() {
    local tmpfile="$_script.$$"
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            echo2 "$html skipped"
            continue
        fi
        sed -r \
        -e '/^[ \t]*<!-- __INCLUDE__ \/includes\/login.html -->[ \t]*$/d' \
        "$html" > "$tmpfile"
        diff "$html" "$tmpfile" > /dev/null
        if [ $? -eq 0 ]; then
            rm "$tmpfile"
            echo2 "$html doesn't have matching lines"
            continue
        fi
        sed -r \
        -e 's/^([ \t]*)<!-- *END PLUGINS *-->[ \t]*$/\0\n\1<!-- __INCLUDE__ \/includes\/login.html -->/' \
        "$tmpfile" > "../$html"
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# 手がかりの行の後ろに複数行を挿入するタイプ
function ConvertHTMLs_4() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's/^([ \t]*)<script .*bootstrap.min.js.*<\/script>[ \t]*$/\0\n\1<script type="text\/javascript" src="\/js\/plugins\/noty\/jquery.noty.js"><\/script>\n\1<script type="text\/javascript" src="\/js\/plugins\/noty\/layouts\/topCenter.js"><\/script>\n\1<script type="text\/javascript" src="\/js\/plugins\/noty\/layouts\/topLeft.js"><\/script>\n\1<script type="text\/javascript" src="\/js\/plugins\/noty\/layouts\/topRight.js"><\/script>\n\1<script type="text\/javascript" src="\/js\/plugins\/noty\/themes\/default.js"><\/script>/i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "$html matching lines not found"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# ついに sed だけでなんとかする方針を捨てざるを得なくなった
function ConvertHTMLs_6() {
    local tmp="$_script.$$"
    cat << 'PHP' > $tmp
<?php
$message_box = FALSE;
$signout_message_box_found = FALSE;
for (; $line = fgets(STDIN); ) {
    if (strstr($line, '<!-- MESSAGE BOX-->')) {
        $message_box = $line;
    } else if (strstr($line, 'id="mb-signout"')) {
        $signout_message_box_found = TRUE;
    } else if (strstr($line, '<!-- END MESSAGE BOX-->')) {
        if ($signout_message_box_found) {
            $message_box = FALSE;
            $signout_message_box_found = FALSE;
        } else {
            echo $line;
        }
    } else {
        if ($signout_message_box_found) {
        } else {
            if ($message_box) {
                echo $message_box;
                $message_box = FALSE;
            }
            echo $line;
        }
    }
}
?>
PHP
    local html
    for html in *.html
    do
        php -f $tmp < "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            echo2 "id=\"mb-signout\" not found in $html"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
    rm $tmp
}

# 手がかりの行の後に挿入するタイプ
# sed -r -e 's/<pattern>/<replace>/' が使いにくいときは '/' の代わりに '#' を使うのが定番。
# だが '#' は bash の行コメントを示す文字なのでエディターが '#' 以降をコメントの色にしてしまったりする。
# '%' を使ったのは、それが理由。
function ConvertHTMLs_5() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's%^([ \t]*)<!-- __INCLUDE__ /includes/login.html -->[ \t]*$%\0\n\1<!-- __INCLUDE__ /includes/logout.html -->%i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            echo2 "<!-- __INCLUDE__ /includes/login.html --> not found in $html"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# 手がかりの行の前に挿入するタイプ
function ConvertHTMLs_8() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's%^([ \t]*)<!-- __INCLUDE__ /includes/login.html -->[ \t]*$%\1<!-- __INCLUDE__ /includes/message_box.html -->\n\0%' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "<!-- __INCLUDE__ /includes/login.html --> not found in $html"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# <script ...></script> をコメントアウトするタイプ
#        -e 's%^[ \t]*<script .*jquery.min.js.*</script>[ \t]*$%<!-- \0 -->%i' \
#        -e 's%^[ \t]*<script .*jquery-ui.min.js.*</script>[ \t]*$%<!-- \0 -->%i' \
#        -e 's%^[ \t]*<script .*bootstrap.min.js.*</script>[ \t]*$%<!-- \0 -->%i' \
function ConvertHTMLs_9() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's%^[ \t]*<script .*common.js.*</script>[ \t]*$%<!-- \0 -->%i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "$html doesn't include jquery, bootstrap, or common"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

function ExtractScripts() {
    local tmp="$_script.extract.$$"
    cat << 'PHP' > $tmp
<?php
$file = $argv[1];
$script = FALSE;
$plugins = FALSE;
$page_plugins = FALSE;
$template = FALSE;
for (; $line = fgets(STDIN); ) {
    if (strstr($line, '<!-- START SCRIPTS -->')) {
        $script = TRUE;
    } else if (strstr($line, '<!-- END SCRIPTS -->')) {
        $script = FALSE;
    } else {
        if ($script) {
            if (strstr($line, '<!-- START PLUGINS -->')) {
                $plugins = TRUE;
            } else if (strstr($line, '<!-- END PLUGINS -->')) {
                $plugins = FALSE;
            } else if (preg_match('/<!-- *END .*PAGE PLUGINS *-->/', $line)) {
                $page_plugins = FALSE;
            } else if (preg_match('/<!--.*PAGE PLUGINS *-->/', $line)) {
                $page_plugins = TRUE;
            } else if (preg_match('/<!-- *START TEMPLATE *-->/', $line)) {
                $template = TRUE;
            } else if (preg_match('/<!-- *END TEMPLATE *-->/', $line)) {
                $template = FALSE;
            } else {
                $match = [];
                if (preg_match('/^ *(<script .*><\/script>)/', $line, $match)) {
                    $script_tag = $match[1];
                    if ($plugins) {
                        printf("%s %s\n", 'PLUGINS', $script_tag);
                    } else if ($page_plugins) {
                        printf("%s %s\n", 'PAGE_PLUGINS', $script_tag);
                    } else if ($template) {
                        printf("%s %s\n", 'TEMPLATE', $script_tag);
                    }
                } else if (preg_match('/^ *<script>/', $line)) {
                    printf("%s %s\n", 'INLINE_SCRIPT', $file);
                }
            }
        }
    }
}
?>
PHP
    local html
    for html in *.html
    do
        php -f $tmp "$html" < "$html"
    done
    rm $tmp
}

function UnionScripts() {
    local tmp="$_script.union.$$"
    cat << 'PHP' > $tmp
<?php
$plugins = [];
$page_plugins = [];
$template = [];
$inline_scripts = [];
for (; $line = fgets(STDIN); ) {
    $line = trim($line);
    /*printf("%s\n", $line);*/
    $match = [];
    if (!preg_match('/^([^ ]+) (.+)$/', $line, $match)) {
        fprintf(STDERR, "IMPOSSIBLE!\n");
        exit(1);
    }
    $type = $match[1];
    $data = $match[2];
    $data = str_replace('type="text/javascript"', "type='text/javascript'", $data);
    $data = preg_replace_callback(
        '/src=["\']([^"\']+)["\']/',
        function($match) {
            $src = $match[1];
            if (substr($src, 0, 3) == 'js/') {
                $src = "/$src";
            }
            return "src='$src'";
        },
        $data
    );
        
    if ($type == 'PLUGINS') {
        $plugins[$data] = TRUE;
    } else if ($type == 'PAGE_PLUGINS') {
        $page_plugins[$data] = TRUE;
    } else if ($type == 'TEMPLATE') {
        $template[$data] = TRUE;
    } else if ($type == 'INLINE_SCRIPT') {
        $inline_scripts[$data] = TRUE;
    } else {
        fprintf(STDERR, "IMPOSSIBLE! 2: <%s>\n", $line);
        exit(1);
    }
}
printf("<<<<<<< PLUGINS >>>>>>>\n");
foreach ($plugins as $data => $value) {
    printf("%s\n", $data);
}
printf("<<<<<<< PAGE_PLUGINS >>>>>>>\n");
foreach ($page_plugins as $data => $value) {
    printf("%s\n", $data);
}
printf("<<<<<<< TEMPLATE >>>>>>>\n");
foreach ($template as $data => $value) {
    printf("%s\n", $data);
}
printf("<<<<<<< INLINE_SCRIPT >>>>>>>\n");
foreach ($inline_scripts as $data => $value) {
    printf("%s\n", $data);
}
?>
PHP
    php -f $tmp
}

# php スクリプトで情報を抽出
function ConvertHTMLs_10() {
    ExtractScripts | UnionScripts
}

# 手がかりの後ろに複数の行を挿入するタイプ（その2）
function ConvertHTMLs_11() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        elif [[ "$html" =~ ^_ ]]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's%^([ \t]*)<body.*>[ \t]*$%\0\n\1\1<!-- __INCLUDE__ /includes/loading.html -->\n\1\1<!-- __INCLUDE__ /includes/message_box.html -->\n\1\1<!-- __INCLUDE__ /includes/login.html -->\n\1\1<!-- __INCLUDE__ /includes/logout.html -->\n%i' \
        "$html" > "../$html"
        diff "$html" "../$html" > /dev/null
        if [ $? -eq 0 ]; then
            log "$html matching lines not found"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

function ConvertHTMLs_12() {
    local tmp="./tmp.$$"
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        elif [[ "$html" =~ ^_ ]]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's%^([ \t]*)<body.*>[ \t]*$%\0\n\n\1<!-- __INCLUDE__ /includes/head.html -->\n%i' \
        "$html" > "$tmp"
        diff "$html" "$tmp" > /dev/null
        if [ $? -eq 0 ]; then
            rm "$tmp"
            echo2 "$html: matching lines not found"
            continue
        fi
        echo "<<<<<<< $html >>>>>>>"
        mv "$tmp" "../$html"
        diff "$html" "../$html"
    done
}

# 指定の区間を削除
function ConvertHTMLs_13() {
    local tmp="$_script.$$"
    cat << 'PHP' > $tmp
<?php
$script = FALSE;
for (; $line = fgets(STDIN); ) {
    if (strstr($line, '<!-- TASKS -->')) {
        $script = TRUE;
    } else if (strstr($line, '<!-- END TASKS -->')) {
        $script = FALSE;
        echo "                    <!-- __INCLUDE__ /includes/qrcode.html -->\n";
    } else if (!$script) {
        echo $line;
    }
}
?>
PHP
    local html
    for html in *.html
    do
        php -f $tmp < "$html" > ,
        diff "$html" , > /dev/null
        if [ $? -eq 0 ]; then
            rm ,
            echo2 "$html: matching lines not found"
            continue
        fi
        mv , "../$html"
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
    rm $tmp
}

# 単純な文字列置換
function ConvertHTMLs() {
    local html
    for html in *.html
    do
        if [ "$html" = 'index.html' ]; then
            log "$html skipped"
            continue
        fi
        sed -r \
        -e 's/(<script.*) src="js/\1 src="\/js/' \
        -e "s%(<script.*) src='js%\1 src='/js%" \
        -e 's%src="assets/%src="/assets/%' \
        -e 's%src="audio/%src="/audio/%' \
        "$html" > ,
        diff "$html" , > /dev/null
        if [ $? -eq 0 ]; then
            log "src=js not found in $html"
            continue
        fi
        mv , "../$html"
        echo "<<<<<<< $html >>>>>>>"
        diff "$html" "../$html"
    done
}

# メイン

cd "$_absolute_script_dir/../backup"
if [ $? -ne 0 ]; then
    log "can't cd $_absolute_script_dir/../backup"
    exit 1
fi
ConvertHTMLs
cd "$_cwd"
