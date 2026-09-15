
/*
SWAF - Single-paged Web Application Framework
© Starship.jp. All rights reserved.
*/

////////////////////////////////////////////////////////////////////////
// ■定数

// サイト固有
const APP_DOMAIN = 'starship.jp';
const APP_NAME = 'Starship.jp';
const APP_TITLE = "It's philosophy that matters";
const APP_HOST = 'www.' + APP_DOMAIN;
const APP_URI = 'https://' + APP_HOST + '/';
const INDEX_PATH_ADMIN = '/admin_dashboard.html';
const INDEX_PATH_GUEST = '/guest_user_guide.html';
const INDEX_PATH_OTHER = '/user_user_guide.html';

// エラーコード
const ERROR_PARAMETER_INVALID = 1;
const ERROR_USER_UNKNOWN = 2;
const ERROR_PASSWORD_WRONG = 3;
const ERROR_ACCOUNT_OR_PASSWORD_WRONG = 4;

// ユーザータイプ
const USER_TYPE_ADMIN = 0;
const USER_TYPE_PARENT = 1;
const USER_TYPE_CHILD = 2;
const USER_TYPE_GUEST = 3;

// 定義済みユーザー
const GUEST_ID = 2;
const GUEST_ACCOUNT = 'guest@' + APP_DOMAIN;
const GUEST_PASSWORD = 'iXdMT24592j9Cblr';

// 最大値と最小値
const MAX_ACCOUNT_LENGTH = 64;
const MIN_ACCOUNT_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PHONE_SCREEN_WIDTH = 500;
const MAX_HOST_NAME_LENGTH = 128;

////////////////////////////////////////////////////////////////////////
// ■変数

var _noty_layout = (window.screen.width < 500 ? 'bottomCenter' : 'topCenter');
var _noty_container_id = '#noty_' + _noty_layout + '_layout_container';
var _remote_addr;
var _remote_host;

////////////////////////////////////////////////////////////////////////
// ■定義済みクラスの拡張

// 関数から関数名を取得
Function.prototype.getName = function() {
    var str = this.toString();
    var paren_pos = str.indexOf('(');
    var name = str.slice(9, paren_pos);
    return name;
};

// Date クラスの値のうち、指定のフォーマット文字列に対応するものを返す
Date.prototype.getValueOf = function(type) {
    switch (type) {
    case 'YYYY':
        return this.getFullYear();
    case 'YY':
        return pad0(this.getYear());
    case 'mm':
        return pad0(this.getMonth() + 1);
    case 'dd':
        return pad0(this.getDate());
    case 'HH':
        return pad0(this.getHours());
    case 'MM':
        return pad0(this.getMinutes());
    case 'SS':
        return pad0(this.getSeconds());
    case 'T':
        return this.getTime();
    default:
        throw 'unknown date element type: ' + type;
    }
}

/*
Date クラスの値を指定のフォーマットに従って文字列化する。
フォーマット文字列の一覧は、上の Date.prototype.getValueOf を参照。
フォーマット文字列に使われている文字を普通の文字と解釈させたい場合は、フォーマット文字列内のすべての文字を \ でエスケープする。
*/
Date.prototype.format = function(format) {
    if (format == undefined) {
        return this.toString();
    }
    var s = '';
    var type = '';
    var type_c;
    var bEscaped = false;
    for (var pos = 0; pos < format.length; pos++) {
        var c = format.charAt(pos);
        if (bEscaped) {
            s += c;
            bEscaped = false;
        } else {
            if (type_c != c) {
                if (0 < type.length) {
                    s += this.getValueOf(type);
                }
                type = '';
            }
            if (c == '\\') {
                bEscaped = true;
            } else {
                if (c == 'Y' || c == 'm' || c == 'd' || c == 'H' || c == 'M' || c == 'S' || c == 'T') {
                    type += c;
                    type_c = c;
                } else {
                    s += c;
                }
            }
        }
    }
    if (0 < type.length) {
        s += this.getValueOf(type);
    }
    return s;
}

Date.prototype.toUTC = function() {
    var offset = this.getTimezoneOffset();              // JST (+09) なら -540 と出る。単位が分で符合が逆
    this.setTime(this.getTime() + offset * 60 * 1000);  // UTC に変換
    return this;
}

Math.roundFloat = function(f, digits) {
    var m = Math.pow(10, digits);
    return Math.round(f * m) / m;
}

Math.max = function(a, b) {
    if (a < b) {
        return b;
    } else {
        return a;
    }
}

Math.min = function(a, b) {
    if (a < b) {
        return a;
    } else {
        return b;
    }
}

String.prototype.trim = function() {
    return this.replace(/^[ \r\n　]*/, '').replace(/[ \r\n　]*$/, '');
}
// メールアドレスの形式になっているか
String.prototype.isValidMailAddress = function() {
    return this.match(/^[a-z0-9\-_.]+@[a-z][a-z0-9\-_]+[a-z](\.([a-z][a-z0-9\-_]+[a-z]|[a-z][a-z]))*\.[a-z]+$/) ? true : false;
}
// ASCII 文字列か
String.prototype.isAsciiString = function() {
    for (var i = 0; i < this.length; i++) {
        var code = this.charCodeAt(i);
        if (code < 0 || 127 < code) {
            return false;
        }
    }
    return true;
}
// 整数の形式なら整数に変換
String.prototype.toInteger = function(error_value) {
    if (this.match(/^-?[1-9][0-9]*$/)) {
        return parseInt(this, 10);
    } else {
        return error_value;
    }
}
// 日本語アラビア数字をアスキーコードに変換し、更にアラビア数字のみ抽出する
String._code0 = '0'.charCodeAt(0);
String._code9 = '9'.charCodeAt(0);
String._codeWide0 = '０'.charCodeAt(0);
String._codeWide9 = '９'.charCodeAt(0);
String._offsetNarrowWide = String._codeWide0 - String._code0;
String.prototype.extractDigits = function() {
    var digits = this.replace(/./g, function(c) {
        var code = c.charCodeAt(0);
        if (String._codeWide0 <= code && code <= String._codeWide9) {
            return String.fromCharCode(code - String._offsetNarrowWide);
        } else if (String._code0 <= code && code <= String._code9) {
            return c;
        } else {
            return '';
        }
    });
    return digits
}
String.prototype.parseURI = function() {return ParseURI(this);}

// href が URI でなくただのパスなら絶対パスに変換する。
String.prototype.toAbsolutePath = function() {
    let href = this;
    try {
        // URI 形式ならそのまま
        let uri = href.parseURI();
        return href;
    } catch (e) {
        // '.' 付き相対パスは絶対パス化
        if (href.charAt(0) == '.') {
            // 長さが 2 文字以上
            if (1 < href.length) {
                // 如何なる場合も親ディレクトリの参照は不可
                if (href.charAt(1) == '.') {
                    console.log('String.toAbsolutePath(0): invalid href: ' + href);
                    return '/';
                // 2 番目の文字が '/' なら先頭の '.' を除去
                } if (href.charAt(1) == '/') {
                    return href.slice(1);
                // 隠しファイル？の参照は不可
                } else {
                    console.log('String.toAbsolutePath(1): invalid href: ' + href);
                    return '/';
                }
            // '.' のみは '/' と同じ
            } else {
                return '/';
            }
        // 絶対パスはそのまま
        } else if (href.charAt(0) == '/') {
            return href;
        // '.' 無し相対パスは絶対パスに変更
        } else {
            return '/' + href;
        }
    }
}

const _HTML_SPECIAL_CHARACTERS = {
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
    ' ': '&nbsp;'
}

String.prototype.escapeHTML = function() {
    return this.replace(/[&"<> ]/g, function(match) {
        return _HTML_SPECIAL_CHARACTERS[match];
    });
}

Array.prototype.getIndex = function(o, prop) {
    if (prop) {
        return this.findIndex(function(element) {return element[prop] == o});
    } else {
        return this.findIndex(function(element) {return element == o});
    }
}

////////////////////////////////////////////////////////////////////////
// ■関数（汎用共通）

/*
遂に発見！
javascript プログラマーの悩みのタネである
TODO:「javascript のコードでは描画処理の完了を知ることができない」
という問題を近似的に解決する方法。

★ワイ>ChatGPT
javascriptのコードから現在のページのDOMの構造に何らかの変化があったことを知る方法はありますか？

★ChatGPT>ワイ
はい、それは可能です。MutationObserver APIを使用してDOMに変更が加えられたときに通知を受け取ることができます。
これは新規ノードの追加、既存ノードの削除、属性の変更など、DOMのさまざまな変更を検出することができます。
以下に、DOM全体の変更を監視するMutationObserverの基本的な使用法の例を示します：

```javascript
// コールバック関数を作成します。この関数はDOMの変更があったときに呼び出されます。
var callback = function(mutationsList, observer) {
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
        }
    }
};

// オブザーバーインスタンスを作成します。
var observer = new MutationObserver(callback);

// DOM全体を監視するようにオブザーバーを設定します。子ノードと属性の変更も監視します。
observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });

```

上記のコードは、DOMの子ノード（`childList`）と属性（`attributes`）の変更を監視します。
また、`subtree: true`のオプションは、監視を全ての子孫ノードに対して再帰的に適用することを指定します。

注意すべき点として、MutationObserverはパフォーマンスに影響を及ぼす可能性があります。
特に、DOM全体を監視する場合や、大きなDOMツリーで変更が頻繁に発生する場合はその影響が大きいです。
そのため、MutationObserverは必要最低限の範囲と詳細度で使用することが推奨されます。

なお、MutationObserver APIは現代の主要なブラウザで広くサポートされていますが、非常に古いブラウザや一部の非主流ブラウザでは利用できない場合があります。
対応ブラウザについては、使用前に確認してください。

★ワイ>ワイ
これを使えば、コードで DOM 操作を行うたびに body の高さを設定し直すなどの煩雑さから解放される。
「パネルの高さが大きくなってパネルの下端が現在の body からはみ出すと、パネルの下端に黒い隙間が現れる」
という現象を一つのクラスで解消できる。
が、コーディングの量がそこそこ大きそうなので当面保留。
代わりにパネルの内容を更新する全ての関数から
setTimeout(() => {$(window).resize();}, 1000);
を呼び出すことにする。
actions.js で $(window).resize() のハンドラーがセットされている。

★ワイ>ワイ
いや、MutationObserver では問題の解決にならん。「描画が終わったかどうか」が依然として分からんままだ。

setTimeout() 方式と、下記の onRendererIdle() 方式の2択やね。

★ワイ>ワイ
onRendererIdle() は描画処理が実行されていない時に毎秒1回 javascript の処理系によって callback される。
この関数は、このように登録する。
requestAnimationFrame(onRendererIdle);
登録の効果は1回の呼び出しで終わる。
継続したい場合は、onRendererIdle() の中で requestAnimationFrame(onRendererIdle) する。
この仕組を使えば、プログラマーの悩みのタネである

「javascript のコードでは描画処理の完了を知ることができない」

という問題を近似的に解決できるのではなかろうか。

function onRendererIdle() {
    console.log('>>>>>>>onRendererIdle()');
    requestAnimationFrame(afterRender);
}

1. DOM 更新の直後に「描画中」のフラグを立てる。
2. onRendererIdle() はそのフラグが立っていればフラグを下ろし $('body').height(...) 等の処理を行う。

この方法でも、もし

1. DOMが変化する
2. フラグが立つ
3. onRenderer()が呼ばれる
4. フラグが降りる
5. $('body').height(...) 等の処理が行われる
6. 1 のDOMの変化による描画処理が始まる

という順序で事が起きれば 5 の処理は無駄になるが…
1 と 6 の間にこれだけの事が起きることはあり得なくは無いがほとんど無いとは言えるのでは？
→大ウソw。普通にある。
PageGeometryUpdater クラスは妄想の産物であったw
記念碑として残す。
*/
function PageGeometryUpdater() {
}
PageGeometryUpdater._verbose = false;
PageGeometryUpdater._stop = false;
PageGeometryUpdater._update = false;
PageGeometryUpdater.log = function(funcname, message) {
    if (PageGeometryUpdater._verbose) {
        console.log('>>>>>>>PageGeometryUpdater.' + funcname + '():', message);
    }
};
PageGeometryUpdater.verbose = function(verbose) {
    console.log('>>>>>>>PageGeometryUpdater.verbose(): verbose=' + verbose);
    PageGeometryUpdater._verbose = verbose;
};
PageGeometryUpdater.onRendererIdle = function(e, f) {
    //PageGeometryUpdater.log('PageGeometryUpdater.onRendererIdle', 'called');
    if (PageGeometryUpdater._stop) {
        PageGeometryUpdater.log('PageGeometryUpdater.onRendererIdle', 'stopping');
        PageGeometryUpdater._stop = false;
        return;
    }
    if (PageGeometryUpdater._update) {
        PageGeometryUpdater.log('PageGeometryUpdater.onRendererIdle', 'updating');
        PageGeometryUpdater._update = false;
        // ここで画面各部の DOM のサイズを再計算
        $(window).resize();
    } else {
        //PageGeometryUpdater.log('PageGeometryUpdater.onRendererIdle', 'not updated');
    }
    requestAnimationFrame(PageGeometryUpdater.onRendererIdle);
};
PageGeometryUpdater.start = function(verbose) {
    throw 'Don\'t call PageGeometryUpdater.start()';
    let verbose_ = verbose ? true : false;
    PageGeometryUpdater.log('PageGeometryUpdater.start', 'verbose=' + verbose_);
    PageGeometryUpdater._stop = false;
    PageGeometryUpdater.verbose(verbose_);
    requestAnimationFrame(PageGeometryUpdater.onRendererIdle);
};
PageGeometryUpdater.stop = function() {
    PageGeometryUpdater.log('PageGeometryUpdater.stop', 'called');
    PageGeometryUpdater._stop = true;
};
PageGeometryUpdater.update = function(message) {
    if (message == undefined) {
        throw 'PageGeometryUpdater.update() must be called with one argument';
    }
    PageGeometryUpdater.log('PageGeometryUpdater.update', 'message=' + message);
    PageGeometryUpdater._update = true;
    setTimeout(() => {
        $(window).resize();
    }, 1000);
};

/*
任意の文字列内から JSON を探し、あれば object にして返す。
ChatGPT 氏の作。ただし、.* は改行にマッチしないので、[\.\s\S]* に変更した。
*/
const findJSON = (str) => {
    // 正規表現でJSON形式の一部を探す
    // { で始まり、 } で終わる最初の部分を検索します。
    //Console.debug(str, '>>>>>>> str');
    const match = str.match(/{[\.\s\S]*}/); // . は改行にマッチしない。

    if (!match) {
        //Console.debug('JSON not found');
        return null;
    }

    // JSON形式の文字列を取り出す
    const jsonString = match[0];

    // JSON形式の文字列を解析してオブジェクトを取り出す
    try {
        const data = JSON.parse(jsonString);
        return data;
    } catch (err) {
        //Console.debug('Invalid JSON found');
        return null;
    }
};

// URL-safe Base64エンコーディング（ChatGPT 氏の作。そのまま）
function base64UrlEncode(str) {
    let base64 = btoa(str);
    return base64.replace('+', '-').replace('/', '_').replace(/=+$/, '');
}

// URL-safe Base64デコーディング（ChatGPT 氏の作。そのまま）
function base64UrlDecode(base64Url) {
    base64Url = base64Url.replace('-', '+').replace('_', '/');
    while (base64Url.length % 4) {
        base64Url += '=';
    }
    return atob(base64Url);
}

function DateToFullForm(strDate) {
    return (new Date(strDate)).format('YYYY-mm-dd HH:MM:SS');
}

function GetViewPortWidth() {
    return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
}

function GetViewPortHeight() {
    return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}

