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
// @run-at       document-body
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_info
// ==/UserScript==

(function(require, define) {
    'use strict';
    function showError(msg){
        GM_addStyle('#errorDialog{position: fixed;top: 76.5px; bottom: auto; left: 423px; right: auto;background: #fff;border: 1px solid #ced1d9;border-radius: 4px;box-shadow: 0 0 3px #ced1d9;color: black;word-break: break-all;display: block;width: 520px;padding: 10px 20px;z-index: 9999;}#errorDialog h3{border-bottom: 1px solid #ced1d9;font-size: 1.5em;font-weight: bold;}');
        var $ = unsafeWindow.jQuery;
        var $dialog = $('<div id="errorDialog">' +
                        '<h3>EX-baiduyunpan:程序异常</h3>' +
                        '<div class="dialog-body"><p>请尝试更新脚本或复制以下信息提交issue</p>' +
                        '<p>Exception: ' + msg + '</p>' +
                        '<p>Script Ver: ' + GM_info.script.version + '</p>' +
                        '<p>TemperMonkey Ver: ' + GM_info.version + '</p>' +
                        '<p>UA: ' + navigator.userAgent + '</p>' +
                        '<p>URL: ' + location.href + '</p>' +
                        '</div><hr><a class="close" href="javascript:;">关闭</a></div>');
        $dialog.on('click', '.close', function(event){
            $dialog.remove();
        }).appendTo(document.body);
    }
    define('ex-yunpan:manifestInject', function(require, module, exports){
        GM_addStyle('.module-toolbar .list-tools .g-dropdown-button:not(.tools-more) .g-button{border-radius: 0;}');
        var exbtn = {
            "name": "ex-baiduyunpan",
            "group": "com.baidu.pan",
            "version": "1.0",
            "type": "1",
            "description": "The button plugin.",
            "supportManage": false,
            "filesType": "*",
            "contextMenu": {
                "type": "file",
                "title": "EX-\u4e0b\u8f7d",
                "index": 2
            },
            "buttons": [{
                "position": "listTools",
                "index": 3,
                "disabled": "none",
                "title": "EX-\u4e0b\u8f7d",
                "icon": "icon-download",
                "buttonStyle": "normal",
                "type": "dropdown",
                "menu": [{
                    "title": "拷贝链接",
                    "click": function(){
                        var msg = require('system-core:system/baseService/message/message.js');
                        var context = require('system-core:context/context.js');
                        var ctx = new context();
                        var filesList = ctx.list.getSelected();
                        ctx.ui.tip({autoClose: false,hasClose: false,
                                    mode: 'loading',
                                    msg: '开始获取链接...'
                                   });
                        msg.trigger("plugin:" + e.pluginId, {
                            run: 'start',
                            filesList: filesList,
                            getDlink: true,
                            callback: function(){
                                console.log('getdlink callback');
                                console.log(arguments);
                                ctx.ui.tip({autoClose: true,
                                            mode: 'success',
                                            msg: '获取成功'
                                           });
                            }
                        });
                    }
                }, {
                    "title": "显示链接",
                    'click': function (){
                        var msg = require('system-core:system/baseService/message/message.js');
                        var context = require('system-core:context/context.js');
                        var ctx = new context();
                        var filesList = ctx.list.getSelected();
                        var t = function (){
                            console.log(arguments);
                        };
                        require.async("file-widget-1:download/service/dlinkService.js", function(dServ) {
                            var n;
                            switch (n) {
                                case "mbox":
                                    break;
                                case "share":
                                    break;
                                default:
                                    dServ.getDlinkPan(dServ.getFsidListData(filesList), "batch", t, undefined, undefined, "POST");
                            }
                        });
                    }
                }]
            }],
            "preload": true,
            "entranceFile": "file-widget-1:download\/start.js",
            "depsFiles": []
        };
        unsafeWindow.manifest.push(exbtn);
    });
    define('ex-yunpan:pluginInit.js', function(require, module, exports){
        var ctx = require('system-core:context/context.js').instanceForSystem;
        var $ = require("base:widget/libs/jquerypacket.js");
        var prefix = '';
        switch(ctx.pageInfo.currentProduct){
            case "enterprise":
                prefix = 'business-function:';
                break;
            case "share":
            case "pan":
                prefix = 'file-widget-1:';
                break;
            default:
                ctx.ui.tip({
                    mode: "caution",
                    msg: '未能识别当前页面，若脚本失效，请检查更新或提交issue',
                    hasClose: true,
                    autoClose: false
                });
                prefix = 'file-widget-1:';
                break;
        }
        var pluginLoadWatcher = {
            'downloadManager.js': $.Deferred(),
            'guanjiaConnector.js': $.Deferred(),
            'downloadDirectService.js': $.Deferred()
        };
        $(unsafeWindow).on('load', function(){
            Object.values(pluginLoadWatcher).forEach(function(p, index){
                p.reject(index);
            });
        });
        $.when.apply($, Object.values(pluginLoadWatcher)).then(function(result){
            ctx.ui.tip({
                mode: "success",
                msg: 'EX-baiduyunpan: 插件加载成功'
            });
        }).fail(function(){
            var failIndex = [].slice.call(arguments);
            var keys = Object.keys(pluginLoadWatcher);
            var msg = failIndex.map(function(e){return keys[e];}).join() + '加载失败';
            showError(msg);
        });
        require.async(prefix + 'download/service/downloadManager.js', function(dm){
            dm.MODE_PRE_INSTALL = dm.MODE_PRE_DOWNLOAD;
            pluginLoadWatcher['downloadManager.js'].resolve();
        });
        require.async(prefix + "download/service/guanjiaConnector.js", function(gjC){
            gjC.init = function(){
                setTimeout(function(){
                    ctx.ui.tip({
                        mode: "caution",
                        msg: '检测到正在调用云管家，若脚本失效，请检查更新或提交issue',
                        hasClose: true,
                        autoClose: false
                    });
                }, 5000);
            };
            pluginLoadWatcher['guanjiaConnector.js'].resolve();
        });
        require.async(prefix + 'download/service/downloadDirectService.js', function(dDS){
            var $preDlFrame = null;
            var _ = dDS.straightforwardDownload;
            if(typeof _ !== 'function') return;
            dDS.straightforwardDownload = function(){
                ctx.ui.tip({
                    mode: "loading",
                    msg: '正在开始下载...'
                });
                if($preDlFrame === null){
                    setTimeout(function(){
                        var $frame = $("#pcsdownloadiframe");
                        $frame.ready(function(event){
                            ctx.ui.hideTip();
                        });
                        if($frame.length !== 0){
                            $preDlFrame = $frame;
                        }
                    }, 1000);
                }
                _.apply(dDS, arguments);
            };
            pluginLoadWatcher['downloadDirectService.js'].resolve();
        });
    });
    try{
        require('ex-yunpan:manifestInject');
    }catch(ex){
        ctx.ui.tip({
            mode: "caution",
            msg: '按钮初始化失败，若脚本失效，请检查更新或提交issue'
        });
    }
    document.addEventListener("DOMContentLoaded", function(event) {
        try{
            require('ex-yunpan:pluginInit.js');
        }catch(ex){
            showError(ex);
        }
    });
})(unsafeWindow.require, unsafeWindow.define);
