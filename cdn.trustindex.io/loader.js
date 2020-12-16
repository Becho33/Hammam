"use strict";
Element.prototype.isNodeList = function() {
    return false
};
NodeList.prototype.isNodeList = HTMLCollection.prototype.isNodeList = function() {
    return true
};
if (Trustindex === undefined) {
    var Trustindex = function() {
        return {
            loaded_css: [],
            loaded_rich_snippet: false,
            resizerTimeoutPointer: null,
            init: function() {
                let scripts = document.querySelectorAll("div[src*='.trustindex.io'],script[src*='.trustindex.io']");
                for (let i = 0; i < scripts.length; i++) {
                    if (scripts[i].getAttribute("src").search("loader") == -1) {
                        continue
                    }
                    let script_tag = scripts[i];
                    let key = scripts[i].getAttribute("src").split("?");
                    if (key.length < 2) {
                        continue
                    }
                    key = key[key.length - 1];
                    key = key.split("&")[0];
                    if (!key || key.search("=") != -1) {
                        continue
                    }
                    if (script_tag.getAttribute("data-ti-loaded")) {
                        continue
                    }
                    script_tag.insertAdjacentHTML("afterend", "<div>loading...</div>");
                    script_tag.setAttribute("data-ti-loaded", true);
                    let http = new XMLHttpRequest();
                    http.open("GET", "https://cdn.trustindex.io/widgets/" + key.substring(0, 2) + "/" + key + "/content.html");
                    http.send();
                    http.onload = function() {
                        if (http.readyState == 4 && http.status == 200) {
                            let html = http.responseText;
                            script_tag.nextSibling.remove();
                            script_tag.insertAdjacentHTML("afterend", html);
                            let widget = script_tag.nextSibling;
                            Trustindex.init_widget(widget);
                            if (widget.getAttribute("style") && widget.getAttribute("style").indexOf("border: 4px dashed red") != -1) {
                                return
                            }
                            if (!widget.layout_id) {
                                script_tag.nextSibling.innerHTML = "Layout id not found!";
                                return
                            }
                            if (!widget.container) {
                                script_tag.nextSibling.innerHTML = "Container id not found!";
                                return
                            }
                            let css_url = null;
                            if (widget.set_id || widget.pid) {
                                if (html.indexOf("<style class='scss-content'>") == -1) {
                                    css_url = "https://cdn.trustindex.io/assets/widget-presetted-css/" + widget.layout_id + "-" + widget.set_id + ".css"
                                }
                            } else {
                                css_url = "https://cdn.trustindex.io/widget-assets/css/" + widget.layout_id + "-" + (widget.classList.contains("ti-dark") ? "blue-dark" : "blue") + ".css"
                            }
                            if (css_url) {
                                if (Trustindex.loaded_css.indexOf(css_url) == -1) {
                                    Trustindex.addCSS(css_url);
                                    Trustindex.loaded_css.push(css_url)
                                }
                            }
                            Trustindex.formatReviews();
                            Trustindex.resize_widget(widget);
                            Trustindex.init_pager(widget);
                            Trustindex.replaceErrorImages()
                        } else {
                            script_tag.nextSibling.innerHTML = "Widget not found!"
                        }
                    }
                }
                Trustindex.formatReviews();
                Trustindex.replaceErrorImages();
                Trustindex.resize_widgets();
                window.addEventListener("resize", function() {
                    clearTimeout(Trustindex.resizerTimeoutPointer);
                    Trustindex.resizerTimeoutPointer = setTimeout(function() {
                        Trustindex.resize_widgets()
                    }, 1000)
                })
            },
            init_widget: function(b) {
                b.layout_id = b.getAttribute("data-layout-id");
                b.set_id = b.getAttribute("data-set-id");
                b.pid = b.getAttribute("data-pid");
                if (b.layout_id) {
                    b.layout_id = parseInt(b.layout_id)
                }
                b.container = b.querySelector(".ti-widget-container");
                b.wrapper = b.querySelector(".ti-reviews-container-wrapper");
                b.pager_autoplay_timeout = b.getAttribute("data-pager-autoplay-timeout");
                b.mouse_over = false
            },
            init_dots: function(b) {
                let dot_container = b.querySelector(".ti-controls-dots");
                if (dot_container) {
                    if (!b.container.classList.contains("ti-col-1")) {
                        Trustindex.toggleElement(dot_container, "hide")
                    } else {
                        let html = "",
                            length = b.querySelectorAll(".ti-review-item").length;
                        for (let di = 0; di < length; di++) {
                            html += '<div class="dot" data-pager-state="' + di + '"></div> '
                        }
                        dot_container.innerHTML = html;
                        Trustindex.toggleElement(dot_container);
                        dot_container.querySelector(".dot").classList.add("active")
                    }
                }
            },
            init_pager: function(b) {
                if (window.jQuery && b instanceof jQuery) {
                    b.each(function() {
                        Trustindex.init_pager(this)
                    });
                    return
                }
                if (b.isNodeList !== undefined && b.isNodeList()) {
                    b.forEach(function(c) {
                        Trustindex.init_pager(c)
                    });
                    return
                }
                if (b.layout_id === undefined) {
                    Trustindex.init_widget(b)
                }
                Trustindex.init_dots(b);
                Trustindex.setClickableParts(b);
                Trustindex.setReadMore(b);
                if (b.pager_autoplay_timeout !== null) {
                    b.pager_state = 0;
                    b.pager_moving = false;
                    b.pager_autoplay_direction = "next";
                    b.pager_position = "0px";
                    b.pager_autoplay_timeout = parseInt(b.pager_autoplay_timeout);
                    Trustindex.controlsShowHide(b);
                    b.querySelectorAll(".ti-review-item").forEach(function(c) {
                        c.style.position = "relative"
                    });
                    b.querySelector(".ti-widget-container").addEventListener("mouseenter", function(c) {
                        b.mouse_over = true
                    });
                    b.querySelector(".ti-widget-container").addEventListener("mouseleave", function(c) {
                        b.mouse_over = false
                    });
                    b.addEventListener("click", function(c) {
                        if (c.target.matches(".ti-controls .ti-next") || c.target.matches(".ti-controls .ti-prev")) {
                            c.preventDefault();
                            Trustindex.moverBtnClicked(b, c.target.classList.contains("ti-next"), "manual", 500)
                        }
                        if (c.target.matches(".ti-controls-dots .dot")) {
                            c.preventDefault();
                            Trustindex.moveReviews(b, parseInt(c.target.getAttribute("data-pager-state")), "manual", 500)
                        }
                    }, false);
                    if (b.pager_autoplay_timeout > 0) {
                        b.intervalPointer = setInterval(function() {
                            Trustindex.moverBtnClicked(b, b.pager_autoplay_direction == "next", "auto")
                        }, b.pager_autoplay_timeout * 1000)
                    }
                    let touchstartx, touchmovex, touchstartY, touchmoveY, isUpDownScroll;
                    b.querySelector(".ti-reviews-container").addEventListener("touchstart", function(c) {
                        touchstartx = c.touches[0].pageX;
                        touchstartY = c.touches[0].pageY;
                        touchmovex = null;
                        touchmoveY = null;
                        b.mouse_over = true
                    });
                    b.querySelector(".ti-reviews-container").addEventListener("touchmove", function(c) {
                        touchmovex = c.touches[0].pageX;
                        touchmoveY = c.touches[0].pageY;
                        let xmove = Math.abs(touchstartx - touchmovex);
                        let ymove = Math.abs(touchstartY - touchmoveY);
                        if (xmove > 10 || xmove > ymove) {
                            c.preventDefault()
                        }
                    });
                    b.querySelector(".ti-reviews-container").addEventListener("touchend", function(c) {
                        if (touchstartx && touchmovex && Math.abs(touchstartx - touchmovex) > 60) {
                            let direction = touchstartx > touchmovex;
                            b.querySelectorAll(".ti-review-content").forEach(function(d) {
                                d.scrollTop = 0
                            });
                            if (direction && b.isNext) {
                                Trustindex.moverBtnClicked(b, direction, "manual", 500)
                            } else {
                                if (!direction && b.isPrev) {
                                    Trustindex.moverBtnClicked(b, direction, "manual", 500)
                                }
                            }
                        }
                        touchstartx = null;
                        touchmovex = null;
                        b.mouse_over = false;
                        c.preventDefault()
                    })
                }
                b.addEventListener("click", function(c) {
                    if (c.target.matches(".disable-widget")) {
                        c.preventDefault();
                        b.remove()
                    }
                });
                b.removeEventListener("click", Trustindex.popupHandler);
                b.addEventListener("click", Trustindex.popupHandler);
                b.removeEventListener("click", Trustindex.popupCloseHandler);
                b.addEventListener("click", Trustindex.popupCloseHandler)
            },
            moverBtnClicked: function(d, e, b, c) {
                if (d.pager_moving || (d.mouse_over && b == "auto")) {
                    return false
                } else {
                    let num_reviews = d.querySelectorAll(".ti-review-item").length;
                    let num_visible_reviews = Trustindex.getVisibleReviewNum(d);
                    if (num_reviews <= num_visible_reviews) {
                        return false
                    }
                }
                let direction = e ? 1 : -1;
                Trustindex.moveReviews(d, d.pager_state + direction, b, c)
            },
            moveReviews: function(e, d, b, c) {
                e.pager_state = d;
                e.pager_moving = true;
                Trustindex.controlsShowHide(e);
                Trustindex.slideReviews(e, c);
                if (b != "auto" && e.intervalPointer !== undefined) {
                    clearInterval(e.intervalPointer);
                    delete e.intervalPointer
                }
            },
            slideReviews: function(c, b) {
                if (c.pager_position === undefined) {
                    return
                }
                if (b === undefined) {
                    b = 1000
                }
                let num_visible_reviews = Trustindex.getVisibleReviewNum(c);
                let rotate_left = (-1 * c.pager_state * c.wrapper.offsetWidth / num_visible_reviews) + "px";
                c.querySelectorAll(".ti-review-item").forEach(function(d) {
                    d.animate({
                        left: [c.pager_position, rotate_left]
                    }, {
                        duration: b,
                        fill: "both",
                        easing: "ease-in-out"
                    })
                });
                c.pager_position = rotate_left;
                setTimeout(function() {
                    c.pager_moving = false
                }, b)
            },
            setClickableParts: function(b) {
                let selector = null;
                switch (b.layout_id) {
                    case 5:
                    case 9:
                    case 13:
                        selector = ".ti-footer";
                        break;
                    case 8:
                    case 10:
                    case 34:
                        selector = ".ti-header";
                        break
                }
                let a = b.querySelector("a[href]");
                if (a && a.getAttribute("href") != "#" && selector) {
                    let container = b.querySelector(selector);
                    if (container) {
                        container.classList.add("ti-clickable-link");
                        container.addEventListener("click", function(c) {
                            if (c.target.nodeName == "A") {
                                return false
                            }
                            window.open(a.getAttribute("href"), "_blank")
                        })
                    }
                }
            },
            setReadMore: function(b, c) {
                if (typeof c == "undefined") {
                    c = 200
                }
                setTimeout(function() {
                    let loadMoreButtons = b.querySelectorAll(".ti-read-more");
                    if (loadMoreButtons) {
                        loadMoreButtons.forEach(function(d) {
                            let inner = d.previousElementSibling;
                            let fontSize = parseFloat(window.getComputedStyle(inner, null).getPropertyValue("font-size"));
                            let reviewLines = parseInt(window.getComputedStyle(inner, null).getPropertyValue("-webkit-line-clamp"));
                            let maxHeightTest = parseFloat(window.getComputedStyle(inner, null).getPropertyValue("max-height"));
                            let maxHeight = parseInt(fontSize * 1.44 * reviewLines);
                            if (inner.scrollHeight > maxHeight) {
                                d.style.display = "block";
                                d.addEventListener("click", function(f) {
                                    f.preventDefault();
                                    inner.style.setProperty("-webkit-line-clamp", "unset", "important");
                                    inner.style.setProperty("max-height", "unset", "important");
                                    d.style.display = "none"
                                })
                            } else {
                                d.style.display = "none"
                            }
                        })
                    }
                }, c)
            },
            formatReviews: function() {
                let svg_good = '<svg style="display: inline-block; vertical-align: sub;fill: #0ab21b;position:relative;top:-2px" viewBox="0 0 128 128"><path d="M64 8a56 56 0 1 0 56 56A56 56 0 0 0 64 8zm0 104a48 48 0 1 1 48-48 48 48 0 0 1-48 48zM44 64a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm48-8a8 8 0 1 1-8-8 8 8 0 0 1 8 8zm-4.8 21.6a4 4 0 0 1 .6 3.6A24.3 24.3 0 0 1 64 97c-9.7 0-15.7-4.2-19-7.8a22.7 22.7 0 0 1-4.8-8A4 4 0 0 1 44 76h40a4 4 0 0 1 3.2 1.6z"></path></svg>';
                let svg_bad = '<svg style="display: inline-block; vertical-align: sub;fill: #383838;margin-top: -1px;position:relative;top:-2px" viewBox="0 0 128 128"><path d="M64 8a56 56 0 1 0 56 56A56 56 0 0 0 64 8zm0 104a48 48 0 1 1 48-48 48 48 0 0 1-48 48zM44 64a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm48-8a8 8 0 1 1-8-8 8 8 0 0 1 8 8zm-5.2 30.2a4 4 0 1 1-5.6 5.6c-10.5-10.4-24-10.4-34.4 0a4 4 0 0 1-5.6-5.6c13.6-13.7 32-13.7 45.6 0z"></path></svg>';
                let reviews = document.querySelectorAll(".ti-widget .ti-review-content, .ti-widget .ti-inner .ti-review-text");
                if (reviews && reviews.length) {
                    reviews.forEach(function(b) {
                        let inner = b.querySelector(".ti-inner");
                        if (inner) {
                            b = inner
                        }
                        let svgs = b.querySelectorAll("svg");
                        if (svgs.length == 0) {
                            let html = b.innerHTML;
                            html = html.replace(/<img.+class="emoji" alt="☺" src="[^'"]+">/gm, svg_good + "&nbsp;&middot;&nbsp;");
                            html = html.replace(/<img.+class="emoji" alt="☹" src="[^'"]+">/gm, svg_bad + "&nbsp;&middot;&nbsp;");
                            html = html.replace("☺", svg_good + "&nbsp;&middot;&nbsp;").replace("☹", svg_bad + "&nbsp;&middot;&nbsp;");
                            html = html.replace(/\n/g, "<br />");
                            b.innerHTML = html;
                            svgs = b.querySelectorAll("svg")
                        }
                        if (svgs.length) {
                            let size = parseInt(b.style.fontSize || 14) * 0.95;
                            svgs.forEach(function(c) {
                                c.style.width = size + "px";
                                c.style.height = size + "px"
                            })
                        }
                        b.innerHTML = Trustindex.decodeHtml(b.innerHTML)
                    })
                }
            },
            defaultAvatarUrl: "https://cdn.trustindex.io/assets/default-avatar/noprofile-01.svg",
            replaceErrorImages: function() {
                let images = document.querySelectorAll(".ti-widget .ti-review-item .ti-profile-img img");
                if (images && images.length) {
                    images.forEach(function(b) {
                        if (!b.complete) {
                            b.addEventListener("error", function() {
                                this.setAttribute("src", Trustindex.defaultAvatarUrl)
                            })
                        } else {
                            if (b.naturalWidth === undefined || b.naturalWidth == 0) {
                                b.setAttribute("src", Trustindex.defaultAvatarUrl)
                            }
                        }
                    })
                }
            },
            controlsShowHide: function(b) {
                let num_reviews = b.querySelectorAll(".ti-review-item").length;
                let num_visible_reviews = Trustindex.getVisibleReviewNum(b);
                b.isPrev = true;
                b.isNext = true;
                if (b.pager_state == 0) {
                    Trustindex.toggleElement(b.querySelector(".ti-prev"), "hide");
                    b.pager_autoplay_direction = "next";
                    b.isPrev = false
                } else {
                    Trustindex.toggleElement(b.querySelector(".ti-prev"))
                }
                if (b.pager_state >= num_reviews - num_visible_reviews) {
                    Trustindex.toggleElement(b.querySelector(".ti-next"), "hide");
                    b.pager_autoplay_direction = "prev";
                    b.isNext = false
                } else {
                    Trustindex.toggleElement(b.querySelector(".ti-next"))
                }
                b.querySelectorAll(".dot").forEach(function(c) {
                    c.classList.remove("active")
                });
                let el = b.querySelector('.dot[data-pager-state="' + b.pager_state + '"]');
                if (el) {
                    el.classList.add("active")
                }
            },
            resize_widget: function(c) {
                if (c.layout_id === undefined) {
                    Trustindex.init_widget(c)
                }
                let col_count = 3;
                if (c.layout_id == 5 || c.layout_id == 13) {
                    if (c.offsetWidth < 520) {
                        c.container.setAttribute("class", "ti-widget-container ti-col-1")
                    } else {
                        if (c.offsetWidth < 750) {
                            c.container.setAttribute("class", "ti-widget-container ti-col-2")
                        } else {
                            if (c.offsetWidth < 1160) {
                                c.container.setAttribute("class", "ti-widget-container ti-col-3")
                            } else {
                                c.container.setAttribute("class", "ti-widget-container ti-col-4")
                            }
                        }
                    }
                } else {
                    if (c.layout_id == 4 || c.layout_id == 15 || c.layout_id == 16 || c.layout_id == 34 || c.layout_id == 31) {
                        if (c.offsetWidth < 540) {
                            c.container.setAttribute("class", "ti-widget-container ti-col-1");
                            col_count = 1
                        } else {
                            if (c.offsetWidth < 760) {
                                c.container.setAttribute("class", "ti-widget-container ti-col-2");
                                col_count = 2
                            } else {
                                c.container.setAttribute("class", "ti-widget-container ti-col-3");
                                col_count = 3
                            }
                        }
                    }
                }
                if (c.layout_id == 31) {
                    let reviews = c.container.querySelectorAll(".ti-review-item");
                    c.wrapper.innerHTML = "";
                    for (var b = 0, d = []; b < col_count; b++) {
                        d[b] = document.createElement("div");
                        d[b].setAttribute("class", "ti-column");
                        c.wrapper.appendChild(d[b])
                    }
                    reviews.forEach(function(f, e) {
                        d[e % col_count].appendChild(f)
                    })
                }
                Trustindex.init_dots(c);
                Trustindex.slideReviews(c)
            },
            resize_widgets: function() {
                document.querySelectorAll(".ti-widget").forEach(function(b) {
                    Trustindex.resize_widget(b)
                })
            },
            decodeHtml: function(c) {
                var b = document.createElement("textarea");
                b.innerHTML = c;
                return b.value
            },
            toggleElement: function(c, b) {
                if (b === undefined) {
                    b = "show"
                }
                if (c) {
                    c.style.display = b == "show" ? "block" : "none"
                }
            },
            getVisibleReviewNum: function(d) {
                var c = parseInt(d.container.classList.toString().replace(/^.*ti-col-(\d+).*$/, "$1"));
                var b = (d.layout_id == 5 || d.layout_id == 13) ? 1 : 0;
                c -= b;
                return Math.max(c, 1)
            },
            addCSS: function(b) {
                let link = document.createElement("link");
                link.type = "text/css";
                link.rel = "stylesheet";
                link.href = b;
                document.head.appendChild(link)
            },
            popupHandler: function(b) {
                if (b.target.matches('a[href="#dropdown"]') || b.target.matches('a[href="#popup"]')) {
                    b.preventDefault();
                    b.target.classList.toggle("active");
                    let widget = b.target.closest(".ti-widget");
                    if (widget) {
                        let popups = widget.querySelectorAll(".ti-dropdown-widget, .ti-popup-widget");
                        popups.forEach(function(c) {
                            c.classList.toggle("active")
                        });
                        Trustindex.setReadMore(widget, 10)
                    }
                }
            },
            popupCloseHandler: function(b) {
                if (b.target.matches(".ti-header .ti-close-lg")) {
                    b.preventDefault();
                    let widget = b.target.closest(".ti-widget");
                    if (widget) {
                        let header = widget.querySelector("a.ti-header[href]");
                        if (header) {
                            header.click()
                        }
                    }
                }
            }
        }
    }();
    Trustindex.init()
} else {
    Trustindex.init()
};