function CallAPI(uri, method, command, timeout, data, on_response) {
    if (data == undefined) {
        data = {};
    }
    if (on_response == undefined) {
        on_response = {success: function(response) {}, error: function(response) {}};
    }
    if (typeof on_response != 'object') {
        throw 'illegal type of argument on_response';
    }
    if (on_response.success == undefined) {
        on_response.success = function(response) {};
    }
    if (on_response.error == undefined) {
        on_response.error = function(response) {};
    }
    if (on_response.finally == undefined) {
        on_response.finally = function(data) {};
    }
    var ajax_params = {
        url: uri,
        type: method,
        async: true,
        timeout: timeout,
        cache: false,
        success: function(response, responseType) {
            if (response.status == 'success') {
                on_response.success(response);
                on_response.finally(data);
            } else {
                on_response.error(response);
                on_response.finally(data);
            }
        },
        error: function(xhr, status, error) {
            on_response.fatal(status, error);
            on_response.finally(data);
        }
    };

    var user = User.getCurrent();
    // data がフォームデータの場合は普通のプロパティは読まれず、ajax のパラメータも微妙に違う
    if (typeof data == 'object' && data.toString() == '[object FormData]') {
        ajax_params.processData = false;
        ajax_params.contentType = false;
        ajax_params.xhr = function() {
            var xhr = $.ajaxSettings.xhr();
            if (xhr.upload) {
                xhr.upload.addEventListener('progress', function(e) {
                    var progress = Math.floor(e.loaded / e.total * 100);
                    var bar;
                    if (data.progress_bar != undefined) {
                        bar = data.progress_bar;
                    }
                    if (bar != undefined && 0 < bar.length) {
                        bar.attr('aria-valuenow', progress);
                        bar.css('width', progress + '%');
                        bar.html(progress + '%');
                    }
                    //console.log(progress + '%');
                }, false); 
            }
            return xhr;
        };
        if (data.set != undefined) {    // 毎度おなじみクソ IE 対策。IE の場合は FormData を作る前に dom レベルでパラメータを埋め込まねばならない
            if (user && data.get('_account') == undefined) {
                data.set('_account', user.account);
                data.set('_password', user.password);
            }
            data.set('_command', command);
        }
    } else {
        if (user && data._account == undefined) {
            data._account = user.account;
            data._password = user.password;
        }
        data._command = command;        // 書き換えているのは DOM ではなく DOM から作成されたオブジェクト（なのでオリジナルは当然不変）
        data = CallAPI.sortData(data);
    }
    ajax_params.data = data;
    $.ajax(ajax_params);
}

CallAPI.sortData = function(data) {
    var a = Object.entries(data).sort(function(a1, a2) {
        if (a1[0] == '_command') {
            return -1;
        } else {
            if (a1[0] < a2[0]) {
                return -1;
            } else {
                return 1;
            }
        }
    });
    var o = {};
    for (var i = 0; i < a.length; i++) {
        o[a[i][0]] = a[i][1];
    }
    return o;
}

// 自分定義のクラスを ajax に渡すと ajax が発狂するので、システムで定義済みのオブジェクトに戻す（というかコピーする）
// TODO: これ、Object.assign({}, o); で良かったのでは？
CallAPI.toPlainObject = function(o) {
    if (o == undefined) {
        return o;
    } else if (Array.isArray(o)) {
        var a = [];
        for (var i = 0; i < o.length; i++) {
            a.push(CallAPI.toPlainObject(o[i]));
        }
        return a;
    } else if (typeof o == 'object') {
        var p = {};
        for (var name in o) {
            if (typeof o[name] != 'function') {
                p[name] = CallAPI.toPlainObject(o[name]);
            }
        }
        return p;
    } else {
        return o;
    }
}

function UpdateProgressBar(bar, percent) {
    if (bar == undefined || bar.length == 0) {
        throw 'UpdateProgressBar(): bar undefined';
    }
    bar.attr('aria-valuenow', percent);
    bar.css('width', percent + '%');
    bar.html(percent + '%');
}

/*
CallAPIEx - REST API 呼び出し関数
2023-02-02 © starship.jp 

jquery を使っているプロジェクトならどんなプロジェクトにも使える。

使用例：

CallAPIEx({
    uri: this.server + PayPal.TOKEN_PATH,
    method: 'POST',
    timeout: 7013,
    ↑ここまで必須
    ↓ここから任意
    auth: {
        type: 'Basic',
        user: this.client_id,
        pass: this.client_secret,
    },
    または、
    auth: {
       type: 'Bearer',
       token: this.response.access_token,
    },
    contentType: 'application/json',    // 既定値は x-www-form-url-encoded
    data: {grant_type: 'client_credentials'},
    wait_cursor: {
        // レスポンスを受け取るまで、このカーソルを表示する
        classname: 'cursor_wait',
        // これら↓の jquery オブジェクトを hover しているときに、そのカーソルを表示する
        containers: [$(e.currentTarget), $(e.currentTarget).parents('.panel_token')],
    },
    // 正常な応答を受け取ったとき呼び出してほしい関数
    success: function(response) {
    },
    // 正常な応答を受け取らなかったとき呼び出してほしい関数
    error: function(xhr) {
        console.log(xhr.status);
        console.log(xhr.getAllResponseHeaders());
        console.log(xhr.responseJSON);
    },
    // 正常な応答を受け取っても受け取らなくても呼び出してほしい関数
    complete: function(xhr) {
    },
});
*/
function CallAPIEx(argv) {
    // 受け取ったパラメータをチェック
    if (argv.uri == undefined || argv.uri == '') {
        throw 'CallAPIEx(): argv.uri invalid';
    }
    if (['GET', 'POST', 'PATCH', 'PUT'].findIndex(function(element) {return (element == argv.method);}) == -1) {
        throw 'CallAPIEx(): argv.method invalid';
    }
    if (typeof argv.timeout != 'number') {
        throw 'CallAPIEx(): argv.timeout invalid: ' + (typeof argv.timeout);
    }

    // リクエストヘッダーを作成
    var headers;
    if (argv.headers) {
        headers = argv.headers;
    } else {
        headers = {};
    }
    if (argv.auth) {
        if (argv.auth.type == 'Basic') {
            var userpass = argv.auth.user + ':' + argv.auth.pass;
            headers['Authorization'] = 'Basic ' + window.btoa(userpass);
        } else if (argv.auth.type == 'Bearer') {
            headers['Authorization'] = 'Bearer ' + argv.auth.token;
        }
    }

    // リクエストパラメータを作成
    var processData;    // data を加工するか。既定値 true。
    var contentType;    // リクエストの形式。既定値 'application/x-www-form-urlencoded; charset=UTF-8'
    var data;           // リクエストデータ
    var dataType;       // レスポンスの形式（ここでは常に json なので指定不要。てか jquery がレスポンスヘッダーで判断する）
    var xhr;            // アップロード進捗報告関数
    // Content-Type: application/json
    if (argv.contentType == 'application/json') {
        //headers['Content-Type'] = 'application/json'; これでもいいはずだが、contentType というプロパティが用意されているのでそれを使う
        contentType = argv.contentType;
        if (argv.data) {
            data = JSON.stringify(argv.data);
        }
    // Content-Type: x-www-form-urlencoded
    } else {
        //contentType = 'application/x-www-form-urlencoded; charset=UTF-8'; 既定値なので指定不要
        if (argv.data) {
            data = argv.data;
        }
    }

    // data が FormData である場合
    if (typeof data == 'object' && data.toString() == '[object FormData]') {
        processData = false;
        contentType = false;
    }

    // 進捗報告オブジェクトが指定されている場合
    if (argv.progressBar) {
        xhr = function() {
            var xhr = $.ajaxSettings.xhr();
            if (xhr.upload) {
                xhr.upload.addEventListener('progress', function(e) {
                    var percent = Math.floor(e.loaded / e.total * 100);
                    UpdateProgressBar(argv.progressBar, percent);
                }, false); 
            }
            return xhr;
        };
    }

    // マウスポインタの形状を変更
    if (argv.wait_cursor && argv.wait_cursor.classname && Array.isArray(argv.wait_cursor.containers)) {
        argv.wait_cursor.containers.forEach(function(elem) {elem.addClass(argv.wait_cursor.classname)});
    }

    // リクエストを送信
    $.ajax({
        url: argv.uri,
        type: argv.method,
        async: true,
        timeout: argv.timeout,
        cache: false,
        processData: processData,   // undefined なら存在しないのと同様に扱われるはず
        contentType: contentType,   // undefined なら存在しないのと同様に扱われるはず
        xhr: xhr,                   // undefined なら存在しないのと同様に扱われるはず
        headers: headers,
        data: data,
        success: function(response, responseType) {
            //console.log('>>>>>>>', response);
            if (argv.success) {
                argv.success(response, false/*not cached*/);
            }
        },
        error: function(xhr, status, error) {
            //console.log(xhr.status);
            //console.log(xhr.getAllResponseHeaders());
            //console.log(xhr.responseJSON);
            if (argv.error) {
                argv.error(xhr);
            }
        },
        complete: function(xhr, status) {
            if (argv.complete) {
                argv.complete(xhr);
            }
            if (argv.wait_cursor && argv.wait_cursor.classname && Array.isArray(argv.wait_cursor.containers)) {
                argv.wait_cursor.containers.forEach(function(elem) {elem.removeClass(argv.wait_cursor.classname)});
            }
        }
    });
}

/*
var argv = {
    data: <object that will be passed to the private API server>,
    wait_cursor: <array of jquery objects on which the mouse cursor should be the 'wait' cursor>,
    success: <function to be called on successful response from the API server>,
    error: <function to be called on error response from the API server>,
    fatal: <function to be called on error response from the HTTP server (eg. 500 Internal Server Error)>,
    complete: <function to be called whether or not successful>,
};
*/
function CallStarshipAPI(uri, method, timeout, command, argv) {
    if (uri == undefined) {
        throw 'CallStarshipAPI(): uri missing';
    }
    if (method == undefined) {
        throw 'CallStarshipAPI(): method missing';
    }
    if (timeout == undefined) {
        throw 'CallStarshipAPI(): timeout missing';
    }
    if (command == undefined) {
        throw 'CallStarshipAPI(): command missing';
    }
    if (argv == undefined) {
        throw 'CallStarshipAPI(): argv missing';
    }
    if (typeof argv != 'object') {
        throw 'CallStarshipAPI(): illegal type of argv';
    }
    var data = argv.data ? argv.data : {};
    if (typeof data == 'object' && data.toString() == '[object FormData]') {
        data.set('_command', command);
        data.set('_account', User.getCurrent().account);
        data.set('_password', User.getCurrent().password);
    } else {
        data._command = command;
        data._account = User.getCurrent().account;
        data._password = User.getCurrent().password;
    }
    let wait_cursor;
    if (argv.wait_cursor) {
        wait_cursor = argv.wait_cursor;
    } else {
        wait_cursor = {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        }
    }

    CallAPIEx({
        uri: uri,
        method: method,
        timeout: timeout,
        data: data,
        progressBar: argv.progressBar,
        wait_cursor: wait_cursor,
        success: function(response) {
            if (response.status == 'success') {
                if (argv.success) {
                    argv.success(response);
                }
            } else {
                if (argv.error) {
                    argv.error(response);
                }
            }
        },
        error: function(xhr) {
            if (argv.fatal) {
                argv.fatal(xhr);
            }
        },
        complete: argv.complete,
    });
}

/*
UploadTable() はテーブル形式のファイルをアップロードし、そのまま ajax でダウンロードするための汎用的な関数であり、カラムの数も名前も知らない。
*/
function UploadTable(form, uploaded_file, title, on_success, on_success_argv) {
    var timeout = Math.floor(uploaded_file.size / 1024 * 2) + 7013;     // TODO: 往復で 1 KB 2 ミリ秒と想定。妥当かどうかは知らん。Excel と CSV で全然サイズが違うから妥当であるはずがないか…
    var user = User.getCurrent();
    var fd = new FormData(form.get(0));
    if (fd.set == undefined) {
        form.find('[name=_command]').val('upload_table');   // IE 対策
        form.find('[name=_account]').val(user.account);     // IE 対策
        form.find('[name=_password]').val(user.password);   // IE 対策
    } else {
        fd.set('uploaded_file', uploaded_file);             // D&D またはファイル選択ダイアログで取得したファイルのデータをセット（IE では無効）
    }
    ShowLoading();
    CallAPI('/api/', 'POST', 'upload_table', timeout, fd, {
        success: function(response) {
            if (on_success) {
                on_success(response.table, on_success_argv);
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        finally: function(data) {
            HideLoading();
        },
    });
}

// DownoadTable() はテーブル形式のデータをアップロードし、そのままファイルとしてダウンロードするための汎用的な関数であり、カラムの数も名前も知らない。
function DownloadTable(table, on_end) {
    var user = User.getCurrent();
    var head = JSON.stringify(table.head);
    var body = JSON.stringify(table.body);
    var form = $('<form id="download_form" action="./sms_api/" method="POST" target="_blank"></form>');
    form.append('<input type="hidden" name="command" value="download_table"/>');
    form.append('<input type="hidden" name="account" value="' + user.account + '"/>');
    form.append('<input type="hidden" name="password" value="' + user.password + '"/>');
    form.append('<input type="hidden" name="file_name" value="' + table.file_name + '"/>');
    var input = $('<input type="hidden" name="head"/>');
    input.val(head);
    form.append(input);
    input = $('<input type="hidden" name="body"/>');
    input.val(body);
    form.append(input);  
    $('body').append(form);
    form.submit();
    $('#download_form').remove();
    if (on_end) {
        on_end();
    }
}

// ファイルのサイズを人が読みやすい文字列に変える
function FileSizeBytesToString(bytes, decimal_places) {
    if (decimal_places == undefined) {
        decimal_places = 0;
    }
    let multiply_by = Math.pow(10, decimal_places);
    if (bytes > 1024 * 1024) {
        return Math.ceil((bytes / 1024 / 1024) * multiply_by) / multiply_by + ' MB';
    } else if (bytes > 1024) {
        return Math.ceil((bytes / 1024) * multiply_by) / multiply_by + ' KB';
    } else {
        return bytes + ' bytes';
    }
}

// 文字列 n の頭に必要な数だけ '0' を付加して指定の桁数の文字列を作成
function pad0(n, digits) {
    if (digits == undefined) {
        digits = 2;
    }
    return ('00000000' + n).slice(-digits);
}

function Compare(o1, o2, reverse) {
    var result;
    if (o1 == undefined) {
        if (o2 == undefined) {
            result = 0;
        } else {
            result = -1;
        }
    } else if (o2 == undefined) {
        if (o1 == undefined) {
            result = 0;
        } else {
            result = 1;
        }
    } else {
        if (o1 < o2) {
            result = -1;
        } else if (o2 < o1) {
            result = 1;
        } else {
            result = 0;
        }
    }
    if (reverse && result != 0) {
        result *= -1;
    }
    return result
}

// ネットワークバイトオーダーはリトルエンディアン（下位バイトがアドレスの若い方に置かれる）
function ip_aton(a) {
    var m = a.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m || m.length != 5) {
        throw 'IP アドレスの形式が間違っています';
    }
    var n = (parseInt(m[1], 10) << 0) | (parseInt(m[2], 10) << 8) | (parseInt(m[3], 10) << 16) | (parseInt(m[4], 10) << 24);
    return n;
}

function ip_ntoa(n) {
    var a0 = ((n >> 0) & 0xff).toString();
    var a1 = ((n >> 8) & 0xff).toString();
    var a2 = ((n >> 16) & 0xff).toString();
    var a3 = ((n >> 24) & 0xff).toString();
    var a = a0 + '.' + a1 + '.' + a2 + '.' + a3;
    return a;
}

function CIDRToAddress(cidr) {
    var ip_a;
    var mask_length;
    var slash_pos = cidr.indexOf('/');
    if (slash_pos == -1) {
        ip_a = cidr;
        mask_length = 32;
    } else {
        ip_a = cidr.substring(0, slash_pos);
        mask_length = parseInt(cidr.substring(slash_pos + 1), 10);
        if (mask_length < 0 || 32 < mask_length) {
            throw 'ネットマスクの長さが異常です';
        }
    }
    var ip_n = ip_aton(ip_a);
    var addr = {ip: ip_n, mask_length: mask_length}
    return addr;
}

function escapeHtml(s) {
    if (s == undefined) {
        return '';
    }
    var HTML_SPECIAL_CHARACTERS = {
        "&": "&amp;",
        "\"": "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        " ": "&nbsp;"
    }
    return s.replace(/[&"<> ]/g, function(match) {
        return HTML_SPECIAL_CHARACTERS[match];
    });
}

/*
Googlebot は SWAF のコンテンツを取得できないことが、テストの結果判明した。
そこで Googlebot 用スタティックページサイト (/_static/) を作成し、そこへ Googlebot からのリクエストを User-Agent を条件としてリバースプロキシで振り向けることにした。
スタティックページの内容は、実際に表示されているページの内容を $('body').html() で取得し、プリレンダリング API サーバー http://prerender-dev1.starship.jp/ に登録する。
それを /_static/prerender.sh で取得してスタティックページサイトの html ファイルを作成する。
*/
function UploadCurrentPage() {
    let html = $('body').html();
    CallAPIEx({
        uri: 'https://prerender-dev1.starship.jp/',
        method: 'POST',
        timeout: 7013,
        data: {
            _command: 'upload_page',
            _account: User.getCurrent().account,
            _password: User.getCurrent().password,
            uri: Location.getCurrent().href.build(),
            html: html,
        },
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            alert(JSON.stringify(response, null, 4));
        },
        error: function(xhr) {
            Console.debug(xhr, '>>>>>>> xhr:');
        },
        complete: function(xhr) {
        },
    });
}

