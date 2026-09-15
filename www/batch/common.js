
const _https = require('https'); 
const _http = require('http'); 
const _path = require('path');
const _os = require('os');
const _fs = require('fs');

CallTCPDetectiveAPI.ADMIN_ACCOUNT = 'admin@tcpdetective.com';
CallTCPDetectiveAPI.ADMIN_PASSWORD_DEV = 'VUqTHtg2QmjDea5W';
CallTCPDetectiveAPI.ADMIN_PASSWORD_REL = '0jDuU2YphzG2cOgY';

function LoadConfig(isDev) {
    CallTCPDetectiveAPI._admin_account = CallTCPDetectiveAPI.ADMIN_ACCOUNT;
    if (isDev) {
        CallTCPDetectiveAPI._admin_password = CallTCPDetectiveAPI.ADMIN_PASSWORD_DEV;
    } else {
        CallTCPDetectiveAPI._admin_password = CallTCPDetectiveAPI.ADMIN_PASSWORD_REL;
    }
}

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

// 文字列 n の頭に必要な数だけ '0' を付加して指定の桁数の文字列を作成
function pad0(n, digits) {
    if (digits == undefined) {
        digits = 2;
    }
    return ('00000000' + n).slice(-digits);
}

// 標準エラー出力に、指定されたヘッダー（あれば）、および時刻、およびスクリプト名付きで文字列を印字する
function log() {
    let now = (new Date()).format('YYYY-mm-dd HH:MM:SS');
    let script = _path.basename(process.argv[1]);
    let i = 0;
    let header;
    if (0 < arguments.length) {
        if (arguments[i] == undefined) {
            i++;
            header = now + ' ' + script + ':';
        } else {
            header = arguments[i++] + ' ' + now + ' ' + script + ':';
        }
    } else {
        header = now + ' ' + script + ':';
    }
    let args = header;
    for (; i < arguments.length; i++) {
        args += ' ';
        args += arguments[i];
    }
    console.error(args);
}

// オブジェクトを、整形された JSON 文字列に変換する。
function ToJSON(o) {
    return JSON.stringify(o, null, 4);
}

/*
↓例えばこのような Object を、

let o = {
    a: 1,
    b: '2',
    c: true,
    d: {
        e: 'foo',
        f: {
            g: 'bar',
        },
    },
    h: [1.1, {i: 'woo'}],
};

↓この形式 (application/x-www-form-urlencoded) に変換する関数なっしー

a=1&b=2&c=true&d[e]=foo&d[f][g]=bar&h[0]=1.1&h[1][i]=woo

node.js では（当然ながら）$.ajax() が使えないので、この形式の変換は自力でやらざるを得ない。
*/
function ToWWWParams(o) {
    return _ToWWWParams('', o, 0);
}

function _ToWWWParams(parent_name, o, level) {
    if (typeof o == 'object') {
        if (Array.isArray(o)) {
            return _ArrayToWWWParams(parent_name, o, level);
        } else {
            return _ObjectToWWWParams(parent_name, o, level);
        }
    } else {
        return parent_name + '=' + encodeURIComponent(o);
    }
}

function _ObjectToWWWParams(parent_name, o, level) {
    let params;
    for (let name in o) {
        if (params == undefined) {
            params = '';
        } else {
            params += '&';
        }
        let value = o[name];
        let name_ = parent_name;
        if (0 < level) {
            name_ += ('[' + name + ']');
        } else {
            name_ = name;
        }
        let value_ = _ToWWWParams(name_, value, level + 1);
        params += value_;
    }
    return params;
}

function _ArrayToWWWParams(parent_index, o, level) {
    let params;
    for (let index = 0; index < o.length; index++) {
        if (params == undefined) {
            params = '';
        } else {
            params += '&';
        }
        let value = o[index];
        let index_ = parent_index;
        if (0 < level) {
            index_ += '[' + index + ']';
        } else {
            index_ = index;     // 実際には、これは無い
        }
        let value_ = _ToWWWParams(index_, value, level + 1);
        params += value_;
    }
    return params;
}

