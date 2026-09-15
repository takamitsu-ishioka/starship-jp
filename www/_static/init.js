<script>
$(document).ready(function(e) {

    // href を解析し、クエリーがあれば読み取る。
    try {
        Location.setCurrent(location);
    } catch (e) {
        var e_str = JSON.stringify(e, null, '    ');
        alert("can't parse location.href: e: " + e_str);
        return;
    }

    // サイトの初期化。
    InitializeSite();

    // ユーザーの初期化（最初は常に guest）。
    User.initialize();
});
</script>