function GenerateRandomPassword(digits) {
    var table = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var password = '';
    for (var i = 0; i < digits; i++) {
        var pos = Math.floor(table.length * Math.random());
        var c = table.charAt(pos);
        password += c;
    }
    return password;
}

/*
これもう全然「汎用」じゃないけど
位置やサイズの計算に苦労しないで済む究極のパネル内テーブル内ラジオボタン
<table class="... table_radio_button ...">
    <thead>
        <tr>
            <th class="radio_button">
            </th>
            <th>    // ←ここに特別なクラスを必要としない。radio_button の次の th との border が消える
                <span class="radio_button_label">Foobar</span>  // ← Foobar をラジオボタンの真上に表示したい場合、このようにする。<th>Foobar</th> とすれば、ラジオボタンのカラムの次のカラムの真上に表示される（当たり前）
            </th>
            ...
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="radio_button">
            </td>
            <td>    // ここに特別なクラスを必要としない。radio_button の次の td との border が消える
            </td>
            ...
        </tr>
    </tbody>
</table>
このテーブルのラジオボタンに click ハンドラーをセットする
*/
function PanelTableRadioButtonClick(table, onClick) {
    if (table == undefined) {
        throw 'PanelTableRadioButtonClick(): table undefined';
    }
    if (onClick == undefined) {
        throw 'PanelTableRadioButtonClick(): onClick undefined';
    }
    let tbody = table.find('tbody');
    tbody.find('>tr>td.radio_button input[type=radio]').click((e) => {
        e.stopPropagation();
        onClick(table, $(e.currentTarget));
    });
    tbody.find('td.radio_button, td.radio_button+td').click((e) => {
        e.stopPropagation();
        $(e.currentTarget).parent().find('>td.radio_button input[type=radio]').click();
    });
}

// ログ表示画面の表示範囲指定コントロールの初期化
function InitializeViewDateRange() {
    var now = new Date();
    var first_day = new Date(now.getFullYear(), now.getMonth(), 1);
    $('#view_date_from').val(first_day.format('YYYY-mm-dd'));
    $('#view_date_from').datepicker({
        format: 'yyyy-mm-dd',
        language: 'ja',
        autoclose: true
    });
    $('#view_date_to').val(now.format('YYYY-mm-dd'));
    $('#view_date_to').datepicker({
        format: 'yyyy-mm-dd',
        language: 'ja',
        autoclose: true
    });
}

// ダイアログを画面の中央に表示する
function ShowCentered(dialog, argv) {
    dialog.css({
        display: 'block'
    });
    if (screen.width < 400) {
        dialog.css('width', '98%');
    }
    dialog.css({
        left: Math.floor((dialog.parent().outerWidth() - dialog.outerWidth()) / 2) + 'px',
        top: $(document).scrollTop() + Math.floor(($(window).outerHeight() - dialog.outerHeight()) / 2) + 'px'
    });
    if (argv) {
        if (argv.css) {
            dialog.css(argv.css);
        }
        if (argv.on_end) {
            argv.on_end();
        }
    }
}

// ダイアログを非表示状態に変えるとき、微妙にまったり感を出す
function Fadable(dialog) {
    dialog.find('.panel-remove').click(function(e) {
        dialog.animate({'opacity': 0}, 200, function() {
            dialog.remove();
        });
    });
}

// ダイアログをドラッグ可能にする
function Draggable(dialog) {
    var header = $(dialog.find('.panel-heading').get(0));
    header.mousedown(function(e) {
        e.preventDefault();
        e.stopPropagation();
        dialog._mousedown = {
            offsetX: e.pageX - dialog.offset().left,    // ダイアログの左上隅の x 座標とマウスポインタの x 座標の変位
            offsetY: e.pageY - dialog.offset().top      // 同じく y
        }
        $(document).mouseup(function(e) {
            e.preventDefault();
            dialog._mousedown = null;
            $(document).off();
        });
        $(document).mousemove(function(e) {
            e.preventDefault();
            if (dialog._mousedown) {
                var dialogX = e.pageX - dialog.parent().offset().left - dialog._mousedown.offsetX;
                var dialogY = e.pageY - dialog.parent().offset().top - dialog._mousedown.offsetY;
                dialogX = Math.max(dialogX, 0);
                dialogY = Math.max(dialogY, 0);
                dialogX = Math.min(dialogX, dialog.parent().width() - dialog.outerWidth());
                dialogY = Math.min(dialogY, $(document).scrollTop() + dialog.parent().height() - dialog.outerHeight() - 20);    // - 20 はスクロールバーの領域？ここより下に表示しようとすると縦のスクロールバーが表示されてウザい
                dialog.css({
                    left: dialogX + 'px',
                    top: dialogY + 'px'
                });
            }
        });
    });
}

/*
遅まきながら bootstrap の dialog が良さそうであることがわかったので、先にそっちを試す。
https://codepen.io/adamcjoiner/pen/PNbbbv
draggable な bootstrap dialog

// 確認ダイアログ（javascript 組み込みの confirm() に相当）
function ShowConfirmDialog_(argv) {
    var container = $('.page-content');
    if (container.length == 0) {
        container = $('body');
    }
    var dialog = $('.confirm_dialog');
    //console.log('dialog>', dialog);
    dialog.CreateDialog({
        container: container
    });
    dialog.find('.panel-body').append(argv.body);
    var button_help = dialog.find('.button_help');
    if (0 < button_help.length) {
        button_help.click(function(e) {
            if (argv.on_help && typeof argv.on_help == 'function') {
                argv.on_help();
            }
        });
    }
    dialog.find('.button_ok').click(function(e) {
        if (argv.on_ok && typeof argv.on_ok == 'function') {
            argv.on_ok();
        }
    });
    dialog.ShowModal();
}
*/
/*
こっちは prod.sms.starship.jp/js/common.js にあったやつ
argv = {
    message: <メッセージ>,
    on_cancel: <キャンセルボタンクリック時の動作>,
    on_ok: <OKボタンクリック時の動作>
};
bootstrap dialog を使おうとしているが、ここへ持ってくると動かない。なんでや？
DONE: 230501 動いた。../includes/_generic_dialog.html を参照。
*/
/*
function ShowConfirmDialog(argv) {
    var dialog = $('#confirm_dialog');
    console.log('dialog>', dialog);
    dialog.find('.modal-body').html(argv.message);
    dialog.find('.btn_cancel').off().click(argv.on_cancel);
    dialog.find('.btn_ok').off().click(argv.on_ok);
    //var title = '<span class="fa fa-rocket"></span> ' + _service_name;
    var title = '<span class="fa fa-rocket"></span> ' + 'TCPDetective';
    dialog.find('#smallModalHead').html(title);
    dialog.modal('show');
}
*/
/*
function DoYouWantToLogin() {
    ShowConfirmDialog({
        message: '<p>Your are currently a guest user.<br>Do you want to login?</p>',
        on_ok: function() {
            alert('OK button pressed');
        },
        on_cancel: function() {
            alert('Cancel button pressed');
        }
    });
}
*/

// 見た目のかっこいいドロップダウンリスト（bootstrap の selectpicker の外観だけ利用しコードはスクラッチから。bootstrap の selectpicker はいろいろ挙動不審なので）
var _picker_instance_count = 0;

function CreateSelectPicker(select, argv) {
    _picker_instance_count++;
    select.css('display', 'none');
    var picker = $(
'<div class="btn-group bootstrap-select" style="z-index: 1000;">' +    // ここの open と
    '<button type="button" class="btn dropdown-toggle selectpicker btn-default" data-toggle="dropdown" aria-expanded="false">' +    // この true/false は同期してトグルする
        '<span class="filter-option pull-left"></span>&nbsp;<span class="caret"></span>' +
    '</button>' +
    '<div class="dropdown-menu open" style="max-height: 426px; overflow: hidden; min-height: 0px;">' +  // ここは常に open
        '<ul class="dropdown-menu inner selectpicker" role="menu" style="max-height: 424px; overflow-y: auto; min-height: 0px;">' +
        '</ul>' +
    '</div>' +
'</div>'
);
    var container = select.parent();
    container.append(picker);
    var option = select.find('option[value=' + select.val() + ']');
    var button = picker.find('.dropdown-toggle');
    var button_text = button.find('.filter-option');
    var menu = picker.find('ul.dropdown-menu');
    button.attr('title', option.attr('title'));
    var icon_name = option.attr('icon');
    if (icon_name != undefined && icon_name != '') {
        button_text.append('<span class="fa ' + icon_name + ' icon"></span>');
    }
    button_text.append(option.html());
    select.find('option').each(function(i, o) {
        var li = $('<li><a tabindex="0"><span class="text"></span></a></li>');
        li.attr('value', $(o).val());
        li.attr('rel', i);
        li.attr('title', $(o).attr('title') ? $(o).attr('title') : '');
        if ($(o).prop('selected')) {
            li.addClass('selected');
        }
        icon_name = $(o).attr('icon');
        if (icon_name != undefined && icon_name != '') {
            li.find('.text').append('<span class="fa ' + icon_name + ' icon"></span>');
        }
        li.find('.text').append($(o).html());
        li.hover(
            function(e) {
                if (select.val() != $(o).val()) {
                    button.attr('title', $(e.currentTarget).attr('title'));
                    button_text.html($(e.currentTarget).find('a').html());
                    select.val($(o).val());
                    if (!argv || argv.trigger_change_on_hover) {
                        select.trigger('change');
                    }
                }
            }
        );
        menu.append(li);
    });
    // select が持っているクラスを picker にコピー
    var select_classes = select.attr('class').split(/\s+/);
    for (var i = 0; i < select_classes.length; i++) {
        picker.addClass(select_classes[i]);
    }
    menu.mousedown(function(e) {
        // スクロールバー上の mousedown
        if (e.target.localName == 'ul') {
            e.stopPropagation();            // button.blur の発生を防ぐ
        } else {
            if (argv && !argv.trigger_change_on_hover) {
                select.trigger('change');
            }
        }
    });
    var data = {
        picker: picker,
        button: button,
        menu: menu
    };
    button.blur(function(e) {
        if (menu.css('display') == 'block') {
            OpenSelectPickerMenu(data, false);
        }
    });
    button.click(function(e) {
/*
DONE: picker が open クラスを持っているかどうかで判定すべきところだが、な
ぜか一個目のインスタンスでは addClass/removeClass すると動作が逆になり、、
当然ながら付くべきときに inset な box_shadow が付かず、付くべきでないとき
に付く。
全くあり得ない話だが事実だからしょうがない。
コードを全く変えずに 2 つ目以降のインスタンスを作成すると普通に動く。
絶対にあり得ない話だが事実だからしょうがない。
そこで hasClass('open') による判定は諦め、css('display') で判定する。
→ SetActivePage() 内の $(document).off() により、この問題は解決した。
*/
        if (menu.css('display') == 'block') {
            OpenSelectPickerMenu(data, false);
        } else {
            OpenSelectPickerMenu(data, true);
        }
    });
/*  全然呼ばれてないやないか～い！→ click イベントは mousedown, mouseup から作られるものらしい。jquery をロードする時点では picker は DOM 上に存在しないから、その処理を行うハンドラーがセットされない（のか？）
    menu.click(function(e) {
        console.log(e);
    });
    menu.find('li').click(function(e) {
        console.log(e);
    });
    menu.find('li a').click(function(e) {
        var a = $(e.currentTarget);
        button_text.html(a.html());
        OpenSelectPickerMenu(data, false);
        select.trigger('change');
    });
*/
    select.change(function(e) {
        var value = select.val();
        menu.find('li.selected').removeClass('selected');
        var li = menu.find('li[value=' + value + ']');
        li.addClass('selected');
        button.attr('title', li.attr('title'));
        button_text.html(li.find('a').html());
    });
    menu.css('display', 'none');
    //OpenSelectPickerMenu(data, false);
}

function OpenSelectPickerMenu(data, open) {
    if (open) {
        data.picker.addClass('open');
        data.button.attr('aria-expanded', true);
        data.menu.parent().css('display', 'block');
        data.menu.css('display', 'block');
    } else {
        data.picker.removeClass('open');
        data.button.attr('aria-expanded', false);
        data.menu.parent().css('display', 'none');
        data.menu.css('display', 'none');
    }
}

function DestroySelectPicker(select) {
    var picker = select.parent().find('.bootstrap-select');
    if (0 < picker.length) {
        picker.remove();
    }
}

/*
tagsinput だが、これもスクラッチから自作。オリジナルの tagsinput はイマイチ機能不足なので
<input type="text" class="tags" value="First,Second,Third" id="tags1529914034638" style="display: none;">
<div id="tags1529914034638_tagsinput" class="tagsinput" style="width: 100%; height: auto;">
    <span class="tag">
        <span>First&nbsp;&nbsp;</span>
        <a href="#" title="Removing tag"></a>
    </span>
    <span class="tag">
        <span>Second&nbsp;&nbsp;</span>
        <a href="#" title="Removing tag"></a>
    </span>
    <span class="tag">
        <span>Third&nbsp;&nbsp;</span>
        <a href="#" title="Removing tag"></a>
    </span>
    <div id="tags1529914034638_addTag">
        <input id="tags1529914034638_tag" value="" data-default="" style="color: rgb(102, 102, 102); width: 80px;">
    </div>
    <div class="tags_clear"></div>
</div>
*/
var _tagsinput_tag_id_to_value_map = {};

function CreateTagsInput(input, options, tags_data) {
    var tagsinput = $('<div class="tagsinput"></div>');
    if (options == undefined || options.add != 'no') {
        var add_tag = $(
'<div class="add_tag">' +
    '<input placeholder="タグを追加" style="color: rgb(102, 102, 102); width: 256px;">' +
'</div>'
);
        add_tag.find('input').keydown(function(e) {
            var input = $(e.currentTarget);
            if (e.which == 13) {
                if (options == undefined || options.onAdd == undefined) {
                    return;
                }
                var tag_count = 0;
                tagsinput.find('.tag').each(function() {
                    tag_count++;
                });
                var label = input.val();
                var response = options.onAdd(tag_count, label);
                if (response == undefined || typeof response != 'object' || response.value == undefined) {
                    return;
                }
                var tag = CreateTagsInputTag(tag_count, {label: label, value: response.value}, options);
                input.before(tag);
                input.val('');
                if (response.onAdded && typeof response.onAdded == 'function') {
                    response.onAdded();
                }
            } else if (e.which == 27) {
                input.val('');
            }
        });
        tagsinput.append(add_tag);
    }
    if (tags_data) {
        AddTagsInputTags(/*input, */tagsinput, tags_data, options);
        tagsinput.css('opacity', 0);
        tagsinput.animate({opacity: 1.0}, 200, 'linear');
    }
    var api = tagsinput.get(0);
    api.removeTags = function() {
        tagsinput.find('.tag').each(function(i, o) {
            var tag_id = $(o).prop('id');
            delete _tagsinput_tag_id_to_value_map[tag_id];
        });
        tagsinput.find('.tag').remove();
    }
    api.addTags = function(tags_data) {
        AddTagsInputTags(/*input, */tagsinput, tags_data, options);
        tagsinput.css('opacity', 0);
        tagsinput.animate({opacity: 1.0}, 200, 'linear');
    };
    api.selectAllTags = function(select) {
        if (select) {
            tagsinput.find('.tag').addClass('selected');
        } else {
            tagsinput.find('.tag').removeClass('selected');
        }
    };
    api.selectTagByLabel = function(label, select) {
        var selected_tag_index = -1;
        tagsinput.find('.tag .tag_label').each(function(i, o) {
            if ($(o).html() == label) {
                if (select) {
                    $(o).parent().addClass('selected');
                } else {
                    $(o).parent().removeClass('selected');
                }
                selected_tag_index = i;
            }
        });
        return selected_tag_index;
    };
    api.isTagSelected = function(label) {
        var result = false;
        tagsinput.find('.tag.selected>.tag_label').each(function(i, o) {
            if ($(o).html() == label) {
                result = true;
            }
        });
        return result;
    };
    api.getSelectedValues = function() {
        var values = [];
        tagsinput.find('.tag.selected').each(function(i, o) {
            values.push(o.getValue());
        });
        return values;
    };
    input.after(tagsinput);         // 引数で渡された input はここでしか使っていない
    input.css('display', 'none');
    return tagsinput.get(0);        // jQuery の DOM オブジェクトラッパーはライフタイムが不明なので、生の DOM オブジェクトを返す（それが「API オブジェクト」という趣向）
}