/*
API 呼び出しの uri が '/api/' のようなパスの形式なら http(s)://... の形式に変更する。
apache の config ファイルから ProxyPassReverse の値を取得する。
引数の uri にクエリー文字列が付いているとうまく動かない。
使い方：
const api_uri = APIPathToURI('/api/');
console.error('>>>>>>>', api_uri);
*/
function APIPathToURI(uri) {

    if (uri.charAt(0) != '/') {
        return uri;
    }

    // ローカルホストは何番機か
    const hostname = _os.hostname();
    let host_match = hostname.match(/^[a-z\-]+([0-9]+)\./);
    if (!host_match) {
        throw 'local host name ' + hostname + ' invalid';
    }
    const host_number = host_match[1];

    // ウェブアプリのドキュメントルートのベースネーム（命名規則により常にウェブアプリのサーバーホスト名 FQDN と一致する。ただし何番機かを表す数字は無い）
    const root_base = _path.basename(_path.dirname(__dirname));
    let root_match = root_base.match(/^([a-z\-]+)(\..+)$/);
    if (!root_match) {
        throw 'document root directory name ' + root_base + ' invalid';
    }
    const fqdn = root_match[1] + host_number + root_match[2];

    // apache configuration file のパス
    const conf = '/etc/httpd/conf.d/' + root_base + '.conf';

    // ServerName www-dev1.tcpdetective.com
    const server_pattern = 'ServerName' + '[ \t]+' + fqdn;
    const server_regexp = new RegExp(server_pattern);

    // ProxyPassReverse /api/ http://priapi-dev1.tcpdetective.com/
    const proxy_pattern = 'ProxyPassReverse' + '[ \t]+' + uri + '[ \t]+([^ \t]+)';
    const proxy_regexp = new RegExp(proxy_pattern);

    let api_uri;
    let bInVirtualHost = false;
    let bInTheRightVirtualHost = false;
    try {
        _fs.readFileSync(conf).toString('utf8').split('\n').forEach(function(line) {
            if (bInVirtualHost) {
                if (line.match(/<\/VirtualHost>/)) {
                    bInTheRightVirtualHost = false;
                    bInVirtualHost = false;
                    return;
                }
                if (server_regexp.exec(line)) {
                    bInTheRightVirtualHost = true;
                    return;
                }
                if (!bInTheRightVirtualHost) {
                    return;
                }
                let m = proxy_regexp.exec(line);
                if (!m) {
                    return;
                }
                api_uri = m[1];
                throw 'Found!';
            } else {
                if (line.match(/<VirtualHost[^>]*>/)) {
                    bInVirtualHost = true;
                    return;
                }
            }
        });
    } catch (e) {
        if (e != 'Found!') {
            throw e;
        }
    }

    return api_uri;
}

