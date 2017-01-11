// ==UserScript==
// @name         EX-baiduyunpan
// @namespace    https://github.com/gxvv/ex-baiduyunpan/
// @version      0.1.0
// @description  [下载大文件] [批量下载] [文件夹下载] [百度网盘] [百度云盘] [百度云盘企业版] [baidu] [baiduyun] [yunpan] [baiduyunpan]
// @author       gxvv
// @license      MIT
// @supportURL   https://github.com/gxvv/ex-baiduyunpan/issues
// @date         01/01/2017
// @modified     01/10/2017
// @match        *://pan.baidu.com/disk/home*
// @match        *://pan.baidu.com/s/*
// @match        *://yun.baidu.com/s/*
// @match        *://pan.baidu.com/share/link?*
// @match        *://yun.baidu.com/share/link?*
// @match        *://eyun.baidu.com/s/*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_info
// ==/UserScript==

(function(require, define) {
    'use strict';

    function showError(msg) {
        GM_addStyle('#errorDialog{position: fixed;top: 76.5px; bottom: auto; left: 423px; right: auto;background: #fff;border: 1px solid #ced1d9;border-radius: 4px;box-shadow: 0 0 3px #ced1d9;color: black;word-break: break-all;display: block;width: 520px;padding: 10px 20px;z-index: 9999;}#errorDialog h3{border-bottom: 1px solid #ced1d9;font-size: 1.5em;font-weight: bold;}');
        var $;
        try {
            $ = require('base:widget/libs/jquerypacket.js');
        } catch (e) {
            var div = document.createElement('div');
            $ = function(str) {
                div.innerHTML = str;
                div.onclick = function() {
                    this.remove();
                };
                return $;
            };
            $.on = function() {
                return {
                    appendTo: function() {
                        document.body.appendChild(div);
                    }
                };
            };
        }
        var $dialog = $('<div id="errorDialog">' +
            '<h3>EX-baiduyunpan:程序异常</h3>' +
            '<div class="dialog-body"><p>请尝试更新脚本或复制以下信息提交issue</p>' +
            '<p>Exception: ' + msg + '</p>' +
            '<p>Script Ver: ' + GM_info.script.version + '</p>' +
            '<p>TemperMonkey Ver: ' + GM_info.version + '</p>' +
            '<p>UA: ' + navigator.userAgent + '</p>' +
            '</div><hr><a class="close" href="javascript:;">关闭</a></div>');
        $dialog.on('click', '.close', function(event) {
            $dialog.remove();
        }).appendTo(document.body);
    }
    define('ex-yunpan:pageInfo', function(require) {
        var url = location.href;
        var currentPage = 'pan';
        var matchs = {
            '.*://pan.baidu.com/disk/home.*': 'pan',
            '.*://pan.baidu.com/s/.*': 'share',
            '.*://yun.baidu.com/s/.*': 'share',
            '.*://pan.baidu.com/share/link?.*': 'share',
            '.*://yun.baidu.com/share/link?.*': 'share',
            '.*://eyun.baidu.com/s/.*': 'enterprise'
        };
        var PAGE_CONFIG = {
            pan: {
                prefix: 'file-widget-1:',
                containers: ['.module-toolbar .list-tools>.g-button:has(.icon-download)', '.module-list-view .list-view .undefined>.g-button:has(.icon-download)'],
                style: function() {
                    GM_addStyle('.module-toolbar .list-tools .g-dropdown-button.ex-yunpan-dropdown-button .g-button{border-radius: 0;}');
                }
            },
            share: {
                prefix: 'file-widget-1:',
                containers: ['.list-header .list-header-operatearea .list-header-operate .button-box>.g-button:has(.icon-download)', '.module-share-top-bar .button-box>.g-button:has(.icon-download)'],
                style: function() {
                    GM_addStyle('.module-toolbar .list-tools .g-dropdown-button:not(.tools-more) .g-button{border-radius: 0;}.module-list .list-view-header{z-index: 2;}.module-list .module-list-view .operate .ex-yunpan-dropdown-button .icon:before{display: none;}.module-share-header .slide-show-right{width: auto;}.ex-yunpan-dropdown-button.g-dropdown-button.button-open .menu{z-index:31;}');
                }
            },
            enterprise: {
                prefix: 'business-function:',
                containers: ['.button-box-container>.g-button:has(:contains("下载"))'],
                style: function() {
                    GM_addStyle('.ex-yunpan-dropdown-button .icon-download{background-image: url(/box-static/business-function/infos/icons_z.png?t=1476004014313);}.ex-yunpan-dropdown-button .g-button:hover .icon-download{background-position: 0px -34px;}');
                }
            }
        };
        for (var match in matchs) {
            if (new RegExp(match).test(url) === true) {
                currentPage = matchs[match];
            }
        }
        return PAGE_CONFIG[currentPage];
    });
    define('ex-yunpan:downloadBtnInit', function(require) {
        var ctx = require('system-core:context/context.js').instanceForSystem;
        var $ = require('base:widget/libs/jquerypacket.js');
        var pageInfo = require('ex-yunpan:pageInfo');
        var prefix = pageInfo.prefix;
        var dServ = null;
        require.async(prefix + 'download/service/dlinkService.js', function(dlinkService) {
            var _doError = dlinkService._doError;
            dlinkService._doError = function(errorCode) {
                if (errorCode === -20) {
                    ctx.ui.tip({
                        mode: 'caution',
                        msg: '需要输入验证码，请使用普通下载',
                        hasClose: true,
                        autoClose: false
                    });
                }
                _doError.call(dServ, errorCode);
            };
            dServ = dlinkService;
        });
        var exDlBtnConfig = {
            type: 'dropdown',
            title: 'EX-下载',
            resize: true,
            menu: [{
                title: '普通下载',
                'click': function() {
                    var start = require(prefix + 'download/start.js');
                    start.start(ctx);
                }
            }, {
                title: '复制链接',
                'click': function() {
                    var yunData;
                    var selectedList = ctx.list.getSelected();
                    var foldersList = selectedList.filter(function(e) {
                        return e.isdir === 1;
                    });
                    var filesList = selectedList.filter(function(e) {
                        return e.isdir === 0;
                    });
                    var promises = [];
                    switch (ctx.pageInfo.currentProduct) {
                        case 'pan':
                            if (filesList.length > 0) foldersList.unshift(filesList);
                            promises = foldersList.map(function(e) {
                                return new Promise(function(resolve, reject) {
                                    dServ.getDlinkPan(dServ.getFsidListData(e), e.isdir === 1 ? 'batch' : 'nolimit', function(result) {
                                        resolve($.extend({}, e.isdir === 1 ? e : {}, result));
                                        clearTimeout(timer);
                                        timer = null;
                                    }, undefined, undefined, 'POST');
                                });
                            });
                            break;
                        case 'share':
                            yunData = require('disk-share:widget/system/data/yunData.js').get();
                            if (filesList.length > 0) foldersList.unshift(filesList);
                            promises = foldersList.map(function(e) {
                                return new Promise(function(resolve, reject) {
                                    dServ.getDlinkShare({
                                        share_id: yunData.shareid,
                                        share_uk: yunData.uk,
                                        sign: yunData.sign,
                                        timestamp: yunData.timestamp,
                                        list: e,
                                        type: e.isdir === 1 ? 'batch' : 'nolimit'
                                    }, function(result) {
                                        resolve($.extend({}, e.isdir === 1 ? e : {}, result));
                                        clearTimeout(timer);
                                        timer = null;
                                    });
                                });
                            });
                            break;
                        case 'enterprise':
                            yunData = require('page-common:widget/data/yunData.js').get();
                            if (filesList.length > 0)[].push.apply(foldersList, filesList);
                            promises = foldersList.map(function(e) {
                                return new Promise(function(resolve, reject) {
                                    var config = {
                                        share_id: yunData.shareid,
                                        share_uk: yunData.uk,
                                        sign: yunData.sign,
                                        timestamp: yunData.timestamp,
                                        list: [e],
                                        type: e.isdir === 1 ? 'batch' : 'nolimit'
                                    };
                                    dServ.getDlinkShare(config, function(result) {
                                        resolve($.extend({}, e.isdir === 1 ? e : {}, result));
                                        clearTimeout(timer);
                                        timer = null;
                                    });
                                });
                            });
                            break;
                        default:
                            ctx.ui.tip({
                                mode: 'caution',
                                msg: '复制链接当前页面不可用',
                                hasClose: true,
                                autoClose: false
                            });
                            return;
                    }
                    Promise.all(promises).then(function(result) {
                        var dlinks = [];
                        result.forEach(function(e) {
                            if (e.isdir === 1) {
                                var dlink = e.dlink + "&zipname=" + encodeURIComponent('【文件夹】' + e.server_filename + '.zip');
                                dlinks.push(e.dlink && dlink);
                            } else {
                                [].push.apply(dlinks, (e.dlink || e.list || []).map(function(e) {
                                    return e.dlink;
                                }));
                            }
                        });
                        dlinks = dlinks.filter(function(e) {
                            return e !== undefined;
                        });
                        if (dlinks.length === 0) return ctx.ui.tip({
                            mode: 'caution',
                            msg: '复制失败，未获取到链接'
                        });
                        GM_setClipboard(dlinks.join('\n'));
                        ctx.ui.tip({
                            mode: 'success',
                            msg: '复制成功'
                        });
                    }).catch(function(e) {
                        if (e === 'timeout') {
                            ctx.ui.tip({
                                mode: 'caution',
                                msg: '请求超时',
                                hasClose: true,
                                autoClose: false
                            });
                        } else {
                            showError(e);
                        }
                    });
                }
            }],
            icon: 'icon-download'
        };
        var selector = pageInfo.containers.join();
        $(selector).each(function(i, e) {
            var exDlBtn = ctx.ui.button(exDlBtnConfig);
            $(e).after(exDlBtn.dom.addClass('ex-yunpan-dropdown-button'));
            exDlBtn.resizeButtonWidth();
        });
        pageInfo.style();
    });
    define('ex-yunpan:pluginInit.js', function(require, module, exports) {
        var ctx = require('system-core:context/context.js').instanceForSystem;
        var $ = require('base:widget/libs/jquerypacket.js');
        var pageInfo = require('ex-yunpan:pageInfo');
        var prefix = pageInfo.prefix;
        var dmPromise = new Promise(function(resolve, reject) {
            $(unsafeWindow).on('load', function() {
                reject('downloadManager.js');
            });
            require.async(prefix + 'download/service/downloadManager.js', function(dm) {
                dm.MODE_PRE_INSTALL = dm.MODE_PRE_DOWNLOAD;
                resolve();
            });
        });
        var gjcPromise = new Promise(function(resolve, reject) {
            $(unsafeWindow).on('load', function() {
                reject('guanjiaConnector.js');
            });
            require.async(prefix + 'download/service/guanjiaConnector.js', function(gjC) {
                gjC.init = function() {
                    setTimeout(function() {
                        ctx.ui.tip({
                            mode: 'caution',
                            msg: '检测到正在调用云管家，若脚本失效，请检查更新或提交issue',
                            hasClose: true,
                            autoClose: false
                        });
                    }, 5000);
                };
                resolve();
            });
        });
        var ddsPromise = new Promise(function(resolve, reject) {
            $(unsafeWindow).on('load', function() {
                reject('downloadDirectService.js');
            });
            require.async(prefix + 'download/service/downloadDirectService.js', function(dDS) {
                var $preDlFrame = null;
                var _ = dDS.straightforwardDownload;
                if (typeof _ !== 'function') return;
                dDS.straightforwardDownload = function() {
                    ctx.ui.tip({
                        mode: 'loading',
                        msg: '正在开始下载...'
                    });
                    if ($preDlFrame === null) {
                        setTimeout(function() {
                            var $frame = $('#pcsdownloadiframe');
                            if ($frame.length === 0) return;
                            $frame.ready(function(event) {
                                ctx.ui.hideTip();
                            });
                            $preDlFrame = $frame;
                        }, 1000);
                    }
                    _.apply(dDS, arguments);
                };
                resolve();
            });
        });
        Promise.all([dmPromise, gjcPromise, ddsPromise]).then(function() {
            try {
                require('ex-yunpan:downloadBtnInit');
                ctx.ui.tip({
                    mode: 'success',
                    msg: 'EX-baiduyunpan: 插件加载成功'
                });
            } catch (e) {
                ctx.ui.tip({
                    mode: 'caution',
                    msg: 'EX-baiduyunpan: 插件加载成功，按钮初始化失败',
                    autoClose: false,
                    hasClose: true
                });
            }
        }).catch(function(msg) {
            showError(msg + '加载失败');
        });
    });
    try {
        require('ex-yunpan:pluginInit.js');
    } catch (ex) {
        showError(ex);
    }
})(unsafeWindow.require, unsafeWindow.define);