function AddTagsInputTags(/*input, */tagsinput, tags_data, options) {
    var add_tag = tagsinput.find('.add_tag');
    for (var index = 0; index < tags_data.length; index++) {
        var tag = CreateTagsInputTag(index, tags_data[index], options);
        if (add_tag.length == 0) {
            tagsinput.append(tag);
        } else {
            add_tag.before(tag);
        }
    }
}

function CreateTagsInputTag(index, tag_data, options) {
    var tag = $(
'<span class="tag">' +
    '<span class="tag_label">' + tag_data.label + '</span>' +
    '<span class="fa fa-times tag_remove" title="【' + tag_data.label + '】タグを削除する"></span>' +
'</span>'
);
    var tag_id = CreateTagsInputTagId();
    tag.prop('id', tag_id);
    _tagsinput_tag_id_to_value_map[tag_id] = tag_data.value;    // 新規作成時にユーザーが中身を指定しなければ undefined
    tag.get(0).getValue = function() {
        var tag_id = tag.prop('id');
        return _tagsinput_tag_id_to_value_map[tag_id];
    }
    if (options && options.remove == 'no') {
        tag.find('.tag_remove').addClass('hidden');
    }
    tag.click(function(e) {
        var tag = $(e.currentTarget);
        if (options == undefined || options.onSelect == undefined || options.onSelect(index, tag_data.label, tag_data.value, !tag.hasClass('selected'), tag_data)) {
            tag.toggleClass('selected');
        }
    });
    tag.find('.tag_remove').click(function(e) {
        var tag = $(e.currentTarget).parent();
        if (options == undefined || options.onRemove == undefined || options.onRemove(index, tag_data.label, tag_data.value, tag_data)) {
            tag.animate({opacity: 0}, 200, 'linear', function() {
                tag.remove();
            });
        }
    });
    return tag;
}

function CreateTagsInputTagId() {
    var now = new Date();
    var suffix = Math.floor(1024 * 1024 * 1024 * 20 * Math.random());
    var id = 'tag_id_' + now.format('YYYYmmddHHMMSS') + '_' + suffix;
    return id;
}

// noty のインライン表示がイマイチなので。同じようなものを作った。トゲ付き。
var _notices = {};  // TODO: Notice を親（コンテナ）の子供として表示するように変えたので、RemoveAllNotices() は、要らなくなった。当然、_notices も要らなくなった。

/*
argv = {
    message: <メッセージの html>,
    target: <ドゲが指し示す対象の jquery オブジェクト>,
    container: <コンテナ。コンテナが動くと Notice も一緒に動く>,
    duration: <見せる／消すアニメーションの時間。ミリ秒>,
}

bootstrap の modal でスクロールバーが出たり消えたりするたびに body の幅が変化してみっともない。
ChatGPT さんから教わった対策が、
body {
    overflow: hidden;
}
.modal-open {
    padding-right: 0 !important;
}
恐らくこれで body がスクロールしなくなり、代わりに html がスクロールするようになった。
それまで body.scrollTop() と body.animate() で動いていたコードが動かなくなった。

また、座標（var top）計算の前提に関する勘違いを発見した。

.offset() で取得されるのは「絶対座標」だが、.css('top', ...) でセットされるのは「相対座標」。

これ jquery の最大の落とし穴なのでは？

そこで、下記の通り書き換えた。
長年モヤモヤしていた問題が、遂に最終的に解決したか？
*/
function Notice(argv) {
    var html = $('html');
    var body = $('body');
    // 親が明示されていなければ body が親
    var container;
    if (argv.container == undefined) {
        container = body;
    } else {
        container = argv.container;
    }

    // アニメーションの長さ
    var duration;
    if (argv.duration == undefined) {
        duration = 300;
    } else {
        duration = argv.duration;
    }

    // 表示位置の変位の指定
    let top_offset_y = (argv.top_offset_y == undefined) ? Notice._top_offset_y : argv.top_offset_y;
    let top_offset_x = (argv.top_offset_x == undefined) ? Notice._top_offset_x : argv.top_offset_x;

    // 通知のターゲットが既に別の通知のターゲットになっている
    var target = argv.target;
    var target_of_notice = target.attr('target_of_notice');
    if (target_of_notice && target_of_notice != '') {
        var prev_notice = _notices[target_of_notice];
        prev_notice.remove();
        target.attr('target_of_notice', null);
        delete _notices[target_of_notice];
    }

    // 新しい通知を作る
    var notice = $('<div class="notice_inline"><div class="message_box">' + argv.message + '</div></div>');
    if (argv.type == undefined) {
        notice.addClass('danger');
    } else {
        notice.addClass(argv.type);
    }
    var notice_id = 'notice_' + Math.floor(20 * 1024 * 1024 * 1024 * Math.random());
    notice.prop('id', notice_id);
    target.attr('target_of_notice', notice_id);
    _notices[notice_id] = notice;

    // 表示位置の計算
    var top = target.offset().top + target.outerHeight() + top_offset_y;    // 絶対座標
    var topr = (container.scrollTop() - container.offset().top) + top;      // 相対座標
    var move_up_by = 8;
    notice.css({
        top: (topr + move_up_by) + 'px',
        left: target.offset().left - container.offset().left + top_offset_x + 'px',
        //width: target.outerWidth() + 'px',
        width: 'auto',
        opacity: 0
    });

    // 表示位置の表示
/*
    console.log('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
    console.log('>>>>>>>html', html);
    console.log('>>>>>>>html.scrollTop()', html.scrollTop());
    console.log('>>>>>>>body', body);
    console.log('>>>>>>>body.scrollTop()', body.scrollTop());
    console.log('>>>>>>>container', container);
    console.log('>>>>>>>container.scrollTop()', container.scrollTop());
    console.log('>>>>>>>container.offset().top', container.offset().top);
    console.log('>>>>>>>container.outerHeight()', container.outerHeight());
    console.log('>>>>>>>target', target);
    console.log('>>>>>>>target.scrollTop()', target.scrollTop());
    console.log('>>>>>>>target.offset().top', target.offset().top);
    console.log('>>>>>>>target.outerHeight()', target.outerHeight());
    console.log('>>>>>>>top', top);
*/

    // イベントハンドラー
    container.on('click keydown wheel', function(e) {
        notice.fadeOut();
    });
    notice.click(function(e) {
        notice.fadeOut();
    });

    // 表示
    container.append(notice);
    if (html.scrollTop() + body.scrollTop() < top - target.outerHeight() && target.outerHeight() + notice.outerHeight() <= GetViewPortHeight()) {
        //console.log('>>>>>>>not scrolling');
        notice.animate({opacity: 1.0, top: topr + 'px'}, duration);
    } else {
        var scroll_top = Math.max(top - target.outerHeight(), top - GetViewPortHeight());
        //console.log('>>>>>>>scrolling to', scroll_top);
        html.animate(
            {scrollTop: scroll_top},
            300,
            'linear',
            function() {
                notice.animate({opacity: 1.0, top: topr + 'px'}, duration);
            }
        );
    }

    // メソッド
    /*
    DONE:
    なんと、このメソッドはもともと呼ばれていない。
    なのにクリックや container のクリックで notice_inline は消える（※）。
    しかも DOM は消えていない。
    なんだこりゃ？
    PayPal.getAccessToken() のコメントと同じ現象？
    var notice と this が別の jquery オブジェクトを指している？
    →どうもそうらしい。this.fadeOut = function() を notice.fadeOut = function() に変えたら fadeOut が呼ばれるようになった。
    →ただし、※の原因は不明のまま。
    → javascript と jquery は伏魔殿。
    */
    notice.fadeOut = function() {
        this.animate({opacity: 0}, duration, function() {
            notice.remove();
            target.attr('target_of_notice', null);
            delete _notices[notice_id];
        });
    }

    return notice;
}
Notice._top_offset_y = 0;
Notice.setTopOffsetY = function(top_offset_y) {
    let current_top_offset_y = Notice._top_offset_y;
    Notice._top_offset_y = top_offset_y;
    return current_top_offset_y;
};
Notice._top_offset_x = 0;
Notice.setTopOffsetX = function(top_offset_x) {
    let current_top_offset_x = Notice._top_offset_x;
    Notice._top_offset_x = top_offset_x;
    return current_top_offset_x
};

function RemoveAllNotices() {
    for (var notice_id in _notices) {
        var notice = _notices[notice_id];
        if (notice != undefined) {
            notice.remove();
        }
    }
    $('[target_of_notice]').attr('target_of_notice', null);
    _notices = {};
}

// 指定の DataTable セルにトゲ付きエラーメッセージを表示する（指定のセルが表示されていなければ表示して）
function TableCellNotice(
datatable_api,          // table に対応する DataTable API オブジェクト
table,                  // table タグに対応する jQuery オブジェクト
position,               // エラーメッセージを表示する対象となるセルの [行番号, 列番号]（どちらも 0 起源）
index_attribute_name,   // position[0] で指定されたテーブルの行番号は、テーブルの全ての行のデータを保持する配列の中で何番目か
message                 // メッセージ文字列（タグ入り可）
)
{
    var target_row_index = position[0];
    var target_column_index = position[1];
    var target_row;
    table.find('tbody tr').each(function(relative_row_index, row_dom) {
        var current_row_index = $(row_dom).find('[' + index_attribute_name + ']').attr(index_attribute_name);
        if (current_row_index == target_row_index) {
            target_row = $(row_dom);
        }
    });
    if (target_row) {
        var td = target_row.find('>td:nth-child(' + (target_column_index + 1) + ')');
        Notice({message: message, target: td});
        return;
    }
    var page_length = datatable_api.page.len();
    var target_page = Math.floor(target_row_index / page_length);
    datatable_api._on_drawn = function() {
        TableCellNotice(datatable_api, table, position, index_attribute_name, message);
    };
    datatable_api.page(target_page).draw(false);
}

// URI を解析して部品に分ける
function ParseURI(s) {
    //var m = s.match(/^(https?):\/\/([a-z][0-9a-z\-]*[0-9a-z]*)(\.[a-z][0-9a-z\-]*[0-9a-z]*)*(\.[a-z]{2,8})(:[\d]+)?(\/[^\?]*)?(\?.+)?$/);
    //                                                                          ↑このパターンだと繰り返しマッチしたものが出力されない！
    var m = s.match(/^(https?):\/\/([a-z][0-9a-z\-]*[0-9a-z]*)(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z]{2,8})(:[\d]+)?(\/[^\?]*)?(\?.*)?$/);
    //console.log(m);
    if (!m) {
        throw 'invalid uri';
    }
    // プロトコル
    var protocol = m[1];
    // FQDN の最初の単語
    var fqdn = m[2];
    // FQDN の残りの単語
    var undefined_count = 0;
    var prev_word;
    var capture_group_index = 3;
    for (; capture_group_index < m.length; capture_group_index++) {
        if (m[capture_group_index] == undefined) {
            undefined_count++;
            if (1 < undefined_count && prev_word != undefined) {
                break;
            }
        } else if (m[capture_group_index].charAt(0) == '.') {
            fqdn += m[capture_group_index];
        } else {
            break;
        }
        prev_word = m[capture_group_index];
    }
    // ポート番号
    var port;
    if (capture_group_index < m.length) {
        if (m[capture_group_index] == undefined) {
        } else if (m[capture_group_index].charAt(0) == ':') {
            port = parseInt(m[capture_group_index].slice(1), 10);
        }
        capture_group_index++;
    }
    // パス
    var path;
    if (capture_group_index < m.length) {
        if (m[capture_group_index] == undefined) {
        } else if (m[capture_group_index].charAt(0) == '/') {
            path = m[capture_group_index];
        }
        capture_group_index++;
    }
    // クエリー
    let query;
    //let query_array = [];
    let query_map = {};
    if (capture_group_index < m.length) {
        if (m[capture_group_index] == undefined) {
        } else if (m[capture_group_index].charAt(0) == '?') {
            query = m[capture_group_index].slice(1);
            //console.log('>>>>>>>query', query);
            let pairs = query.split('&');
            //console.log('>>>>>>>pairs', pairs);
            if (Array.isArray(pairs)) {
                for (let pair_index = 0; pair_index < pairs.length; pair_index++) {
                    let pair = pairs[pair_index];
                    //console.log('>>>>>>>pair', pair);
                    let name_and_value = pair.split('=');
                    //console.log('>>>>>>>name_and_value', name_and_value);
                    if (Array.isArray(name_and_value) && 1 < name_and_value.length && name_and_value[0] != '') {
                        /*
                        query_array.push({
                            name: name_and_value[0],
                            value: name_and_value[1]
                        });
                        */
                        query_map[name_and_value[0]] = name_and_value[1];
                    }
                }
            }
        }
        capture_group_index++;
    }
/*
    for (let name in query_map) {
        console.log('>>>>>>>', name + '==' + query_map[name]);
    }
*/
    // URI インスタンスを構築
    let uri = new URI({
        protocol: protocol,
        fqdn: fqdn,
        port: port,
        path: path,
        query: query,
        query_map: query_map
    });
    //console.log('>>>>>>>uri', uri);
    return uri;
}

function OpenURI(uri) {
    var form = $('<form method="get" target="_blank"></form>');
    form.attr('action', uri);
    $('body').prepend(form);
    form.submit();
    form.remove();
}

