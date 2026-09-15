#!/home/ec2-user/.nvm/versions/node/v13.5.0/bin/node

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

const _path = require('path');

function log() {
    let now = (new Date()).format('YYYY-mm-dd HH:MM:SS');
    let script = _path.basename(process.argv[1]);
    let i = 0;
    let header;
    if (0 < arguments.length) {
        header = arguments[i++] + ' ' + now + ' ' + script;
    } else {
        header = now + ' ' + script;
    }
    let args = header;
    for (; i < arguments.length; i++) {
        args += ' ';
        args += arguments[i];
    }
    console.error(args);
}

function PrettyQuoteJSObject(o) {
    var json = JSON.stringify(o, null, 4);
    var quoted = json
        .replace(/"([A-Za-z_][0-9A-Za-z_]+)":/g, '$1:')
        .replace(/"/g, "''")
        .replace(/^(.*)$/gm, "'$1\\n'")
    ;
    return 'E' + quoted;
}

let date1 = new Date('2023-03-31T04:19:34Z');
let date2 = new Date('2023-03-31 04:19:34');
log('date1.getTime() == date2.getTime()' , date1.getTime() == date2.getTime());

// あかん。これではダメだ。ChatGPT 破れたり！
function toBaseN(bytes, baseDigits) {
    // bytesを10進数の数値に変換
    let decimalValue = 0;
    for (let i = 0; i < bytes.length; i++) {
        decimalValue = decimalValue * 256 + bytes[i];
    }

    // 10進数の数値をN進数の文字列に変換
    let result = '';
    while (decimalValue > 0) {
        let remainder = decimalValue % baseDigits.length;
        decimalValue = Math.floor(decimalValue / baseDigits.length);
        result = baseDigits[remainder] + result;
    }
    return result;
}

const baseDigits = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

function stringToBase62(str) {
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str[i].charCodeAt(0));
    }
    //console.log('>>>>>>>bytes', bytes);
    //console.log('>>>>>>>baseDigits', baseDigits);
    let strBase62 = toBaseN(bytes, baseDigits);
    return strBase62;
}

function createBase62Digits() {
    let baseDigits = [];
    for (let code = '0'.charCodeAt(0); code <= '9'.charCodeAt(0); code++) {
        let char = String.fromCharCode(code);
        baseDigits.push(char);
    }
    for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
        let char = String.fromCharCode(code);
        baseDigits.push(char);
    }
    for (let code = 'a'.charCodeAt(0); code <= 'z'.charCodeAt(0); code++) {
        let char = String.fromCharCode(code);
        baseDigits.push(char);
    }
    return baseDigits;
}

function CreateRandomPassword(digits) {
    var table = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var password = '';
    for (let i = 0; i < digits; i++) {
        let pos = Math.floor(table.length * Math.random());
        let c = table.charAt(pos);
        password += c;
    }
    return password;
}

console.log(CreateRandomPassword(64));
