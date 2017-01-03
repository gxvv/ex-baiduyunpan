// ==UserScript==
// @name         EX-baiduyunpan
// @namespace    https://github.com/gxvv/ex-baiduyunpan/
// @version      0.1.0
// @description  [下载大文件] [批量下载] [文件夹下载] [百度网盘] [百度云盘] [百度云盘企业版] [baidu] [baiduyun] [yunpan] [baiduyunpan]
// @author       gxvv
// @license      MIT
// @supportURL   https://github.com/gxvv/ex-baiduyunpan/issues
// @date         01/01/2016
// @modified     01/02/2016
// @match        *://pan.baidu.com/disk/home*
// @match        *://pan.baidu.com/s/*
// @match        *://pan.baidu.com/share/link?*
// @match        *://eyun.baidu.com/s/*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_addStyle
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
            '<p>URL: ' + location.href + '</p>' +
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
            '.*://pan.baidu.com/share/link?.*': 'share',
            '.*://eyun.baidu.com/s/.*': 'enterprise'
        };
        var PAGE_CONFIG = {
            pan: {
                prefix: 'file-widget-1:',
                containers: ['.module-toolbar .list-tools', '.module-list-view .list-view .undefined'],
                style: function() {
                GM_addStyle('.module-toolbar .list-tools .g-dropdown-button.ex-yunpan-dropdown-button .g-button{border-radius: 0;}')
                }
            },
            share: {
                prefix: 'file-widget-1:',
                containers: ['.list-header .list-header-operatearea .list-header-operate .button-box', '.module-share-top-bar .button-box'],
                style: function() {
                    GM_addStyle('.module-toolbar .list-tools .g-dropdown-button:not(.tools-more) .g-button{border-radius: 0;}.module-list .list-view-header{z-index: 2;}.module-list .module-list-view .operate .ex-yunpan-dropdown-button .icon:before{display: none;}.module-share-header .slide-show-right{width: auto;}');
                }
            },
            enterprise: {
                prefix: 'business-function:',
                containers: [],
                style: function() {}
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
                title: '显示链接',
                'click': function() {
                    var selectedList = ctx.list.getSelected();
                    var foldersList = selectedList.filter(function(e){ return e.isdir === 1;});
                    var filesList = selectedList.filter(function(e){ return e.isdir === 0;});
                    require.async(prefix + 'download/service/dlinkService.js', function(dServ) {
                        switch (ctx.pageInfo.currentProduct) {
                            case 'pan':
                                if(filesList.length > 0) foldersList.unshift(filesList);
                                var promises = foldersList.map(function(e){
                                    var def = $.Deferred();
                                    dServ.getDlinkPan(dServ.getFsidListData(e), e.isdir===1?'batch':'nolimit', function(result) {
                                        console.log(result);
                                        def.resolve(result);
                                    }, undefined, undefined, 'POST');
                                    console.log(def.state());
                                    return def;
                                });
                                $.when.apply($, promises).then(function(){
                                    consnole.log(arguments);
                                }).fail(function(){
                                    console.log(arguments);
                                });
                                break;
                            case 'share':
                                var yunData = require('disk-share:widget/system/data/yunData.js').get();
                                var folderList = filesList;
                                console.log(filesList);
                                dServ.getDlinkShare({
                                    share_id: yunData.shareid,
                                    share_uk: yunData.uk,
                                    sign: yunData.sign,
                                    timestamp: yunData.timestamp,
                                    list: filesList,
                                    // type: 'nolimit'
                                    isForBatch: true
                                }, function (result) {
                                  console.log(result);
                                });
                                break;
                            default:
                                break;
                        }
                    });
                }
            }],
            icon: 'icon-download'
        };
        var selector = pageInfo.containers.map(function(e) {
            return e + '>.g-button:has(.icon-download)';
        }).join();
        $(selector).each(function(i, e) {
            var exDlBtn = ctx.ui.button(exDlBtnConfig);
            $(e).after(exDlBtn.dom.addClass('ex-yunpan-dropdown-button'));
            exDlBtn.resizeButtonWidth();
        });
        pageInfo.style();
    });
    define('ex-yunpan:pluginLoadWatcher', function(require, exports, module) {
        var ctx = require('system-core:context/context.js').instanceForSystem;
        var $ = require('base:widget/libs/jquerypacket.js');
        var pluginLoadWatcher = {
            'downloadManager.js': $.Deferred(),
            'guanjiaConnector.js': $.Deferred(),
            'downloadDirectService.js': $.Deferred()
        };
        $(unsafeWindow).on('load', function() {
            Object.values(pluginLoadWatcher).forEach(function(p, index) {
                if (p.state() === 'pending') p.reject(index);
            });
        });
        $.when.apply($, Object.values(pluginLoadWatcher)).then(function(result) {
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
        }).fail(function() {
            var failIndex = [].slice.call(arguments);
            var keys = Object.keys(pluginLoadWatcher);
            var msg = failIndex.map(function(e) {
                return keys[e];
            }).join() + '加载失败';
            showError(msg);
        });
        module.exports = pluginLoadWatcher;
    });
    define('ex-yunpan:pluginInit.js', function(require, module, exports) {
        var ctx = require('system-core:context/context.js').instanceForSystem;
        var $ = require('base:widget/libs/jquerypacket.js');
        var pageInfo = require('ex-yunpan:pageInfo');
        var prefix = pageInfo.prefix;
        var pluginLoadWatcher = require('ex-yunpan:pluginLoadWatcher');

        require.async(prefix + 'download/service/downloadManager.js', function(dm) {
            dm.MODE_PRE_INSTALL = dm.MODE_PRE_DOWNLOAD;
            pluginLoadWatcher['downloadManager.js'].resolve();
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
            pluginLoadWatcher['guanjiaConnector.js'].resolve();
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
            pluginLoadWatcher['downloadDirectService.js'].resolve();
        });
    });
    try {
        require('ex-yunpan:pluginInit.js');
    } catch (ex) {
        showError(ex);
    }
})(unsafeWindow.require, unsafeWindow.define);