// ドラッグ・アンド・ドロップで順序を変えられるリスト
function CreateDraggableList(container, argv) {
    // パラメータ
    var draggable = true;
    var fade = -1;
    if (argv) {
        draggable = (argv.draggable == undefined || argv.draggable);
        if (argv.fade != undefined && 0 < argv.fade) {
            fade = argv.fade;
        }
    }
    // 隠しリスト（位置計算用）を取得
    var hidden_list = container.find('>.draggable_list:not(.visible)');
    if (hidden_list.length == 0) {
        throw 'draggable list not found';
    }
    if (1 < hidden_list.length) {
        throw 'illegal multiple draggable lists found';
    }
    hidden_list.find('>.item').each(function(item_index, item_dom) {
        if (item_index == 0) {
            $(item_dom).addClass('top');    // 一番上のアイテムの border-top を描画させるため
        }
    });
    // 表示用リスト（あれば）を削除
    container.find('>.draggable_list.visible').remove();
    // カラムの位置ごとに全スロット内で最大の幅の値を調べる
    var max_column_widths = [];
    var padding_left;
    var padding_right;
    hidden_list.find('>.item').each(function(item_index, item_dom) {
        var item = $(item_dom);
        item.attr('item_index', item_index); // アイテムの位置（順序）の初期値
        item.find('>.column').each(function(column_index, column_dom) {
            var column = $(column_dom);
            if (item_index == 0 && column_index == 0) {
                padding_left = parseInt(column.css('padding-left'), 10);
                padding_right = parseInt(column.css('padding-right'), 10);
            }
            if (column_index < max_column_widths.length) {
                max_column_widths[column_index] = Math.max(max_column_widths[column_index], column.width());
            } else {
                max_column_widths.push(column.width());
            }
        });
    });
    // ヘッダーがあれば、ヘッダーカラムの幅も調べる（てゆうかヘッダー必須）
    var headers = container.find('.draggable_list_headers');
    if (headers.length == 0) {
        throw 'headers not found';
    }
    if (headers.parent().find('div.clearfix').length == 0) {
        headers.after('<div class="clearfix"></div>');
    }
    var header_height;
    headers.find('>.header').each(function(header_index, header_dom) {
        var header = $(header_dom);
        header_height = header.outerHeight();
        if (header_index < max_column_widths.length) {
            max_column_widths[header_index] = Math.max(max_column_widths[header_index], header.width());
        } else {
            max_column_widths.push(header.width());
        }
    });
    headers.css({height: header_height + 'px'});
    // カラムの幅を全スロット内の同位置のカラムの最大のものに合わせる
    hidden_list.find('>.item').each(function(item_index, item_dom) {
        $(item_dom).find('>.column').each(function(column_index, column_dom) {
            var width = 1 + padding_left + max_column_widths[column_index] + padding_right + 1;
            $(column_dom).css({
                width: width + 'px'
            });
        });
    });
    // ヘッダーがあれば、ヘッダーカラムの幅も合わせる
    headers.find('>.header').each(function(header_index, header_dom) {
        var width = 1 + padding_left + max_column_widths[header_index] + padding_right + 1;
        $(header_dom).css({
            //background: 'black',
            //color: 'white',
            width: width + 'px'
        });
    });
    headers.addClass('visible');
    // hidden_list（リストとアイテムの位置とサイズのデータを計算・保持するためのリスト）から表示用のリストをクローンで作成・表示
    var list = hidden_list.clone(true, true);
    list.addClass('visible');
    list.css({
        //position: 'absolute', css へ移動
        //visibility: 'visible' css へ移動
        top: hidden_list.position().top + 'px',
        left: hidden_list.position().left + 'px',
        opacity: (0 < fade ? 0.0 : 1.0)
    });
    container.append(list);
    list.find('>.item').each(function(item_index, item_dom) {
        var hidden_item = hidden_list.find('>.item:nth-child(' + (item_index + 1) + ')');
        var hidden_item_height = hidden_item.height();
        $(item_dom).css({
            position: 'absolute',
            top: hidden_item.offset().top - hidden_list.offset().top + 'px',
            left: hidden_item.offset().left - hidden_list.offset().left + 'px',
            width: hidden_item.outerWidth() + 'px',
            height: hidden_item.outerHeight() + 'px',
        });
        $(item_dom).find('>.column').each(function(column_index, column_dom) {
            var hidden_column = hidden_item.find('>.column:nth-child(' + (column_index + 1) + ')');
            $(column_dom).css({
                left: hidden_column.offset().left - hidden_item.offset().left + 'px',
                width: hidden_column.outerWidth() - 1 + 'px',   // -1 は border-left の幅（左端のカラムには左のボーダーが無いので、厳密には誤り。あと定数にしてるのがケシカランが面倒）
                height: hidden_item_height + 'px'
            });
        });
        if (draggable) {
            $(item_dom).addClass('draggable');
            DraggableListItem(hidden_list, list, $(item_dom));
        }
    });
    if (0 < fade) {
        list.animate({opacity: 1.0}, fade, 'swing');
    }
}

function DraggableListItem(hidden_list, list, item) {
    item.mousedown(function(e) {
        e.preventDefault();
        e.stopPropagation();
        item._mousedown = {
            pageX: e.pageX,
            pageY: e.pageY,
            offsetX: e.pageX - item.offset().left,  // アイテムの左上隅を原点としたマウスの X 座標
            offsetY: e.pageY - item.offset().top    // アイテムの左上隅を原点としたマウスの Y 座標
        }
        hidden_list._item_moved = false;
        list.addClass('dragged');
        item.addClass('dragged');
        $(document).mouseup(function(e) {
            e.preventDefault();
            delete item._mousedown;
            $(document).off();
            list.removeClass('dragged');
            item.removeClass('dragged');
            // アイテムを穴の位置へ移動（表示位置。元の位置という可能性もある）
            var item_index = item.attr('item_index');
            var hidden_item = hidden_list.find('>.item[item_index=' + item_index + ']');
            item.css({
                top: hidden_item.offset().top - hidden_list.offset().top + 'px',
                left: hidden_item.offset().left - hidden_list.offset().left + 'px',
                width: hidden_item.outerWidth() + 'px',
                height: hidden_item.outerHeight() + 'px',
            });
            // アイテムの移動（順序の移動）は起きていない
            if (!hidden_list._item_moved) {
                return;     // その場合、表示の変更もイベントのトリガーも不要
            }
            // DOM レベルでアイテムの順序を入れ替える
/*
            …のは無理。
            取り除くのに remove() を使うとハンドラーが消える。
             detach() を使うとハンドラーは保存されるが子の順序の情報も残ってしまい、append の順序に関係なく each では元通りの順序で来る。
*/
            // アイテムの外観の変更とイベント生成（てか色を決め打ちしたらアカンやろ、とは思うが順序による css 属性指定における「順序」は DOM のデータであるらしく、リスト初期化以降に remove() + append() で順序を変更することはできない。どうするんだ？→色等を直接指定するのはやめ、クラス名を付け直すことにした）
            list.find('>.item').each(function(item_index, item_dom) {
                var current_item_index = $(item_dom).attr('item_index');
                $(item_dom).removeClass('even');
                $(item_dom).removeClass('odd');
                $(item_dom).removeClass('top');
                if (current_item_index % 2) {
                    $(item_dom).addClass('odd');
                } else {
                    $(item_dom).addClass('even');
                }
                if (current_item_index == 0) {
                    $(item_dom).addClass('top');
                }
                hidden_list.trigger('draggable_list:item_change', {item_index: current_item_index, item_dom: item_dom});
            });
            // リストのイベント生成
            var item_count = list.find('>.item').length;
            var items = [];
            for (var item_index = 0; item_index < item_count; item_index++) {           // item_index 属性値の昇順のアイテム配列を作成
                items.push(list.find('>.item[item_index=' + item_index + ']').get(0));
            }
            list.css('display', 'none');
            list.css('display', 'block');
            hidden_list.trigger('draggable_list:change', {type: 'order', items: items});
        });
        $(document).mousemove(function(e) {
            if (item._mousedown) {
                if (item._mouse) {
                    item._prev_mouse = item._mouse;
                }
                item._mouse = {x: e.pageX, y: e.pageY};
                var itemX = e.pageX - item._mousedown.offsetX;  // アイテムの左上隅を原点としたマウスの X 座標がマウスダウン時と同じになるようなアイテムの左上隅の新しい X 座標
                var itemY = e.pageY - item._mousedown.offsetY;  // アイテムの左上隅を原点としたマウスの Y 座標がマウスダウン時と同じになるようなアイテムの左上隅の新しい Y 座標
                itemX -= item.parent().offset().left;   // アイテムの親に対する相対座標に変換
                itemY -= item.parent().offset().top;    // アイテムの親に対する相対座標に変換
                item.css({
                    left: itemX + 'px',
                    top: itemY + 'px'
                });
                var rectDragged = new Rect(item.offset().left, item.offset().top, item.outerWidth(), item.outerHeight());
                var evaded = false;
                list.find('>.item:not(.dragged)').each(function(item_index, item_dom) {
                    if (!evaded) {
                        var itemTarget = $(item_dom);
                        var rectTarget = new Rect(itemTarget.offset().left, itemTarget.offset().top, itemTarget.outerWidth(), itemTarget.outerHeight());
                        if (rectDragged.isCenterPointInRect(rectTarget)) {
                            if (item._prev_mouse && item._prev_mouse.y < item._mouse.y) {
                                if (DraggableListEvadeItem(list, hidden_list, itemTarget, item, 'upward')) {
                                    evaded = true;
                                }
                            } else {
                                if (DraggableListEvadeItem(list, hidden_list, itemTarget, item, 'downward')) {
                                    evaded = true;
                                }
                            }
                        }
                        if (evaded) {
                            hidden_list._item_moved = true;
                        }
                    }
                });
            }
        });
    });
}

// 移動により mousemove が発生するやもしれぬ
function DraggableListEvadeItem(list, hidden_list, target/*自アイテム*/, dragged/*ドラッグ中のアイテム*/, direction) {
    var target_index = parseInt(target.attr('item_index'), 10);
    var dragged_index = parseInt(dragged.attr('item_index'), 10);
    // 上方向に穴（ドラッグ中のアイテムが抜けた穴）を探す
    if (direction == 'upward') {
        // 穴は上方向にある
        if (dragged_index < target_index) {
            // 一つ上が穴（ドラッグ中のアイテムを空いたスペースに入れる）
            if (dragged_index == target_index - 1) {
                DraggableListSwapItems(list, hidden_list, target, dragged_index, dragged, target_index);
                return true;
            // 穴は一つ上より更に上にある
            } else {
                var upper_target = list.find('>.item[item_index=' + (target_index - 1) + ']');
                // 上をどかして
                if (DraggableListEvadeItem(list, hidden_list, upper_target, dragged, direction)) {
                    // ドラッグ中のアイテムを空いたスペースに入れる（この時点で、穴はターゲットアイテムの一つ上に移動している）
                    DraggableListSwapItems(list, hidden_list, target, target_index - 1, dragged, target_index);
                    return true;
                }
            }
        // 上方向に穴はない
        } else {
            return false;
        }
    // 下方向に穴を探す
    } else {
        // 穴は下方向にある
        if (target_index < dragged_index) {
            // 一つ下が穴（ドラッグ中のアイテムを空いたスペースに入れる）
            if (target_index + 1 == dragged_index) {
                DraggableListSwapItems(list, hidden_list, target, dragged_index, dragged, target_index);
                return true;
            // 穴は一つ下より更に下にある
            } else {
                var downer_target = list.find('>.item[item_index=' + (target_index + 1) + ']');
                // 下をどかして
                if (DraggableListEvadeItem(list, hidden_list, downer_target, dragged, direction)) {
                    // ドラッグ中のアイテムを空いたスペースに入れる（この時点で、穴はターゲットアイテムの一つ下に移動している）
                    DraggableListSwapItems(list, hidden_list, target, target_index + 1, dragged, target_index);
                    return true;
                }
            }
        // 下方向に穴はない
        } else {
            return false;
        }
    }
}

function DraggableListSwapItems(list, hidden_list, target, new_target_index, dragged, new_dragged_index) {
    // 隠しアイテムを入れ替える
    var hidden_target = hidden_list.find('>.item[item_index=' + new_dragged_index + ']');   // ターゲットアイテムに対応する隠しアイテム（現在の位置は new_dragged_index）
    var hidden_dragged = hidden_list.find('>.item[item_index=' + new_target_index + ']');   // 穴アイテムに対応する隠しアイテム（現在の位置は new_target_index）
    hidden_target.attr('item_index', new_target_index);
    hidden_dragged.attr('item_index', new_dragged_index);
    hidden_target.detach();
    if (new_target_index < new_dragged_index) {
        hidden_dragged.before(hidden_target);
    } else {
        hidden_dragged.after(hidden_target);
    }
    // 見えるアイテムを入れ替える
    target.attr('item_index', new_target_index);
    dragged.attr('item_index', new_dragged_index);
    target.animate({
        left: hidden_target.offset().left - list.offset().left + 'px',
        top: hidden_target.offset().top - list.offset().top + 'px'
    }, 103, 'swing');
}

var _panel_types = [
'panel-primary',
'panel-default',
'panel-danger',
'panel-warning',
'panel-success',
'panel-info'
];

// checkbox_wrap を複数行に綺麗に並べる
function TileCheckboxes(container) {
    container.ready(function(e) {
        var rows = [];
        var cols;
        var last_top;
        container.find('.checkbox_wrap').each(function(i, o) {
            var top = parseInt($(o).offset().top, 10);
            if (last_top == undefined || last_top < top) {
                if (cols) {
                    rows.push(cols);
                }
                cols = [];
            }
            cols.push(o);
            last_top = top;
        });
        rows.push(cols);
        console.log(rows);
        for (var i = 1; i < rows.length; i++) {
            var cols = rows[i];
            for (var j = 0; j < cols.length; j++) {
                if (j == 1) {
                    break;
                }
                var chexkbox_wrap = $(cols[j]);
                chexkbox_wrap.css({
                    'margin-top': '6px',
                    'margin-left': 0
                });
            }
        }
    });
}

/*
テーブルの行を選択できるようにする（この挙動は Windows Explorer などのマネ）
Ctrl+クリックの場合：
    クリックした行以外：そのまま（何もしない）
    クリックした行
        選択されている場合：選択解除
        選択されていない場合：選択
クリックのみの場合
    クリックした行以外：選択解除
    クリックした行
        選択されている場合：編集開始（てゆうかコールバック関数を呼ぶ）
        選択されていない場合：選択
どちらの場合も、フォーカスはクリックした行へ移動
*/
function MakeTableSelectable(table, bMultiselect, callback) {
    table.addClass('selectable');
    table.find('>tbody>tr').click(function(e) {
        var tr = $(e.currentTarget);
        if (e.ctrlKey) {
            if (bMultiselect) {
                tr.toggleClass('selected');
            } else {
                var bSelected = tr.hasClass('selected');
                tr.parent().find('>tr').removeClass('selected');
                if (bSelected) {
                } else {
                    tr.addClass('selected');
                }
            }
        } else {
            if (bMultiselect) {
            } else {
                tr.parent().find('>tr').removeClass('selected');
            }
            tr.addClass('selected');
        }
        tr.parent().find('>tr').removeClass('focused');
        tr.addClass('focused');
        if (typeof callback == 'function') {
            callback(e);
        }
    });
}

/*
noty() による確認ダイアログ。
こっちの方が断然スマートやね。
noty() は Object を返すし、引数で諸々カスタマイズできるし。
確認ダイアログのみならず何でもできそう。→これは気の所為だった。幅が限られているので巨大ダイアログは結構つらい。
*/
function NotyConfirm(options) {
    var oNoty = noty({
        text: options.text,
        layout: options.layout,
        buttons: [
            {
                addClass: 'btn btn-default btn-clean pull-left cancel',
                text: 'Cancel',
                onClick: function($noty) {
                    $noty.close();
                }
            },
            {
                addClass: 'btn btn-primary btn-clean pull-right ok',
                text: 'OK',
                onClick: function($noty) {
                    $noty.close();
                    options.onOK();
                }
            }
        ]
    });
    // noty の構築のコードで要素に個別に style を設定しているので、css で色系の style を指定しても無駄。size 系は効く。
    oNoty.$bar.css({
        border: 'solid 1px #eee',
    });
    oNoty.$message.css({
        background: 'white',
        color: 'black',
    });
    oNoty.$buttons.addClass('clearfix');
    oNoty.$buttons.css({
        background: '#f5f5f5',
    });
    // キー操作をボタンのクリックに変える
    var btnOK = oNoty.$buttons.find('button.ok');
    btnOK.keydown(function(e) {
        // Enter TODO: スペースもこっち？んなアホな
        if (e.which == 13) {
            e.stopPropagation();
            $(e.currentTarget).trigger('click');
        // ESC
        //} else if (e.which == 27) {
        // その他
        } else {
            e.stopPropagation();
            $(e.currentTarget).parent().find('button.cancel').trigger('click');
        }
    });
    btnOK.blur(function(e) {
        $(e.currentTarget).parent().find('button.cancel').trigger('click');
    });
    btnOK.focus();
}

function DownloadTarball(subscription) {
    var form = $('<form action="/api/" method="POST"></form>\n');
    var account = $('<input type="hidden" name="_account"/>');
    var password = $('<input type="hidden" name="_password"/>');
    var command = $('<input type="hidden" name="_command" value="download_tarball"/>');
    var subscription_id = $('<input type="hidden" name="subscription_id"/>');
    var user = User.getCurrent();
    account.val(user.account);
    password.val(user.password);
    subscription_id.val(subscription.id);
    form.append(account);
    form.append(password);
    form.append(command);
    form.append(subscription_id);
    $('body').prepend(form);
    form.submit();
    form.remove();
}

function RemoveAllTooltips() {
    setTimeout(() => {
        $('body .tooltip').remove();
    }, 1000);
}

