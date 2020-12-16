! function(s) {
    s.fn.paraceviriciWidget = function(a) {
        if (s(this).length < 1) return this;
        var o = s.extend(!0, {
            widget: "boxline",
            wData: {
                category: 0,
                currency: "USD-EUR"
            },
            wSize: {
                wWidth: 200,
                wHeight: 20
            },
            wBase: {
                pUnit: "TRY",
                wLanguage: "tr"
            },
            func: function(t) {
                return +t === t && !(t % 1) && 0 <= t
            },
            qs: function() {
                return "w=" + o.widget + "&d=" + o.wData.category + "&c=" + o.wData.currency + "&u=" + o.wBase.pUnit + "&l=" + o.wBase.wLanguage
            },
            uri: "/servis/widget/widget?"
        }, a);
        return s(this).each(function() {
            var t = s(this),
                e = o.wSize.wWidth,
                i = o.wSize.wHeight + "px";
            o.func(e) && (e = o.wSize.wWidth + "px"), t.css({
                width: e,
                height: i,
                position: "relative"
            });
            var n = s("<div />").css({
                    width: e,
                    height: i
                }).appendTo(t),
                c = s("<iframe />").attr({
                    scrolling: "no",
                    frameborder: 0,
                    allowtransparency: "yes",
                    width: o.wSize.wWidth,
                    height: o.wSize.wHeight
                }).appendTo(n),
                r = JSON.stringify(a);
            (c = c[0].contentWindow ? c[0].contentWindow : c[0].contentDocument.document ? c[0].contentDocument.document : c[0].contentDocument).document.open(), c.document.write("<!DOCTYPE html><html lang='tr'><head><meta http-equiv='content-type' content='text/html;charset=UTF-8' /><meta http-equiv='content-language' content='tr' /><script src='https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js'><\/script><script src='https://paracevirici.com" + o.uri + o.qs() + "'><\/script><script>$(function(){window.xWidget(" + r + ")});<\/script></head><body></body></html>"), c.document.close()
        }), this
    }
}(jQuery);