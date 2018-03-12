// ==UserScript==
// @name         EX-百度云盘-mock
// @namespace    https://github.com/gxvv/ex-baiduyunpan/
// @version      0.2.0
// @description  ex-baiduyunpan-mock
// @author       gxvv
// @license      MIT
// @match        *://pan.baidu.com/disk/home*
// @match        *://yun.baidu.com/disk/home*
// @match        *://pan.baidu.com/s/*
// @match        *://yun.baidu.com/s/*
// @match        *://pan.baidu.com/share/link?*
// @match        *://yun.baidu.com/share/link?*
// @match        *://eyun.baidu.com/s/*
// @match        *://eyun.baidu.com/enterprise/*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

(function(require) {
    'use strict';

    var script = unsafeWindow.document.createElement('script');
    script.setAttribute('src', 'https://cdn.bootcss.com/Mock.js/1.0.0/mock-min.js');
    unsafeWindow.document.body.appendChild(script);

    script.onload = function() {
        init(unsafeWindow.Mock);
    };

    function init(Mock) {
        Mock.mock(/\/api\/download/, function(opts) {
            console.log(opts);
            if (/type=batch/.test(opts.body)) {
                return {
                    "errno": 0,
                    "request_id": 1638728891788015501,
                    "dlink": "batch-https:\/\/www.baidupcs.com\/rest\/2.0\/pcs\/file?xxxx"
                };
            } else if (/type=nolimit/.test(opts.body)) {
                return {
                    "errno": 0,
                    "request_id": 1638807446155143968,
                    "dlink": [{
                        "fs_id": "585382316377758",
                        "dlink": "nolimit-https:\/\/d.pcs.baidu.com\/file\/xxxx"
                    }, {
                        "fs_id": "719329425382101",
                        "dlink": "nolimit-https:\/\/d.pcs.baidu.com\/file\/xxxx"
                    }]
                };
            }
            return {errno: -1};
        });

        Mock.mock(/\/api\/sharedownload/, function(opts) {
            console.log(opts);
            if (/type=batch/.test(opts.body)) {
                return {
                    "errno": 0,
                    "request_id": 1638867848412003560,
                    "server_time": 1520841258,
                    "dlink": "batch-https:\/\/www.baidupcs.com\/rest\/2.0\/pcs\/file?xxxx"
                };
            }

            return {
                "errno": 0,
                "request_id": 1638837700730131957,
                "server_time": 1520841146,
                "list": [{
                    "fs_id": 168192872164822,
                    "server_filename": "\u6559\u7236BD\u53cc\u8bed\u53cc\u5b57.mkv",
                    "size": 3311639424,
                    "isdir": 0,
                    "category": 1,
                    "share": "0",
                    "dlink": "nolimit-https:\/\/d.pcs.baidu.com\/file\/xxxxx",
                }]
            };
        });
    }
})(unsafeWindow.require);