function PrettyPrint(o) {
    var json = JSON.stringify(o, null, 4);
    var quoted = json
        .replace(/"([A-Za-z_][0-9A-Za-z_]+)":/g, '$1:')
        .replace(/"/g, "'")
        //.replace(/^(.*)$/gm, "'$1\\n'")
    ;
    return quoted;
}

function ShowAPIErrorDialog(argv) {
    const o = Object.assign({
        title: 'API ERROR',
        date: (new Date()).toUTC().format('YYYY-mm-dd HH:MM:SS'),
        location: Location.getCurrent(),
        history: User.getCurrent().history,
    }, argv);
    if (o.data) {
        if (o.data._password) {
            o.data._password = '********';
        }
    }
    const message = PrettyPrint(o);
    ShowMessageBox({
        mode: 'error',
        enableCopy: true,
        message: message,
        isHTML: false,
    });
}

// TODO: xhr の扱いは、あのままでいいか？
function ShowHTTPErrorDialog(argv) {
    const o = Object.assign({
        title: 'HTTP ERROR',
        date: (new Date()).toUTC().format('YYYY-mm-dd HH:MM:SS'),
        location: Location.getCurrent(),
        history: User.getCurrent().history,
    }, argv);
    if (o.data) {
        if (o.data._password) {
            o.data._password = '********';
        }
    }
    const message = PrettyPrint(o);
    ShowMessageBox({
        mode: 'error',
        enableCopy: true,
        message: message,
        isHTML: false,
    });
}

////////////////////////////////////////////////////////////////////////
// ■クラス

// 全てのオブジェクトのベースクラス（「全て」はウソ）
function BaseClass(arg) {
    if (arg != undefined && typeof arg == 'object' && arg.toString() == '[object Object]') {
        for (var name in arg) {
            var value = arg[name];
            if (typeof value == 'string') {
                if (value == '0') {
                    value = 0;
                } else if (value.match(/^-?[1-9][0-9]*$/)) {    // 「parseInt() をかけて出力が数値ならばその値を使う」方式でやったら日付、時刻が数値に変換される大惨事になった。ので正規表現に戻した。
                    value = parseInt(value, 10);
                }
            }
            this[name] = value;
        }
    }
    if (typeof this == 'object') {
        if (this.id == undefined) {
            this.id = -1;               // クライアントが新しく作ったオブジェクト
        }
    }
}

function Device() {
}
Device.isWide = function() {
    return (1000 < GetViewPortWidth());
};

// ブラウザのデバッガー・コンソール
function Console() {
}
/*
書式指定付きで console.log() を呼ぶ。
obj: 出力する対象。任意の型。
style: HTML タグの style 属性と同じ形式の文字列。undefined 可。
header: 出力文字列の先頭に付ける文字列。undefined 可。
*/
Console.log = function(obj, style, header) {

    let message;

    if (typeof obj == 'string') {
        message = obj;
    } else if (typeof obj == 'undefined') {
        message = 'undefined';
    } else if (typeof obj == 'object') {
        if (obj == null) {
            message = 'null';
        } else {
            message = obj.constructor.name + ' ' + JSON.stringify(obj, null, 4);
        }
    } else {
        message = obj.toString();
    }

    if (header != undefined) {
        if (typeof header != 'string') {
            throw 'ConsoleLog(): illegal type of argument "header"';
        }
        message = header + ' ' + message;
    }

    if (style != undefined) {
        if (typeof style != 'string') {
            throw 'ConsoleLog(): illegal type of argument "style"';
        }
        message = '%c' + message;
    }

    console.log(message, style);
};

Console.debug = function(obj, header) {
    Console.log(obj, 'color: orange; font-weight: bold; font-size: 14px;', header ? header : '>>>>>>>');
}

// ユーザーの「好み」
function Preferences() {
}
Preferences.load = function() {
    //Console.debug('Preferences.load(): called!');
    Preferences.page = User.getCurrent().getCurrentURI();
    Preferences.storage_item_key = 'preferences_' + User.getCurrent().id;
    let preferences = localStorage.getItem(Preferences.storage_item_key);
    if (preferences == undefined || preferences == '') {
        Preferences.data = {}
        Preferences.updated = false;
    } else {
        try {
            Preferences.data = JSON.parse(preferences);
            Preferences.updated = false;
        } catch (e) {
            Console.debug(e, '>>>>>>> Preferences.load(): e:');     // たぶん解析不能のゴミが入っている（過去のバグで）
            Preferences.data = {};
            Preferences.updated = true;
        }
    }
}
Preferences.save = function() {
    if (Preferences.updated) {
        var preferences = JSON.stringify(Preferences.data);
        localStorage.setItem(Preferences.storage_item_key, preferences);
        Preferences.updated = false;
    }
}
Preferences.set = function(key, value, global) {
    var data = Preferences.data;
    if (global) {
        data[key] = value;
        Preferences.updated = true;
    }
    if (data._page_data == undefined) {
        data._page_data = {}
    }
    if (data._page_data[Preferences.page] == undefined) {
        data._page_data[Preferences.page] = {}
    }
    var page_data = data._page_data[Preferences.page];
    if (page_data == undefined) {
        page_data = {}
    }
    page_data[key] = value;
    Preferences.updated = true;
}
Preferences.get = function(key, global) {
    if (Preferences.data == undefined) {
        return undefined;
    }
    let data = Preferences.data;
    if (global) {
        return data[key];
    }
    if (data._page_data == undefined) {
        return undefined;
    }
    if (data._page_data[Preferences.page] == undefined) {
        return undefined;
    }
    return data._page_data[Preferences.page][key];
}
Preferences.showDialog = function(argv) {
    ShowPreferencesDialog(argv);
};

// クリップボード
function Clipboard() {
}
Clipboard.copy = function(str) {
    var div = document.createElement('div');
    div.appendChild(document.createElement('pre')).textContent = str;
    div.style.position = 'fixed';
    div.style.left = '-100%';
    document.body.appendChild(div);
    document.getSelection().selectAllChildren(div);
    var success = document.execCommand('copy');
    document.body.removeChild(div);
    return success;
}
Clipboard.paste = function(argv) {
    try {
        // http でサイトを開いているときは、readText() で例外が飛ぶ
        navigator.clipboard.readText().then(text => {
            // クリップボードから読み取ったテキストを処理する
            //console.log(text);
            if (argv && argv.onSuccess) {
                argv.onSuccess(text);
            }
        }).catch(err => {
            // クリップボードからの読み取りに失敗した場合の処理
            //console.error('Failed to read clipboard contents: ', err);
            if (argv && argv.onFailure) {
                argv.onFailure(err);
            }
        });
    } catch (e) {
        console.log('>>>>>>>Clipboard.paste(): e', e);
    }
}

// URI
function URI(uri) {
    BaseClass.call(this, uri);
    this.build = function() {
        var uri = this.protocol + '://' + this.fqdn + (this.port ? (':' + this.port) : '') + (this.path ? this.path : '') + (this.query ? ('?' + this.query) : '');
        return uri;
    }
    this.buildBase = function() {
        var base = this.protocol + '://' + this.fqdn + (this.port ? (':' + this.port) : '');
        return base;
    }
    this.buildExtension = function() {
        var ext = (this.path ? this.path : '') + (this.query ? ('?' + this.query) : '');
        return ext;
    }
}
URI.prototype = BaseClass.prototype;

// Location
function Location(location) {
    try {
        this.href = location.href.parseURI();
    } catch (e) {
        throw 'Location(): ' + e;
    }
    this.isDev = function() {
        return (this.href.fqdn.indexOf('-dev') != -1);
    }
    this.getQueryValueOf = function(name) {
        return this.href.query_map[name];
    }
    this.deleteQuery = function(name) {
        delete this.href.query_map[name];
    }
    this.buildBase = function() {
        return this.href.buildBase();
    }
}
Location._current;
Location.setCurrent = function(location) {
    //console.log('>>>>>>>Location.setCurrent(): ' + location);
    try {
        Location._current = new Location(location);
    } catch (e) {
        throw 'Location.setCurrent(): ' + e;
    }
    //console.log('>>>>>>>Location._current', Location._current);
/*
    let query_map = Location._current.href.query_map;
    for (let name in query_map) {
        console.log('>>>>>>>Location.setCurrent()', name + '==' + query_map[name]);
    }
*/
};
Location.getCurrent = function() {
/*
    let query_map = Location._current.href.query_map;
    for (let name in query_map) {
        console.log('>>>>>>>Location.getCurrent()', name + '==' + query_map[name]);
    }
*/
    return Location._current;
};

// User
function User(user) {
    BaseClass.call(this, user);
    this.isValidated = function() {
        return (this.validated == 1);
    }
    this.getLanguage = function() {
        return (navigator.language || navigator.userLanguage);
    }
    this.getCurrentLanguage = function() {
        let language = Location.getCurrent().getQueryValueOf('lang');
        if (language == undefined) {
            language = Preferences.get('language', true);
        }
        if (language == undefined) {
            language = this.getLanguage();
        }
        if (language == undefined) {
            language = 'en';
        }
        return language;
    }
    this.history = [];
    this.pushURI = function(uri) {
        this.history.push(uri);
    }
    this.getCurrentURI = function() {
        if (!this.history || this.history.length == 0) {
            return undefined;
        }
        return this.history[this.history.length - 1];
    }
    this.isGuest = function() {
        //return (this.id == GUEST_ID);
        return (this.type == USER_TYPE_GUEST);
    }
    this.isAdmin = function() {
        return (this.type == USER_TYPE_ADMIN);
    }
    this.isParent = function() {
        return (this.type == USER_TYPE_PARENT);
    }
    this.isChild = function() {
        return (this.type == USER_TYPE_CHILD);
    }
    this.getIndexPath = function() {
        if (this.isAdmin()) {
            return INDEX_PATH_ADMIN;
        } else if (this.isGuest()) {
            return INDEX_PATH_GUEST;
        } else {
            return INDEX_PATH_OTHER;
        }
    }
    // カレントユーザーの情報に合わせて画面の各部を更新する。
    this.updateWindow = function() {
        /* admin ならダイアログ表示時に「びよ～ん」となっても構わない
        if (this.isAdmin()) {
            $('body').css({
                'height': 'auto',
                'overflow-y': 'auto',
            });
        }
        */

        // 左上隅のプロフィールを書き換える。
        let name = this.account.replace(/^([^@]+)@.*$/, function(match, p1) {return p1});
        let Name = name.charAt(0).toUpperCase() + name.slice(1);
        $('.xn-profile a.profile-mini img').attr('alt', Name);
        //$('.xn-profile .profile .profile-image img').attr('alt', name);
        this.setProfileImage();
        $('.xn-profile .profile .profile-data .profile-data-name').html('Welcome, ' + Name + '!');
        $('.xn-profile .profile .profile-data .profile-data-title').html(this.account);

        // 右上隅のアイコン・ボタンの外観と機能を切り替える。
        if (this.isGuest()) {
            $('a.mb-control').html('<span class="fa fa-sign-in" title="Login"></span>');
            $('a.mb-control').off().click(function(e) {
                DoYouWantToLogin(true);
                return false;
            });
            let login = Location.getCurrent().getQueryValueOf('login');
            if (login) {
                Location.getCurrent().deleteQuery('login');         // これをやらないと、ログアウトして guest に戻った時もログインダイアログが表示される。
                DoYouWantToLogin(false, login.isValidMailAddress() ? login : undefined);
            } else if (this.history.length == 1) {
                ShowMessageBox({
                    message: 'You are a guest now.',
                    on_close: function() {
                        ShowLoginNoty();
                        ShowLanguageNotice();
                    },
                });
            }
        } else {
            $('a.mb-control').html('<span class="fa fa-sign-out" title="Logout"></span>');
            $('a.mb-control').off().click(function(e) {
                DoYouWantToLogout(e);
                return false;
            });
            if (this.history.length == 1) {
                ShowMessageBox({
                    message: 'Now you have logged in as ' + this.account + '.',
                    on_close: function() {
                        ShowLanguageNotice();
                    },
                });
            }
        }
    }
    // プロフィール画像
    this.setProfileImage = function() {
        return;
        var color;
        if (this.isGuest()) {
            color = 'rgb(192, 192, 192)';
        } else if (this.isAdmin()) {
            //color = '#E04B4A';
            color = '#FEA223';
        } else {
            color = '#1caf9a';
        }
        var parent = $('.xn-profile .profile .profile-image');
        var cx = screen.width < MAX_PHONE_SCREEN_WIDTH ? Math.floor(screen.width / 2 - parent.offset().left) : 100;
        var user_svg_gray =
        '<svg>\n' +
            '<defs>\n' +
                '<radialGradient id="user_grad_gray" cx="20%" cy="30%" r="50%" fx="50%" fy="50%">\n' +
                    '<stop offset="0%" style="stop-color: rgb(255, 255, 255); stop-opacity: 1;" />\n' +
                    '<stop offset="100%" style="stop-color: ' + color + '; stop-opacity: 1;" />\n' +
                '</radialGradient>\n' +
            '</defs>\n' +
            '<ellipse cx="' + cx + '" cy="80" rx="40" ry="50" fill="url(#user_grad_gray)" />\n' +
        '</svg>\n'
        '';
        parent.html(user_svg_gray);
    }
}
User._current;
User.initialize = function() {
    User._current = User.createGuest();
    Preferences.load();
};
User.createGuest = function() {
    return new User({
        id: GUEST_ID,
        type: USER_TYPE_GUEST,
        account: GUEST_ACCOUNT,
        password: GUEST_PASSWORD,
        validated: 0,
    });
};
// DONE: これ↓があると、index.html を介さず普通に guest_dashboard.html を表示しようとするだけで例外が飛ぶ (intermediate value)(...) is not a function
// 何と最後の '}' の後に ';' が無いと例外が飛び、あると正常に処理される。何だこりゃ？ javascript はようわからん。
User.getCurrent = function() {
    //return _user;
    return User._current;
};
User.setCurrent = function(user) {
    //_user = new User(user);
    //LoadBody(_user.getIndexPath());
    //console.log('typeof user>>>>>>>', typeof user);
    User._current = user;
    let page_path;
    let page = Location.getCurrent().getQueryValueOf('page');
    if (page) {
        Location.getCurrent().deleteQuery('page');  // これをやらないと、ログアウトして guest に戻った時も、このページへ行こうとする。
        page_path = '/' + page + '.html';
    } else {
        page_path = User._current.getIndexPath();
    }
    Preferences.load();
    LoadBody(page_path);
};
User._arrayTypeString = [
    'admin',
    'parent',
    'child',
    'guest',
];
User.typeToString = function(type) {
    return User._arrayTypeString[type];
};

// PayPalPlanTemplate
function PayPalPlanTemplate() {
}
/*
var argv = {
    data: <object that will be passed to the server>,
    success: <function to be called on successful response>,
    error: <function to be called on error>,
    complete: <function to be called whether or not successful>,
};
*/
PayPalPlanTemplate.load = function(argv) {
    CallStarshipAPI('/api/', 'POST', 21013, 'load_paypal_plan_templates', {
        data: {},
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            PayPalPlanTemplate._map = {};
            for (var i = 0; i < response.paypal_plan_templates.length; i++) {
                var paypal_plan_template = response.paypal_plan_templates[i];
                PayPalPlanTemplate._map[paypal_plan_template.id] = paypal_plan_template;
            }
            if (argv.success) {
                argv.success(response);
            }
        },
        error: function(response) {
            console.log('>>>>>>>code: ' + response.code + '\n' + 'message: ' + response.message);
            if (argv.error) {
                argv.error(response);
            }
        },
        fatal: function(xhr) {
            var log = {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders().split(/\r\n/),
                response: xhr.responseJSON ? xhr.responseJSON : null,
            };
            var strLog = JSON.stringify(log, null, '    ');
            console.log('COPY START >>>>>>>');
            console.log(strLog);
            console.log('COPY END <<<<<<<');
            alert('Press Shift-Ctrl-I to show the debug console.\nCopy the error response displayed there.\nSend it somehow to me.');
            if (argv.error) {
                argv.error(xhr);    // TODO: 呼び出す関数を間違えている
            }
        },
        complete: function(xhr) {
            if (argv.complete) {
                argv.complete(xhr);
            }
        },
    });
};
PayPalPlanTemplate.getById = function(paypal_plan_template_id) {
    return PayPalPlanTemplate._map[paypal_plan_template_id];
};
/*
var argv = {
    data: <object that will be passed to the server>,
        {
            id: <natural number that denotes paypal_plan_templates record id> | <undefined which denotes a new record>,
            name: <string without any carriage return codes or line feed codes>,
            description: <string not longer than 127 characters>,
            js_code: <string of any length>,
            memo: <string>
        },
    success: <function to be called on successful response>,
    error: <function to be called on error>,
    complete: <function to be called whether or not successful>,
};
*/
PayPalPlanTemplate.save = function(argv) {
    CallStarshipAPI('/api/', 'POST', 21013, 'save_paypal_plan_templates', {
        data: argv.data,
        wait_cursor: {
            classname: 'cursor_wait',
            containers: [$('body'), $('button'), $('input')],
        },
        success: function(response) {
            PayPalPlanTemplate._map = {};
            for (var i = 0; i < response.paypal_plan_templates.length; i++) {
                var paypal_plan_template = response.paypal_plan_templates[i];
                PayPalPlanTemplate._map[paypal_plan_template.id] = paypal_plan_template;
            }
            if (argv.success) {
                argv.success(response);
            }
        },
        error: function(response) {
            console.log('>>>>>>>code: ' + response.code + '\n' + 'message: ' + response.message);
            if (argv.error) {
                argv.error(response);
            }
        },
        fatal: function(xhr) {
            var log = {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders().split(/\r\n/),
                response: xhr.responseJSON ? xhr.responseJSON : null,
            };
            var strLog = JSON.stringify(log, null, '    ');
            alert(strLog);
            if (argv.error) {
                argv.error(xhr);    // TODO: 呼び出す関数を間違えている
            }
        },
        complete: function(xhr) {
            if (argv.complete) {
                argv.complete(xhr);
            }
        },
    });
};