function CallAPIEx(argv) {
    let protocol;
    if (argv.protocol == undefined || argv.protocol == 'https') {
        protocol = _https;
    } else if (argv.protocol == 'http') {
        protocol = _http;
    } else {
        throw 'CallAPIEx(): argv.protocol ' + argv.protocol + ' invalid';
    }
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
            headers['Authorization'] = 'Basic ' + Buffer.from(userpass).toString('base64');
        } else if (argv.auth.type == 'Bearer') {
            headers['Authorization'] = 'Bearer ' + argv.auth.token;
        }
    }
    var data;
    // Content-Type: application/json
    if (argv.contentType == 'application/json') {
        headers['Content-Type'] = 'application/json';
        if (argv.data) {
            data = JSON.stringify(argv.data);
        }
    // Content-Type: x-www-form-urlencoded
    } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        if (argv.data) {
/*
            DONE: これではネストされたオブジェクトを x-www-form-urlencoded に変換できない。
            var pairs = [];
            for (var name in argv.data) {
                var value = encodeURI(argv.data[name]);
                pairs.push(name + '=' + value);
                //console.log('>>>>>>>name', name);
                //console.log('>>>>>>>value', value);
            }
            data = pairs.join('&');
*/
            data = ToWWWParams(argv.data);
            //console.log('>>>>>>>data', data);
        }
    }
    var uri;
    if (argv.method == 'GET') {
        if (data == undefined) {
            uri = APIPathToURI(argv.uri);
        } else {
            uri = APIPathToURI(argv.uri) + '?' + data;
        }
    } else {
        uri = APIPathToURI(argv.uri);
    }
    var options = {
        method: argv.method,
        headers: headers,
    };
    const request = protocol.request(uri, options, (response) => {
        //response.setEncoding('utf8');   // めんどくさいから決め打ち
        let body = '';
        response.on('data', (chunk) => {
            body += chunk;
        }).on('end', () => {
            if (argv.on_success) {
                argv.on_success(response, body);
            }
            if (argv.on_complete) {
                argv.on_complete();
            }
        });
    }).on('error', (error) => {
        if (argv.on_error) {
            argv.on_error(error);
        }
        if (argv.on_complete) {
            argv.on_complete();
        }
    }).on('timeout', () => {
        request.abort();
        if (argv.on_timeout) {
            argv.on_timeout();
        }
        if (argv.on_complete) {
            argv.on_complete();
        }
    });
    request.setTimeout(argv.timeout);
    if (argv.method == 'GET') {
    } else {
        if (data) {
            request.write(data);
        }
    }
    request.end();
}

function CallTCPDetectiveAPI(uri, method, timeout, command, argv) {
    if (uri == undefined) {
        throw 'CallTCPDetectiveAPI(): uri missing';
    }
    if (method == undefined) {
        throw 'CallTCPDetectiveAPI(): method missing';
    }
    if (timeout == undefined) {
        throw 'CallTCPDetectiveAPI(): timeout missing';
    }
    if (command == undefined) {
        throw 'CallTCPDetectiveAPI(): command missing';
    }
    if (argv == undefined) {
        throw 'CallTCPDetectiveAPI(): argv missing';
    }
    if (typeof argv != 'object') {
        throw 'CallTCPDetectiveAPI(): illegal type of argv';
    }
    var data = argv.data ? argv.data : {};
    data._command = command;
    data._account = CallTCPDetectiveAPI._admin_account;
    data._password = CallTCPDetectiveAPI._admin_password;
    CallAPIEx({
        protocol: 'http',
        uri: uri,
        method: method,
        timeout: timeout,
        data: data,
        // 通信が成功し
        on_success: function(response, body) {
            // 応答の形式が正しい
            if (response['headers'] && response.headers['content-type'] && response.headers['content-type'] == 'application/json') {
                var body_object = JSON.parse(body);
                if (body_object.status == 'success') {
                    if (argv.on_success) {
                        argv.on_success(response, body_object);
                    }
                } else {
                    if (argv.on_failure) {
                        argv.on_failure(response, body_object); // on_failure() の第二引数は object の場合と
                    }
                }
            // 応答の形式が間違っている
            } else {
                if (argv.on_failure) {
                    argv.on_failure(response, body);    // html(?) の場合がある
                }
            }
        },
        // 通信が失敗した
        on_error: function(error) {
            if (argv.on_error) {
                argv.on_error(error);
            }
        },
        // 通信が時間切れ
        on_timeout: function() {
            if (argv.on_timeout) {
                argv.on_timeout();
            }
        },
        // 終わった（通信の成功／失敗も応答の形式の正誤も問わない）
        on_complete: argv.on_complete,
    });
}

module.exports = {
    LoadConfig: LoadConfig,
    log: log,
    ToJSON: ToJSON,
    ToWWWParams: ToWWWParams,
    CallAPIEx: CallAPIEx,
    CallTCPDetectiveAPI: CallTCPDetectiveAPI,
};
