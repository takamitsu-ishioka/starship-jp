
////////////////////////////////////////////////////////////////////////
// ■定数

////////////////////////////////////////////////////////////////////////
// ■グローバル変数

var _env_name;
var _remote_addr;
var _user;
var _page;

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

// Date クラスの値を指定のフォーマットに従って文字列化する
Date.prototype.format = function(format) {
    if (format == undefined) {
        return this.toString();
    }
    var s = '';
    var type = '';
    var type_c;
    for (var pos = 0; pos < format.length; pos++) {
        var c = format.charAt(pos);
        if (type_c != c) {
            if (0 < type.length) {
                s += this.getValueOf(type);
            }
            type = '';
        }
        if (c == 'Y' || c == 'm' || c == 'd' || c == 'H' || c == 'M' || c == 'S' || c == 'T') {
            type += c;
            type_c = c;
        } else {
            s += c;
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

Array.prototype.getIndex = function(o, prop) {
    if (prop) {
        return this.findIndex(function(element) {return element[prop] == o});
    } else {
        return this.findIndex(function(element) {return element == o});
    }
}

////////////////////////////////////////////////////////////////////////
// ■クラス

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function MousePoint(e) {
    this.x = e.pageX;
    this.y = e.pageY;
}

// 矩形（ヒットテスト用）
function Rect(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.right = this.left + width;
    this.bottom = this.top + height;
    this.centerX = left + Math.floor(width / 2);
    this.centerY = top + Math.floor(height / 2);
    this.isCenterPointInRect = function(rect) {
        return rect.left <= this.centerX && this.centerX < rect.right && rect.top <= this.centerY && this.centerY < rect.bottom;
    }
}

function Rectangle(o) {
    this.left = $(o).offset().left;
    this.top = $(o).offset().top;
    this.right = $(o).offset().left + $(o).width();
    this.bottom = $(o).offset().top + $(o).height();
    this.width = $(o).width();
    this.height = $(o).height();
    this.topLeft = function() {
        return new Point(this.left, this.top);
    }
    this.bottomLeft = function() {
        return new Point(this.left, this.bottom);
    }
    this.topRight = function() {
        return new Point(this.right, this.top);
    }
    this.bottomRight = function() {
        return new Point(this.right, this.bottom);
    }
    this.contains = function(p) {
        return (this.left <= p.x) && (p.x < this.left + this.width) && (this.top <= p.y) && (p.y < this.top + this.height);
    }
    this.intersect = function(r) {
        return this.contains(r.topLeft()) || this.contains(r.bottomLeft()) || this.contains(r.topRight()) || this.contains(r.bottomRight());
    }
}

// 環境
function Environment() {
}
Environment.isDevelopment = function() {
    return _env_name == 'DEVELOPMENT';
}

// SMS API 定数
function SMS_API() {
}
SMS_API.getTypeIdPC = function() {return 0;}
SMS_API.getTypeIdAPI = function() {return 1;}
SMS_API.getTypeIdIVR = function() {return 2;}

// 全てのオブジェクトのベースクラス
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
BaseClass.prototype.isNew = function() {return this.id == -1;}
BaseClass.prototype.isUser = function() {return false;}
BaseClass.prototype.isCustomer = function() {return false;}
BaseClass.prototype.isTemplate = function() {return false;}
BaseClass.prototype.isMessage = function() {return false;}
BaseClass.prototype.indexOf = function(str) {
    for (var attr in this) {
        var value = this[attr];
        if (typeof value == 'string') {
            var index = value.indexOf(str);
            if (index != -1) {
                return index;
            }
        }
    }
    return -1;
}

// ユーザー
function User(user) {
    BaseClass.call(this, user);
    if (this.company) {
        this.customer = new Customer(this.company, this.company_extra, this.company_attributes);
        delete this.company;                    // 残しておくと紛らわしい
        if (this.company_extra) {
            delete this.company_extra;          // 残しておくと紛らわしい
        }
        if (this.company_attributes) {
            delete this.company_attributes;     // 残しておくと紛らわしい
        }
    }
    if (this.templates) {
        for (var i = 0; i < this.templates.length; i++) {
            this.templates[i] = new Template(this.templates[i]);
        }
    }
    if (this.is_guest == undefined) {
        this.is_guest = false;
    }
    this.isUser = function() {return true;}
    this.getCustomerUser = function() {
        if (this.type == 3) {
            return this;
        } else if (this.type == 4) {
            return this.customer.user;
        } else {
            throw 'uset type ' + this.type + ' not supported yet';
        }
    }
    this.isAdministrator = function() {return this.type == 1}
    this.isCompanyUser = function() {return this.type == 3}
    this.isChildUser = function() {return this.type == 4}
    this.isGuestUser = function() {return this.is_guest}
}
User.getCurrent = function() {return _user;}
User.prototype = BaseClass.prototype;

// 顧客
function Customer(customer, extra, attributes) {
    BaseClass.call(this, customer);
    if (extra) {
        this.company_extra_id = parseInt(extra.id, 10);
        delete extra.id;
        BaseClass.call(this, extra);
    }
    if (attributes) {
        this.company_attribute_id = parseInt(attributes.id, 10);
        delete attributes.id;
        BaseClass.call(this, attributes);
    }
    if (this.user) {
        this.user = new User(this.user);
    }
    if (this.child_users) {
        for (var i = 0; i < this.child_users.length; i++) {
            this.child_users[i] = new User(this.child_users[i]);
        }
    }
    if (this.price) {
        this.price = new Price(this.price);
    }
    this.isCustomer = function() {return true;}
    this.hasOwnBannedWords = function() {return this.use_company_ng_words == 1;}
    this.hasString = function(str) {
        if (this.user) {
            if (this.user.name.indexOf(str) != -1) {
                return true;
            }
            if (this.user.account.indexOf(str) != -1) {
                return true;
            }
        }
        if (this.agent) {
            if (this.agent.user.name.indexOf(str) != -1) {
                return true;
            }
        }
        return false;
    }
    this.getSMSLimit = function(default_value) {return (this.sms_limit && this.sms_limit != -1) ? this.sms_limit : default_value}
    this.getUserById = function(user_id) {
        if (this.user && this.user.id == user_id) {
            return this.user;
        }
        if (this.child_users == undefined) {
            return null;
        }
        for (var i = 0; i < this.child_users.length; i++) {
            var child_user = this.child_users[i];
            if (child_user.id == user_id) {
                return child_user;
            }
        }
        return null;
    }
    this.sumNewCaseMessageCount = function() {
        var new_case_message_count = this.user.new_case_message_count;
        for (var i = 0; i < this.child_users.length; i++) {
            new_case_message_count += this.child_users[i].new_case_message_count;
        }
        return new_case_message_count;
    }
}
Customer.prototype = BaseClass.prototype;

function Price(price) {
    BaseClass.call(this, price);
}

// テンプレート
function Template(template) {
    BaseClass.call(this, template);
    if (this.id == -1) {
        this.user_id = User.getCurrent().id;
        this.title = '新しいテンプレート';
        this.order_by = 0;
        this.body = '';
        this.allow_user_ids = [User.getCurrent().id];
        this.allow_department_ids = [];
    }
    this.isTemplate = function() {return true;}
}
Template.prototype = BaseClass.prototype;

// 電話帳
function PhoneBook(phone_book) {
    if (PhoneBook.prototype.isPrototypeOf(phone_book)) {
        throw 'phone_book already PhoneBook';
    }
    BaseClass.call(this, phone_book);
    if (phone_book == undefined && this.id == -1) {
        this.headers = PhoneBook.getRequiredTags();
        this.rows = [];
        this.name = '新しい電話帳';
        this.user_id = User.getCurrent().id;
        this.ignore_name = 1;
        this.ignore_organization = 1;
        this.ignore_department = 1;
        this.allow_user_ids = [User.getCurrent().id];
        this.allow_department_ids = [];
    }
    this.isPhoneBook = function() {return true}
    this.getTagNames = function() {
        return this.headers.map(function(header) {return header.name}).join(', ');
    }
    this.ignores = function(tag_name) {
        if (tag_name == '氏名' && this.ignore_name) {
            return true;
        } else if (tag_name == '組織名' && this.ignore_organization) {
            return true;
        } else if (tag_name == '部署名' && this.ignore_department) {
            return true;
        } else {
            return false;
        }
    }
    this.ignoreTagIfFaked = function(tag_data) {
        if (tag_data && tag_data.data && tag_data.data.type == 'faked') {
            if (tag_data.label == '氏名') {
                this.ignore_name = 1;
            } else if (tag_data.label == '組織名') {
                this.ignore_organization = 1;
            } else if (tag_data.label == '部署名') {
                this.ignore_department = 1;
            }
        }
    }
}
PhoneBook.prototype = BaseClass.prototype;
PhoneBook.getRequiredTags = function() {
    return [
        {name: 'ID', type: 'required'},
        {name: '電話番号', type: 'required'}
    ].concat();
}

// 電話帳エントリー（ID、電話番号、氏名、組織名、部署名、その他）
function PhoneBookEntry(phone_book_entry) {
    if (PhoneBookEntry.prototype.isPrototypeOf(phone_book_entry)) {
        throw 'phone_book_entry already PhoneBookEntry';
    }
    BaseClass.call(this, phone_book_entry);
    this.row = phone_book_entry;    // 文字列の配列
    this.hasString = function(str) {
        for (var i = 0; i < this.row.length; i++) {
            var cell = this.row[i];
            if (typeof cell == 'string' && cell.indexOf(str) != -1) {
                return true;
            }
        }
        return false;
    }
    this.isPhoneBookEntry = function() {return true;}
}
PhoneBookEntry.prototype = BaseClass.prototype;

// メッセージ（送信前）
function Message(message) {
    BaseClass.call(this, message);
    this.isMessage = function() {return true;}
    this.getErrorCount = function() {
        if (this.error_count != undefined) {
            return this.error_count;
        }
        this.error_count = 0;
        if (this.banned_words) {
            this.error_count += this.banned_words.length;
        }
        if (this.isBlack) {
            this.error_count++;
        }
        if (this.isTooLong) {
            this.error_count++;
        }
        return this.error_count;
    }
    this.getBannedWordsString = function() {
        return this.banned_words ? this.banned_words.join(' ') : '';
    }
    this.checkBlack = function() {
        this.isBlack = Blacks.isBlack(this.phone);
    }
    this.checkLength = function() {
        this.isTooLong = Message.isTooLong(this.body);
    }
}
Message.prototype = BaseClass.prototype;
Message.isTooLong = function(body) {
    if (140 < body.length && body.isAsciiString()) {
        return true;
    } else if (70 < body.length && !body.isAsciiString()) {
        return true;
    } else {
        return false;
    }
}

// メッセージ（送信後）
function SentMessage(message) {
    BaseClass.call(this, message);
    this.getBodyHTML = function(fold) {
        if (fold) {
            return this.body.replace(/\n/g, '<br>\n');
        } else {
            return this.body;
        }
    }
    this.getStatusName = function() {
        return SentMessage._statuses[this.send_status];
    }
    this.getErrorName = function() {
        if (SentMessage._errors[this.error_code]) {
            return SentMessage._errors[this.error_code];
        }
        return '';
    }
    this.isResendable = function() {
        return this.send_status == 2 || this.send_status == 3 || this.send_status == 4;
    }
}
SentMessage.prototype = BaseClass.prototype;
SentMessage._statuses = [
    "送信待ち",                // 使わない
    "送信中",
    "送信完了",
    "送信キャンセル",
    "送信エラー",
    "未使用",
    "送信タイムアウト"         // 使わない
];
SentMessage._errors = {
    0: '完了',
    1: 'メッセージが長すぎます',
    2: '宛先がありません',
    3: '端末のメモリ容量を超えました',
    4: '設備プロトコルエラー',
    5: 'この機器はサポートされていません',
    6: 'SMが送れない端末です',
    7: '不明なサービスセンターです',
    8: 'サービスセンターが混雑しています',
    9: '送信中',
    10: '着信拒否',
    11: '送信中',
    12: 'キャリア側ネットワークエラー',
    13: '圏外／電源切れ',
    14: '圏外／電源切れ',
    15: '端末側エラー',
    16: 'ファシリティサポートされていません',
    17: 'SMのが混雑しています',
    18: 'システム障害',
    19: 'メッセージ待機、完全なリストです',
    20: 'データが不足しています',
    21: '予期しないデータ値です',
    22: 'リソース制限されています',
    23: '開始リリース',
    24: '不明なアルファベットが含まれています',
    25: 'USSDが混雑',
    26: '重複したIDを呼び出そうとしています',
    27: 'サポートされていません',
    28: 'ミスタイプパラメータです',
    29: 'ピアから予期しない応答がありました',
    30: 'サービス終了の障害',
    31: 'ピアから応答がありません',
    32: '無効な応答を受信しました',
    34: '無効な宛先です',
    49: 'メッセージの種類はサポートされません',
    50: '宛先は、送信ブロックされています',
    51: '金額が不足しています。',
    52: '価格がありm線',
    67: '無効なesm_classフィールドデータです',
    69: 'SMSCによって拒否されました',
    72: '却下：無効な送信元アドレスのTONです',
    73: '却下：無効な送信元アドレスNPIです',
    80: '却下：無効な宛先アドレスのTONです',
    81: '却下：無効な宛先アドレスNPIです',
    88: 'スロットルエラーです',
    97: '却下：無効な配達予定時間です',
    98: '送信不能',
    99: '通信エラー',
    100: 'エラー送信メッセージ',
    247: '送信中',
    248: '送信中',
    249: '却下されました',
    250: '準備完了',
    251: '送信不能',
    252: '削除',
    253: '期限切れ',
    254: 'ローミングレベルはサポートされていません',
    255: '不明なエラー',
    1000: '宛先番号フォーマットエラー',
    1001: '宛先番号桁数エラー',
    1002: '宛先除外',
    1003: '本文全角文字数エラー',
    1004: '本文半角文字数エラー',
    1005: 'NGワードエラー'
}

// 除外宛先
function Blacks() {
}
Blacks.data = {}
Blacks.isBlack = function(phone) {
    return Blacks.data[phone] ? true : false;
}
Blacks.load = function(on_success) {
    CallAPI('./sms_api/', 'POST', 'load_blacks', 20011, {}, {
        success: function(response) {
            Blacks.data = {};
            for (var i = 0; i < response.blacks.length; i++) {
                var black = response.blacks[i];
                Blacks.data[black.tel] = black;
            }
            if (on_success) {
                on_success(Blacks.data);
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// 禁止語
function BannedWords() {
}
BannedWords.data = {}
BannedWords.isBanned = function(word) {
    if (word) {
        return BannedWords.data[word] ? true : false;
    } else {
        return false;
    }
}
BannedWords.load = function() {
    if (User.getCurrent().customer.hasOwnBannedWords()) {
        CallAPI('./sms_api/', 'POST', 'load_customer_banned_words', 20011, {}, {
            success: function(response) {
                for (var i = 0; i < response.banned_words.length; i++) {
                    var banned_word = response.banned_words[i];
                    BannedWords.data[banned_word.spelling] = true;
                }
            },
            error: function(response) {
                noty({text: response.message, layout: 'topRight', type: 'error'});
            },
            fatal: function(status, error) {
                alert(status + ': ' + error);
            }
        });
    } else {
        CallAPI('./sms_api/', 'POST', 'load_banned_words', 7013, {}, {
            success: function(response) {
                for (var i = 0; i < response.banned_words.length; i++) {
                    var banned_word = response.banned_words[i];
                    BannedWords.data[banned_word.ng_word] = true;
                }
            },
            error: function(response) {
                noty({text: response.message, layout: 'topRight', type: 'error'});
            },
            fatal: function(status, error) {
                alert(status + ': ' + error);
            }
        });
    }
}

// 形態素解析
function MorphemeParser() {
}
MorphemeParser.parseMessages = function(messages, on_success) {
    var q = [];
    for (var message_index = 0; message_index < messages.length; message_index++) {
        var message = messages[message_index];
        message.lines = message.body.split("\n");
        for (var i = 0; i < message.lines.length; i++) {
            q.push({id: message_index, html: message.lines[i]});
        }
    }
    var argv = {
        account: 'kisaburo@starship.jp',
        password: 'MHyWEiJ5MlUWK6Jf',       // TODO: これを隠すために中継用のスクリプトを一枚挟むべきかもしれぬ→違うな。形態素解析サーバーはローカルホストからのアクセスしか許さないようにしたから、パスワードが要らなくなった。そっちを改造すべき。
        q: JSON.stringify(q)
    };
    CallAPI('./morph_api/', 'POST', 'multiple_parse', 7013, argv, {
        success: function(response) {
            for (var text_index = 0; text_index < response.texts.length; text_index++) {
                var text = response.texts[text_index];
                var message = messages[text.id];
                if (message.morphemes == undefined) {
                    message.morphemes = [];
                }
                message.morphemes.push(text.morphemes);
                /* message.morphemes は、次のような 2 要素の配列の配列の配列になる
                var inflected_form = morpheme[0];   // 活用形
                var root_form = morpheme[1];        // 原形
                */
            }
            if (on_success && typeof on_success == 'function') {
                on_success(messages);
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// サポートケース
function SupportCase(support_case) {
    BaseClass.call(this, support_case);
    if (this.messages) {
        this.messages = this.messages.map(function(message) {return new CaseMessage(message)});
    } else {
        this.messages = [];
    }
    this.getTypeName = function() {
        return SupportCase._types[this.type];
    }
    this.getStatusName = function() {
        return SupportCase._statuses[this.status];
    }
    this.getUnreadCount = function() {
        var unread_count = 0;
        for (var i = 0; i < this.messages.length; i++) {
            var message = this.messages[i];
            if ((message.type == 0 || message.type == 2) && message.replied_at == undefined) {
                unread_count++;
            }
        }
        return unread_count;
    }
    this.getLastUpdate = function() {
        var last_update = this.created_at;
        for (var i = 0; i < this.messages.length; i++) {
            var message = this.messages[i];
            if (last_update < message.created_at) {
                last_update = message.created_at;
            }
        }
        return last_update;
    }
    this.buildMessageTree = function() {
        if (this.root_messages) {
            return this.root_messages;
        }
        this.root_messages = [];
        for (var i = 0; i < this.messages.length; i++) {
            var message = this.messages[i];
            if (message.reply_to == -1) {
                this.root_messages.push(message);
                message.buildTree(this.messages);
            }
        }
        return this.root_messages;
    }
}
SupportCase.prototype = BaseClass.prototype;
SupportCase._types = {
    0: '<span class="fa fa-dollar-sign menu_icon"></span> アカウントおよび請求',
    1: '<span class="fa fa-desktop menu_icon"></span> コンソールの使い方',
    2: '<span class="fa fa-cogs menu_icon"></span> API 仕様',
    '-1': '<span class="fa fa-comment-dots menu_icon"></span> その他'
}
SupportCase._statuses = {
    0: 'オープン',
    1: '回答済み',
    2: '応答あり',
    9: 'クローズ'
}

// サポートケースのメッセージ
function CaseMessage(case_message) {
    BaseClass.call(this, case_message);
    this.children = [];
    this.buildTree = function(messages) {
        for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            if (message.reply_to == this.id) {
                this.children.push(message);
                message.buildTree(messages);
            }
        }
    }
}
CaseMessage.prototype = BaseClass.prototype;

// ローダー（くるくる回るやつ）
/*
var loader = new Loader();
loader.show(60000 * 30);
show の引数は予想される待ち時間（ミリ秒）
*/
function Loader(loader) {
    Loader._instance_count++;
    BaseClass.call(this, loader);
    this.updateElapse = function() {
        if (this._started_at == undefined) {
            this._started_at = new Date();
        }
        var now = new Date();
        var seconds = Math.floor((now.getTime() - this._started_at.getTime()) / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        this._loader.find('.elapsed').html(pad0(minutes, 2) + ':' + pad0(seconds, 2));
        var this_loader = this;
        setTimeout(function() {
            this_loader.updateElapse();
        }, 313);
    }
    this.show = function(milliseconds/*予想ミリ秒数*/, argv) {
        var seconds = (milliseconds < 0 ? -1 : Math.floor(milliseconds / 1000));
        this._loader = $('.loader_dialog:not([id])').CreateDialog({
            container: $('.page-content')
        });
        var loader_id = 'loader_' + Loader._instance_count;
        this._loader.prop('id', loader_id);
        if (argv) {
            if (argv.title) {
                this._loader.find('.title').html(argv.title);
            }
        }
        if (seconds < 0) {
            this._loader.find('.estimated').parent().remove();
        } else {
            var minutes = Math.floor(seconds / 60);
            var seconds = seconds % 60;
            this._loader.find('.estimated').html(pad0(minutes, 2) + ':' + pad0(seconds, 2));
        }
        this._loader.ShowModal({
            mask: {
                css: {
                    background: 'white',
                    opacity: 0.7
                }
            },
        });
        this.updateElapse();
    }
    this.remove = function() {
        if (this._loader) {
            this._loader.find('.panel-remove').trigger('click');
        }
    }
}
Loader.prototype = BaseClass.prototype;
Loader._instance_count = 0;

/*
タイマー（条件が満足されるか時間切れになるまでストップウォッチを表示しつつ条件チェックを繰り返すクラス）
stop_watch: stop_watch,
stop_watch_interval: 213,
check_interval: 4013,
timeout: 1000 * 60 * 5,
check_callback: function(timer) {...},
timeout_callback: function(timer) {...}
*/
function Timer(argv) {
    var start = new Date();
    var end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
        start.getSeconds(),
        start.getMilliseconds() + argv.timeout
    );
    var timer = this;
    this.loop = function() {
        if (this._stop) {
            return;
        }
        setTimeout(function() {
            var now = new Date();
            // まだタイムアウトしていない
            if (now.getTime() < end.getTime()) {
                // 時計の表示を更新する
                var elapse = now.getTime() - start.getTime();
                var minutes = Math.floor(elapse / 60 / 1000);
                var seconds = Math.floor((elapse % (60 * 1000)) / 1000);
                var current_time = pad0(minutes) + ':' + pad0(seconds);
                argv.stop_watch.html(current_time);
                timer.loop();
                // 前回のチェックから check_interval ミリ秒経過している
                if (this.last == undefined || this.last.getTime() + argv.check_interval < now.getTime()) {
                    this.last = now;
                    // チェックのためのコールバック関数を呼び出す
                    argv.check_callback(timer);
                }
            // タイムアウトした
            } else {
                argv.timeout_callback(timer)
            }
        }, argv.stop_watch_interval);
        //console.log(this._loop_counter);
        this._loop_counter++;
    }
    this.start = function() {
        this._stop = false;
        this._loop_counter = 0;
        this.loop();
    }
    this.stop = function() {
        this._stop = true;
    }
}
Timer.prototype = Object.prototype;

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
/*
document.execCommand() メソッドは、Webページ内で編集可能な領域に対してコマンドを実行するためのAPIです。以下は document.execCommand() に渡すことができる一般的な引数のリストです。
"copy": 選択範囲をクリップボードにコピーします。
"cut": 選択範囲をクリップボードに切り取ります。
"paste": クリップボードの内容を貼り付けます。
"undo": 直前の操作を取り消します。
"redo": 直前に取り消された操作をやり直します。
"bold": 選択範囲を太字にします。
"italic": 選択範囲を斜体にします。
"underline": 選択範囲に下線を引きます。
"strikeThrough": 選択範囲に打ち消し線を引きます。
"subscript": 選択範囲を下付き文字にします。
"superscript": 選択範囲を上付き文字にします。
"justifyLeft": 選択範囲を左揃えにします。
"justifyCenter": 選択範囲を中央揃えにします。
"justifyRight": 選択範囲を右揃えにします。
"justifyFull": 選択範囲を両端揃えにします。
"indent": 選択範囲をインデントします。
"outdent": 選択範囲をアウトデント（左にずらす）します。
"createLink": 選択範囲にリンクを挿入します。
"unlink": 選択範囲からリンクを削除します。
"insertImage": 選択範囲に画像を挿入します。
"insertHTML": 選択範囲にHTMLを挿入します。
上記は一般的なコマンドであり、環境によってはサポートされていないものもあります。また、ブラウザによっては、このメソッドが非推奨になっているものもあります。
*/

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
URI.open = function(uri, on_success, on_error) {
    CallAPI('./sms_api/', 'POST', 'open_uri', 7013, {uri: uri.build()}, {
        success: function(response) {
            if (response.http_status == 'success') {
                if (on_success) {
                    on_success(response.http_response_code, response.http_response_body);
                } else {
                    noty({text: 'この URL は有効です', layout: 'topRight', type: 'success'});
                }
            } else {
                if (on_error) {
                    on_error(response.http_message);
                } else {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                }
            }
        },
        error: function(response) {
            alert(response.message);
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// ジョブ
function Job(job) {
    BaseClass.call(this, job);
    this.getStatusName = function() {
        return Job._statuses[this.send_status];
    }
    this.getBodyHTML = function() {
        if (this.body == undefined) {
            return '';
        }
        return this.body.replace(/\n/g, "<br>\n");
    }
}
Job._statuses = [
    '送信待ち',
    '送信準備中',
    '送信準備完了',
    '送信中',
    '送信キャンセル',
    '送信完了'
];
Job.getStatuses = function() {return Job._statuses;}
Job.getStatusDone = function() {return 5;}
Job.prototype = BaseClass.prototype;

// 短縮ジョブ
function ShortenJob(job) {
    BaseClass.call(this, job);
    this.getURICount = function() {
        if (this.uris == undefined) {
            return 0;
        } else {
            return this.uris.length;
        }
    };
    this.getViewCount = function() {
        if (this.uris == undefined) {
            return 0;
        };
        var view_count = 0;
        for (var i = 0; i < this.uris.length; i++) {
            view_count += this.uris[i].getViewCount();
        }
        return view_count;
    };
    this.getIdentifiersString = function() {
        if (this.uris == undefined) {
            return '';
        };
        var identifiers;
        for (var i = 0; i < this.uris.length; i++) {
            if (this.uris[i].identifier == undefined) {
                continue;
            }
            if (identifiers) {
                identifiers += ' ';
            }
            identifiers += this.uris[i].identifier;
        }
        return identifiers;
    };
}

// 短縮 URI
function ShortenURI(uri) {
    BaseClass.call(this, uri);
    this.getViewCount = function() {
        if (this.logs == undefined) {
            return 0;
        }
        var view_count = 0;
        for (var i = 0; i < this.logs.length; i++) {
            view_count += this.logs[i].getViewCount();
        }
        return view_count;
    };
    this.getLastViewDate = function() {
        if (this.logs == undefined) {
            return '';
        }
        var last_view_date;
        for (var i = 0; i < this.logs.length; i++) {
            var view_date = this.logs[i].getViewDate();
            if (last_view_date == undefined) {
                last_view_date = view_date;
            } else if (last_view_date < view_date) {
                last_view_date = view_date;
            }
        }
        if (last_view_date == undefined) {
            return '';
        }
        return last_view_date;
    };
    this.getIdentifierString = function() {return this.identifier ? this.identifier : '';};
}

// 短縮ログ
function ShortenLog(log) {
    BaseClass.call(this, log);
    this.getViewCount = function() {return this.view_count;};
    this.getViewDate = function() {return this.view_time;};
}

////////////////////////////////////////////////////////////////////////
// ■関数（共通）

function CallAPI(uri, method, command, timeout, data, on_response) {
//if (uri == './sms_api/') {
//    console.log(">>>>>>> " + command);
//}
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
    var ajax_params = {
        url: uri,
        type: method,
        async: true,
        timeout: timeout,
        cache: false,
        success: function(response, responseType) {
//if (uri == './sms_api/') {
//    console.log("<<<<<<< " + command + " success!");
//}
            if (response.status == 'success') {
                on_response.success(response);
            } else {
                on_response.error(response);
            }
        },
        error: function(xhr, status, error) {
//if (uri == './sms_api/') {
//    console.log("<<<<<<< " + command + " error!");
//}
            on_response.fatal(status, error);
        }
    };
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
            if (_user && data.get('account') == undefined) {
                data.set('account', _user.account);
                data.set('password', _user.password);
            }
            data.set('command', command);
        }
    } else {
        if (_user && data.account == undefined) {
            data.account = _user.account;
            data.password = _user.password;
        }
        data.command = command;                 // 書き換えているのは DOM ではなく DOM から作成されたオブジェクト（なのでオリジナルは当然不変）
    }
    ajax_params.data = data;
    $.ajax(ajax_params);
}
// 自分定義のクラスを ajax に渡すと発狂するので、システムで定義済みのオブジェクトに戻す（というかコピーする）
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

/*
電話帳は従来の電話帳ではなく、新しいデータ構造（タグ名、タグ値を持てる）
一括送信時の宛先番号ファイルは「使い捨ての電話帳」という位置づけ
UploadTable() はテーブル形式のファイルをアップロードし、そのまま ajax でダウンロードするための汎用的な関数であり、カラムの数も名前も知らない。
*/
function UploadTable(form, uploaded_file, title, on_success, on_success_argv) {
    var timeout = Math.floor(uploaded_file.size / 1024 * 2) + 7013;     // TODO: 往復で 1 KB 2 ミリ秒と想定。妥当かどうかは知らん。Excel と CSV で全然サイズが違うから妥当であるはずがないか…
    var loader = new Loader();
    loader.show(timeout, {title: title + 'をアップロード中...'});
    var user = User.getCurrent();
    var fd = new FormData(form.get(0));
    if (fd.set == undefined) {
        form.find('[name=command]').val('upload_table');    // IE 対策
        form.find('[name=account]').val(user.account);      // IE 対策
        form.find('[name=password]').val(user.password);    // IE 対策
    } else {
        fd.set('uploaded_file', uploaded_file);             // D&D またはファイル選択ダイアログで取得したファイルのデータをセット（IE では無効）
    }
    CallAPI('./sms_api/', 'POST', 'upload_table', timeout, fd, {
        success: function(response) {
            if (on_success) {
                on_success(response.table, on_success_argv);
            }
            loader.remove();
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            loader.remove();
        }
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
    input.val(body);    // TODO: 100 万件でも OK?
    form.append(input);  
    $('body').append(form);
    form.submit();
    $('#download_form').remove();
    if (on_end) {
        on_end();
    }
}

// 先頭から必要な数だけ '0' を付加して指定の桁数の数字列を作成
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

// TODO: これはアカン。なんとかして css で実現せねば
function ellipsis(str, max, el) {
    if (el === undefined) {
        el = '…';
    }
    return max < str.length ? str.slice(0, max) + el : str;
}

function CreateRandomPassword(digits) {
    var table = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var password = '';
    for (var i = 0; i < digits; i++) {
        var pos = Math.floor(table.length * Math.random());
        var c = table.charAt(pos);
        password += c;
    }
    return password;
}

// 時刻指定送信の指定日時の作成（バリデーション付き）
function CreateSendAt(send_at_date, send_at_time) {
    if (send_at_date == '') {
        throw {message: '日付を選択してください', target: $('#send_at_date')};
    }
    var ymd = send_at_date.match(/^(\d\d\d\d)-(\d\d)-(\d\d)$/);
    if (!ymd || ymd.length != 4) {
        throw {message: '日付の形式が間違っています', target: $('#send_at_date')};
    }
    if (send_at_time == '') {
        throw {message: '時刻を選択してください', target: $('#send_at_time')};
    }
    var hm = send_at_time.match(/^(\d\d):(\d\d)$/);
    if (!hm || hm.length != 3) {
        throw {message: '時刻の形式が間違っています', target: $('#send_at_time')};
    }
    var send_at = new Date(ymd[1], parseInt(ymd[2], 10) - 1, ymd[3], hm[1], hm[2]);
    var now = new Date();
    if (send_at.getTime() < now.getTime()) {
        throw {message: '過去の日時は指定できません'};
    } else if (send_at.getTime() < now.getTime() + 1000 * 60 * 30) {
        throw {message: '現在から 30 分以内の日時は指定できません'};
    }
    return send_at.format('YYYY-mm-dd HH:MM:SS');
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

// 確認ダイアログ（javascript 組み込みの confirm() に相当）
function ShowConfirmDialog(argv) {
    var container = $('.page-content');
    if (container.length == 0) {
        container = $('body');
    }
    var dialog = $('.confirm_dialog').CreateDialog({
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

// div をまったりと開く／閉じる
function Accordion(o, open, duration) {
    if (open) {
        o.removeClass('closed');
        o.css('display', 'block');
        o.css('height', '0px');
        o.animate({height: o.get(0)._accordion_height + 'px'}, duration, 'swing', function() {
        });
    } else {
        o.css({
            display: 'block',
            height: 'auto'
        });
        o.get(0)._accordion_height = o.height();
        o.animate({height: '0px'}, duration, 'swing', function() {
            o.get(0).height = o.height();
            o.css('display', 'none');
            o.addClass('closed');
        });
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
var _notices = {};

function Notice(argv) {
    // 通知のターゲットが既に別の通知のターゲットになっている
    var target_of_notice = argv.target.attr('target_of_notice');
    if (target_of_notice && target_of_notice != '') {
        var prev_notice = _notices[target_of_notice];
        prev_notice.remove();
        argv.target.attr('target_of_notice', null);
        delete _notices[target_of_notice];
    }
    // 新しい通知を作る
    var notice = $('<div class="notice_inline">' + argv.message + '</div>');
    if (argv.type == 'info') {
        notice.addClass('info');
    } else {
        notice.addClass('danger');
    }
    var notice_id = 'notice_' + Math.floor(20 * 1024 * 1024 * 1024 * Math.random());
    notice.prop('id', notice_id);
    argv.target.attr('target_of_notice', notice_id);
    _notices[notice_id] = notice;
    notice.css({
        top: argv.target.offset().top + argv.target.outerHeight() + 'px',
        left: argv.target.offset().left + 'px',
        //width: argv.target.outerWidth() + 'px',
        width: 'auto',
        opacity: 0
    });
    notice.click(function(e) {
        notice.animate({opacity: 0}, 100, function() {
            notice.remove();
            argv.target.attr('target_of_notice', null);
            delete _notices[notice_id];
        });
    });
    $('body').append(notice);
    notice.animate({opacity: 1.0}, 100);
}

function RemoveAllNotices() {
    for (var notice_id in _notices) {
        var notice = _notices[notice_id];
        notice.remove();
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
    var m = s.match(/^(https?):\/\/([a-z][0-9a-z\-]*[0-9a-z]*)(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z][0-9a-z\-]*[0-9a-z]*)?(\.[a-z]{2,8})(:[\d]+)?(\/[^\?]*)?(\?.+)?$/);
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
    var i = 3;
    for (; i < m.length; i++) {
        if (m[i] == undefined) {
            undefined_count++;
            if (1 < undefined_count && prev_word != undefined) {
                break;
            }
        } else if (m[i].charAt(0) == '.') {
            fqdn += m[i];
        } else {
            break;
        }
        prev_word = m[i];
    }
    // ポート番号
    var port;
    if (i < m.length) {
        if (m[i] == undefined) {
        } else if (m[i].charAt(0) == ':') {
            port = parseInt(m[i].slice(1), 10);
        }
        i++;
    }
    // パス
    var path;
    if (i < m.length) {
        if (m[i] == undefined) {
        } else if (m[i].charAt(0) == '/') {
            path = m[i];
        }
        i++;
    }
    // クエリー
    var query;
    if (i < m.length) {
        if (m[i] == undefined) {
        } else if (m[i].charAt(0) == '?') {
            query = m[i].slice(1);
        }
        i++;
    }
    var uri = new URI({
        protocol: protocol,
        fqdn: fqdn,
        port: port,
        path: path,
        query: query
    });
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

// ここまでの諸々の関数を jQuery オブジェクトメソッド化
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
    $.fn.Accordion = function(open, duration) {
        if (this.hasClass('accordion_box')) {
            Accordion(this, open, duration);
        } else if (this.hasClass('accordion_switch')) {
            Accordion($(this).parents('.accordion_block').find('.accordion_box'), open, duration);
        }
    }
    $.fn.EnableAccordion = function(enable) {
        if (enable) {
            this.click(function(e) {
                var box = $(e.currentTarget).parents('.accordion_block').find('.accordion_box');
                box.Accordion(box.hasClass('closed'), 200);
            });
        } else {
            this.off();
        }
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
// ■関数（電話帳ファイルアップロード）

function SetPhoneBookFileUploadHandlers(argv, on_success) {
    var file_input = argv.file_input;
    var drop_zone = argv.drop_zone;
    var tagsinput_api = argv.tagsinput_api;
    var body_textarea = argv.body_textarea;
    var tagselect = argv.tagselect;
    var file_form = file_input.parent();
    file_form.change(function(e) {
        var fd = new FormData(file_form.get(0));
        var uploaded_file = fd.get('uploaded_file');
        if (uploaded_file.name == '') {
            return;
        }
        UpdateUploadedFileInfo(uploaded_file);
        UploadTable(file_form, uploaded_file, '宛先番号ファイル', function(phone_book) {
            phone_book = new PhoneBook(phone_book);
            var headers = [];
            for (var i = 0; i < phone_book.headers.length; i++) {
                var header = phone_book.headers[i];
                var type;
                if (i < 2) {
                    type = 'required';
                } else {
                    type = 'faked';
                }
                headers.push({name: header, type: type});
            }
            phone_book.headers = headers;
            phone_book.rows = phone_book.rows.map(function(row) {return new PhoneBookEntry(row)});
            argv.phone_book = phone_book;
            UpdatePhoneBook(phone_book, {
                tagsinput_api: tagsinput_api,
                body_textarea: body_textarea,
                tagselect: tagselect
            }, on_success);
        });
    });
    drop_zone.on('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.addClass('dragging');
    });
    $(document).on('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.removeClass('dragging');
    });
    drop_zone.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    drop_zone.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.removeClass('dragging');
        var files = e.originalEvent.dataTransfer.files;
        if (1 < files.length) {
            noty({text: "複数のファイルをアップロードすることはできません", layout: 'topRight', type: 'error'});
            return;
        }
        var fd = new FormData(file_form.get(0));
        if (fd.set == undefined) {
            noty({text: "このブラウザーはドラッグ・アンド・ドロップによるファイル・アップロードに対応していません。<br>Chrome を使いましょう。", layout: 'topRight', type: 'error'});
            // そういう話ではなく、fd.set 関数が無効だという話だが、そう説明してもユーザには何のことだかわからないので、こう説明しておく。
            return;
        }
        UpdateUploadedFileInfo(files[0]);
        UploadTable(file_form, files[0], '宛先番号ファイル', function(phone_book) {
            phone_book = new PhoneBook(phone_book);
            var headers = [];
            for (var i = 0; i < phone_book.headers.length; i++) {
                var header = phone_book.headers[i];
                var type;
                if (i < 2) {
                    type = 'required';
                } else {
                    type = 'faked';
                }
                headers.push({name: header, type: type});
            }
            phone_book.headers = headers;
            phone_book.rows = phone_book.rows.map(function(row) {return new PhoneBookEntry(row)});
            argv.phone_book = phone_book;
            UpdatePhoneBook(phone_book, {
                tagsinput_api: tagsinput_api,
                body_textarea: body_textarea,
                tagselect: tagselect
            }, on_success);
        });
    });
    drop_zone.click(function(e) {
        file_input.trigger('click');
    });
}

var _uploaded_file;

function UpdateUploadedFileInfo(uploaded_file) {
    var file_info = $('.file_info');
    file_info.css({height: '0px', 'margin-top': '0px', opacity: 0});
    file_info.html(uploaded_file.name + ' (' + FileSizeBytesToString(uploaded_file.size) + ')');
    file_info.animate({height: 'auto', 'margin-top': '8px', opacity: 1.0}, 200, 'swing', function() {
        file_info.removeClass('hidden');
        file_info.css({height: 'auto'});
    });
    _uploaded_file = uploaded_file;
}

function FileSizeBytesToString(bytes) {
    if (bytes > 1024 * 1024) {
        return Math.ceil(bytes / 1024 / 1024) + 'MB';
    } else if (bytes > 1024) {
        return Math.ceil(bytes / 1024) + 'KB';
    } else {
        return bytes;
    }
}

////////////////////////////////////////////////////////////////////////
// ■関数（ファイルアップロードダイアログ）TODO: ほとんど同じ処理なのにダイアログかメイン画面かで処理が真っ二つに分かれているのが不細工。なんとかしたい。

/*
file タグとドロップターゲットを持つダイアログを表示
ユーザーがクリックまたはドラッグ・アンド・ドロップでファイルを指定
「アップロード」ボタンでファイルをアップロード
サーバーはアップロードされたファイルをテーブル（単なる配列の配列）形式で返す
そのテーブルを第一引数として on_success を呼び出す
*/
function ShowUploadDialog(argv, on_success) {
    var dialog = $('.upload_dialog').CreateDialog({
        container: $('.page-content'),
        on_remove: RemoveAllNotices
    });
    // タイトル
    dialog.find('.title').html(argv.title);
    // オブジェクト（電話帳など）の名称欄
    if (argv.name) {
        var name_form_group = dialog.find('.form-group.name.hidden')
        name_form_group.removeClass('hidden');
        name_form_group.find('label').html(argv.name.label);
        name_form_group.find('input').val(argv.name.value);
    }
    // ドロップゾーン
    var file_input = dialog.find('input[type=file][name=uploaded_file]');
    var file_form = file_input.parent();
    file_form.change(function(e) {
        var fd = new FormData(file_form.get(0));
        var uploaded_file = fd.get('uploaded_file');
        DialogUpdateUploadedFileInfo(dialog, uploaded_file);
    });
    var drop_zone = dialog.find('.drop_zone')
    drop_zone.on('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.addClass('dragging');
    });
    $(document).on('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.removeClass('dragging');
    });
    drop_zone.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    drop_zone.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        drop_zone.removeClass('dragging');
        var files = e.originalEvent.dataTransfer.files;
        if (1 < files.length) {
            noty({text: '同時に複数のファイルをアップロードすることはできません', layout: 'topRight', type: 'error'});
            return;
        }
        DialogUpdateUploadedFileInfo(dialog, files[0]);
    });
    drop_zone.click(function(e) {
        file_input.trigger('click');
    });
    dialog.find('.button_upload').click(function(e) {
        var fd = new FormData(file_form.get(0));
        if (dialog._uploaded_file == undefined) {
            noty({text: 'アップロードするファイルを指定して下さい', layout: 'topRight', type: 'error'});
            return;
        }
        fd.set('uploaded_file', dialog._uploaded_file);
        UploadTable(file_form, dialog._uploaded_file, argv.title, on_success, dialog);
    });
    if (argv.modal) {
        dialog.ShowModal();
    } else {
        dialog.ShowModeless();
    }
}

function DialogUpdateUploadedFileInfo(dialog, uploaded_file) {
    var file_info = dialog.find('.file_info');
    file_info.css({height: '0px', 'margin-top': '0px', opacity: 0});
    file_info.html(uploaded_file.name + ' (' + FileSizeBytesToString(uploaded_file.size) + ')');
    file_info.animate({height: 'auto', 'margin-top': '8px', opacity: 1.0}, 200, 'swing', function() {
        file_info.removeClass('hidden');
        file_info.css({height: 'auto'});
    });
    dialog._uploaded_file = uploaded_file;
}

////////////////////////////////////////////////////////////////////////
// ■関数（ジョブの操作）

function DownloadJobs(job_ids, type_id) {
    var user = User.getCurrent();
    var form = $(
'<form action="./sms_api/" method="post" target="_blank">' +
    '<input type="hidden" name="account" value="' + user.account + '"/>' +
    '<input type="hidden" name="password" value="' + user.password + '"/>' +
    '<input type="hidden" name="command" value="download_jobs"/>' +
    '<input type="hidden" name="type_id" value="' + type_id + '"/>' +
'</form>'
);
    for (var i = 0; i < job_ids.length; i++) {
        form.append('<input type="hidden" name="job_ids[]" value="' + job_ids[i] + '"/>');
    }
    $('body').prepend(form);
    form.submit();
    form.remove();
}

function CancelJob(job, argv) {
    CallAPI('./sms_api/', 'POST', 'cancel_job', 7013, {job_id: job.id}, {
        success: function(response) {
            if (argv && argv.success && typeof argv.success == 'function') {
                argv.success(response);
            } else {
                noty({text: '次のジョブをキャンセルしました<br>' + job.title, layout: 'topRight', type: 'success'});
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■関数（テンプレートダイアログの操作）

function LoadTemplates(user_id) {
    CallAPI('./sms_api/', 'POST', 'load_templates', 7013, {}, {
        success: function(response) {
            ShowTemplatesDialog(response.users, user_id);
            return;
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// テンプレートダイアログ（ユーザードロップダウンリスト付き）の表示
function ShowTemplatesDialog(users, user_id) {
    users = users.map(function(user) {return new User(user);});
    var dialog = $('.templates_dialog').CreateDialog({
        container: $('.page-content')
    });
    var delete_button = dialog.find('.button_delete');
    var save_button = dialog.find('.button_save');
    var create_button = dialog.find('.button_create');
    var owner_select = dialog.find('select.owner');
    var template_select = dialog.find('select.template');
    var order_by = dialog.find('.order_by');
    var title = dialog.find('input[type=text].title');
    var textarea = dialog.find('textarea.body');
    var dialog_dom = dialog.get(0);
    dialog_dom._user_id_to_templates_map = {};
    dialog_dom._id_to_template_map = {};
    // 削除ボタン
    delete_button.click(function(e) {
        var selected_template_id = template_select.val();
        var selected_template = dialog_dom._id_to_template_map[selected_template_id];
        if (selected_template.user_id != User.getCurrent().id) {
            noty({text: 'このテンプレートの所有者ではないため、削除できません', layout: 'topRight', type: 'error'});
            return;
        }
        ShowConfirmDialog({
            body: '【' + selected_template.title + '】を削除しますか？', 
            on_ok: function() {
                DeleteTemplates([selected_template], function(response) {
                    dialog.remove();
                    LoadTemplates();
                });
            }
        });
    });
    // 保存ボタン
    save_button.click(function(e) {
        var selected_template_id = template_select.val();
        var selected_template = dialog_dom._id_to_template_map[selected_template_id];
        if (selected_template.user_id != User.getCurrent().id) {
            noty({text: 'このテンプレートの所有者ではないため、変更できません', layout: 'topRight', type: 'error'});
            return;
        }
        var owner_user_id = owner_select.val();
        SaveTemplate({
            template_id: selected_template.id,
            user_id: owner_select.val(),
            order_by: owner_user_id,
            title: title.val(),
            body: textarea.val()
        }, function(response) {
            dialog.remove();
            LoadTemplates(owner_user_id);
        });
    });
    // 作成ボタン
    create_button.click(function(e) {
        var current_user = User.getCurrent();
        var current_user_templates = dialog_dom._user_id_to_templates_map[current_user.id];
        if (current_user_templates) {
            for (var i = 0; i < current_user_templates.length; i++) {
                var template = current_user_templates[i];
                if (template.id == -1) {
                    noty({text: '先に【' + template.title + '】を保存してください', layout: 'topRight', type: 'error'});
                    return;
                }
            }
        } else {
            if (current_user.templates == undefined) {
                current_user.templates = [];
            }
            dialog_dom._user_id_to_templates_map[current_user.id] = current_user.templates;
            owner_select.DestroySelectPicker();
            owner_select.prepend('<option value="' + current_user.id + '">' + current_user.name + '</option>');
            owner_select.val(current_user.id);
            owner_select.CreateSelectPicker();
        }
        var new_template = new Template({
            id: -1,
            user_id: current_user.id,
            order_by: 0,
            title: '<新しいテンプレート>',
            body: ''
        });
        dialog_dom._user_id_to_templates_map[current_user.id].splice(0, 0, new_template);
        owner_select.val(current_user.id);
        owner_select.trigger('change');
    });
    // ユーザー（テンプレートの所有者）の select
    owner_select.empty();
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.templates && 0 < user.templates.length) {
            dialog_dom._user_id_to_templates_map[user.id] = user.templates;
            owner_select.append('<option value="' + user.id + '">' + user.name + '</option>');
        }
    }
    var selected_owner_id = owner_select.val();
    if (selected_owner_id == undefined || selected_owner_id == '') {
        noty({text: '使用可能なテンプレートがありません', layout: 'topRight', type: 'error'});
        return;
    }
    if (user_id != undefined) {
        owner_select.val(user_id);
    }
    owner_select.CreateSelectPicker();
    // テンプレートの select
    owner_select.change(function(e) {
        var selected_owner_id = owner_select.val();
        var templates = dialog_dom._user_id_to_templates_map[selected_owner_id];
        dialog_dom._id_to_template_map = {};
        template_select.DestroySelectPicker();
        template_select.empty();
        for (var i = 0; i < templates.length; i++) {
            var template = templates[i];
            dialog_dom._id_to_template_map[template.id] = template;
            template_select.append('<option value="' + template.id + '">' + pad0(template.order_by, 3) + '&nbsp;&nbsp;' + template.title + '</option>');
        }
        template_select.CreateSelectPicker();
        template_select.trigger('change');
    });
    template_select.change(function(e) {
        var selected_template_id = template_select.val();
        var selected_template = dialog_dom._id_to_template_map[selected_template_id];
        order_by.val(pad0(selected_template.order_by, 3));
        title.val(selected_template.title);
        dialog.find('textarea.body').val(selected_template.body);
    });
    owner_select.trigger('change');
    // OK ボタン
    dialog.find('.button_ok').click(function(e) {
        var message_body = $('#message_body');
        message_body.val(textarea.val());
        //UpdateCharacterCounter(message_body);
        message_body.trigger('change');
    });
    dialog.ShowModeless();
}

// テンプレート削除
function DeleteTemplates(templates, on_success) {
    var template_ids = templates.map(function(template) {return template.id});
    CallAPI('./sms_api/', 'POST', 'delete_templates', 7013, {template_ids: template_ids}, {
        success: function(response) {
            if (on_success) {
                on_success(response);
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// テンプレート保存
function SaveTemplate(argv, on_success) {
    CallAPI('./sms_api/', 'POST', 'save_template', 7013, argv, {
        success: function(response) {
            if (on_success) {
                on_success(response);
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// テンプレートおよびメッセージ本文の文字数の表示
function UpdateCharacterCounter(textarea) {
    var cc = textarea.parent().find('.character_counter');
    var text = textarea.val();
    var denominator;
    if (0 < text.length && text.isAsciiString()) {
        denominator = 140;
    } else {
        denominator = 70;
    }
    cc.html(text.length + '/' + denominator);
    if (denominator < text.length) {
        cc.removeClass('bg-success');
        cc.addClass('bg-danger');
    } else {
        cc.removeClass('bg-danger');
        cc.addClass('bg-success');
    }
}

////////////////////////////////////////////////////////////////////////
// ■関数（送信要求発行前の確認用メッセージダイアログの操作）

function ValidateMessages(argv, on_success) {
    argv.messages = argv.messages.map(function(message) {return new Message(message);});
    // 長さと除外宛先
    for (var i = 0; i < argv.messages.length; i++) {
        var message = argv.messages[i];
        message.checkBlack();
        message.checkLength();
    }
    // 形態素解析
    MorphemeParser.parseMessages(argv.messages, function(messages) {
        // 禁止語
        for (var message_index = 0; message_index < messages.length; message_index++) {
            var message = messages[message_index];
            message.html = '';          // 画面表示用 HTML
            message.banned_words = [];  // 禁止語
            for (var line_index = 0; line_index < message.morphemes.length; line_index++) {
                if (0 < line_index) {
                    message.html += "<br>\n";
                }
                var line = message.morphemes[line_index];
                for (var morpheme_index = 0; morpheme_index < line.length; morpheme_index++) {
                    var morpheme = line[morpheme_index];
                    var inflected_form = morpheme[0];   // 活用形
                    var root_form = morpheme[1];        // 原形
                    inflected_form = inflected_form.trim();
                    if (root_form) {
                        root_form = root_form.trim();
                    }
                    var banned = (BannedWords.isBanned(inflected_form) || BannedWords.isBanned(root_form));
                    if (banned) {
                        message.html += '<span class="banned">';
                    }
                    message.html += morpheme[0];
                    if (banned) {
                        message.html += '</span>';
                        message.banned_words.push(inflected_form);
                    }
                }
            }
            message.html = message.html.replace(/https?:\/\/[\x21-\x7f]+/, function(uri) {return '<span class="uri">' + uri + '</span>';});
        }
        if (on_success) {
            on_success(argv);
        }
    });
}

function ShowMessageDialog(argv) {
    var dialog = $('.message_dialog').CreateDialog({
        container: $('.page-content')
    });
/*
    var error_count = 0;
    dialog._messages = argv.messages.map(function(message) {
        error_count += message.getErrorCount();
        return message;
    });
*/
    dialog._messages = argv.messages;
    dialog._message_order = [{column: 0, dir: 'desc'}];
    SortMessages(dialog);
    var table = $(
'<table id="message_table" class="table table-striped table-hover">' +
    '<thead>' +
        '<tr>' +
            '<th><input type="checkbox" class="checkbox"/><span class="checkbox_label">番号</span></th>' +
            '<th>宛先番号</th>' +
            '<th>メッセージ</th>' +
            '<th>長さ</th>' +
            '<th>禁止語</th>' +
            '<th>エラー数</th>' +
        '</tr>' +
    '</thead>' +
'</table>'
);
    table.find('.checkbox').click(function(e) {
        e.stopPropagation();
        UpdateAllMessagesCheck(dialog, table, $(e.currentTarget));
    });
    table.find('.checkbox_label').click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        $(e.currentTarget).parent().find('.checkbox').trigger('click');
    });
    var container = dialog.find('.message_table_container');
    container.empty();
    container.append(table);
    dialog._message_datatable_api = table.DataTable({
        aLengthMenu: [5, 10, 25, 50, 100],
        oLanguage: {
            sLengthMenu: '_MENU_ 行表示',
            sSearch: '<span class="fa fa-search"></span>',
            oPaginate: {
                sNext: '<span class="fa fa-step-forward"></span>',
                sPrevious: '<span class="fa fa-step-backward"></span>'
            },
            sInfo: '全 _TOTAL_ 件中 _START_ から _END_ まで',
            sInfoEmpty: '全 0 件中 0 から 0 まで',
            sInfoFiltered: '(全数 _MAX_ から抽出)',
            sZeroRecords: 'マッチするレコードがありません'
        },
        order: [[0, 'asc']],
        serverSide: true,
        ordering: true,
        searching: true,
        initComplete: function() {dialog.ShowModal();},
        ajax: function(data, callback, settings) {
            SortMessages(dialog, data.order);
            var rows = [];
            var filtered_count;
            var end = data.start + data.length;
            if (0 < data.search.value.length) {
                filtered_count = 0;
                for (var index = data.start; index < end && index < dialog._messages.length; index++) {
                    var message = dialog._messages[index];
                    if (data.start <= filtered_count && filtered_count < end) {
                        if (FindMessageString(message, data.search.value)) {
                            rows.push(CreateMessageRow(index, message));
                        }
                    }
                    filtered_count++;
                }
            } else {
                for (var index = data.start; index < end && index < dialog._messages.length; index++) {
                    var message = dialog._messages[index];
                    var row = CreateMessageRow(index, message);
                    rows.push(row);
                }
                filtered_count = dialog._messages.length;
            }
            callback({
                draw: data.draw,
                data: rows,
                recordsTotal: dialog._messages.length,
                recordsFiltered: filtered_count
            });
        },
        drawCallback: function() {
            table.find('tbody tr input[type=checkbox]').click(function(e) {
                e.stopPropagation();
                UpdateMessageCheck(dialog, $(e.currentTarget));
            });
            table.find('tbody tr').click(function(e) {
                $(e.currentTarget).find('input[type=checkbox]').trigger('click');
            });
            table.find('tbody tr td .body .html .uri').click(function(e) {
                e.stopPropagation();
                OpenURI($(e.currentTarget).html());
            });
            table.find('tbody tr td .body .edit').click(function(e) {
                e.stopPropagation();
                var message_index = $(e.currentTarget).parents('tr').find('[message_index]').attr('message_index');
                EditMessageBody(dialog, table, message_index);
            });
        }
    });
    UpdateMessageDialogStatus(dialog);
    dialog.find('.button_ok').click(function(e) {
        MessageDialogSend(dialog, argv);
    });
}

function SortMessages(dialog, order) {
    var messages = dialog._messages;
    var do_sort = false;
    if (order == undefined) {
        do_sort = true;
    } else if (0 < order.length) {
        if (dialog._message_order[0].column == order[0].column) {
            if (dialog._message_order[0].dir == order[0].dir) {
            } else {
                do_sort = true;
                dialog._message_order[0].dir =  order[0].dir;
            }
        } else {
            do_sort = true;
            var message_order = [];
            message_order.push(order[0]);
            for (var i = 0; i < dialog._message_order.length; i++) {
                if (dialog._message_order[i].column != order[0].column) {
                    message_order.push(dialog._message_order[i]);
                }
            }
            dialog._message_order = message_order;
        }
    }
    if (!do_sort) {
        return;
    }
    messages.sort(function(message1, message2) {
        for (var i = 0; i < dialog._message_order.length; i++) {
            var by = dialog._message_order[i];
            var value1, value2;
            if (by.column == 0) {
                value1 = message1.no;
                value2 = message2.no;
            } else if (by.column == 1) {
                value1 = message1.phone;
                value2 = message2.phone;
            } else if (by.column == 2) {
                value1 = message1.body;
                value2 = message2.body;
            } else if (by.column == 3) {
                value1 = message1.body.length;
                value2 = message2.body.length;
            } else if (by.column == 4) {
                value1 = message1.getBannedWordsString(),
                value2 = message2.getBannedWordsString()
            } else if (by.column == 5) {
                value1 = message1.getErrorCount(),
                value2 = message2.getErrorCount()
            } else {
                value1 = 1;
                value2 = 1;
            }
            if (value1 != value2) {
                var message1_younger = value1 < value2;
                if (by.dir == 'desc') {
                    message1_younger = !message1_younger;
                }
                return message1_younger ? -1 : 1;
            }
        }
        return 0;
    });
}

function FindMessageString(message, str) {
    if (message.no.toString.indexOf(str) != -1) {
        return true;
    }
    if (message.phone.indexOf(str) != -1) {
        return true;
    }
    if (message.body.indexOf(str) != -1) {
        return true;
    }
    if (message.getBannedWordString().indexOf(str) != -1) {
        return true;
    }
    return false;
}

function CreateMessageRow(index, message) {
    var phone;
    if (message.isBlack) {
        phone = '<span class="phone black">' + message.phone + '</span>';
    } else {
        phone = '<span class="phone">' + message.phone + '</span>';
    }
    var length;
    if (message.isTooLong) {
        length = '<span class="body too_long">' + message.body.length + '</span>';
    } else {
        length = message.body.length;
    }
    var error_count = message.getErrorCount();
    if (0 < error_count) {
        error_count = '<span class="error_found">' + error_count + '</span>';
    }
    try {
        var row = [];
        row.push('<div class="no"><input type="checkbox" class="checkbox" message_index="' + index + '"/><span class="checkbox_label">' + pad0(message.no, 5) + '</span></div>');
        row.push('<div class="phone">' + phone + '</div>');
        row.push('<div class="body"><span class="html">' + message.html + '</span><span class="fa fa-pencil-alt edit"></span></div>');
        row.push('<div class="length">' + length + '</div>');
        row.push('<div class="banned_words">' + message.getBannedWordsString() + '</div>');
        row.push('<div class="error_count">' + error_count + '</div>');
        return row;
    } catch (e) {
        console.log(e);
    }
}

function UpdateAllMessagesCheck(dialog, table, checkbox) {
    var checked = checkbox.prop('checked');
    for (var i = 0; i < dialog._messages.length; i++) {
        dialog._messages[i].checked = checked;
    }
    table.find('tbody tr .no input[type=checkbox]').prop('checked', checked);
}

function UpdateMessageCheck(dialog, input) {
    var message_index = input.attr('message_index');
    var checked = input.prop('checked');
    dialog._messages[message_index].checked = checked;
}

function GetCheckedMessages(dialog) {
    var messages = [];
    for (var message_index = 0; message_index < dialog._messages.length; message_index++) {
        if (dialog._messages[message_index].checked) {
            messages.push(dialog._messages[message_index]);
        }
    }
    return messages;
}

function UpdateMessageDialogStatus(dialog) {
    var error_count = 0;
    for (var i = 0; i < dialog._messages.length; i++) {
        error_count += dialog._messages[i].getErrorCount();
    }
    var status_message = dialog.find('.status_message');
    if (0 < error_count) {
        status_message.addClass('text-danger');
        status_message.addClass('font_bold');
        status_message.html(error_count + ' 件のエラーがあります。送信できません。');
        dialog.find('.button_ok').prop('disabled', true);
    } else {
        status_message.removeClass('text-danger');
        status_message.removeClass('font_bold');
        status_message.html('送信できます');
        dialog.find('.button_ok').prop('disabled', false);
    }
}

function EditMessageBody(dialog, table, message_index) {
    $('.inline_editor:not(.hidden)').remove();
    var message = dialog._messages[message_index];
    var td = table.find('tbody tr td [message_index=' + message_index + ']').parents('tr').find('.body').parent();
    var editor = $('.inline_editor.hidden').clone(true, true);
    editor.removeClass('hidden');
    dialog.append(editor);
    var header = editor.find('.header');
    var textarea = editor.find('textarea');
    textarea.val(message.body);
    editor.css({
        position: 'absolute',
        left: td.offset().left - dialog.offset().left - 1 + 'px',
        width: td.outerWidth() - 1 + 'px'
        //'z-index': 2000
    });
    var header_height = header.outerHeight();
    editor.css({
        top: td.offset().top - dialog.offset().top - header_height - 1 + 'px',
        height: td.outerHeight() + - 1 + header_height + 'px',
    });
    textarea.css({
        height: 'calc(100% - ' + header_height + 'px)'
    });
    editor.find('.header .ok').click(function(e) {
        e.stopPropagation();
        UpdateMessageBody(dialog, editor, message_index);
    });
    editor.blur(function(e) {
        UpdateMessageBody(dialog, editor, message_index)
    });
    editor.find('.header .cancel').click(function(e) {
        CancelEdit(editor);
    });
    editor.keyup(function(e) {
        if (e.which == 27) {
            CancelEdit(editor);
        } if (e.which == 13 && e.altKey) {
            UpdateMessageBody(dialog, editor, message_index)
        }
    });
    editor.click(function(e) {
        e.stopPropagation();
    });
    dialog.click(function(e) {
        $('.inline_editor').trigger('blur');
    });
    textarea.focus();
}

function CancelEdit(editor) {
    editor.fadeOut('fast').queue(function() {
        editor.remove();
    });
}

function UpdateMessageBody(dialog, editor, message_index) {
    var message = dialog._messages[message_index];
    message.body = editor.find('textarea').val();
    delete message.morphemes;
    delete message.error_count;
    ValidateMessages({messages: [message]}, function(argv) {
        dialog._messages[message_index] = argv.messages[0];
        editor.fadeOut('fast').queue(function() {
            editor.remove();
            dialog._message_datatable_api.draw(false/*「ソートするな」フラグ*/);
            UpdateMessageDialogStatus(dialog);
        });
    });
}

function MessageDialogSend(dialog, argv) {
    var checked_message_count = 0;
    for (var i = 0; i < dialog._messages.length; i++) {
        var message = dialog._messages[i];
        if (message.checked) {
            checked_message_count++;
        }
    }
    var send_all = (checked_message_count == 0);
    argv.messages = [];
    for (var i = 0; i < dialog._messages.length; i++) {
        var message = dialog._messages[i];
        if (send_all || message.checked) {
            argv.messages.push({
                no: message.no,
                phone: message.phone,
                body: message.body,
                shortener_uri_id: message.shortener_uri_id,
                identifier: message.identifier,
                mau_address_id: message.mau_address_id
            });
        }
    }
    ShowConfirmDialog({
        body: (send_all ? '全 ' : 'チェックを付けた ') + argv.messages.length + ' 件のメッセージを送信しますか？',
        on_ok: function() {
            dialog.find('.panel-remove').trigger('click');
            SendMessages(argv);
        }
    });
}

function SendMessages(argv) {
    var send__messages_argv = {
        send_at: argv.send_at,
        title: argv.title,
        messages: argv.messages,
        shortener_job_id: argv.shortener_job_id,
        mau_job_id: argv.mau_job_id
    }
    CallAPI('./sms_api/', 'POST', 'send_messages', 7013, send__messages_argv, {
        success: function(response) {
            var when;
            if (argv.send_at) {
                when = argv.send_at + ' ';
            } else {
                when = '直ち';
            }
            noty({text: when + 'に ' + argv.messages.length + ' 通の送信を開始します', layout: 'topRight', type: 'success'});
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■関数（送信要求発行後のメッセージダイアログの操作。ほぼ delivery_sms_infos レコードを表示する、ということ）

function LoadSentMessages(job) {
    var timeout = 5 * job.message_total_count + 7013;
    var loader = new Loader();
    loader.show(timeout, {title: 'メッセージを取得中...'});
    CallAPI('./sms_api/', 'POST', 'load_messages', timeout, {job_id: job.id}, {
        success: function(response) {
            loader.remove();
            ShowSentMessageDialog(job, response.messages);
        },
        error: function(response) {
            loader.remove();
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            loader.remove();
            alert(status + ': ' + error);
        }
    });
}

function ShowSentMessageDialog(job, messages) {
    var dialog = $('.sent_message_dialog').CreateDialog({
        container: $('.page-content')
    });
    dialog.find('.button_resend').click(function(e) {
        ResendCheckedMessages(dialog, job);
    });
    dialog.find('.button_download').click(function(e) {
        DownloadSentMessages(job);
    });
    UpdateSentMessages(dialog, job, messages);
}

function UpdateSentMessages(dialog, job, messages) {
    var dialog_dom = dialog.get(0);
    dialog_dom._messages = messages.map(function(message) {return new SentMessage(message);});
    dialog_dom._message_order = [{column: 0, dir: 'desc'}];
    SortSentMessages(dialog, job);
    var column6_title;
    if (job.mau_job_id == undefined || job.mau_job_id == -1) {
        column6_title = '転送数';
    } else {
        column6_title = 'メールアドレス';
    }
    var table = $(
'<table class="table table-striped table-hover">' +
    '<thead>' +
        '<tr>' +
            '<th><input type="checkbox" class="checkbox"><span class="checkbox_label"> 電話番号</span></th>' +
            '<th class="body">本文</th>' +
            '<th>送信開始</th>' +
            '<th>送信終了</th>' +
            '<th>ステータス</th>' +
            '<th>エラー</th>' +
            '<th>' + column6_title + '</th>' +
        '</tr>' +
    '</thead>' +
'</table>'
);
    table.find('.checkbox').click(function(e) {
        e.stopPropagation();
        UpdateAllMessageChecks(dialog, $(e.currentTarget));
    });
    table.find('.checkbox+.checkbox_label').click(function(e) {
        e.stopPropagation();
        $(e.currentTarget).parent().find('.checkbox').trigger('click');
    });
    var container = dialog.find('.sent_message_table_container');
    container.empty();
    container.append(table);
    dialog_dom._sent_message_table_api = table.DataTable({
        aLengthMenu: [10, 25, 50, 100, 250, 500, 1000],
        oLanguage: {
            sLengthMenu: '_MENU_ 行表示',
            sSearch: '<span class="fa fa-search"></span>',
            oPaginate: {
                sNext: '<span class="fa fa-step-forward"></span>',
                sPrevious: '<span class="fa fa-step-backward"></span>'
            },
            sInfo: '全 _TOTAL_ 件中 _START_ から _END_ まで',
            sInfoEmpty: '全 0 件中 0 から 0 まで',
            sInfoFiltered: '(全数 _MAX_ から抽出)',
            sZeroRecords: 'マッチするレコードがありません'
        },
        order: [[0, 'desc']],
        serverSide: true,
        ordering: true,
        searching: true,
        initComplete: function() {dialog.ShowModeless();},
        ajax: function(data, callback, settings) {
            SortSentMessages(dialog, job, data.order);
            var rows = [];
            var filtered_count;
            var end = data.start + data.length;
            if (0 < data.search.value.length) {
                filtered_count = 0;
                for (var index = data.start; index < end && index < dialog_dom._messages.length; index++) {
                    var message = dialog_dom._messages[index];
                    if (data.start <= filtered_count && filtered_count < end) {
                        if (FindSentMessageString(message, data.search.value)) {
                            rows.push(CreateSentMessageRow(dialog, job, index, message));
                        }
                    }
                    filtered_count++;
                }
            } else {
                for (var index = data.start; index < end && index < dialog_dom._messages.length; index++) {
                    var message = dialog_dom._messages[index];
                    var row = CreateSentMessageRow(dialog, job, index, message);
                    rows.push(row);
                }
                filtered_count = dialog_dom._messages.length;
            }
            callback({
                draw: data.draw,
                data: rows,
                recordsTotal: dialog_dom._messages.length,
                recordsFiltered: filtered_count
            });
        },
        drawCallback: function() {
            table.find('tbody tr input[type=checkbox]').click(function(e) {
                e.stopPropagation();
                UpdateSentMessageCheck(dialog, $(e.currentTarget));
            });
            table.find('tbody tr td').click(function(e) {
                OnSentMesssageTableCellClicked(dialog, $(e.currentTarget));
            });
        }
    });
}

function SortSentMessages(dialog, job, order) {
    var dialog_dom = dialog.get(0);
    var do_sort = false;
    if (order == undefined) {
        do_sort = true;
    } else if (0 < order.length) {
        if (dialog_dom._message_order[0].column == order[0].column) {
            if (dialog_dom._message_order[0].dir == order[0].dir) {
            } else {
                do_sort = true;
                dialog_dom._message_order[0].dir =  order[0].dir;
            }
        } else {
            do_sort = true;
            var message_order = [];
            message_order.push(order[0]);
            for (var i = 0; i < dialog_dom._message_order.length; i++) {
                if (dialog_dom._message_order[i].column != order[0].column) {
                    message_order.push(dialog_dom._message_order[i]);
                }
            }
            dialog_dom._message_order = message_order;
        }
    }
    if (!do_sort) {
        return;
    }
    dialog_dom._messages.sort(function(message1, message2) {
        for (var i = 0; i < dialog_dom._message_order.length; i++) {
            var by = dialog_dom._message_order[i];
            var value1, value2;
            if (by.column == 0) {
                value1 = message1.to_tel;
                value2 = message2.to_tel;
            } else if (by.column == 1) {
                value1 = message1.body;
                value2 = message2.body;
            } else if (by.column == 2) {
                value1 = message1.send_start_date;
                value2 = message2.send_start_date;
            } else if (by.column == 3) {
                value1 = message1.send_end_date;
                value2 = message2.send_end_date;
            } else if (by.column == 4) {
                value1 = message1.send_status;
                value2 = message2.send_status;
            } else if (by.column == 5) {
                value1 = message1.error_code;
                value2 = message2.error_code;
            } else if (by.column == 6) {
                if (job.mau_job_id == -1) {
                    value1 = message1.view_count;
                    value2 = message2.view_count;
                } else {
                    value1 = message1.mau_address.address;
                    value2 = message2.mau_address.address;
                }
            } else {
                value1 = 1;
                value2 = 1;
            }
            if (value1 != value2) {
                var message1_younger = value1 < value2;
                if (by.dir == 'desc') {
                    message1_younger = !message1_younger;
                }
                return message1_younger ? -1 : 1;
            }
        }
        return 0;
    });
}

function FindSentMessageString(message, str) {
    if (message.to_tel.indexOf(str) != -1) {
        return true;
    } else if (message.body.indexOf(str) != -1) {
        return true;
    } else if (message.getStatusName().indexOf(str) != -1) {
        return true;
    } else if (message.getErrorName().indexOf(str) != -1) {
        return true;
    }
    return false;
}

function CreateSentMessageRow(dialog, job, index, message) {
    var status;
    if (message.isResendable()) {
        status = message.getStatusName();
    } else {
        status = '<span class="unresendable">' + message.getStatusName() + '</span>';
    }
    try {
        var row = [];
        row.push('<div class="to_tel"><input type="checkbox" class="checkbox" message_index="' + index + '"' + (message.checked ? ' checked' : '') + '/><span class="checkbox_label"> ' + message.to_tel + '</span></div>');
        row.push('<div class="body">' + message.getBodyHTML() + '</div>');
        row.push('<div class="send_start_date">' + (message.send_start_date ? message.send_start_date.replace(/ /, '<br>') : '') + '</div>');
        row.push('<div class="send_end_date">' + (message.send_end_date ? message.send_end_date.replace(/ /, '<br>') : '') + '</div>');
        row.push('<div class="send_status" send_status_code="' + message.send_status_code + '">' + status + '</div>');
        row.push('<div class="send_error" error_code="' + message.error_code + '">' + message.getErrorName() + '</div>');
        if (job.mau_job_id == undefined || job.mau_job_id == -1) {
            row.push('<div class="view_count">' + message.view_count + '</div>');
        } else {
            row.push('<div class="address">' + (message.mau_address.address ? message.mau_address.address : '') + '</div>');
        }
        return row;
    } catch (e) {
        console.log('>>>>>>> error in CreateSentMessageRow()');
        console.log(e);
    }
}

function UpdateAllMessageChecks(dialog, checkbox) {
    var messages = dialog.get(0)._messages;
    var checked = checkbox.prop('checked');
    for (var message_index = 0; message_index < messages.length; message_index++) {
        messages[message_index].checked = checked;
    }
    dialog.find('table tbody tr td div.to_tel input[type=checkbox]').prop('checked', checked);
}

function UpdateSentMessageCheck(dialog, input) {
    var message_index = input.attr('message_index');
    var checked = input.prop('checked');
    dialog.get(0)._messages[message_index].checked = checked;
}

function GetCheckedSentMessages(dialog) {
    var dialog_dom = dialog.get(0);
    var messages = [];
    for (var message_index = 0; message_index < dialog_dom._messages.length; message_index++) {
        if (dialog_dom._messages[message_index].checked) {
            messages.push(dialog_dom._messages[message_index]);
        }
    }
    return messages;
}

function OnSentMesssageTableCellClicked(dialog, td) {
    var div = td.find('div');
    var tr = td.parent();
    var checkbox = tr.find('input[type=checkbox]');
    var checked = !checkbox.prop('checked');
    var messages = dialog.get(0)._messages;
    var class_name = div.attr('class');
    var class_name_index = ['to_tel', 'body', 'send_start_date', 'send_end_date', 'send_status', 'send_error', 'view_count'].findIndex(function(element, index, array) {return element == class_name;});
    // クリックされたのがステータスのセルならば、そのセルと同じ値のステータス・セルを持つ全ての行にチェックを付ける／外す
    if (class_name == 'send_status') {
        var send_status_code = div.attr('send_status_code');
        for (var message_index = 0; message_index < messages.length; message_index++) {
            var message = messages[message_index];
            if (message.send_status_code == send_status_code) {
                message.checked = checked;
            }
        }
        dialog.find('table>tbody>tr>td>div[send_status_code=' + send_status_code + ']').each(function(i, o) {
            $(o).parent().parent().find('input[type=checkbox]').prop('checked', checked);
        });
    // クリックされたのがエラーのセルならば、そのセルと同じ値のエラー・セルを持つ全ての行にチェックを付ける／外す
    } else if (class_name == 'send_error') {
        var error_code = div.attr('error_code');
        for (var message_index = 0; message_index < messages.length; message_index++) {
            var message = messages[message_index];
            if (message.error_code == error_code) {
                message.checked = checked;
            }
        }
        dialog.find('table>tbody>tr>td>div[error_code=' + error_code + ']').each(function(i, o) {
            $(o).parent().parent().find('input[type=checkbox]').prop('checked', checked);
        });
    // クリックされた行だけにチェックを付ける／外す
    } else {
        checkbox.trigger('click');
    }
}

function ResendCheckedMessages(dialog, job) {
    var messages = GetCheckedSentMessages(dialog);
    if (messages.length == 0) {
        noty({text: '再送信するメッセージにチェックを付けてください', layout: 'topRight', type: 'error'});
        return;
    }
    var unresendable_count = 0;
    var messages_to_send = [];
    for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        if (message.isResendable()) {
            var message_to_send = {
                no: messages_to_send.length + 1,
                phone: message.to_tel,
                body: message.body,
                shortener_uri_id: message.shortener_uri_id,
                identifier: message.identifier,
                mau_address_id: message.mau_address_id
            };
            messages_to_send.push(new Message(message_to_send));
        } else {
            unresendable_count++;
        }
    }
    if (0 < unresendable_count) {
        noty({text: '再送信できないメッセージが含まれています（ステータスが赤く表示されたもの）', layout: 'topRight', type: 'error'});
        dialog.get(0)._sent_message_table_api.draw();
        return;
    }
    ValidateMessages({
        title: job.title + '_再送',
        messages: messages_to_send,
        shortener_job_id: job.shortener_job_id,
        mau_job_id: job.mau_job_id
    }, function(argv) {ShowMessageDialog(argv)});
}

function DownloadSentMessages(job) {
    var user = User.getCurrent();
    var form = $(
'<form action="./sms_api/" method="post">' +
    '<input type="hidden" name="account" value="' + user.account + '"/>' +
    '<input type="hidden" name="password" value="' + user.password + '"/>' +
    '<input type="hidden" name="command" value="download_messages"/>' +
    '<input type="hidden" name="job_id" value="' + job.id + '"/>' +
'</form>'
);
    $('body').prepend(form);
    form.submit();
    form.remove();
}

////////////////////////////////////////////////////////////////////////
// ■関数（短縮ダイアログの操作）

function ShowShortenDialog(textarea) {
    var dialog = $('.shorten_dialog').CreateDialog({
        container: $('.page-content')
    });
    if (Environment.isDevelopment()) {
        var shorten_long_uri = localStorage.getItem('shorten_long_uri');
        if (shorten_long_uri && shorten_long_uri != '') {
            dialog.find('.long_uri').val(shorten_long_uri);
        }
    }
    dialog.find('.open_long_uri').click(function(e) {
        var long_uri = dialog.find('.long_uri').val();
        if (long_uri == '') {
            Notice({message: '長い URL を記入してください', target: dialog.find('.long_uri')});
            return;
        }
        var uri;
        try {
            uri = long_uri.parseURI();
        } catch (e) {
            Notice({message: '長い URL の形式に誤りがあります', target: dialog.find('.long_uri')});
            return;
        }
        OpenURI(long_uri);
    });
    dialog.find('.open_short_uri').click(function(e) {
        OpenURI(dialog.find('.short_uri').val());
    });
    dialog.find('button.shorten').click(function(e) {
        try {
            DialogShortenURI(dialog);
        } catch (e) {
            if (e.target) {
                Notice(e);
            } else {
                noty({text: e.message, layout: 'topRight', type: 'error'});
            }
            return;
        }
        if (Environment.isDevelopment()) {
            var shorten_long_uri = dialog.find('.long_uri').val();
            localStorage.setItem('shorten_long_uri', shorten_long_uri);
        }
    });
    dialog.find('.button_copy').click(function(e) {
        if (Clipboard.copy(dialog.find('.short_uri').val())) {
            noty({text: '短い URL をクリップボードにコピーしました<br>本文中の適当な位置に【貼り付け】(Ctrl-V) られます', layout: 'topRight', type: 'success'});
        } else {
            noty({text: 'このブラウザはクリップボードへのコピーができません', layout: 'topRight', type: 'error'});
        }
    });
    dialog.find('.button_paste').click(function(e) {
        var text = textarea.val();
        var curpos = textarea.getCursorPosition();
        var short_uri = dialog.find('.short_uri').val();
        var before = text.slice(0, curpos);
        var after = text.slice(curpos);
        if (!before.match(/[ \n]$/) && 0 < before.length) {
            short_uri = (' ' + short_uri);
        }
        if (!after.match(/^[ \n]/) && 0 < after.length) {
            short_uri += ' ';
        }
        textarea.val(before + short_uri + after);
        textarea.selectRange(curpos + short_uri.length);
        textarea.trigger('change');
    });
    dialog.ShowModeless({css: {top: textarea.offset().top - dialog.outerHeight() - 16 + 'px'}});
}

function DialogShortenURI(dialog) {
    var long_uri = dialog.find('.long_uri');
    var short_uri = dialog.find('.short_uri');
    if (long_uri.val() == '') {
        throw {message: '長い URL を記入してください', target: long_uri};
    }
    var uri;
    try {
        uri = long_uri.val().parseURI();
    } catch (e) {
        throw {message: '長い URL の形式に誤りがあります', target: long_uri};
    }
    URI.open(
        uri,
        function(http_response_code, http_response_body) {
            var customer_user = User.getCurrent().getCustomerUser();
            var argv = {
                account: customer_user.account,
                password: customer_user.password,
                domain_id: -1,
                long_uri: long_uri.val()
            }
            var shorten_button_icon = dialog.find('button.shorten .fa');
            //shorten_button_icon.removeClass('fa fa-arrow-down');
            //shorten_button_icon.addClass('fas fa-sync fa-spin');
            shorten_button_icon.addClass('fa-spin');
            CallAPI('./shorten_api/', 'POST', 'shorten', 7013, argv, {
                success: function(response) {
                    short_uri.val(response.short_uri);
                    //shorten_button_icon.addClass('fa fa-arrow-down');
                    //shorten_button_icon.removeClass('fas fa-sync fa-spin');
                    shorten_button_icon.removeClass('fa-spin');
                },
                error: function(response) {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                    //shorten_button_icon.addClass('fa fa-arrow-down');
                    //shorten_button_icon.removeClass('fas fa-sync fa-spin');
                    shorten_button_icon.removeClass('fa-spin');
                },
                fatal: function(status, error) {
                    alert(status + ': ' + error);
                }
            });
        },
        function(message) {
            Notice({message: 'この URL は開けません<br>(' + message + ')', target: long_uri});
        }
    );
}

////////////////////////////////////////////////////////////////////////
// ■関数（開封確認ダイアログの操作）

function ShowUniqueifyDialog(textarea, phone_book, on_ok, on_cancel) {
    var dialog = $('.uniqueify_dialog').CreateDialog({
        container: $('.page-content')
    });
    var uniqueify_long_uri = localStorage.getItem('uniqueify_long_uri');
    if (uniqueify_long_uri && uniqueify_long_uri != '') {
        dialog.find('.long_uri').val(uniqueify_long_uri);
    }
    if (phone_book) {
        identifier = dialog.find('select.identifier');
        identifier.empty();
        for (var header_index = 0; header_index < phone_book.headers.length; header_index++) {
            identifier.append('<option value="' + header_index + '">' + phone_book.headers[header_index].name + '</option>');
        }
        identifier.removeClass('hidden');
        identifier.CreateSelectPicker();
        dialog.find('.button_cancel').removeClass('hidden');
        dialog.find('.button_ok').removeClass('hidden').click(function(e) {
            var long_uri = dialog.find('.long_uri').val();
            if (long_uri == '') {
                Notice({message: '長い URL を記入してください', target: dialog.find('.long_uri')});
                return;
            }
            var uri;
            try {
                uri = long_uri.parseURI();
            } catch (e) {
                Notice({message: '長い URL の形式に誤りがあります', target: dialog.find('.long_uri')});
                return;
            }
            URI.open(
                uri,
                function(http_response_code, http_response_body) {
                    if (on_ok) {
                        on_ok(uri, identifier);
                    }
                    localStorage.setItem('uniqueify_long_uri', long_uri);
                    dialog.find('.panel-remove').trigger('click');
                },
                function(message) {
                    Notice({message: 'この URL は開けません<br>(' + message + ')', target: dialog.find('.long_uri')});
                }
            );
        });
    } else {
        identifier = dialog.find('input[type=text].identifier')
        identifier.removeClass('hidden');
        dialog.find('.button_close').removeClass('hidden');
    }
    dialog.find('.open_long_uri').click(function(e) {
        var long_uri = dialog.find('.long_uri').val();
        if (long_uri == '') {
            Notice({message: '長い URL を記入してください', target: dialog.find('.long_uri')});
            return;
        }
        var uri;
        try {
            uri = long_uri.parseURI();
        } catch (e) {
            Notice({message: '長い URL の形式に誤りがあります', target: dialog.find('.long_uri')});
            return;
        }
        OpenURI(long_uri);
    });
    dialog.find('.open_short_uri').click(function(e) {
        var short_uri = dialog.find('.short_uri').val();
        if (short_uri == '') {
            Notice({message: '短い URL が作成されていません。【短縮する】ボタンをクリックしてください', target: dialog.find('.short_uri')});
            return;
        }
        OpenURI(short_uri);
    });
    dialog.find('button.uniqueify').click(function(e) {
        try {
            DialogUniqueifyURI(dialog, phone_book, on_ok);
        } catch (e) {
            if (e.target) {
                Notice(e);
            } else {
                noty({text: e.message, layout: 'topRight', type: 'error'});
            }
            return;
        }
        localStorage.setItem('uniqueify_long_uri', dialog.find('.long_uri').val());
    });
    dialog.find('.button_copy').click(function(e) {
        if (phone_book) {
            if (Clipboard.copy('${URL}')) {
                noty({text: 'URL のスロット文字列をクリップボードにコピーしました', layout: 'topRight', type: 'success'});
            } else {
                noty({text: 'このブラウザはクリップボードへのコピーができません', layout: 'topRight', type: 'error'});
                return;
            }
        } else {
            var short_uri = dialog.find('.short_uri').val();
            if (short_uri == '') {
                Notice({message: '【短縮する】ボタンをクリックして短い URL を作ってください', target: dialog.find('button.uniqueify')});
                return;
            }
            if (Clipboard.copy(short_uri)) {
                noty({text: '短い URL をクリップボードにコピーしました', layout: 'topRight', type: 'success'});
                if (on_ok) {
                    on_ok(dialog._job, dialog._uri, dialog._identifier);
                }
                dialog.find('.panel-remove').trigger('click');
            } else {
                noty({text: 'このブラウザはクリップボードへのコピーができません', layout: 'topRight', type: 'error'});
                return;
            }
        }
    });
    dialog.find('.button_paste').click(function(e) {
        var text = textarea.val();
        var curpos = textarea.getCursorPosition();
        var short_uri;
        if (phone_book) {
            short_uri = '${URL}';
        } else {
            short_uri = dialog.find('.short_uri').val();
            if (short_uri == '') {
                Notice({message: '【短縮する】ボタンをクリックして短い URL を作ってください', target: dialog.find('button.uniqueify')});
                return;
            }
        }
        var before = text.slice(0, curpos);
        var after = text.slice(curpos);
        if (!before.match(/[ \n]$/) && 0 < before.length) {
            short_uri = (' ' + short_uri);
        }
        if (!after.match(/^[ \n]/) && 0 < after.length) {
            short_uri += ' ';
        }
        textarea.val(before + short_uri + after);
        textarea.selectRange(curpos + short_uri.length);
        textarea.trigger('change');
        if (phone_book == undefined) {
            if (on_ok) {
                on_ok(dialog._job, dialog._uri, dialog._identifier);
            }
            dialog.find('.panel-remove').trigger('click');
        }
    });
    dialog.find('.button_cancel').click(function(e) {
        if (on_cancel) {
            on_cancel();
        }
        dialog.find('.panel-remove').trigger('click');
    });
    dialog.ShowModeless({css: {top: textarea.offset().top - dialog.outerHeight() - 16 + 'px'}});
}

function DialogUniqueifyURI(dialog, phone_book, on_ok) {
    var long_uri = dialog.find('.long_uri');
    var short_uri = dialog.find('.short_uri');
    if (long_uri.val() == '') {
        throw {message: '長い URL を記入してください', target: long_uri};
    }
    var uri;
    try {
        uri = long_uri.val().parseURI();
    } catch (e) {
        throw {message: '長い URL の形式に誤りがあります', target: long_uri};
    }
    var uri_base = uri.buildBase();
    var uri_ext = uri.buildExtension();
    var identifier;
    var identifier_value;
    if (phone_book) {
        identifier = dialog.find('select.identifier');
        if (phone_book.rows.length == 0) {
            throw {message: '【' + phone_book.file_name + '】には宛先が一件も登録されていません', target: identifier};
        }
        identifier_value = phone_book.rows[0][identifier.val()];
    } else {
        identifier = dialog.find('input[type=text].identifier')
        if (identifier.val().match(/^[ 　]*$/)) {
            throw {message: '個人識別情報を記入してください', target: identifier};
        }
        identifier_value = identifier.val();
    }
    URI.open(
        uri,
        function(http_response_code, http_response_body) {
            var customer_user = User.getCurrent().getCustomerUser();
            var argv = {
                account: customer_user.account,
                password: customer_user.password,
                uri_base: uri_base,
                uri_ext: uri_ext,
                identifiers: [identifier_value]
            }
            var uniqueify_button_icon = dialog.find('button.uniqueify .fa');
            uniqueify_button_icon.addClass('fa-spin');
            CallAPI('./uniqueify_api/', 'POST', 'create_unique_uris', 7013, argv, {
                success: function(response) {
                    var destination_uri = uri.build();
                    var argv = {
                        account: customer_user.account,
                        password: customer_user.password,
                        destination_uri: destination_uri,
                        domain_id: -1,
                        long_uris: [response.uris[0].redirector_uri]
                    }
                    CallAPI('./shorten_api/', 'POST', 'shorten_uris', 7013, argv, {
                        success: function(response) {
                            dialog._job = response.job;
                            dialog._uri = response.uris[0];
                            dialog._identifier = identifier_value;
                            short_uri.val(response.short_uris[0]);
                            uniqueify_button_icon.removeClass('fa-spin');
                        },
                        error: function(response) {
                            noty({text: response.message, layout: 'topRight', type: 'error'});
                            uniqueify_button_icon.removeClass('fa-spin');
                        },
                        fatal: function(status, error) {
                            alert(status + ': ' + error);
                        }
                    });
                },
                error: function(response) {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                    uniqueify_button_icon.removeClass('fa-spin');
                },
                fatal: function(status, error) {
                    alert(status + ': ' + error);
                }
            });
        },
        function(message) {
            Notice({message: 'この URL は開けません<br>(' + message + ')', target: long_uri});
        }
    );
}

////////////////////////////////////////////////////////////////////////
// ■関数（一括送信）

function UpdatePhoneBook(phone_book, argv, on_success) {
    if (argv) {
        if (argv.tagsinput_api) {
            argv.tagsinput_api.removeTags();
        }
        if (argv.tagselect) {
            argv.tagselect.DestroySelectPicker();
            argv.tagselect.empty();
        }
    }
    var tags = [];
    for (var i = 0; i < phone_book.headers.length; i++) {
        var header = phone_book.headers[i];
        var label;
        var data;
        if (typeof header == 'string') {    // UploadTable で上げたもの（TODO: UploadTable のヘッダーを文字列配列からオブジェクト配列に変更するべき）
            label = header;
        } else {                            // DB から取り出したもの
            label = header.name;
            data = header;
        }
        tags.push({label: label, value: i + 1, data: data});
        if (argv && argv.tagselect) {
            argv.tagselect.append('<option value="' + i + '">' + phone_book.headers[i].name + '</option>');
        }
    }
    if (argv) {
        if (argv.tagsinput_api) {
            argv.tagsinput_api.addTags(tags);
            if (argv.body_textarea) {
                UpdateTagsSelection(argv.tagsinput_api, argv.body_textarea);
            }
        }
        if (argv.tagselect) {
            argv.tagselect.CreateSelectPicker();
        }
    }
    if (on_success) {
        on_success(phone_book);
    }
}

function UpdateTextareaByTagSelection(textarea, label, selected) {
    if (label.match(/^差込\d$/)) {
        label = label.slice(2);
    }
    var text = textarea.val();
    var slot = '${' + label + '}';
    var slot_pos = text.indexOf(slot);
    if (selected) {
        if (slot_pos == -1) {
            var cursor_pos = textarea.getCursorPosition();
            text = text.slice(0, cursor_pos) + slot + text.slice(cursor_pos);
            textarea.val(text);
        }
    } else {
        if (slot_pos != -1) {
            text = text.slice(0, slot_pos) + text.slice(slot_pos + slot.length);
            textarea.val(text);
            textarea.selectRange(slot_pos);
        }
    }
}

function UpdateTagsSelection(tagsinput_api, textarea, strict) {
    var unfilled_slot_labels = [];
    tagsinput_api.selectAllTags(false);
    var text = textarea.val();
    var m = text.match(/\$\{[^}]+\}/g);
    if (m == undefined) {
        if (strict) {
            return false;
        } else {
            return unfilled_slot_labels;
        }
    }
    for (var i = 0; i < m.length; i++) {
        var label = m[i].slice(2, -1);
        if (label.match(/^\d$/)) {
            label = '差込' + label;
        }
        var tag_index = tagsinput_api.selectTagByLabel(label, true);
        if (strict && tag_index == -1) {
            unfilled_slot_labels.push(label);
        }
    }
    return unfilled_slot_labels;
}

/*
差込と開封確認とメアド収集のスロットを埋めて、次のようなデータを作り、ValidateMessages に渡す
...,
...,
messages: [{
    no: 1,
    phone: phone_number,
    body: message_body
}]
*/
function CreateMessages(argv) {
    var template = argv.template;
    var phone_book = argv.phone_book;
    var headers = phone_book.headers;
    var rows = phone_book.rows;
    var identifier_column_index = argv.identifier_column_index;
    var uniqueifier_destination_uri = argv.uniqueifier_destination_uri;
    var mau_server_id = argv.mau_server_id;
    var send_checked = argv.send_checked;
    var header_label_to_index_map = {};
    for (var column_index = 0; column_index < headers.length; column_index++) {
        var header = headers[column_index];
        header_label_to_index_map[header.name] = column_index;
    }
    var messages = [];
    var identifiers = [];
    // 差込タグを置換しつつ個人識別情報の配列を作成しつつメッセージ本文を作成
    for (var message_index = 0; message_index < rows.length; message_index++) {
        var phone_book_entry = rows[message_index];
        if (send_checked && !phone_book_entry.checked) {
            continue;
        }
        var row = phone_book_entry.row;
        var phone = row[1].extractDigits();
        var body = template.replace(/\$\{[^}]+\}/g, function(slot) {
            var label = slot.slice(2, -1);
            if (label.match(/^\d$/)) {
                label = '差込' + label;
            }
            if (label == 'URL') {
                identifiers.push(row[identifier_column_index]);
                return slot;
            } else if (label == 'MAU') {
                identifiers.push(row[identifier_column_index]);
                return slot;
            }
            var column_index = header_label_to_index_map[label];
            var value = row[column_index];
            return value;
        });
        var message = {
            no: message_index + 1,
            phone: phone,
            body: body
        };
        messages.push(message);
    }
    argv.messages = messages;
    argv.identifiers = identifiers;
    if (identifiers.length == 0) {
        ValidateMessages(argv, function(argv) {ShowMessageDialog(argv)});
    } else if (uniqueifier_destination_uri) {
        UniqueifyURIs(argv);
    } else if (mau_server_id) {
        UniqueifyMailAddresses(argv);
    }
}

function UniqueifyURIs(argv) {
    var customer_user = User.getCurrent().getCustomerUser();
    var uniqueify_argv = {
        account: customer_user.account,
        password: customer_user.password,
        uri_base: argv.uniqueifier_destination_uri.buildBase(),
        uri_ext: argv.uniqueifier_destination_uri.buildExtension(),
        identifiers: argv.identifiers
    };
    var timeout = 7013 + 25 * argv.identifiers.length;
    var uniqueify_loader = new Loader();
    uniqueify_loader.show(timeout, {title: 'ユニーク URL 生成中...'});
    CallAPI('./uniqueify_api/', 'POST', 'create_unique_uris', timeout, uniqueify_argv, {
        success: function(response) {
            var long_uris = response.uris.map(function(uri) {return uri.redirector_uri;});
            var shorten_argv = {
                account: customer_user.account,
                password: customer_user.password,
                destination_uri: argv.uniqueifier_destination_uri.build(),
                domain_id: -1,
                long_uris: long_uris
            }
            uniqueify_loader.remove();
            var shorten_loader = new Loader();
            shorten_loader.show(timeout, {title: 'URL 短縮中...'});
            CallAPI('./shorten_api/', 'POST', 'shorten_uris', timeout, shorten_argv, {
                success: function(response) {
                    argv.shorten = response;
                    FillURISlots(argv);
                    shorten_loader.remove();
                },
                error: function(response) {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                    shorten_loader.remove();
                },
                fatal: function(status, error) {
                    alert(status + ': ' + error);
                    shorten_loader.remove();
                }
            });
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            uniqueify_loader.remove();
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
            uniqueify_loader.remove();
        }
    });
}

function FillURISlots(argv) {
    var short_uris = argv.shorten.short_uris;
    var uris = argv.shorten.uris;
    var identifiers = argv.identifiers;
    var messages = [];
    for (var message_index = 0; message_index < argv.messages.length; message_index++) {
        var body = argv.messages[message_index].body.replace(/\$\{URL\}/, function(slot) {
            return short_uris[message_index];
        });
        messages.push({
            no: argv.messages[message_index].no,
            phone: argv.messages[message_index].phone,
            body: body,
            shortener_uri_id: uris[message_index].id,
            identifier: identifiers[message_index]
        });
    }
    ValidateMessages({
        title: argv.title,
        messages: messages,
        shortener_job_id: argv.shorten.job.id
    }, function(argv) {ShowMessageDialog(argv)});
}

function UniqueifyMailAddresses(argv) {
    var timeout = 7013 + 25 * argv.identifiers.length;
    var mau_loader = new Loader();
    mau_loader.show(timeout, {title: 'ユニークメアド生成中...'});
    var mau_argv = {
        user_id: User.getCurrent().id,
        title: argv.title,
        server_id: argv.mau_server_id,
        identifiers: argv.identifiers
    };
    CallAPI('./mau_api/', 'POST', 'create_unique_mail_addresses', timeout, mau_argv, {
        success: function(response) {
            argv.mau = response;
            FillMAUSlots(argv);
            mau_loader.remove();
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            mau_loader.remove();
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
            mau_loader.remove();
        }
    });
}

function FillMAUSlots(argv) {
    var mail_addresses = argv.mau.mail_addresses;
    var messages = [];
    for (var message_index = 0; message_index < argv.messages.length; message_index++) {
        var body = argv.messages[message_index].body.replace(/\$\{MAU\}/, function(slot) {
            return mail_addresses[message_index].address;
        });
        messages.push({
            no: argv.messages[message_index].no,
            phone: argv.messages[message_index].phone,
            body: body,
            mau_address_id: mail_addresses[message_index].id
        });
    }
    ValidateMessages({
        title: argv.title,
        messages: messages,
        mau_job_id: argv.mau.job.id
    }, function(argv) {ShowMessageDialog(argv)});
}

////////////////////////////////////////////////////////////////////////
// ■関数（メアド収集）

function LoadMAUServers(select) {
    var argv = {
        user_id: User.getCurrent().id
    };
    CallAPI('./mau_api/', 'POST', 'load_servers', 7013, argv, {
        success: function(response) {
            select.DestroySelectPicker();
            select.empty();
            for (var i = 0; i < response.servers.length; i++) {
                var server = response.servers[i];
                select.append('<option value="' + server.id + '">' + server.fqdn + '</option>');
            }
            select.CreateSelectPicker();
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■関数（電話帳送信）

function LoadPhoneBooks(on_success, on_end) {
    CallAPI('./sms_api/', 'POST', 'load_phone_books', 7013, {}, {
        success: function(response) {
            response.users = response.users.map(function(user) {
                user.phone_books = user.phone_books.map(function(phone_book) {
                    return new PhoneBook(phone_book);
                });
                return user;
            });
            on_success(response.users);
            if (on_end) {
                on_end();
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            if (on_end) {
                on_end();
            }
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
            if (on_end) {
                on_end();
            }
        }
    });
}

// テンプレートと違いデータの件数が万単位なので予め全ユーザーの全電話帳の全エントリーをロードするのは無理
function LoadPhoneBookEntries(phone_book, on_success) {
    CallAPI('./sms_api/', 'POST', 'load_phone_book', 7013, {phone_book_id: phone_book.id}, {
        success: function(response) {
            response.phone_book = new PhoneBook(response.phone_book);
            response.phone_book.rows = response.phone_book.rows.map(function(row) {return new PhoneBookEntry(row)});
            on_success(response.phone_book);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■関数（開封確認ログ）

// 開封確認のログデータを取得
function LoadUniqueifyLogs(from, to, on_success) {
    var customer_user = User.getCurrent().getCustomerUser();
    var argv = {
        account: customer_user.account,
        password: customer_user.password,
        from: from,
        to: to
    };
    CallAPI('./shorten_api/', 'POST', 'load_logs', 7013, argv, {
        success: function(response) {
            try {
                BuildUniqueifyJobs(response.jobs, response.logs, on_success);
            } catch (e) {
                if (typeof e == 'string') {
                    noty({text: e, layout: 'topRight', type: 'error'});
                } else {
                    console.log(e);
                    alert('unknown exception');
                }
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// job -> uri -> log の木構造を作る
function BuildUniqueifyJobs(jobs, logs, on_success) {
    var job_id_to_job_map = {};
    jobs = jobs.map(function(job_) {
        var job = new ShortenJob(job_);
        job.uri_id_to_uri_map = {};
        job.uris = [];
        job_id_to_job_map[job.id] = job;
        return job;
    });
    logs.map(function(log_) {
        if (log_.job_id == undefined || log_.job_id == -1) {
            //throw 'あれ？';   古いデータにはこの状態のものがある。無用の混乱を避けるためにエラーを隠す
            return;
        }
        var job = job_id_to_job_map[log_.job_id];
        if (job == undefined) {
            throw 'おや？';
            return;
        }
        var uri = job.uri_id_to_uri_map[log_.uri_id];
        if (uri == undefined) {
            if (log_.long_uri == job.destination_uri) {
                return;                                 // job.destination_uri と uri.long_uri が同じものは単なる短縮であり、開封確認ではない。
            }
            uri = new ShortenURI({
                id: log_.uri_id,
                long_uri: log_.long_uri,
                short_id: log_.short_id,
                short_uri: log_.short_uri,
                updated_at: log_.updated_at,
                uri_base: log_.uri_base
            });
            uri.logs = [];
            job.uri_id_to_uri_map[uri.id] = uri;
            job.uris.push(uri);
        }
        var log = new ShortenLog({
            view_count: log_.view_count,
            view_time: log_.view_time
        });
        uri.logs.push(log);
    });
    // 開封確認の uri を一つも持たないジョブを削除
    var jobs_ = [];
    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        if (0 < job.uris.length) {
            jobs_.push(job);
        }
    }
    jobs = jobs_;
    // job と uri のデータから、各 uri に対応する identifier を取得
    var argv = {
        jobs: []
    };
    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        argv.jobs.push({
            shortener_job_id: job.id,
            shortener_uri_ids: job.uris.map(function(uri) {return uri.id})
        });
    }
    CallAPI('./sms_api/', 'POST', 'load_identifiers', 7013, argv, {
        success: function(response) {
            on_success(jobs, response.identifier_array_array);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

function ShowUniqueifyURIDialog(job) {
    $('.uniqueify_uri_dialog:visible').remove();
    var dialog = $('.uniqueify_uri_dialog').CreateDialog({
        container: $('.page-content')
    });
    dialog._uris = job.uris;
    dialog._uri_order = [{column: 3, dir: 'desc'}];
    SortUniqueifyURIs(dialog);
    dialog.find('.destination_uri').html(job.destination_uri);
    var table = $(
'<table class="table table-striped table-hover">' +
    '<thead>' +
        '<tr>' +
            '<th>短縮 URL</th>' +
            '<th>個人識別情報</th>' +
            '<th>最終転送日</th>' +
            '<th class="view_count">転送数</th>' +
        '</tr>' +
    '</thead>' +
'</table>'
);
    var container = dialog.find('.uniqueify_uri_table_container');
    container.empty();
    container.append(table);
    dialog._datatable_api = table.DataTable({
        aLengthMenu: [10, 25, 50, 100, 250, 500, 1000],
        oLanguage: {
            sLengthMenu: '_MENU_ 行表示',
            sSearch: '<span class="fa fa-search"></span>',
            oPaginate: {
                sNext: '<span class="fa fa-step-forward"></span>',
                sPrevious: '<span class="fa fa-step-backward"></span>'
            },
            sInfo: '全 _TOTAL_ 件中 _START_ から _END_ まで',
            sInfoEmpty: '全 0 件中 0 から 0 まで',
            sInfoFiltered: '(全数 _MAX_ から抽出)',
            sZeroRecords: 'マッチするレコードがありません'
        },
        order: [[3, 'desc']],
        serverSide: true,
        ordering: true,
        searching: true,
        ajax: function(data, callback, settings) {
            SortUniqueifyURIs(dialog, data.order);
            var rows = [];
            var filtered_count;
            var end = data.start + data.length;
            if (0 < data.search.value.length) {
                filtered_count = 0;
                for (var index = data.start; index < end && index < dialog._uris.length; index++) {
                    var uri = dialog._uris[index];
                    if (data.start <= filtered_count && filtered_count < end) {
                        if (FindUniqueifyURIString(uri, data.search.value)) {
                            rows.push(CreateUniqueifyURIRow(index, uri));
                        }
                    }
                    filtered_count++;
                }
            } else {
                for (var index = data.start; index < end && index < dialog._uris.length; index++) {
                    var uri = dialog._uris[index];
                    var row = CreateUniqueifyURIRow(index, uri);
                    rows.push(row);
                }
                filtered_count = dialog._uris.length;
            }
            callback({
                draw: data.draw,
                data: rows,
                recordsTotal: dialog._uris.length,
                recordsFiltered: filtered_count
            });
        },
        drawCallback: function() {
        }
    });
    dialog.find('.button_download').click(function(e) {
        DownloadUniqueifyURILog(dialog);
    });
    dialog.ShowModeless();
}

function SortUniqueifyURIs(dialog, order) {
    var uris = dialog._uris;
    var uri_order = dialog._uri_order;
    var do_sort = false;
    if (order == undefined) {
        do_sort = true;
    } else if (0 < order.length) {
        if (uri_order[0].column == order[0].column) {
            if (uri_order[0].dir == order[0].dir) {
            } else {
                do_sort = true;
                uri_order[0].dir =  order[0].dir;
            }
        } else {
            do_sort = true;
            var uri_order = [];
            uri_order.push(order[0]);
            for (var i = 0; i < uri_order.length; i++) {
                if (uri_order[i].column != order[0].column) {
                    uri_order.push(uri_order[i]);
                }
            }
            uri_order = uri_order;
        }
    }
    if (!do_sort) {
        return;
    }
    uris.sort(function(uri1, uri2) {
        for (var i = 0; i < uri_order.length; i++) {
            var by = uri_order[i];
            var value1, value2;
            if (by.column == 0) {
                value1 = uri1.short_uri;
                value2 = uri2.short_uri;
            } else if (by.column == 1) {
                value1 = uri1.identifier;
                value2 = uri2.identifier;
            } else if (by.column == 2) {
                value1 = uri1.getLastViewDate();
                value2 = uri2.getLastViewDate();
            } else if (by.column == 3) {
                value1 = uri1.getViewCount();
                value2 = uri2.getViewCount();
            } else {
                value1 = 1;
                value2 = 1;
            }
            if (value1 != value2) {
                var uri1_younger = value1 < value2;
                if (by.dir == 'desc') {
                    uri1_younger = !uri1_younger;
                }
                return uri1_younger ? -1 : 1;
            }
        }
        return 0;
    });
}

function FindUniqueifyURIString(uri, str) {
    if (uri.short_uri.indexOf(str) != -1) {
        return true;
    } else if (uri.getIdentifierString().indexOf(str) != -1) {
        return true;
    }
    return false;
}

function CreateUniqueifyURIRow(index, uri) {
    var identifier = uri.getIdentifierString();
    var identifier_title;
    if (identifier == '') {
        identifier = '&nbsp';
        identifier_title = ' title="2018年8月10日以前に作成された短縮 URL では、このデータは表示されない可能性があります"';
    } else {
        identifier_title = '';
    }
    try {
        var row = [];
        row.push('<div class="short_uri">' + uri.short_uri + '</div>');
        row.push('<div class="identifier"' + identifier_title + '>' + identifier + '</div>');
        row.push('<div class="last_view_date">' + uri.getLastViewDate() + '</div>');
        row.push('<div class="view_count">' + uri.getViewCount() + '</div>');
        return row;
    } catch (e) {
        console.log(e);
    }
}

function DownloadUniqueifyURILog(dialog) {
    var loader = new Loader();
    loader.show(-1, {title: 'ダウンロード中...'});
    var destination_fqdn = dialog.find('.destination_uri').html().parseURI().fqdn;
    var date_from = $('#view_date_from').val();
    var date_to = $('#view_date_to').val();
    var table = {
        file_name: '個人別転送数_' + destination_fqdn + '_' + date_from + '_' + date_to,
        head: ['短縮 URL', '個人識別情報', '最終転送日', '転送数'],
        body: []
    };
    var uris = dialog._uris;
    for (var i = 0; i < uris.length; i++) {
        var uri = uris[i];
        table.body.push([uri.short_uri, uri.identifier, uri.getLastViewDate(), uri.getViewCount()]);
    }
    DownloadTable(table);
    dialog.find('.panel-remove').trigger('click');
    loader.remove();
}

////////////////////////////////////////////////////////////////////////
// ■関数（開封確認日別転送ログ棒グラフダイアログ）

function ShowUniqueifyChartDialog(job) {
    $('.uniqueify_chart_dialog:visible').remove();
    var dialog = $('.uniqueify_chart_dialog').CreateDialog({
        container: $('.page-content')
    });
    dialog.find('.destination_uri').html(job.destination_uri);
    var bars = {};
    var uris = job.uris;
    for (var i = 0; i < uris.length; i++) {
        var logs = uris[i].logs;
        for (var j = 0; j < logs.length; j++) {
            var log = logs[j];
            var view_date = log.getViewDate();
            if (bars[view_date] == undefined) {
                bars[view_date] = 0;
            }
            bars[view_date] += log.getViewCount();
        }
    }
    // グラフのデータを作成する
    var date = new Date($('#view_date_from').val());
    var date_to = new Date($('#view_date_to').val());
    var data = [];
    var prev_month;
    for (; date.getTime() <= date_to.getTime(); ) {
        var date_string = date.format('YYYY-mm-dd');
        var y = bars[date_string];
        if (y == undefined) {
            y = 0;
        }
        var x;
/*
        if (prev_month == date.getMonth()) {
            x = date.getDate();
        } else {
            x = (date.getMonth() + 1) + '/' + date.getDate();
        }
*/
        x = (date.getMonth() + 1) + '/' + date.getDate();
        data.push({x: x, y: y});
        prev_month = date.getMonth();
        date.setDate(date.getDate() + 1);
    }
    // グラフを作成する
    var container = dialog.find('.uniqueify_chart_container');
    container.prop('id', 'uniqueify_chart_container');
    container.empty();
    dialog.css({display: 'block'});
    container.css({
        height: Math.floor((dialog.parent().height() - dialog.outerHeight()) * 0.8)
    });
    Morris.Bar({
        element: 'uniqueify_chart_container',
        data: data,
        xkey: 'x',
        ykeys: ['y'],
        gridIntegers: true,
        ymin: 0,
        labels: ['転送数'],
        xLabelMargin: 2,
        barColors: ['#B64645']
    });
    //var hover = container.find('.morris-hover');
    //hover.remove();
    // x 軸のラベルは密度が高いと間引かれるので、「ある月の（表示される）最初の日である」ことを知るには表示されてから調べるしかない。そして順序は期待と逆（右が先）
    // 以下は「月の最初の日だけ月の数字を付けて色を変える」処理
    var xlabels = [];
    container.find('text tspan').each(function(i, o) {
        var html = $(o).html();
        var slash_pos = html.indexOf('/');
        if (slash_pos != -1) {
            xlabels.push({month: html.slice(0, slash_pos), date: html.slice(slash_pos + 1)});
        }
    });
    var prev_month;
    for (var i = xlabels.length - 1; 0 <= i; i--) {
        var xlabel = xlabels[i];
        if (prev_month == undefined || xlabel.month != prev_month) {
            xlabel.first_label_of_the_month = true;
        }
        prev_month = xlabel.month;
    }
    var xlabel_pos = 0;
    container.find('text tspan').each(function(i, o) {
        var html = $(o).html();
        var slash_pos = html.indexOf('/');
        if (slash_pos != -1) {
            var xlabel = xlabels[xlabel_pos++];
            if (xlabel.first_label_of_the_month) {
                $(o).html(xlabel.month + '/' + xlabel.date);
                $(o).css({
                    'font-weight': 'bold'
                });
                $(o).parent().attr('fill', '#ff0000');
            } else {
                $(o).html(xlabel.date);
                //$(o).parent().attr('fill', '#666666');
            }
        }
    });
    dialog.ShowModeless();
}

////////////////////////////////////////////////////////////////////////
// ■関数（短縮ログ）

// 開封確認のログデータを取得
function LoadShortenLogs(from, to, on_success) {
    var customer_user = User.getCurrent().getCustomerUser();
    var argv = {
        account: customer_user.account,
        password: customer_user.password,
        from: from,
        to: to
    };
    CallAPI('./shorten_api/', 'POST', 'load_logs', 7013, argv, {
        success: function(response) {
            try {
                BuildShortenJobs(response.jobs, response.logs, on_success);
            } catch (e) {
                if (typeof e == 'string') {
                    noty({text: e, layout: 'topRight', type: 'error'});
                } else {
                    console.log(e);
                    alert('unknown exception');
                }
            }
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            alert(status + ': ' + error);
        }
    });
}

// job -> uri -> log の木構造を作る
function BuildShortenJobs(jobs, logs, on_success) {
    var job_id_to_job_map = {};
    jobs = jobs.map(function(job_) {
        var job = new ShortenJob(job_);
        job.uri_id_to_uri_map = {};
        job.uris = [];
        job_id_to_job_map[job.id] = job;
        return job;
    });
    logs.map(function(log_) {
        if (log_.job_id == undefined || log_.job_id == -1) {
            //throw 'あれ？';   古いデータにはこの状態のものがある。無用の混乱を避けるためにエラーを隠す
            return;
        }
        var job = job_id_to_job_map[log_.job_id];
        if (job == undefined) {
            throw 'おや？';
            return;
        }
        var uri = job.uri_id_to_uri_map[log_.uri_id];
        if (uri == undefined) {
            if (log_.long_uri != job.destination_uri) {
                return;                                 // job.destination_uri と uri.long_uri が異なるものは開封確認であり単なる短縮ではない
            }
            uri = new ShortenURI({
                id: log_.uri_id,
                long_uri: log_.long_uri,
                short_id: log_.short_id,
                short_uri: log_.short_uri,
                updated_at: log_.updated_at,
                uri_base: log_.uri_base
            });
            uri.logs = [];
            job.uri_id_to_uri_map[uri.id] = uri;
            job.uris.push(uri);
        }
        var log = new ShortenLog({
            view_count: log_.view_count,
            view_time: log_.view_time
        });
        uri.logs.push(log);
    });
    // 短縮の uri を一つも持たないジョブを削除
    var jobs_ = [];
    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        if (0 < job.uris.length) {
            jobs_.push(job);
        }
    }
    jobs = jobs_;
    on_success(jobs);
}

////////////////////////////////////////////////////////////////////////
// ■関数（短縮ログ日別転送数棒グラフダイアログ）

function ShowShortenChartDialog(job) {
    $('.shorten_chart_dialog:visible').remove();
    var dialog = $('.shorten_chart_dialog').CreateDialog({
        container: $('.page-content')
    });
    dialog.find('.destination_uri').html(job.destination_uri);
    var bars = {};
    var uris = job.uris;
    for (var i = 0; i < uris.length; i++) {
        var logs = uris[i].logs;
        for (var j = 0; j < logs.length; j++) {
            var log = logs[j];
            var view_date = log.getViewDate();
            if (bars[view_date] == undefined) {
                bars[view_date] = 0;
            }
            bars[view_date] += log.getViewCount();
        }
    }
    // グラフのデータを作成する
    var date = new Date($('#view_date_from').val());
    var date_to = new Date($('#view_date_to').val());
    var data = [];
    var prev_month;
    for (; date.getTime() <= date_to.getTime(); ) {
        var date_string = date.format('YYYY-mm-dd');
        var y = bars[date_string];
        if (y == undefined) {
            y = 0;
        }
        var x;
/*
        if (prev_month == date.getMonth()) {
            x = date.getDate();
        } else {
            x = (date.getMonth() + 1) + '/' + date.getDate();
        }
*/
        x = (date.getMonth() + 1) + '/' + date.getDate();
        data.push({x: x, y: y});
        prev_month = date.getMonth();
        date.setDate(date.getDate() + 1);
    }
    // グラフを作成する
    var container = dialog.find('.shorten_chart_container');
    container.prop('id', 'shorten_chart_container');
    container.empty();
    dialog.css({display: 'block'});
    container.css({
        height: Math.floor((dialog.parent().height() - dialog.outerHeight()) * 0.8)
    });
    Morris.Bar({
        element: 'shorten_chart_container',
        data: data,
        xkey: 'x',
        ykeys: ['y'],
        gridIntegers: true,
        ymin: 0,
        labels: ['転送数'],
        xLabelMargin: 2,
        barColors: ['#B64645']
    });
    //var hover = container.find('.morris-hover');
    //hover.remove();
    // x 軸のラベルは密度が高いと間引かれるので、「ある月の（表示される）最初の日である」ことを知るには表示されてから調べるしかない。そして順序は期待と逆（右が先）
    // 以下は「月の最初の日だけ月の数字を付けて色を変える」処理
    var xlabels = [];
    container.find('text tspan').each(function(i, o) {
        var html = $(o).html();
        var slash_pos = html.indexOf('/');
        if (slash_pos != -1) {
            xlabels.push({month: html.slice(0, slash_pos), date: html.slice(slash_pos + 1)});
        }
    });
    var prev_month;
    for (var i = xlabels.length - 1; 0 <= i; i--) {
        var xlabel = xlabels[i];
        if (prev_month == undefined || xlabel.month != prev_month) {
            xlabel.first_label_of_the_month = true;
        }
        prev_month = xlabel.month;
    }
    var xlabel_pos = 0;
    container.find('text tspan').each(function(i, o) {
        var html = $(o).html();
        var slash_pos = html.indexOf('/');
        if (slash_pos != -1) {
            var xlabel = xlabels[xlabel_pos++];
            if (xlabel.first_label_of_the_month) {
                $(o).html(xlabel.month + '/' + xlabel.date);
                $(o).css({
                    'font-weight': 'bold'
                });
                $(o).parent().attr('fill', '#ff0000');
            } else {
                $(o).html(xlabel.date);
                //$(o).parent().attr('fill', '#666666');
            }
        }
    });
    dialog.ShowModeless();
}

////////////////////////////////////////////////////////////////////////
// ■関数（電話帳メンテナンス）

function DownloadPhoneBook(phone_book) {
    var user = User.getCurrent();
    var form = $(
'<form action="./sms_api/" method="post">' +
    '<input type="hidden" name="account" value="' + user.account + '"/>' +
    '<input type="hidden" name="password" value="' + user.password + '"/>' +
    '<input type="hidden" name="command" value="download_phone_book"/>' +
    '<input type="hidden" name="phone_book_id" value="' + phone_book.id + '"/>' +
'</form>'
);
    $('body').prepend(form);
    form.submit();
    form.remove();
}

function ShowPhoneBookDialog(phone_book, argv) {
    $('#phone_book_dialog').remove();
    // 電話帳データを作成
    if (phone_book == undefined) {
        phone_book = new PhoneBook();
    }
    // ダイアログを作成
    var type;
    var title;
    if (phone_book.user_id == User.getCurrent().id) {
        if (phone_book.isNew()) {
            type = 'panel-success';
        } else {
            type = 'panel-warning';
        }
        title = phone_book.name + '（編集）';
    } else {
        type = 'panel-info';
        title = phone_book.name + '（参照のみ）';
    }
    var dialog = $('.phone_book_dialog').CreateDialog({
        container: $('.page-content'),
        type: type,
        title: title,
        on_remove: (argv && argv.on_remove) ? argv.on_remove : null
    });
    dialog.prop('id', 'phone_book_dialog');
    if (argv && argv.animate != undefined && !argv.animate) {
        dialog.removeClass('animated');
    }
    if (argv && argv.enable_select) {
        dialog.find('.button_select').removeClass('hidden');
        dialog.find('.editor_control').addClass('hidden');
    }
    dialog._phone_book = phone_book;
    dialog._name_changed = false;
    dialog._permission_changed = phone_book.isNew() ? true : false;
    dialog._content_changed = false;                                    // 名前しか変えてないときエントリー全取っ替えは流石に酷すぎるんじゃないかと
    // 電話帳名設定
    dialog.find('.name').val(phone_book.name);
    // 参照権チェックボックス作成
    var current_user = User.getCurrent();
    var permissions = dialog.find('.permissions');
    permissions.empty();
    var all_checked = false;
    var checkbox_wrap = $('<span class="checkbox_wrap"><input type="checkbox" class="checkbox all" company_user_id="' + current_user.customer.user_id + '"/><span class="checkbox_label">組織全体</span></span>\n');
    if (phone_book.allow_user_ids.findIndex(function(allow_user_id) {return allow_user_id == current_user.customer.user_id}) != -1) {
        checkbox_wrap.find('input[type=checkbox]').prop('checked', true);
        all_checked = true;
    }
    permissions.append(checkbox_wrap);
    var departments = current_user.customer.departments;
    for (var i = 0; i < departments.length; i++) {
        var department = departments[i];
        checkbox_wrap = $('<span class="checkbox_wrap"><input type="checkbox" class="checkbox department" department_id="' + department.id + '"/><span class="checkbox_label">' + department.name + '</span></span>\n');
        if (!all_checked && phone_book.allow_department_ids.findIndex(function(allow_department_id) {return allow_department_id == department.id}) != -1) {
            checkbox_wrap.find('input[type=checkbox]').prop('checked', true);
        }
        permissions.append(checkbox_wrap);
    }
    var child_users = current_user.customer.child_users;
    for (var i = 0; i < child_users.length; i++) {
        var child_user = child_users[i];
        checkbox_wrap = $('<span class="checkbox_wrap"><input type="checkbox" class="checkbox child_user" child_user_id="' + child_user.id + '"/><span class="checkbox_label">' + child_user.name + '</span></span>\n');
        if (!all_checked && phone_book.allow_user_ids.findIndex(function(allow_user_id) {return allow_user_id == child_user.id}) != -1) {
            checkbox_wrap.find('input[type=checkbox]').prop('checked', true);
        }
        permissions.append(checkbox_wrap);
    }
    permissions.find('.checkbox_wrap').click(function(e) {
        $(e.currentTarget).find('input[type=checkbox]').trigger('click');
    });
    permissions.find('.checkbox_wrap input[type=checkbox].all').click(function(e) {
        e.stopPropagation();
        dialog._permission_changed = true;
        if ($(e.currentTarget).prop('checked')) {
            permissions.find('.checkbox_wrap input[type=checkbox]:not(.all)').prop('checked', false);   //「組織全体」にチェックが付けられたた「組織全体」以外のチェックを外す
        }
    });
    permissions.find('.checkbox_wrap input[type=checkbox]:not(.all)').click(function(e) {
        dialog._permission_changed = true;
        e.stopPropagation();
        if ($(e.currentTarget).prop('checked')) {
            permissions.find('.checkbox_wrap input[type=checkbox].all').prop('checked', false);         //「組織全体」以外のどれかにチェックが付けられたら「組織全体」のチェックを外す
        }
    });
    // タグリスト作成
    var tags = [];
    for (var tag_name_index = 0; tag_name_index < phone_book.headers.length; tag_name_index++) {
        var tag_name = phone_book.headers[tag_name_index];
        tags.push({label: tag_name.name, value: tag_name_index, data: tag_name});
    }
    dialog._tagsinput_api = dialog.find('.tags').CreateTagsInput({
        onAdd: function(index, label) {
            return {
                value: index,
                onAdded: function() {
                    AddPhoneBookTag(dialog, index, label);
                }
            };
        },
        onRemove: function(index, label, value, tag_data) {
            RemoveAllNotices();
            if (tag_data && tag_data.data && tag_data.data.type == 'required') {
                Notice({message: '【' + label + '】は削除できません', target: dialog.find('.tags').parent()});
            } else {
                ConfirmDeletePhoneBookTag(dialog, index, label, value, tag_data);
            }
            return false;
        },
        onSelect: function(index, label, value, selected) {
            return false;
        }
    }, tags);
    // 電話帳エントリーをソート
    dialog._row_order = [{column: 0, dir: 'asc'}];
    SortPhoneBookEntries(dialog);
    // 電話帳エントリーテーブル作成
    BuildPhoneBookEntryTable(dialog);
    // ハンドラーをセット
    dialog.find('.button_renumber').click(function(e) {
        RenumberPhoneBookEntries(dialog);
    });
    dialog.find('.button_delete').click(function(e) {
        DeletePhoneBookEntries(dialog);
    });
    dialog.find('.button_create').click(function(e) {
        CreatePhoneBookEntry(dialog);
    });
    dialog.find('.button_upload').click(function(e) {
        ShowPhoneBookUploadDialog(dialog);
    });
    dialog.find('.button_download').click(function(e) {
        DownloadTable({
            file_name: dialog._phone_book.name,
            head: dialog._phone_book.headers.map(function(header) {return header.name}),
            body: dialog._phone_book.rows.map(function(phone_book_entry) {return phone_book_entry.row})
        });
    });
    dialog.find('.button_ok').click(function(e) {
        OnPhoneBookOkClicked(dialog, (argv && argv.on_ok) ? argv.on_ok : null);
    });
    dialog.find('.button_select').click(function(e) {
        argv.on_selected(dialog);
    });
    // ローダーを削除
    if (argv && argv.loader) {
        argv.loader.remove();
    }
    // ダイアログを表示
    dialog.ShowModeless();
    TileCheckboxes(permissions);
    return dialog;
}

// 電話帳エントリーテーブル作成
function BuildPhoneBookEntryTable(dialog, on_initialized) {
    var phone_book = dialog._phone_book;
    var table = $(
'<table id="phone_book_entry_table" class="table table-striped table-hover">\n' +
    '<thead>\n' +
        '<tr>\n' +
        '</tr>\n' +
    '</thead>\n' +
'</table>\n'
);
    var thead_tr = table.find('thead tr');
    var headers = phone_book.headers;
    for (var tag_name_index = 0; tag_name_index < headers.length; tag_name_index++) {
        var tag_name = headers[tag_name_index];
        var th = $('<th tag_name_index="' + tag_name_index + '"></th>\n');
        if (tag_name_index == 0) {
            th.html('<input type="checkbox" class="checkbox"/> <span class="checkbox_label">' + tag_name.name + '</span>');
            th.find('.checkbox_label').click(function(e) {
                e.stopPropagation();
                $(e.currentTarget).parent().find('.checkbox').trigger('click');
            });
            th.find('.checkbox').click(function(e) {
                e.stopPropagation();
                UpdateAllPhoneBookEntryChecks(dialog, $(e.currentTarget));
            });
        } else {
            th.html(tag_name.name);
        }
        thead_tr.append(th);
    }
    var container = dialog.find('.phone_book_entry_table_container');
    container.empty();
    container.append(table);
    dialog._phone_book_entry_table_api = table.DataTable({
        aLengthMenu: [10, 25, 50, 100, 250, 500, 1000],
        oLanguage: {
            sLengthMenu: '_MENU_ 行表示',
            sSearch: '<span class="fa fa-search"></span>',
            oPaginate: {
                sNext: '<span class="fa fa-step-forward"></span>',
                sPrevious: '<span class="fa fa-step-backward"></span>'
            },
            sInfo: '全 _TOTAL_ 件中 _START_ から _END_ まで',
            sInfoEmpty: '全 0 件中 0 から 0 まで',
            sInfoFiltered: '(全数 _MAX_ から抽出)',
            sZeroRecords: 'マッチするレコードがありません'
        },
        order: [[0, 'asc']],
        serverSide: true,
        ordering: true,
        searching: true,
        initComplete: function() {
            table.css('width', '100%');
            table.after('<div style="clear: both;"></div>');
            if (on_initialized) {
                on_initialized();
            }
        },
        ajax: function(data, callback, settings) {
            SortPhoneBookEntries(dialog, data.order);
            var rows = [];
            var filtered_count;
            var end = data.start + data.length;
            if (0 < data.search.value.length) {
                filtered_count = 0;
                for (var index = data.start; index < end && index < phone_book.rows.length; index++) {
                    var phone_book_entry = phone_book.rows[index];
                    if (data.start <= filtered_count && filtered_count < end) {
/*
                        if (phone_book_entry.hasString(data.search.value)) {
                            rows.push(CreatePhoneBookEntryRow(dialog, index, phone_book_entry));
                        }
*/
                    }
                    filtered_count++;
                }
            } else {
                for (var index = data.start; index < end && index < phone_book.rows.length; index++) {
                    var phone_book_entry = phone_book.rows[index];
                    rows.push(CreatePhoneBookEntryRow(dialog, index, phone_book_entry));
                }
                filtered_count = phone_book.rows.length;
            }
            callback({
                draw: data.draw,
                data: rows,
                recordsTotal: phone_book.rows.length,
                recordsFiltered: filtered_count
            });
        },
        drawCallback: function() {
            table.css('width', container.width() + 'px');   // 高さがウィンドウの高さを超えるとスクロールバーができてコンテナの幅が小さくなる。が、放置すると table は幅が広いまま
            table.find('tbody tr input[type=checkbox]').click(function(e) {
                e.stopPropagation();
                UpdatePhoneBookEntryCheck(dialog, $(e.currentTarget));
            });
            if (dialog.hasClass('no_edit')) {
                table.find('tbody tr td [tag_index]').click(function(e) {
                    e.stopPropagation();
                    var div = $(e.currentTarget);
                    var tr = div.parents('tr');
                    var checkbox = tr.find('input[type=checkbox]');
                    var tag_index = div.attr('tag_index');
                    if (tag_index < 1) {
                        checkbox.trigger('click');
                    } else {
                        var phone_book_entry_index = checkbox.attr('phone_book_entry_index');
                        UpdatePhoneBookEntryChecksByCellValue(dialog, table, phone_book_entry_index, tag_index, !checkbox.prop('checked'));
                    }
                });
            } else {
                table.find('tbody tr').click(function(e) {
                    $(e.currentTarget).find('input[type=checkbox]').trigger('click');
                });
                table.find('tbody tr td .edit').click(function(e) {
                    e.stopPropagation();
                    OnPhoneBookEntryCellEditButtonClicked(dialog, $(e.currentTarget));
                });
            }
            //【保存】ボタンクリック時のテーブルセル内容正当性チェックにおいて現在表示されていないページのセルにエラーを発見した場合、先に表示ページを変更し、描画が終わったあとで実行すべき処理を dialog._phone_book_entry_table_api._on_drawn に無名関数としてセットしておく
            if (dialog._phone_book_entry_table_api && dialog._phone_book_entry_table_api._on_drawn) {
                dialog._phone_book_entry_table_api._on_drawn();     // それを実行する
                delete dialog._phone_book_entry_table_api._on_drawn;
            }
        }
    });
}

function SortPhoneBookEntries(dialog, order) {
    var do_sort = false;
    if (order == undefined) {
        do_sort = true;
    } else if (0 < order.length) {
        if (dialog._row_order[0].column == order[0].column) {
            if (dialog._row_order[0].dir == order[0].dir) {
            } else {
                do_sort = true;
                dialog._row_order[0].dir =  order[0].dir;
            }
        } else {
            do_sort = true;
            var order_ = [];
            order_.push(order[0]);
            for (var i = 0; i < dialog._row_order.length; i++) {
                if (dialog._row_order[i].column != order[0].column) {
                    order_.push(dialog._row_order[i]);
                }
            }
            dialog._row_order = order_;
        }
    }
    if (!do_sort) {
        return;
    }
    // ヘッダークリックではない場合、ローカルに作ったエントリーは上位にまとめる
    dialog._phone_book.rows.sort(function(phone_book_entry1, phone_book_entry2) {
        if (order != undefined || (phone_book_entry1.updated_at == undefined && phone_book_entry2.updated_at == undefined)) {
            for (var i = 0; i < dialog._row_order.length; i++) {
                var by = dialog._row_order[i];
                var value1 = phone_book_entry1.row[by.column];
                var value2 = phone_book_entry2.row[by.column];
                if (value1 != value2) {
                    var phone_book_entry1_younger = value1 < value2;
                    if (by.dir == 'desc') {
                        phone_book_entry1_younger = !phone_book_entry1_younger;
                    }
                    return phone_book_entry1_younger ? -1 : 1;
                }
            }
            return 0;
        } else if (phone_book_entry1.updated_at == undefined && phone_book_entry2.updated_at != undefined) {
            return 1;
        } else if (phone_book_entry1.updated_at != undefined && phone_book_entry2.updated_at == undefined) {
            return -1;
        } else {
            if (phone_book_entry1.updated_at < phone_book_entry2.updated_at) {
                return -1;
            } else if (phone_book_entry2.updated_at < phone_book_entry1.updated_at) {
                return 1;
            } else {
                return 0;
            }
        }
    });
}

function CreatePhoneBookEntryRow(dialog, index, phone_book_entry) {
    var tags = phone_book_entry.row;
    try {
        var row = [];
        var cell = '<div class="phone_book_entry_tag" tag_index="0"><input type="checkbox" class="checkbox" phone_book_entry_index="' + index + '"/><span class="checkbox_label">' + tags[0] + '</span><span class="fa fa-pencil-alt edit"></span></div>';
        row.push(cell);
        for (var tag_index = 1; tag_index < tags.length; tag_index++) {
            cell = '<div class="phone_book_entry_tag" tag_index="' + tag_index + '">' + tags[tag_index] + '<span class="fa fa-pencil-alt edit"></span></div>';
            row.push(cell);
        }
        return row;
    } catch (e) {
        console.log(e);
    }
}

function UpdateAllPhoneBookEntryChecks(dialog, checkbox) {
    var checked = checkbox.prop('checked');
    var rows = dialog._phone_book.rows;
    for (var i = 0; i < rows.length; i++) {
        rows[i].checked = checked;
    }
    dialog.find('#phone_book_entry_table tbody tr td input[type=checkbox]').prop('checked', checked);
}

function UpdatePhoneBookEntryCheck(dialog, input) {
    var phone_book_entry_index = input.attr('phone_book_entry_index');
    var checked = input.prop('checked');
    dialog._phone_book.rows[phone_book_entry_index].checked = checked;
}

function UpdatePhoneBookEntryChecksByCellValue(dialog, table, phone_book_entry_index, tag_index, checked) {
    var rows = dialog._phone_book.rows;
    var phone_book_entry = rows[phone_book_entry_index];
    phone_book_entry.checked = checked;
    var cell_value = phone_book_entry.row[tag_index];
    for (var phone_book_entry_index = 0; phone_book_entry_index < rows.length; phone_book_entry_index++) {
        var phone_book_entry = rows[phone_book_entry_index];
        if (phone_book_entry.row[tag_index] == cell_value) {
            phone_book_entry.checked = checked;
        }
    }
    table.find('tbody tr td input[type=checkbox]').each(function(i, o) {
        var checkbox = $(o);
        var phone_book_entry_index = checkbox.attr('phone_book_entry_index');
        var phone_book_entry = rows[phone_book_entry_index];
        checkbox.prop('checked', phone_book_entry.checked);
    });
}

function GetCheckedPhoneBookEntries(dialog) {
    var phone_book_entries = [];
    for (var phone_book_entry_index = 0; phone_book_entry_index < dialog._phone_book.rows.length; phone_book_entry_index++) {
        if (dialog._phone_book.rows[phone_book_entry_index].checked) {
            phone_book_entries.push(dialog._phone_book.rows[phone_book_entry_index]);
        }
    }
    return phone_book_entries;
}

function ConfirmDeletePhoneBookTag(dialog, index, label, value, tag_data) {
    ShowConfirmDialog({
        body: '【' + dialog._phone_book.name + '】の【' + label + '】カラムを削除しますか？<br>【' + label + '】のデータが全て削除されますが、よろしいですか？',
        on_ok: function() {
            DeletePhoneBookTag(dialog, index, label, value, tag_data);
        }
    });
}

function DeletePhoneBookTag(dialog, index, label, value, tag_data) {
    dialog._content_changed = true;
    var phone_book = dialog._phone_book;
    phone_book.headers.splice(index, 1);
    if (tag_data && tag_data.data && tag_data.data.type == 'faked') {
        phone_book.ignoreTagIfFaked(tag_data)
    }
    var rows = phone_book.rows;
    for (var row_index = 0; row_index < rows.length; row_index++) {
        var phone_book_entry = rows[row_index];
        phone_book_entry.row.splice(index, 1);
    }
    UpdatePhoneBook(phone_book, {
        tagsinput_api: dialog._tagsinput_api
    }, function(phone_book) {
    });
    BuildPhoneBookEntryTable(dialog);
}

function AddPhoneBookTag(dialog, index, label) {
    dialog._content_changed = true;
    var phone_book = dialog._phone_book;
    phone_book.headers.push({name: label});
    var rows = phone_book.rows;
    for (var row_index = 0; row_index < rows.length; row_index++) {
        var phone_book_entry = rows[row_index];
        phone_book_entry.row.push('');
    }
    BuildPhoneBookEntryTable(dialog);
}

function DeletePhoneBookEntries(dialog) {
    var phone_book_entries = GetCheckedPhoneBookEntries(dialog);
    if (phone_book_entries.length == 0) {
        noty({text: '削除するエントリーにチェックを付けてください', layout: 'topRight', type: 'error'});
        return;
    }
    ShowConfirmDialog({
        body: '選択された ' + phone_book_entries.length + ' 件のエントリーを削除しますか？',
        on_ok: function() {
            dialog._content_changed = true;
            var rows = dialog._phone_book.rows;
            for (var i = rows.length - 1; 0 <= i; i--) {
                var row = rows[i];
                if (row.checked) {
                    rows.splice(i, 1);
                }
            }
            BuildPhoneBookEntryTable(dialog);
        }
    });
}

function CreatePhoneBookEntry(dialog) {
    dialog._content_changed = true;
    var row = dialog._phone_book.headers.map(function(header) {return ''});
    var phone_book_entry = new PhoneBookEntry(row);
    phone_book_entry.updated_at = (new Date()).format('YYYY-mm-dd HH:MM:SS');
    dialog._phone_book.rows.splice(0, 0, phone_book_entry);
    dialog._phone_book_entry_table_api.draw();
}

function ShowPhoneBookUploadDialog(phone_book_dialog) {
    var argv = {
        modal: false,
        title: '電話帳ファイル',
        name: {
            label: '電話帳名',
            value: phone_book_dialog.find('.name').val()
        }
    };
    ShowUploadDialog(argv, function(table, upload_dialog) {
        var file_info = upload_dialog.find('.file_info');
        if (table.headers.length < 2) {
            Notice({message: 'このファイルは電話帳ファイルではありません', target: file_info});
            return;
        }
        if (table.rows.length == 0) {
            Notice({message: 'このファイルには中身がありません', target: file_info});
            return;
        }
        for (var i = 0; i < table.rows.length; i++) {
            var row = table.rows[i];
            var phone = row[1].extractDigits();
            if (!phone.match(/^0[789]0\d\d\d\d\d\d\d\d$/)) {
                Notice({message: (1 + i + 1) + ' 行目の電話番号が間違っています', target: file_info});
                return;
            }
            row[1] = phone;
        }
        phone_book_dialog._content_changed = true;
        var phone_book = phone_book_dialog._phone_book;
        phone_book.headers = table.headers.map(function(header) {return {name: header}});
        phone_book.rows = table.rows;
        ShowPhoneBookDialog(phone_book, {animate: false});
        upload_dialog.find('.panel-remove').trigger('click');
    });
}

function OnPhoneBookEntryCellEditButtonClicked(dialog, button) {
    $('.inline_editor:not(.hidden)').remove();
    var phone_book_entry_index = parseInt(button.parents('tr').find('[phone_book_entry_index]').attr('phone_book_entry_index'), 10);
    var phone_book_entry = dialog._phone_book.rows[phone_book_entry_index];
    var tag_index = parseInt(button.parent().attr('tag_index'));
    var tag = phone_book_entry.row[tag_index];
    var td = button.parent().parent();
    var checkbox_label = button.parent().find('.checkbox_label');
    var editor = $('.inline_editor.hidden').clone(true, true);
    editor.removeClass('hidden');
    dialog.append(editor);
    var header = editor.find('.header');
    var textarea = editor.find('textarea');
    var input = $('<input type="text"/>');
    textarea.after(input);
    textarea.remove();
    input.val(tag);
    var left = td.offset().left - dialog.offset().left - 1;
    var left_offset;
    if (0 < checkbox_label.length) {
        left_offset = (checkbox_label.offset().left - dialog.offset().left + 3) - left;
    } else {
        left_offset = 0;
    }
    editor.css({
        position: 'absolute',
        left: left + left_offset,
        width: td.outerWidth() - 1 - left_offset + 'px',
        'z-index': 2000
    });
    var header_height = header.outerHeight();
    editor.css({
        top: td.offset().top - dialog.offset().top - header_height - 1 + 'px',  // このへんの定数が気持ち悪い
        height: td.outerHeight() + header_height + 'px',
    });
    input.css({
        height: 'calc(100% - ' + header_height + 'px)'
    });
    editor.find('.header .ok').click(function(e) {
        e.stopPropagation();
        UpdatePhoneBookEntryCell(dialog, editor, phone_book_entry, tag_index);
    });
    input.blur(function(e) {
        UpdatePhoneBookEntryCell(dialog, editor, phone_book_entry, tag_index)
    });
    editor.find('.header .cancel').click(function(e) {
        CancelEdit(editor);
    });
    editor.keyup(function(e) {
        if (e.which == 27) {
            CancelEdit(editor);
        } if (e.which == 13) {      // 編集領域が textarea ではなく input なので Enter キーのみで確定とする
            UpdatePhoneBookEntryCell(dialog, editor, phone_book_entry, tag_index)
        }
    });
    editor.click(function(e) {
        e.stopPropagation();
    });
    dialog.click(function(e) {
        $('.inline_editor').trigger('blur');
    });
    input.focus();
}

function UpdatePhoneBookEntryCell(dialog, editor, phone_book_entry, tag_index) {
    console.log(editor.val());
    dialog._content_changed = true;
    var current_tag = phone_book_entry.row[tag_index];
    var new_tag = editor.find('input[type=text]').val();
    if (current_tag != new_tag) {
        phone_book_entry.row[tag_index] = new_tag;
        //phone_book_entry.updated_at = (new Date()).format('YYYY-mm-dd HH:MM:SS'); // セル内容更新の場合はあえて前へ出さないことにした
        SortPhoneBookEntries(dialog);
        var api = dialog._phone_book_entry_table_api;
        api.draw(false/*「ソートするな」フラグ*/);
        // TODO: 長い文字列を入れると鉛筆が折り返されて行の幅が太くなってしまう
    }
    CancelEdit(editor);
}

function RenumberPhoneBookEntries(phone_book_dialog) {
    var dialog = $('.phone_book_entry_renumber_dialog').CreateDialog({
        container: $('.page-content'),
    });
    dialog.find('.button_ok').click(function(e) {
        dialog._content_changed = true;
        var prefix = dialog.find('.prefix').val();
        var digits = dialog.find('.digits').val();
        var initial = parseInt(dialog.find('.initial').val());
        var phone_book_entries = phone_book_dialog._phone_book.rows;
        for (var i = 0; i < phone_book_entries.length; i++) {
            var phone_book_entry = phone_book_entries[i];
            phone_book_entry.row[0] = prefix + pad0(initial + i, digits);
        }
        phone_book_dialog._phone_book_entry_table_api.draw();
    });
    dialog.ShowModeless();
}

function OnPhoneBookOkClicked(dialog, on_ok) {
    RemoveAllNotices();
    var name = dialog.find('.name');
    if (name.val().match(/^[ 　]*$/)) {
        Notice({message: '電話帳名を記入してください', target: name});
        return;
    }
    var permissions = dialog.find('.permissions');
    var allow_department_ids = [];
    var allow_user_ids = [];
    GetPermissions(dialog, allow_department_ids, allow_user_ids);
    if (allow_department_ids.length == 0 && allow_user_ids.length == 0) {
        Notice({message: '誰にも参照権がありません', target: permissions});
        return;
    }
    var current_user = User.getCurrent();
    if (allow_user_ids.getIndex(current_user.id) == -1 &&
        allow_user_ids.getIndex(current_user.customer.user_id) == -1 &&
        allow_department_ids.getIndex(current_user.department_id) == -1) {
        Notice({message: current_user.name + 'さん自身に参照権がありません', target: permissions});
        return;
    }
    var table = dialog.find('table');
    var phone_book = dialog._phone_book;
    var rows = phone_book.rows;
    if (rows.length == 0) {
        Notice({message: '電話番号が 1 件も登録されていません', target: table});
        return;
    }
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i].row;
        if (row[0].match(/^[ 　]*$/)) {
            TableCellNotice(dialog._phone_book_entry_table_api, table, [i, 0], 'phone_book_entry_index', i + 1 + ' 行目の ID が空白になっています');
            return;
        }
        if (row[1].match(/^[ 　]*$/)) {
            TableCellNotice(dialog._phone_book_entry_table_api, table, [i, 1], 'phone_book_entry_index', i + 1 + ' 行目の電話番号が空白になっています');
            return;
        }
        var phone = row[1].extractDigits();
        if (!phone.match(/^0[789]0\d\d\d\d\d\d\d\d$/)) {
            TableCellNotice(dialog._phone_book_entry_table_api, table, [i, 1], 'phone_book_entry_index', i + 1 + ' 行目の電話番号の形式が間違っています');
            return;
        }
        row[1] = phone;
    }
    ShowConfirmDialog({
        body: phone_book.rows.length + ' 件のエントリーをアップロードしますか？' + (phone_book.id == -1 ? '' : '<br>古いデータは失われますが、よろしいですか？'),
        on_ok: function() {
            UploadPhoneBook(dialog, on_ok);
        }
    });
}

function GetPermissions(dialog, allow_department_ids, allow_user_ids) {
    dialog.find('.permissions input[type=checkbox]').each(function(i, o) {
        var checkbox = $(o);
        if (checkbox.prop('checked')) {
            if (checkbox.hasClass('all')) {
                allow_user_ids.push(checkbox.attr('company_user_id'));
            } else if (checkbox.hasClass('department')) {
                allow_department_ids.push(checkbox.attr('department_id'));
            } else if (checkbox.hasClass('child_user')) {
                allow_user_ids.push(checkbox.attr('child_user_id'));
            }
        }
    });
}

function UploadPhoneBook(dialog, on_ok) {
    var phone_book = dialog._phone_book;
    var name = dialog.find('.name').val();
    if (phone_book.name != name) {
        dialog._name_changed = true;
    }
    var allow_department_ids = [];
    var allow_user_ids = [];
    GetPermissions(dialog, allow_department_ids, allow_user_ids);
    var timeout = phone_book.rows.length * 1 + 7013;
    var loader = new Loader();
    loader.show(timeout, {title: '【' + name + '】をアップロード中...'});
    var argv = {
        phone_book_id: phone_book.id,       // ローカルに新規作成されたものなら -1
        name: name,
        name_changed: dialog._name_changed,
        permission_changed: dialog._permission_changed,
        content_changed: dialog._content_changed,
        allow_user_ids: allow_user_ids,
        allow_department_ids: allow_department_ids,
        headers: phone_book.headers.map(function(header) {return header.name}),
        rows: phone_book.rows.map(function(phone_book_entry) {return phone_book_entry.row}),
/*      要らん。更新したら必ずこうなる
        ignore_name: phone_book.ignore_name,
        ignore_organization: phone_book.ignore_organization,
        ignore_department: phone_book.ignore_department
*/
    };
    CallAPI('./sms_api/', 'POST', 'upload_phone_book', timeout, argv, {
        success: function(response) {
console.log(response);
            loader.remove();
            if (on_ok) {
                on_ok(dialog);
            }
        },
        error: function(response) {
            loader.remove();
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            loader.remove();
            alert(status + ': ' + error);
        }
    });
}

////////////////////////////////////////////////////////////////////////
// ■関数（API 接続許可 IP アドレステーブル）

function LoadAPIAllowFroms(dialog) {
    CallAPI('./sms_api/','POST', 'load_api_ips', 7013, {company_id: User.getCurrent().customer.id}, {
        success: function(response) {
            UpdateAPIAllowFroms(dialog, response.api_ips);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function UpdateAPIAllowFroms(dialog, api_ips) {
    var tbody = dialog.find('.security_api_allow_from_table_container table tbody');
    tbody.empty();
    dialog.get(0)._api_ips = api_ips;
    for (var i = 0; i < api_ips.length; i++) {
        var ip_a = ip_ntoa(api_ips[i].ip);
        var mask_length = api_ips[i].mask_length;
        var tr = $(
'<tr>' +
    '<td><input type="checkbox" class="checkbox"/><span class="checkbox_label ip">' + ip_a + '/' + mask_length + '</span> <span class="fa fa-pencil-alt edit ip"></span></td>' +
    '<td>' + escapeHtml(api_ips[i].comment) + ' <span class="fa fa-pencil-alt edit comment"></span></td>' +
'</tr>'
);
        tr.attr('api_ip_index', i);
        tbody.append(tr);
    }
    tbody.find('input[type=checkbox]').click(function(e) {
        e.stopPropagation();
    });
    tbody.find('td').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(e.currentTarget).parent().find('input[type=checkbox]').trigger('click');
    });
    tbody.find('.edit.ip').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        BeginEditAPIAllowFromIP(dialog, $(e.currentTarget));
    });
    tbody.find('.edit.comment').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        BeginEditAPIAllowFromComment(dialog, $(e.currentTarget));
    });
}

function BeginEditAPIAllowFromIP(dialog, edit) {
    var api_ip_index = edit.parents('[api_ip_index]').attr('api_ip_index');
    var api_ip = dialog.get(0)._api_ips[api_ip_index];
    var td = edit.parents('td');
    var input = $('<input type="text" class="inline_input"/>');
    input.val(ip_ntoa(api_ip.ip));
    input.css({
        left: td.offset().left + 27 + 'px',
        top: td.offset().top + 1 + 'px',
        width: td.outerWidth() - 27 - 2 + 'px',
        height: td.outerHeight() - 2 + 'px',
        'padding-left': '2px'
    });
    var current_ip_button = $('<button class="current_ip_button">現在の IP</button>');
    current_ip_button.css({
        left: td.offset().left + td.width() - 46 + 'px',
        top: td.offset().top + 4 + 'px',
    });
    $('body').append(input);
    $('body').append(current_ip_button);
    input.blur(function(e) {
        // 「現在の IP」ボタンをクリックしたことにより blur が発生した場合
        if (e.originalEvent.relatedTarget && e.originalEvent.relatedTarget.className == 'current_ip_button') {
            input.val(_remote_addr + '/32');
        }
        EndEditAPIAllowFromIP(dialog, input, api_ip);
    });
    input.keydown(function(e) {
        if (e.which == 13) {
            EndEditAPIAllowFromIP(dialog, input, api_ip);
        } else if (e.which == 27) {
            $('.current_ip_button').remove();
            input.remove();
        }
    });
    input.focus();
}

function EndEditAPIAllowFromIP(dialog, input, api_ip) {
    var addr;
    try {
        addr = CIDRToAddress(input.val());
    } catch (e) {
        noty({text: e.toString(), layout: 'topRight', type: 'error'});
        input.focus();
        return;
    }
    SaveAPIAllowFrom(
        dialog,
        input,
        api_ip == undefined ? -1 : api_ip.id,
        addr.ip,
        addr.mask_length,
        api_ip == undefined ? null : api_ip.comment
    );
}

function BeginEditAPIAllowFromComment(dialog, edit) {
    var api_ip_index = edit.parents('[api_ip_index]').attr('api_ip_index');
    var api_ip = dialog.get(0)._api_ips[api_ip_index];
    var td = edit.parents('td');
    var input = $('<input type="text" class="inline_input"/>');
    input.val(api_ip.comment);
    input.css({
        left: td.offset().left + 1 + 'px',
        top: td.offset().top + 1 + 'px',
        width: td.outerWidth() - 2 + 'px',
        height: td.outerHeight() - 2 + 'px',
    });
    $('body').append(input);
    input.blur(function(e) {
        EndEditAPIAllowFromComment(dialog, input, api_ip);
    });
    input.keydown(function(e) {
        if (e.which == 13) {
            EndEditAPIAllowFromComment(dialog, input, api_ip);
        } else if (e.which == 27) {
            input.remove();
        }
    });
    input.focus();
}

function EndEditAPIAllowFromComment(dialog, input, api_ip) {
    var comment = input.val();
    SaveAPIAllowFrom(
        dialog,
        input,
        api_ip == undefined ? -1 : api_ip.id,
        api_ip == undefined ? 0 : api_ip.ip,
        api_ip == undefined ? 32 : api_ip.mask_length,
        comment
    );
}

function SaveAPIAllowFrom(dialog, input, api_ip_id, ip_n, mask_length, comment) {
    var data = {
        api_ip_id: api_ip_id,
        company_id: User.getCurrent().customer.id,
        ip: ip_n,
        mask_length: mask_length,
        comment: comment
    }
    CallAPI('./sms_api/','POST', 'save_api_ip', 7013, data, {
        success: function(response) {
            input.remove();
            $('.current_ip_button').remove();
            LoadAPIAllowFroms(dialog);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            input.remove();
            $('.current_ip_button').remove();
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function DeleteAPIAllowFroms(dialog) {
    var api_ip_ids = [];
    dialog.find('.security_api_allow_from_table_container>table.ip_address_table>tbody>tr>td input[type=checkbox]:checked').each(function(i, o) {
        var api_ip_index = $(o).parents('[api_ip_index]').attr('api_ip_index');
        if (api_ip_index != -1) {
            var api_ip = dialog.get(0)._api_ips[api_ip_index];
            api_ip_ids.push(api_ip.id);
        }
    });
    if (api_ip_ids.length == 0) {
        Notice({message: '削除する IP アドレスを選択してください', target: dialog.find('.security_api_allow_from_table_container>table.ip_address_table')});
        return;
    }
    ShowConfirmDialog({
        body: '選択されている ' + api_ip_ids.length + ' 個の IP アドレスを削除しますか？',
        on_ok: function() {
            var data = {
                api_ip_ids: api_ip_ids
            }
            CallAPI('./sms_api/','POST', 'delete_api_ips', 7013, data, {
                success: function(response) {
                    LoadAPIAllowFroms(dialog);
                },
                error: function(response) {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                },
                fatal: function(status, error) {
                    noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
                }
            });
        }
    });
}

function AddAPIAllowFrom(dialog) {
    var api_ip = {
        id: -1,
        company_id: User.getCurrent().customer.id,
        ip: 0,
        mask_length: 32,
        comment: ''
    }
    dialog.get(0)._api_ips.push(api_ip);
    UpdateAPIAllowFroms(dialog, dialog.get(0)._api_ips);
}

////////////////////////////////////////////////////////////////////////
// ■関数（管理画面接続許可 IP アドレステーブル）

function LoadConsoleAllowFroms(dialog) {
    CallAPI('./sms_api/','POST', 'load_allow_froms', 7013, {company_id: User.getCurrent().customer.id}, {
        success: function(response) {
            UpdateConsoleAllowFroms(dialog, response.allow_froms);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function UpdateConsoleAllowFroms(dialog, allow_froms) {
    allow_froms = allow_froms.map(function(allow_from) {
        // 新形式に移行していないレコードをここで変換
        if (allow_from.ip_n == undefined) {
            var allow_from_cidr = CIDRToAddress(allow_from.ip);
            allow_from.ip = allow_from_cidr.ip;
            allow_from.ip_n = allow_from_cidr.ip;
            allow_from.mask_length = allow_from_cidr.mask_length;
        // 移行済みのものはコピー
        } else {
            allow_from.ip = allow_from.ip_n;
        }
        return allow_from;
    });
    var tbody = dialog.find('.security_console_allow_from_table_container table tbody');
    tbody.empty();
    dialog.get(0)._allow_froms = allow_froms;
    for (var i = 0; i < allow_froms.length; i++) {
        var ip_a = ip_ntoa(allow_froms[i].ip);
        var mask_length = allow_froms[i].mask_length;
        var tr = $(
'<tr>' +
    '<td><input type="checkbox" class="checkbox"/><span class="checkbox_label ip">' + ip_a + '/' + mask_length + '</span> <span class="fa fa-pencil-alt edit ip"></span></td>' +
    '<td>' + escapeHtml(allow_froms[i].comment) + ' <span class="fa fa-pencil-alt edit comment"></span></td>' +
'</tr>'
);
        tr.attr('allow_from_index', i);
        tbody.append(tr);
    }
    tbody.find('input[type=checkbox]').click(function(e) {
        e.stopPropagation();
    });
    tbody.find('td').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(e.currentTarget).parent().find('input[type=checkbox]').trigger('click');
    });
    tbody.find('.edit.ip').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        BeginEditConsoleAllowFromIP(dialog, $(e.currentTarget));
    });
    tbody.find('.edit.comment').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        BeginEditConsoleAllowFromComment(dialog, $(e.currentTarget));
    });
}

function BeginEditConsoleAllowFromIP(dialog, edit) {
    var allow_from_index = edit.parents('[allow_from_index]').attr('allow_from_index');
    var allow_from = dialog.get(0)._allow_froms[allow_from_index];
    var td = edit.parents('td');
    var input = $('<input type="text" class="inline_input"/>');
    input.val(ip_ntoa(allow_from.ip));
    input.css({
        left: td.offset().left + 27 + 'px',
        top: td.offset().top + 1 + 'px',
        width: td.outerWidth() - 27 - 2 + 'px',
        height: td.outerHeight() - 2 + 'px',
        'padding-left': '2px'
    });
    var current_ip_button = $('<button class="current_ip_button">現在の IP</button>');
    current_ip_button.css({
        left: td.offset().left + td.width() - 46 + 'px',
        top: td.offset().top + 4 + 'px',
    });
    $('body').append(input);
    $('body').append(current_ip_button);
    input.blur(function(e) {
        // 「現在の IP」ボタンをクリックしたことにより blur が発生した場合
        if (e.originalEvent.relatedTarget && e.originalEvent.relatedTarget.className == 'current_ip_button') {
            input.val(_remote_addr + '/32');
        }
        EndEditConsoleAllowFromIP(dialog, input, allow_from);
    });
    input.keydown(function(e) {
        if (e.which == 13) {
            EndEditConsoleAllowFromIP(dialog, input, allow_from);
        } else if (e.which == 27) {
            $('.current_ip_button').remove();
            input.remove();
        }
    });
    input.focus();
}

function EndEditConsoleAllowFromIP(dialog, input, allow_from) {
    var addr;
    try {
        addr = CIDRToAddress(input.val());
    } catch (e) {
        noty({text: e.toString(), layout: 'topRight', type: 'error'});
        input.focus();
        return;
    }
    SaveConsoleAllowFrom(
        dialog,
        input,
        allow_from == undefined ? -1 : allow_from.id,
        addr.ip,
        addr.mask_length,
        allow_from == undefined ? null : allow_from.comment
    );
}

function BeginEditConsoleAllowFromComment(dialog, edit) {
    var allow_from_index = edit.parents('[allow_from_index]').attr('allow_from_index');
    var allow_from = dialog.get(0)._allow_froms[allow_from_index];
    var td = edit.parents('td');
    var input = $('<input type="text" class="inline_input"/>');
    input.val(allow_from.comment);
    input.css({
        left: td.offset().left + 1 + 'px',
        top: td.offset().top + 1 + 'px',
        width: td.outerWidth() - 2 + 'px',
        height: td.outerHeight() - 2 + 'px',
    });
    $('body').append(input);
    input.blur(function(e) {
        EndEditConsoleAllowFromComment(dialog, input, allow_from);
    });
    input.keydown(function(e) {
        if (e.which == 13) {
            EndEditConsoleAllowFromComment(dialog, input, allow_from);
        } else if (e.which == 27) {
            input.remove();
        }
    });
    input.focus();
}

function EndEditConsoleAllowFromComment(dialog, input, allow_from) {
    var comment = input.val();
    SaveConsoleAllowFrom(
        dialog,
        input,
        allow_from == undefined ? -1 : allow_from.id,
        allow_from == undefined ? 0 : allow_from.ip,
        allow_from == undefined ? 32 : allow_from.mask_length,
        comment
    );
}

function SaveConsoleAllowFrom(dialog, input, allow_from_id, ip_n, mask_length, comment) {
    var data = {
        allow_from_id: allow_from_id,
        company_id: User.getCurrent().customer.id,
        ip: ip_ntoa(ip_n) + '/' + mask_length,      // api_ips.ip と同じ名前だが、実体は文字列で CIDR 形式！（旧システムとの互換性のため、旧システムが滅びるまでこのまま維持）
        ip_n: ip_n,
        mask_length: mask_length,
        comment: comment
    }
    CallAPI('./sms_api/','POST', 'save_allow_from', 7013, data, {
        success: function(response) {
            input.remove();
            $('.current_ip_button').remove();
            LoadConsoleAllowFroms(dialog);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
            input.remove();
            $('.current_ip_button').remove();
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function DeleteConsoleAllowFroms(dialog) {
    var allow_from_ids = [];
    dialog.find('.security_console_allow_from_table_container>table.ip_address_table>tbody>tr>td input[type=checkbox]:checked').each(function(i, o) {
        var allow_from_index = $(o).parents('[allow_from_index]').attr('allow_from_index');
        if (allow_from_index != -1) {
            var allow_from = dialog.get(0)._allow_froms[allow_from_index];
            allow_from_ids.push(allow_from.id);
        }
    });
    if (allow_from_ids.length == 0) {
        Notice({message: '削除する IP アドレスを選択してください', target: dialog.find('.security_console_allow_from_table_container>table.ip_address_table')});
        return;
    }
    ShowConfirmDialog({
        body: '選択されている ' + allow_from_ids.length + ' 個の IP アドレスを削除しますか？',
        on_ok: function() {
            var data = {
                command: 'delete_api_ids',
                allow_from_ids: allow_from_ids
            }
            CallAPI('./sms_api/','POST', 'delete_allow_froms', 7013, data, {
                success: function(response) {
                    LoadConsoleAllowFroms(dialog);
                },
                error: function(response) {
                    noty({text: response.message, layout: 'topRight', type: 'error'});
                },
                fatal: function(status, error) {
                    noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
                }
            });
        }
    });
}

function AddConsoleAllowFrom(dialog) {
    var allow_from = {
        id: -1,
        company_id: User.getCurrent().customer.id,
        ip: 0,
        mask_length: 32,
        comment: '',
        ip_n: 0
    }
    dialog.get(0)._allow_froms.push(allow_from);
    UpdateConsoleAllowFroms(dialog, dialog.get(0)._allow_froms);
}

////////////////////////////////////////////////////////////////////////
// ■関数（顧客テーブル）

function LoadCustomers(dialog) {
    var timeout = 7013;
    var loader = new Loader();
    loader.show(timeout, {title: '顧客リストロード中...'});
    CallAPI('./sms_api/', 'POST', 'load_agents', timeout, {}, {
        success: function(response) {
            UpdateCustomers(dialog, response.agents, function() {
                loader.remove();
            });
        },
        error: function(response) {
            loader.remove();
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            loader.remove();
            alert(status + ': ' + error);
        }
    });
}

function UpdateCustomers(dialog, agents, on_success) {
    dialog._customers = [];
    agents.map(function(agent) {
        agent.companies.map(function(company) {
            company.agent = {
                id: agent.id,
                user_id: agent.user_id,
                user: agent.user
            };
            dialog._customers.push(company);
        });
    });
    dialog._customer_order = [{column: 1, dir: 'desc'}];
    for (var i = 0; i < dialog._customers.length; i++) {
        var customer_ = dialog._customers[i];
        var extra = customer_.extra;
        delete customer_.extra;
        var attributes = customer_.attributes;
        delete customer_.attributes;
        var support_case_ids = customer_.user.support_case_ids;
        for (var j = 0; j < customer_.child_users.length; j++) {
            support_case_ids = support_case_ids.concat(customer_.child_users[j].support_case_ids);
        }
        customer_.support_case_ids = support_case_ids;
        var customer = new Customer(customer_, extra, attributes);
        dialog._customers[i] = customer;
    }
    SortCustomers(dialog);
    var container = $('.customer_table_container');
    container.empty();
    // テーブルのスケルトンを作成
    var table = $(
'<table class="table table-striped table-hover customer_table">' +
    '<thead>' +
        '<tr>' +
            '<th class="customer_id">顧客番号</th>' +
            '<th class="customer_name">顧客名</th>' +
            '<th>ID</th>' +
            //'<th>作成日時</th>' +
            '<th>契約開始</th>' +
            '<th>契約終了</th>' +
            '<th class="sms_count">今月送信数</th>' +
            '<th>代理店名</th>' +
        '</tr>' +
    '</thead>' +
    '<tbody>' +
    '</tbody>' +
'</table>'
);
    container.append(table);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var today_next_month = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    today_next_month.setMonth(today_next_month.getMonth() + 1);
    // テーブルを「データテーブル」化する
    table.DataTable({
        aLengthMenu: [10, 25, 50, 100, 250, 500, 1000],
        oLanguage: {
            sLengthMenu: '_MENU_ 行表示',
            sSearch: '<span class="fa fa-search"></span>',
            oPaginate: {
                sNext: '<span class="fa fa-step-forward"></span>',
                sPrevious: '<span class="fa fa-step-backward"></span>'
            },
            sInfo: '全 _TOTAL_ 件中 _START_ から _END_ まで',
            sInfoEmpty: '全 0 件中 0 から 0 まで',
            sInfoFiltered: '(全数 _MAX_ から抽出)',
            sZeroRecords: 'マッチするレコードがありません'
        },
        order: [[0, 'asc']],
        serverSide: true,
        ordering: true,
        searching: true,
        initComplete: function() {
            if (on_success) {
                on_success();
            }
        },
        ajax: function(data, callback, settings) {
            SortCustomers(dialog, data.order);
            var rows = [];
            var filtered_record_count;
            var end = data.start + data.length;
            if (0 < data.search.value.length) {
                var match_count = 0;
                for (var customer_index = 0; customer_index < dialog._customers.length; customer_index++) {
                    var customer = dialog._customers[customer_index];
                    if (customer.hasString(data.search.value)) {
                        if (data.start <= match_count && match_count < end) {
                            var row = CreateCustomerRow(customer_index, customer, today, today_next_month);
                            rows.push(row);
                        }
                        match_count++;
                    }
                }
                filtered_record_count = match_count;
            } else {
                for (var customer_index = data.start; customer_index < end && customer_index < dialog._customers.length; customer_index++) {
                    var customer = dialog._customers[customer_index];
                    var row = CreateCustomerRow(customer_index, customer, today, today_next_month);
                    rows.push(row);
                }
                filtered_record_count = dialog._customers.length;
            }
            callback({
                draw: data.draw,
                data: rows,
                recordsTotal: dialog._customers.length,
                recordsFiltered: filtered_record_count
            });
            // イベントハンドラー
            table.find('tbody tr').click(function(e) {
                $(e.currentTarget).find('input[type=checkbox]').trigger('click');
            });
            table.find('tbody td input[type=checkbox]').click(function(e) {
                e.stopPropagation();
                UpdateCustomerCheck(dialog, $(e.currentTarget));
            });
        },
        drawCallback: function(settings) {
            table.find('tbody>tr>td>div.customer_name').each(function(i, o) {
                $(o).parent().addClass('customer_name');
            });
            table.css({width: table.parent().width() + 'px'});
        }
    });
    table.resize(function(e) {
        e.stopPropagation();
        table.css('width', table.parent().width() + 'px');
    });
    $(window).resize(function(e) {
        table.trigger('resize');
    });
}

var _column_comparators = [
    function(c1, c2, d) {
        return Compare(c1.id, c2.id, d);
    },
    function(c1, c2, d) {
        return Compare(c1.user.name, c2.user.name, d);
    },
    function(c1, c2, d) {
        return Compare(c1.user.account, c2.user.account, d);
    },
/*
    function(c1, c2, d) {
        var diff = (c1.create_date < c2.create_date) ? -1 : 1;
        return d ? diff * -1 : diff;
    },
*/
    function(c1, c2, d) {
        return Compare(c1.contract_start, c2.contract_start, d);
    },
    function(c1, c2, d) {
        return Compare(c1.contract_end, c2.contract_end, d);
    },
    function(c1, c2, d) {
        return Compare(c1.sms_count, c2.sms_count, d);
    },
    function(c1, c2, d) {
        return Compare(c1.agent.user.name, c2.agent.user.name, d);
    },
];

function SortCustomers(dialog, order) {
    var customers = dialog._customers;
    var do_sort = false;
    if (order == undefined) {
        do_sort = true;
    } else if (0 < order.length) {
        if (dialog._customer_order[0].column == order[0].column) {
            if (dialog._customer_order[0].dir == order[0].dir) {
            } else {
                do_sort = true;
                dialog._customer_order[0].dir =  order[0].dir;
            }
        } else {
            do_sort = true;
            var customer_order = [];
            customer_order.push(order[0]);
            for (var i = 0; i < dialog._customer_order.length; i++) {
                if (dialog._customer_order[i].column != order[0].column) {
                    customer_order.push(dialog._customer_order[i]);
                }
            }
            dialog._customer_order = customer_order;
        }
    }
    if (!do_sort) {
        return;
    }
    customers.sort(function(customer1, customer2) {
        for (var i = 0; i < dialog._customer_order.length; i++) {
            var by = dialog._customer_order[i];
            var result = _column_comparators[by.column](customer1, customer2, by.dir == 'desc');
            if (result != 0) {
                return result;
            }
        }
        return 0;
    });
}

function CreateCustomerRow(customer_index, customer, today, today_next_month) {
    var contract_start = new Date(customer.contract_start);
    var contract_end = new Date(customer.contract_end);
    var valid_from = $('<span>' + contract_start.format('YYYY-mm-dd') + '</span>');
    var valid_thru = $('<span>' + contract_end.format('YYYY-mm-dd') + '</span>');
    if (today.getTime() < contract_start.getTime()) {
        valid_from.addClass('label-primary');                           // まだ契約期間が始まっていない
        valid_from.attr('title', 'まだ契約期間が始まっていません');
    } else if (contract_end.getTime() < today.getTime()) {
        valid_thru.addClass('label-danger');                            // 契約終了日を過ぎている
        valid_thru.attr('title', '既に契約が切れています');
    } else if (contract_end.getTime() < today_next_month.getTime()) {
        valid_thru.addClass('label-warning');                           // 来月の今日までに契約終了
        valid_thru.attr('title', '来月で契約が切れます');
    }
    var div = $('<div></div>');
    div.append(valid_from);
    var valid_from_html = div.html();
    div.empty();
    div.append(valid_thru);
    var valid_thru_html = div.html();
    var new_case_message_count = customer.sumNewCaseMessageCount();
    var case_count = '';
    if (0 < new_case_message_count) {
        case_count = '<span class="label-danger case_count" title="新しい問い合わせ ' + new_case_message_count + ' 件">' + new_case_message_count + '</span>';
    }
    var row = [];
    row.push('<div class="customer_id"><input type="checkbox" class="checkbox" customer_index="' + customer_index + '"/><span class="checkbox_label"> ' + customer.id + '</span></div>');
    row.push('<div class="customer_name" title="' + customer.user.name + '">' + escapeHtml(customer.user.name) + '</div>' + case_count);
    row.push(customer.user.account);
    //row.push(customer.create_date.slice(0, 16));
    row.push(valid_from_html);
    row.push(valid_thru_html);
    row.push('<div class="sms_count">' + customer.sms_count + '</div>');
    row.push(escapeHtml(customer.agent.user.name));
    return row;
}

function UpdateCustomerCheck(dialog, checkbox) {
    var customer_index = checkbox.attr('customer_index');
    dialog._customers[customer_index].checked = checkbox.prop('checked');
}

function GetCheckedCustomers(dialog) {
    var customers = [];
    for (var customer_index = 0; customer_index < dialog._customers.length; customer_index++) {
        var customer = dialog._customers[customer_index];
        if (customer.checked) {
            customers.push(customer);
        }
    }
    return customers;
}

////////////////////////////////////////////////////////////////////////
// ■関数（ページの初期化）

function LogEnter(fun) {
    console.log('>>>>>>> ' + fun.getName());
}

function LogLeave(fun) {
    console.log('<<<<<<< ' + fun.getName());
}

/*
FontAwesome のバージョンを新しくしたら大惨事の巻
foo:before の content に "\f531" とか書いてたやつが全部無効になった（原因不明）
ので普通に DOM を入れる
*/
function CreateMobilePhoneControls() {
    // 縦長の場合
    if (window.screen.width < 500) {
        // メニューボタン
        $('.x-navigation .x-navigation-control').before('<span class="x-navigation-control-bars"><span class="fa fa-bars"></span></span>');
    }
    // 検索ボックスの虫眼鏡
    $('.x-navigation .xn-search').before('<span class="xn-search-before"><span class="fa fa-search"></span></span>');
    // 開閉できるメニュー項目（子を持つ項目）の開閉ボタン
    CreateOpenCloseButtons(true);
}

function CreateOpenCloseButtons(create) {
    if (create) {
        // 開閉できるメニュー項目（子を持つ項目）の開閉ボタンを挿入
        $('.x-navigation li.xn-openable:not(.active)>a').each(function(i, a) {
            $(a).append('<span class="fa fa-plus-square open-close-button"></span>');
        });
        $('.x-navigation li.xn-openable.active>a').each(function(i, a) {
            $(a).append('<span class="fa fa-minus-square open-close-button"></span>');
        });
        // 開閉できるメニュー項目（子を持つ項目）の開閉ボタンをクリックで変更
        $('.x-navigation li.xn-openable').click(function(e) {
            $('.x-navigation li.xn-openable').each(function(i, o) {
                var li = $(o);
                if (li.hasClass('active')) {
                    li.find('.open-close-button').removeClass('fa-plus-square').addClass('fa-minus-square');
                } else {
                    li.find('.open-close-button').removeClass('fa-minus-square').addClass('fa-plus-square');
                }
            });
        });
    } else {
        // 開閉できるメニュー項目（子を持つ項目）の開閉ボタンを削除
        $('.x-navigation li.xn-openable>a .open-close-button').remove();
    }
}

function SetActiveMenuPath() {
    $('.x-navigation li.active').removeClass('active');
    var breadcrumb = $('.page-content ul.breadcrumb');
    breadcrumb.empty();
    $('a.leaf_menu_item').each(function(i, o) {
        var a = $(o);
        if (a.attr('href') != ('./' + _page)) {
            return;
        }
        var li = a.parent();
        var ul = li.parent();
        for (var i = 0; i < 32; i++) {          // 万一の無限ループ防止
            li.addClass('active');
            var label = li.find('>a .xn-text').html();
            breadcrumb.prepend('<li><span class="greater_than"><span class="fa fa-greater-than"></span></span>' + label + '</li>');
            if (ul.hasClass('x-navigation')) {
                break;
            }
            li = ul.parent();
            ul = li.parent();
        }
    });
    if (_store_last_active_page) {
        //「最後に開いたページ」をユーザーごとに記憶（種類の違うユーザーでログインし直した場合、あるはずのページが無いとか無いはずのページが開くとかの事態が予想される）
        var last_active_pages;
        var str = localStorage.getItem('last_active_pages');
        if (str == undefined || str == '') {
            last_active_pages = {};
        } else {
            last_active_pages = JSON.parse(str);
        }
        last_active_pages[User.getCurrent().id] = _page;
        str = JSON.stringify(last_active_pages);
        localStorage.setItem('last_active_pages', str);
    }
}

function SetCommonHandlers() {
    SetTabHandlers();
    SetRadioLabelHandlers();
    SetCheckboxLabelHandlers();
    SetAccordionHandlers();
}

// タブのクリックでアクティブなタブとペインを切り替えるハンドラーをセット
function SetTabHandlers() {
    $('.tabs .nav-tabs [data-toggle=tab]').each(function(tab_index, tab) {
        $(tab).click(function(e) {
            var tabs = $(e.currentTarget).parents('.tabs');
            tabs.find('.nav-tabs>li').removeClass('active');
            tabs.find('.nav-tabs>li:nth-child(' + (tab_index + 1) + ')').addClass('active');
            tabs.find('.tab-content>.tab-pane').removeClass('active');
            tabs.find('.tab-content>.tab-pane:nth-child(' + (tab_index + 1) + ')').addClass('active');
        });
    });
}

// radio ボタンの直後のラベルクリックをボタンに渡す
function SetRadioLabelHandlers() {
    $('input[type=radio].radio+.radio_label').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(e.currentTarget).parent().find('input[type=radio].radio').trigger('click');
    });
}

// checkbox の直後のラベルクリックを checkbox に渡す
function SetCheckboxLabelHandlers(container) {
    if (container == undefined) {
        container = $('body');
    }
    container.find('input[type=checkbox].checkbox+.checkbox_label').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(e.currentTarget).parent().find('input[type=checkbox].checkbox').trigger('click');
    });
}

// アコーディオンの開閉
function SetAccordionHandlers() {
    $('.accordion_switch').EnableAccordion(true);
    // アコーディオンは height を記録するため最初は開いた状態で表示される。closed クラスを持っているものをここですべて閉じる。
    var accordion_boxes_to_close = $('.accordion_block .accordion_box.closed');
    for (var i = 0; i < accordion_boxes_to_close.length; i++) {
        $(accordion_boxes_to_close.get(i)).Accordion(false, 0);
    }
}

function InitializeSendAtDateTime() {
    var now = new Date();
    now.setTime(now.getTime() + 1000 * 60 * 60);
    var start_day = now.format('YYYY-mm-dd');
    now.setMonth(now.getMonth() + 1);
    var end_day = now.format('YYYY-mm-dd');
    var send_at_date = $('#send_at_date');
    send_at_date.val(start_day);
    send_at_date.datepicker({
        format: 'yyyy-mm-dd',
        language: 'ja',
        autoclose: true,
        beforeShowDay: function(date) {
            var the_day = date.format('YYYY-mm-dd');
            return start_day <= the_day && the_day <= end_day;
        }
    });
    $('#send_at_time').val(now.format('HH:MM'));
    $('#send_at_time').clockpicker({
        default: 'now',
        fromnow: 1000 * 60 * 60,
        autoclose: true
        //donetext: 'この時刻に決定'
    });
}

function InitializeJobStatusCheckboxes() {
    var scc = $('#status_checkbox_container');
    scc.append('<span class="checkbox_wrap"><input type="checkbox" class="checkbox" status_code="-1" checked/><span class="checkbox_label">全て</span></span>\n');
    scc.find('.checkbox_wrap').click(function(e) {
        scc.find('input[type=checkbox]').trigger('click');
    });
    scc.find('input[type=checkbox][status_code=-1]').click(function(e) {
        e.stopPropagation();
        var checked = $(e.currentTarget).prop('checked');
        scc.find('input[type=checkbox].checkbox[status_code!=-1]').prop('checked', checked);
    });
    var statuses = Job.getStatuses();
    for (var status_code = 0; status_code < statuses.length; status_code++) {
        var status_name = statuses[status_code];
        scc.append('<span class="checkbox_wrap"><input type="checkbox" class="checkbox" status_code="' + status_code + '" checked/><span class="checkbox_label">' + status_name + '</span></span>\n');
    }
}

function GetCheckedJobStatuses() {
    var statuses = [];
    $('#status_checkbox_container').find('input[type=checkbox][status_code!=-1]:checked').each(function(i, o) {
        statuses.push($(o).attr('status_code'));
    });
    if (statuses.length == 0) {
/*
        $('#status_checkbox_container').find('input[type=checkbox][status_code!=-1]').each(function(i, o) {
            statuses.push($(o).attr('status_code'));
        });
*/
        Notice({message: '取得したいジョブのステータスにチェックを付けてください', target: $('#status_checkbox_container').parent().find('.help-block')});
    }
    return statuses;
}

var _scrolltop_evading = false;

function LetScrollTopEvade(e) {
    if (_scrolltop_evading) {
        return;
    }
    var pointMouse = new MousePoint(e);
    var rectScrollTop = new Rectangle($('.material-scrolltop').get(0));
    $('button.btn.btn-primary').each(function(i, o) {
        var button = $(o);
        var rectButton = new Rectangle(o);
        if (rectScrollTop.intersect(rectButton)) {
            _scrolltop_evading = true;
            $('.material-scrolltop').animate({'left': 32 + 'px'}, 'fast', 'swing', function() {
                //_scrolltop_evading = false;
                setTimeout(function() {
                    //_scrolltop_evading = true;
                    $('.material-scrolltop').animate({'left': rectScrollTop.left + 'px'}, 'slow', 'swing', function() {
                        _scrolltop_evading = false;
                    });
                }, 7013);
            });
        }
    });
}

function LoadNewInfoCount(on_success) {
    CallAPI('./sms_api/','POST', 'load_new_info_count', 7013, {}, {
        success: function(response) {
            UpdateNewInfoCount(response.new_info_count, on_success);
        },
        error: function(response) {
            noty({text: response.message, layout: 'topRight', type: 'error'});
        },
        fatal: function(status, error) {
            noty({text: status + ': ' + error, layout: 'topRight', type: 'error'});
        }
    });
}

function UpdateNewInfoCount(new_info_count, on_success) {
    var info_badge = $('.x-navigation.x-navigation-horizontal>.xn-icon-button>.informer');
    if (new_info_count == 0) {
        info_badge.addClass('hidden');
    } else {
        info_badge.html(new_info_count);
        info_badge.removeClass('hidden');
    }
    if (on_success) {
        on_success(new_info_count);
    }
}

function SetActivePage() {
    LogEnter(SetActivePage);
    try {
        $(document).off();  // これをやらないと SelectPicker が極めて不可解な動作をする
        SetCommonHandlers();
        CreateMobilePhoneControls();
        var user = User.getCurrent();
        // ユーザーのタイプと設定に従って要素を隠す／見せる
        if (user.isAdministrator()) {
            // メニューがいったん全部びよ～んと表示されてから消えて非常にかっこ悪いが、それを見るのは社内の人間だけなので放置
            $('.x-navigation:not(.x-navigation-horizontal) li:not(.xn-logo):not(.admin_item), .x-navigation:not(.x-navigation-horizontal) ul:not(.admin_item)').addClass('hidden');
            $('.x-navigation .admin_item.hidden').removeClass('hidden');
        } else if (user.isCompanyUser()) {
            $('.parent_item').removeClass('hidden');
        } else if (user.isChildUser()) {
            $('.child_item').removeClass('hidden');
        }
        if (user.isGuestUser()) {
            $('.x-navigation:not(.x-navigation-horizontal) li:not(.xn-logo):not(.guest_item), .x-navigation:not(.x-navigation-horizontal) ul:not(.guest_item)').addClass('hidden');
        } else {
            $('li.guest_item>a.leaf_menu_item').each(function(i, o) {
                $(o).parent().addClass('hidden');
            });
        }
        if ((user.isCompanyUser() || user.isChildUser()) && !user.customer.price.sms_webapi) {
            $('.api_item').addClass('hidden');
        }
        if (user.isChildUser() && user.customer.hide_child_maintenance) {
            $('.maintenance_item').addClass('hidden');
        }
        // 現在のページに対応するメニューアイテムをアクティブにする（開く）
        SetActiveMenuPath();
        $('.user_name').html(User.getCurrent().name);
        // iframe を目一杯高くしつつスクロールバーを出さない（iframe の内部のスクロールバーは出る）
        var full_height_wrap = $('.page-content-wrap.full_height_frame');
        if (0 < full_height_wrap.length) {
            full_height_wrap.css({
                height: $('.page-content').height() - full_height_wrap.offset().top - 4 + 'px',  // 謎の -4
            });
        }
        // スクロールトップボタン
        $('body').materialScrollTop({
            //onScrollEnd: function(e) {}
        });
        if (0 < $('.material-scrolltop').length) {
            $('.material-scrolltop, button.btn.btn-primary').each(function(i, o) {
                $(o).hover(
                    function(e) {
                        LetScrollTopEvade(e);
                    },
                    function(e) {
                    }
                );
            });
        }
        // 右上隅のお知らせアイコン
        setTimeout(function() {
            if (user.isCompanyUser() || user.isChildUser()) {
                var info_icon = $('.x-navigation.x-navigation-horizontal>.xn-icon-button>.info_icon>span');
                info_icon.off().click(function(e) {
                    e.stopPropagation();
                    var support_info_item = $('.support_info_item a span.xn-text');
                    support_info_item.trigger('click');
                });
                LoadNewInfoCount();
            } else {
                var info_icon = $('.x-navigation.x-navigation-horizontal>.xn-icon-button>.info_icon');
                info_icon.addClass('hidden');
            }
        }, 1013);
        // リサイズ
        $(window).resize(function(e) {
            if (typeof ResizeControls == 'function') {
                ResizeControls();
            }
        });
    } catch (e) {
        LogLeave(SetActivePage);
        throw e;
    }
    LogLeave(SetActivePage);
}