////////////////////////////////////////////////////////////////////////
// ■ここまでの諸々の関数を jQuery オブジェクトメソッド化

(function($) {
    $.fn.CreateDialog = function(argv) {
        var dialog = this.clone(true, true);
        if (argv) {
            if (argv.container) {
                argv.container.append(dialog);
            }
            if (argv.id) {
                dialog.prop('id', argv.id);
            }
            if (argv.type) {
                for (var i = 0; i < _panel_types.length; i++) {
                    dialog.removeClass(_panel_types[i]);
                }
                dialog.addClass(argv.type);
            }
            if (argv.title) {
                dialog.find('.panel-heading .title').html(argv.title);
            }
            if (argv.subtitle) {
                dialog.find('.panel-heading .subtitle').html(argv.subtitle);
            }
        } else {
            $('body').append(dialog);
        }
        //ShowCentered(dialog);
        //Fadable(dialog);      呼ぶ必要無し
        Draggable(dialog);      // フレームワーク（Joli テンプレート）の draggable はなんか動きが変なので自力でやった
        if (argv && argv.on_remove) {
            dialog._on_remove = argv.on_remove;
        }
        dialog.find('.panel-remove').click(function(e) {
            RemoveAllNotices();
            if (dialog._modal_mask) {
                dialog._modal_mask.animate({'opacity': 0}, 200, function() {
                    dialog._modal_mask.remove();
                });
            }
            if (dialog._on_remove) {
                dialog._on_remove();
            }
        });
        return dialog;
    }
    $.fn.ShowModeless = function(argv) {
        var dialog = this;
        var topmost_dialog_z_index = 1000;
        dialog.parent().find('.dialog:visible').each(function(i, o) {
            var z_index = parseInt($(o).css('z-index'), 10);
            topmost_dialog_z_index = Math.max(topmost_dialog_z_index, z_index);
        });
        //dialog.css('z-index', 999);
        dialog.css('z-index', topmost_dialog_z_index);
        ShowCentered(dialog, argv);
        return dialog;
    }
    $.fn.ShowModal = function(argv) {
        var dialog = this;
/*
        var topmost_modal_mask_z_index = 998;
        dialog.parent().find('.modal_mask').each(function(i, o) {
            var z_index = parseInt($(o).css('z-index'), 10);
            topmost_modal_mask_z_index = Math.max(topmost_modal_mask_z_index, z_index);
        });
*/
        var topmost_dialog_z_index = 1000;
        dialog.parent().find('.dialog:visible').each(function(i, o) {
            var z_index = parseInt($(o).css('z-index'), 10);
            topmost_dialog_z_index = Math.max(topmost_dialog_z_index, z_index);
        });
        var mask = $('<div class="modal_mask"></div>');
        mask.css({
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '100%',
            height: $(document).height() + 'px',
            background: 'black',
            opacity: 0.3,
            //'z-index': topmost_modal_mask_z_index + 2
            'z-index': topmost_dialog_z_index + 1
        });
        if (argv && argv.mask && argv.mask.css) {
            mask.css(argv.mask.css);
        }
        mask.click(function(e) {
            e.stopPropagation();
        });
        dialog.parent().prepend(mask);
        //dialog.css('z-index', topmost_modal_mask_z_index + 3);
        dialog.css('z-index', topmost_dialog_z_index + 2);
        dialog._modal_mask = mask;
        ShowCentered(dialog);
        return dialog;
    }
    $.fn.DestroyDialog = function() {
        this.find('.panel-remove').trigger('click');
    }
    $.fn.CreateSelectPicker = function(argv) {
        CreateSelectPicker(this, argv);
    }
    $.fn.DestroySelectPicker = function(arg) {
        DestroySelectPicker(this);
    }
    $.fn.CreateTagsInput = function(options, tags_data) {
        return CreateTagsInput(this, options, tags_data);
    }
    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if ('selectionStart' in el) {
            pos = el.selectionStart;
        } else if ('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
    $.fn.selectRange = function(start, end) {
        if (end === undefined) {
            end = start;
        }
        return this.each(function() {
            if ('selectionStart' in this) {
                this.selectionStart = start;
                this.selectionEnd = end;
            } else if (this.setSelectionRange) {
                this.setSelectionRange(start, end);
            } else if (this.createTextRange) {
                var range = this.createTextRange();
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', start);
                range.select();
            }
        });
    };
    $.fn.CreateDraggableList = function(argv) {
        return CreateDraggableList(this, argv);
    }
    $.fn.DestroyDraggableList = function() {
        var container = this;
        container.find('>.draggable_list.visible').remove();
    }
})(jQuery);

////////////////////////////////////////////////////////////////////////
// ■コンタクトページ

var _from_name = 'Starship.jp';
var _from_address = 'no-reply@starship.jp';

function SendMail() {
    var mail;
    var first_name;
    var last_name;
    var country;
    var state;
    var city;
    var message;
    try {
        mail = $('#mail').val();
        if (mail.match(/^[ 　]*$/)) {
            throw {message: 'Enter your mail address', target: $('#mail')};
        }
        if (!mail.isValidMailAddress()) {
            throw {message: 'Not a valid mail address', target: $('#mail')};
        }
        first_name = $('#first_name').val();
        if (first_name.match(/^[ 　]*$/)) {
            throw {message: 'Enter your first name', target: $('#first_name')};
        }
        last_name = $('#last_name').val();
        if (last_name.match(/^[ 　]*$/)) {
            throw {message: 'Enter your last name', target: $('#last_name')};
        }
        country = $('#country').val();
        if (country.match(/^[ 　]*$/)) {
            throw {message: 'Enter your country', target: $('#country')};
        }
        state = $('#state').val();
        if (state.match(/^[ 　]*$/)) {
            throw {message: 'Enter your state/province', target: $('#state')};
        }
        city = $('#city').val();
        if (city.match(/^[ 　]*$/)) {
            throw {message: 'Enter your city/locality', target: $('#city')};
        }
        message = $('#message').val();
        if (message.match(/^[ 　]*$/)) {
            throw {message: 'Enter your message', target: $('#message')};
        }
    } catch (e) {
        e.target.parent().noty({text: e.message, type: 'error'});
        $('html, body').animate({scrollTop: e.target.offset().top});
        return;
    }
    var body =
"<pre>\n" +
"Hello, " + first_name + ".\n" +
"\n" +
"Thank you for your interest in me or my products.\n" +
"I will make best efforts to reply within 24 hours.\n" +
"Please don't reply to this mail because it has been sent by a server automatically.\n" +
"\n" +
"--------\n" +
_from_name + "\n" +
"URI: https://www.starship.jp/\n" +
"</pre>\n"
;
    var argv = {
        to: mail,
        from: _from_address,
        subject: 'Thank you.',
        body: body
    };
    CallAPI('./api', 'POST', 'sendmail', 7013, argv, {
        success: function(response) {
            var text = 
"<div style=\"text-align: left; font-size: 12px;\">\n" +
"I have received your message and sent an automatic reply to " + mail + ".<br>\n" +
"If you don't receive it within a few minutes, it is highly probable that you <span style=\"font-weight: bold; color: red;\">misspelled your mail address</span>.<br>\n" +
"In that case, corret it and push the submit button again.<br>\n" +
"</div>\n"
;
            noty({text: text, layout: 'topCenter', type: 'success'});
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            return;
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
            return;
        }
    });
    argv.to = 'information@starship.jp';
    argv.subject = 'Message From Web Form';
    argv.body =
"<pre>\n" +
mail + "\n" +
first_name + "\n" +
last_name + "\n" +
country + "\n" +
state + "\n" +
city + "\n" +
message + "\n" +
"</pre>\n"
;
    CallAPI('./api', 'POST', 'sendmail', 7013, argv, {
        success: function(response) {
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
    var message =
'You have a message from a guest.\n' +
'REMOTE_ADDR: ' + _remote_addr + '\n' +
'REMOTE_HOST: ' + _remote_host + '\n' +
'MAIL: ' + mail + '\n' +
'FIRST NAME: ' + first_name + '\n' +
'LAST NAME:' + last_name + '\n' +
'COUNTRY: ' + country + '\n' +
'STATE/PROVINCE: ' + state + '\n' +
'CITY/LOCALITY: ' + '\n' +
'MESSAGE:\n' +
message
;
    CallAPI('./api', 'POST', 'send_line_message_to_kisaburo', 7013, {message: message}, {
        success: function(response) {
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■ページの初期化

function LogConsoleAccess(onSuccess) {
    let user = CallAPI.toPlainObject(User.getCurrent());
    user.password = '********';
    CallStarshipAPI('/api/', 'POST', 7013, 'log_console_access', {
        data: {
            user: user,
            log: (Location.getCurrent().getQueryValueOf('log') != 'no'),
        },
        success: function(response) {
            onSuccess(response);
        },
        error: function(response) {
            let error = 'code: ' + response.code + '\n' + 'message: ' + response.message;
            console.log('>>>>>>>', error);
            const ERROR_OPERATION_NOT_NEEDED = 6;
            if (response.code != ERROR_OPERATION_NOT_NEEDED) {
                alert(error);
            }
        },
        fatal: function(xhr) {
            var log = {
                status: xhr.status,
                headers: xhr.getAllResponseHeaders().split(/\r\n/),
                response: xhr.responseJSON ? xhr.responseJSON : null,
            };
            var strLog = JSON.stringify(log, null, 4);
            console.log(strLog);
            alert(strLog);
        },
        complete: function(xhr) {
        },
    });
}

function ActivateCurrentPage() {
    var uri = location.href.parseURI();
    //console.log('uri>', uri);
    $('#menu li a[page_path]').each(function(i, o) {
        var page_path = $(o).attr('page_path');
        if (page_path == uri.path) {
            $(o).addClass('current_page_item');
        } else {
            $(o).removeClass('current_page_item');
        }
    });
}

function AddPageView() {
    var me = '121.1.142.207';
    if (_remote_addr == me) {
        return;
    }
    var message =
'You have a visitor to https://www.starship.jp/.\n' +
'REQUEST_URI: ' + _request_uri + '\n' +
'REMOTE_ADDR: ' + _remote_addr + '\n' +
'REMOTE_HOST: ' + _remote_host
;
    CallAPI('./api', 'POST', 'send_line_message_to_kisaburo', 7013, {message: message}, {
        success: function(response) {
            //noty({text: 'Welcome!', layout: 'topCenter', type: 'success'});
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function ConfirmNotySample_() {
    noty({
        text: 'Do you have a pen?',
        layout: 'topRight',
        buttons: [
            {
                addClass: 'btn btn-success btn-clean',
                text: 'Yes',
                onClick: function($noty) {
                    $noty.close();
                    noty({text: 'You have a pen.', layout: 'topRight', type: 'success'});
                }
            },
            {
                addClass: 'btn btn-danger btn-clean',
                text: 'No',
                onClick: function($noty) {
                    $noty.close();
                    noty({text: 'You do NOT have a pen.', layout: 'topRight', type: 'error'});
                }
            }
        ]
    })
}

// 右ペイン上端中央にログインを促す noty を表示する。
function ShowLoginNoty() {
    if (!User.getCurrent().isGuest()) {
        return;
    }

    noty({
        text: '<span style="font-size: 1rem;">Click/Tap here to <span style="font-weight: bold; font-size: 1rem;">LOGIN</span>.</span>',
        layout: _noty_layout,
        //type: 'success',
        type: 'warning',
    });
    $(_noty_container_id + '>li').click(function(e) {
        $('a.mb-control').trigger('click');
    });
}

// 複数言語対応のページなら言語の切り替え方を Notice() する。
function ShowLanguageNotice() {
    //Console.debug(ShowLanguageNotice._showCount, '>>>>>>> ShowLanguageNotice._showCount:');
    if (0 < ShowLanguageNotice._showCount) {
        return;
    }
    let uri = User.getCurrent().getCurrentURI();
    //Console.debug(uri, '>>>>>>> uri:');
    /*
    if (uri == undefined || !uri.match(/user_guide/)) {
        return;
    }
    */
    ShowLanguageNotice._showCount++;
    //Console.debug(Device.isWide(), '>>>>>>> Device.isWide():');
    let target;
    if (Device.isWide()) {
        target = $('.profile .profile-image svg.svg_icon_user, .profile .profile-image img.img_icon_user');
    } else {
        target = $('.page-content .page-title .preference');
    }
    Notice({
        message: 'Click/Tap here to change the language.',
        type: 'info',
        target: target,
    });
}
ShowLanguageNotice._showCount = 0;

// ログイン・ダイアログを表示する。
function DoYouWantToLogin(bCalledOnClick, login) {
    $(_noty_container_id).remove();
    var dialog = $('.login_dialog');
    if (login != undefined) {
        dialog.find('.login_text_account').val(login);
    }
    dialog.find()
    dialog.modal({
        show: true,
        keyboard: true,
        backdrop: 'static',
    });

    /*
    ユーザーが何もイベントを起こしていない時点で playAudio() を実行すると、
    Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first. https://goo.gl/xX8pDD
    という例外が飛ぶ。
    そして in promise なので、playAudio() を try ブロックに入れても、その例外を catch できない。
    */
    if (bCalledOnClick) {
        playAudio('alert');
    }

/*
    こうすると一応ドラッガブルにはなるが、かなり挙動不審。
    それではと bootstrap のバージョンを最新にしたら、ダイアログが表示されなくなった。
    今度は jquery が古すぎるんだろう。→違った。https://codepen.io/adamcjoiner/pen/PNbbbv の html, css, js をそのまま埋め込むと完璧に動作する。ただし、影が変。
    この問題は後回し。
    リリースを急ぐ。
    let $modal = $("#myModal");
    $modal.draggable({
        handle: ".modal-header",
    });
    $modal.resizable();
    $modal.modal('show');
*/
}

function DoYouWantToLogout(e) {
    //var box = $($(this).data("box"));
    var box = $($(e.currentTarget).data("box"));
    if (0 < box.length) {
        box.toggleClass("open");
        var sound = box.data("sound");
        if (sound === 'alert') {
            playAudio('alert');
        } else if(sound === 'fail') {
            playAudio('fail');
        }
    }
}

function LoginValidate(dialog) {
    var account = dialog.find('.login_text_account');
    var password = dialog.find('.login_password');
    var create = dialog.find('label#login_checkbox_create_account input[type=checkbox]');
    //console.log('account>', account.val());
    //console.log('password>', password.val());
    //console.log('create>', create.prop('checked'));

    // account
    if (account.val() == '') {
        throw {message: 'Input your mail address.', target: account}
    }
    if (MAX_ACCOUNT_LENGTH < account.val().length) {
        throw {message: 'Too long.', target: account}
    }
    if (account.val().length < MIN_ACCOUNT_LENGTH) {
        throw {message: 'Too short.', target: account}
    }
    if (!account.val().isValidMailAddress()) {
        throw {message: 'Invalid mail address.', target: account}
    }

    // password
    if (password.val() == '') {
        throw {message: 'Input your password.', target: password}
    }
    if (MAX_PASSWORD_LENGTH < password.val().length) {
        throw {message: 'Too long.', target: password}
    }
    if (password.val().length < MIN_PASSWORD_LENGTH) {
        throw {message: 'Too short.', target: password}
    }
    if (!password.val().match(/[0-9]/)) {
        throw {message: 'Does not include a number.', target: password}
    }
    if (!password.val().match(/[A-Za-z]/)) {
        throw {message: 'Does not include an alphabet.', target: password}
    }

    return {
        account: account.val(),
        password: password.val(),
        create: create.prop('checked'),
    };
}

function Logout(dialog) {
    dialog.removeClass('open');
    User.setCurrent(User.createGuest());
}

function Login(dialog) {
    var argv;
    try {
        argv = LoginValidate(dialog);
    } catch (error) {
        Notice({
            message: error.message,
            target: error.target,
            container: dialog.find('.modal-content'),   // これが見かけ上のダイアログの jquery オブジェクト
            noscroll: true,
        });
        return false;
    }

    //console.log('argv>', argv);

    //ShowLoading('Logging in...');

    CallAPI('/api/', 'POST', 'login', 7013, argv, {
        // 指定されたアカウントを検索できた
        success: function(response) {
            // アカウントを作ろうとしている
            if (argv.create) {
                ShowMessageBox({
                    message: 'Account ' + argv.account + ' is already registered.\nUncheck "Create?".',
                    on_close: ShowLoginNoty,
                });
            // 既存のアカウントでログインしようとしている
            } else {
                if (argv.password == response.user.password) {
                    User.setCurrent(new User(response.user));
                } else {
                    alert('You entered a wrong password.'); // これは無い
                }
            }
        },
        // 指定されたアカウントの検索が失敗した
        error: function(response) {
            //console.log('response>', response);
            // アカウントを作ろうとしている
            if (argv.create) {
                // 指定されたアカウントは未登録
                if (response.code == ERROR_USER_UNKNOWN) {
                    // 登録する
                    CreateAccount(argv);
                // 指定されたアカウントは登録済み
                } else {
                    if (response.code == ERROR_PASSWORD_WRONG) {
                        ShowMessageBox({
                            message: 'Can\'t create the account.\nAccount name <span class="text-danger"> ' + argv.account + ' </span> is already registered.\nChange the account name.',
                            on_close: ShowLoginNoty,
                        });
                    } else {
                        alert(response.message);    // これは無い
                    }
                }
            // 既存のアカウントでログインしようとしている
            } else {
                // ところが指定されたアカウントは未登録
                if (response.code == ERROR_USER_UNKNOWN) {
                    ShowMessageBox({
                        message: 'Account name <span class="text-danger"> ' + argv.account + ' </span> was not found.<br>Is it not misspelled?',
                        on_close: ShowLoginNoty,
                    });
                // 指定されたアカウントは登録済み
                } else {
                    if (response.code == ERROR_PASSWORD_WRONG) {
                        ShowMessageBox({
                            message: "Can't login.\nYou entered a wrong password.",
                            on_close: ShowLoginNoty,
                        });
                    } else {
                        alert(response.message);    // これは無い
                    }
                }
            }
        },
        // 通信が失敗した（ほとんどの場合、サーバー側スクリプトの障害）
        fatal: function(status, error) {
            ShowMessageBox(status + ': ' + error);
        }
    });

    return true;
}

/*
アカウントを作る。
親（顧客）アカウントは課金（請求）の対象。
子アカウントは課金に関する権限を持たない一般作業者のアカウント。
地区や部署など、それ以外の区分が必要な場合は、任意のタグを付けてもらう。「集計はそちらでご随意に」。
*/
function CreateAccount(argv) {
    if (User.getCurrent().isGuest()) {
        argv.type = USER_TYPE_PARENT;
    } else if (User.getCurrent().isParent()) {
        argv.type = USER_TYPE_CHILD;
    } else {
        /*
        ここには来ない。
        来たらバグ。
        つまり、親アカウントは一つしか作れない。
        guest でログインすればいくつでも作れるが、システム側はそれらの関係を知らない。
        従って、それらをまとめて取り扱うことはできない。
        */
        alert('ありえへん！');
        return;
    }

    CallAPI('/api/', 'POST', 'create_account', 7013, argv, {
        success: function(response) {
            let account = response.user.account;
            ShowMessageBox({
                message: 'We have sent an email to <strong>' + account + '</strong>.\n' +
                         'Please click or tap on the URL included in the email to confirm the validity of the email address <strong>' + account + '</strong>.',
                on_close: function() {
                    User.setCurrent(new User(response.user));
                },
            });
        },
        error: function(response) {
            ShowMessageBox({
                message: response.message.replace(/\n/, '<br>\n'),
                on_close: ShowLoginNoty
            });
        },
        fatal: function(status, error) {
            ShowMessageBox({
                message: status + ': ' + error,
                on_close: ShowLoginNoty
            });
        },
    });
}

// アカウント名の有効性を確認する手続きを開始する。
function StartAccountValidation() {
    let data = {};
    CallStarshipAPI('/api/', 'POST', 7013, 'start_account_validation', {
        data: data,
        success: function(response) {
            let account = User.getCurrent().account;
            ShowMessageBox({
                message: 'We have sent an email to <strong>' + account + '</strong>.\n' +
                         'Please click or tap on the URL included in the email to confirm the validity of the email address <strong>' + account + '</strong>.',
            });
        },
        error: function(response) {
            ShowAPIErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                response: response,
            });
        },
        fatal: function(xhr) {
            ShowHTTPErrorDialog({
                data: data,         // _command は、この時点で data のプロパティになっている
                xhr: xhr,
            });
        },
    });
}

function BuildCurrentPageURI() {
    let href_base = Location.getCurrent().href.buildBase();
    let user = User.getCurrent();
    let history = user.history;
    let path = history[history.length - 1];
    let page;
    let m = path.match(/^\/([a-z_]+)\.html$/);
    if (m) {
        page = m[1];
    } else {
        page = user.getIndexPath();
    }
    let uri = href_base + '/?login=' + user.account + '&page=' + page;
    return uri;
}

////////////////////////////////////////////////////////////////////////
// ■テンプレート実行前にテンプレートの動作を修正（テンプレート実行後では手遅れなもの）

function HeadInitializePage() {
    /*
    .panel-refresh の click ハンドラーは「『くるくる』は 3 秒後に解除する」というケシカランものだったので、関数呼び出しで解除するように修正。
    また、そのハンドラーを actions.js でセットするとインライン・スクリプトでセットしたハンドラーより後に実行される。
    そのため、インライン・スクリプトで「くるくる」を解除することができない。
    そこで、ここへ移動した。
    */
    $('.panel-refresh').click(function(e) {
        var panel = $(e.currentTarget).parents('.panel');
        RefreshPanel(panel, true);  // true==bStart
        $(this).parents(".dropdown").removeClass("open");
        return false;
    });
    //console.log('>>>>>>>User.getCurrent()', User.getCurrent());
}

function RefreshPanel(panel, bStart) {
    //console.log('RefreshPanel(): ' + (bStart ? 'start' : 'end'));
    if (bStart) {
        panel.append('<div class="panel-refresh-layer"><img src="/img/loaders/default.gif"/></div>');
        panel.find('.panel-refresh-layer').width(panel.width()).height(panel.height());
        panel.addClass('panel-refreshing');
    } else {
        panel.find('.panel-refresh-layer').remove();
        panel.removeClass('panel-refreshing');
    }       
    onload();
}

////////////////////////////////////////////////////////////////////////
// ■テンプレート実行後にテンプレートの動作を修正

function TailInitializePage() {
    // おまじない
    $(document).off();

    // スクロール位置を 0 に戻す。
    let html_dom = document.getElementsByTagName('html')[0];
    html_dom.scrollTop = 0;

    // 縦のスクロールバーが常に表示されるようにする。body の高さが変化するたびに一瞬縦のスクロールバーが出たり消えたりして画面がガクガク動くのがみっともない。
    AlwaysShowVerticalScrollBar();

    // ページが更新されたとき、img が表示されていれば（パネルの本体が開いていれば）、img のコンテナの幅を調整し、スクロールバーの表示・非表示を決める。
    $(window).resize((e) => {
        $('.panel .panel-body .image_container img').each(function(i, o) {
            AdjustImageContainer($(o));
        });
    });
    // .panel-collapse がクリックされたとき、img が表示されていれば（パネルの本体が開いていれば）、img のコンテナの幅を調整し、スクロールバーの表示・非表示を決める。
    $('.panel .panel-collapse').click((e) => {
        $(e.currentTarget).parents('.panel').find('.panel-body .image_container img').each(function(i, o) {
            AdjustImageContainer($(o));
        });
    });

    // プロフィール・アイコンの位置を調整する。
    AdjustProfileImagePosition();

    // プロフィール・アイコンのハンドラーをセットする。
    $('.profile .profile-image svg.svg_icon_user, .profile .profile-image img.img_icon_user').click((e) => {
        ChangeLanguage();
    });
    // ページタイトルのハンドラーをセットする。
    $('.page-content .page-title .preference').click((e) => {
        ChangeLanguage();
    });

    // 検索を隠す。
    $('.xn-search').addClass('hidden');

    /*
    右上隅のタスクリストのアイコン・ボタンを隠す。
    ボタン自体削除したので不要になった。
    今後、新たなページを追加したときこのボタンが表示されれば修正忘れのリマインダーになるので、隠す処理をコメントアウトする。
    $('ul.x-navigation-horizontal>li.xn-icon-button>a>span.fa-tasks').each(function(i, span) {
        let li = $(span).parent().parent();
        //$(span).parent().parent().addClass('hidden');
        //li.addClass('hidden');
        li.remove();
    });
    */

    /*
    // 右上隅のコメントリストのアイコン・ボタンを隠す。
    ボタン自体削除したので不要になった。
    今後、新たなページを追加したときこのボタンが表示されれば修正忘れのリマインダーになるので、隠す処理をコメントアウトする。
    $('ul.x-navigation-horizontal>li.xn-icon-button>a>span.fa-comments').each(function(i, span) {
        $(span).parent().parent().addClass('hidden');
    });
    */

    // 右上隅の qrcode のアイコン・ボタンのハンドラーをセットする。
    $('ul.x-navigation-horizontal>li.xn-icon-button>a.qrcode').click((e) => {
        let img = $(e.currentTarget).parent().find('img.qrcode');
        if (img.length == 1) {
            let uri = BuildCurrentPageURI();
            let src = '/cgi/qrcode.sh?command=encode&input=' + uri;
            img.prop('src', src);
            let download = $(e.currentTarget).parent().find('button.download');
            download.click((e) => {
                DownloadQRCode(uri);
            });
        }
    });

    // プリレンダリング用ページ登録アイコン・ボタンを表示しハンドラーをセットする
    if (Location.getCurrent().getQueryValueOf('prerender') != undefined) {
        $('.page-container>.page-content>ul.x-navigation>li.xn-icon-button>a.pre_render').each((i, o) => {
            $(o).parent().removeClass('hidden');
            $(o).click((e) => {
                UploadCurrentPage();
            });
        });
    }

    // カレントユーザーの情報に合わせて画面を更新する。
    User.getCurrent().updateWindow();

    // どこの誰がどのページを表示したかを記録する。
    LogConsoleAccess((response) => {
        //Console.debug(response, '>>>>>>> response');
        let carousel = $('.widget.widget_visitors .owl-carousel#owl-example');
        carousel.find('.total_views .widget-subtitle').html((new Date()).format('dd/mm/YY HH:MM'));
        carousel.find('.total_views .widget-int').html(response.total_view_count);
        carousel.find('.total_visitors .widget-int').html(response.total_visitor_count);
        carousel.find('.returned_visitors .widget-int').html(response.returned_visitor_count);
        $('.widget.widget_subscriptions .widget-data .widget-int.num-count').html(response.subscription_count);
        $('.widget.widget_users .widget-data .widget-int.num-count').html(response.user_count);
    });

    // プリファレンスをロードする。User.setCurrent() 内へ移動。
    //Preferences.load();

    // PayPal の設定をロードする。
    // PayPal.loadConfig();

    ShowTwitterButton();
}

/*
img のコンテナ（親 div）の幅を img の幅に合わせる（そうしないと常にスクロールバーが表示されてみっともない）。
img を収容しきれない場合のみスクロールバーを出す。
コンテナは max-width を 100% にしておく必要がある。→これはウソ。
*/
function AdjustImageContainer(img) {
    // img が表示されているなら（上下の border の高さが 1px なので、表示されていなくても 2px はある）
    if (2 < img.outerHeight()) {
        let image_container = img.parent();
        if (image_container.width() < img.outerWidth()) {
            image_container.css({
                'overflow-x': 'scroll'
            });
        } else {
            image_container.css({
                'width': Math.floor(img.outerWidth()) + 'px',
                'overflow-x': 'hidden'
            });
        }
    }
}

// 縦のスクロールバーが常に表示されるようにする。
function AlwaysShowVerticalScrollBar() {
    let page_content_wrap = $('.page-content-wrap');
    if (page_content_wrap.length == 1) {
        //console.log('>>>>>>>GetViewPortHeight()', GetViewPortHeight());
        let body = $('html');
        //console.log('>>>>>>>body', body.height());
        if (body.height() < GetViewPortHeight() + 20) {
            body.css({
                'min-height': body.height() + 20 + 'px'
            });
            //console.log('>>>>>>>body', body.height());
        }
    }
}

function DownloadQRCode(text) {
    var form = $('<form action="/cgi/qrcode.sh" method="GET"></form>\n');
    var command = $('<input type="hidden" name="command" value="download"/>');
    var input = $('<input type="hidden" name="input"/>');
    input.val(text);
    form.append(command);
    form.append(input);
    $('body').prepend(form);
    form.submit();
    form.remove();
}

function ChangeLanguage() {
    let prev_language = Preferences.get('language', true);
    Preferences.showDialog({
        onOK: function() {
            let curr_language = Preferences.get('language', true);
            if (curr_language != prev_language) {
                let uri = User.getCurrent().getCurrentURI();
                LoadBody(uri);
            }
        }
    });
}

function ShowTwitterButton() {
    const uri = Location.getCurrent().href.buildBase() + '/';
    //Console.debug(uri);
    const text =
'Starship.jp - Master of System Architecture and Innovative Software Development\n' +
'\n' +
'The OS, language, or framework doesn\'t matter.\n' +
'It\'s philosophy that matters.\n' +
'';
    let textURIEncoded = encodeURIComponent(text);
    let btnTweet =
'<div style="position: fixed; top: 52px; right: 0; z-index: 1000;">\n' +
'<a href="https://twitter.com/share?ref_src=twsrc%5Etfw&url=' + uri + '&text=' + textURIEncoded + '" class="twitter-share-button" data-size="large" data-show-count="false">Tweet</a>\n' +
'<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n' +
'</div>\n'
;
    //Console.debug(btnTweet);
    $('body').prepend(btnTweet);

    let btnFollow =
'<div style="position: fixed; top: 82px; right: 0; z-index: 1000;">\n' +
'<a href="https://twitter.com/kisaburo_y?ref_src=twsrc%5Etfw" class="twitter-follow-button" data-size="large" data-show-screen-name="false" data-lang="en" data-show-count="false">Follow @kisaburo_y</a>\n' +
'<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n' +
'</div>\n'
;
    $('body').prepend(btnFollow);
}

/*
これをやらないと、あれこれ（例：bootstrap select picker）挙動不審になる。
$(document).ready() の中でやると jquery (?) をロードするたびにやらなければならなくなる。→結局こうした。
スクリプトの地の部分でやると、効果が無い（挙動不審のまま）。
(function($) {
    $(document).off();
});
*/

function InitializeSite() {
    $('head title').html(APP_TITLE);
    //console.log('>>>>>>>', Location.getCurrent());
    let isDev = Location.getCurrent().isDev();
    //PayPal.loadSDK(isDev);
    PayPal.setCurrent(isDev);
    Notice.setTopOffsetY(8);
    // プロフィール・アイコンの水平位置を調整
    $(window).resize((e) => {
        AdjustProfileImagePosition();
    });
}

function AdjustProfileImagePosition() {
    let svg_icon_user = $('.profile .profile-image svg.svg_icon_user');
    if (Device.isWide()) {
        svg_icon_user.css({
            left: '50px'
        });
    } else {
        let left = Math.floor((svg_icon_user.parent().width() - svg_icon_user.outerWidth()) / 2);
        //Console.debug(svg_icon_user.offset().left, '>>>>>>> svg_icon_user.offset().left');
        //Console.debug(left, '>>>>>>> left');
        svg_icon_user.css({
            left: left + 'px',
        });
    }
}
