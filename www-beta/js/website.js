// このウェブサイトの構造

function WebSite() {
}
WebSite._map = {
    'guest@starship.jp': {
        'ja': {
            '/guest_user_guide.html': '/_lang/ja',
        },
    },
    'guest2@starship.jp': {
        'ja': {
            '/guest_user_guide.html': '/_lang/ja',
        },
    },
    '*': {
        'ja': {
            '/user_user_guide.html': '/_lang/ja',
        },
    },
};
WebSite.getPropByName = function(name, map) {

    let map_;
    if (map == undefined) {
        map_ = WebSite._map;
    } else {
        map_ = map;
    }

    let name_;
    if (name == undefined) {
        name_ = '*';
    } else if (map_[name] == undefined) {
        name_ = '*';
    } else {
        name_ = name;
    }

    return map_[name_];
};
// アカウント別 x 言語別のパスの読み替えが指定されていればそれを返す。
WebSite.map = function(path, account, language) {
    if (language == undefined) {
        return path;
    }
    let account_map = WebSite.getPropByName(account);
    if (account_map == undefined) {
        return path;
    }
    let language_map = WebSite.getPropByName(language, account_map);
    if (language_map == undefined) {
        return path;
    }
    let redirected_to = WebSite.getPropByName(path, language_map);
    if (redirected_to == undefined) {
        return path;
    }
    return redirected_to + path;
};
