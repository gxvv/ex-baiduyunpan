// ==UserScript==
// @name         EX-百度云盘
// @namespace    https://github.com/gxvv/ex-baiduyunpan/
// @version      0.3.3
// @description  [下载大文件] [批量下载] [文件夹下载] [百度网盘] [百度云盘] [企业版]
// @description  [baidu] [baiduyun] [yunpan] [baiduyunpan] [eyun]
// @author       gxvv
// @license      MIT
// @supportURL   https://github.com/gxvv/ex-baiduyunpan/issues
// @updateURL    https://gxvv.github.io/ex-baiduyunpan/EX-baiduyunpan.user.js
// @date         01/01/2017
// @modified     20/08/2018
// @match        *://pan.baidu.com/disk/home*
// @match        *://yun.baidu.com/disk/home*
// @match        *://pan.baidu.com/s/*
// @match        *://yun.baidu.com/s/*
// @match        *://pan.baidu.com/share/link?*
// @match        *://yun.baidu.com/share/link?*
// @match        *://eyun.baidu.com/s/*
// @match        *://eyun.baidu.com/enterprise/share/link?*
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_info
// @require      https://cdn.bootcss.com/babel-standalone/6.26.0/babel.min.js
// @require      https://cdn.bootcss.com/clipboard.js/1.5.16/clipboard.min.js
// ==/UserScript==

/* jshint ignore:start */
var inline_src = (<><![CDATA[
    /* jshint ignore:end */
    /* jshint esnext: false */
    /* jshint esversion: 6 */

    (({require, define, Promise}) => {
        let showError = msg => {
            GM_addStyle(`#errorDialog {position: fixed;top: 76.5px; bottom: auto; left: 423px; right: auto;background: #fff;border: 1px solid #ced1d9;border-radius: 4px;box-shadow: 0 0 3px #ced1d9;color: black;word-break: break-all;display: block;width: 520px;padding: 10px 20px;z-index: 9999;}
                         #errorDialog h3 {border-bottom: 1px solid #ced1d9;font-size: 1.5em;font-weight: bold;}
                         #errorDialog .very-very-important {font-size: 20px;font-weight: bold;}
                         `);
            let div = document.createElement('div');

            div.innerHTML = `<div id="errorDialog">
                                <h3>EX-baiduyunpan:程序异常</h3>
                                <div class="dialog-body">
                                    <p>
                                        请尝试
                                        <a href="https://gxvv.github.io/ex-baiduyunpan/EX-baiduyunpan.user.js" target="_blank">更新脚本</a>
                                        或复制以下信息
                                        <a href="https://github.com/gxvv/ex-baiduyunpan/issues" target="_blank">提交issue</a>
                                        <span class="very-very-important">(请不要提交重复的issue)</span>
                                    </p>
                                    <p>Exception: ${msg}</p>
                                    <p>Script Ver: ${GM_info.script.version}</p>
                                    <p>TemperMonkey Ver: ${GM_info.version}</p>
                                    <p>UA: ${navigator.userAgent}</p>
                                </div>
                                <hr>
                                <a class="close" href="javascript:;">关闭</a>
                             </div>`;
            div.addEventListener('click', div.remove);
            document.body.appendChild(div);
        };

        define('ex-yunpan:pageInfo', () => {
            const URL_HREF = location.href;
            const MATCHS = {
                'https?://(pan|yun).baidu.com/disk/home.*': 'pan',
                'https?://(pan|yun).baidu.com/s/.*': 'share',
                'https?://(pan|yun).baidu.com/share/link\?.*': 'share',
                'https?://eyun.baidu.com/(s|enterprise)/.*': 'enterprise'
            };
            const PAGE_CONFIG = {
                pan: {
                    prefix: 'function-widget-1:',
                    product: 'pan',
                    containers: ['.g-button[title="\u79bb\u7ebf\u4e0b\u8f7d"]'],
                    style: () => {}
                },
                share: {
                    prefix: 'function-widget-1:',
                    product: 'share',
                    containers: [
                        'div:not(.file-name)>div>.x-button-box>.g-button[title^="\u4e0b\u8f7d"]',
                        '.module-share-top-bar .x-button-box>.g-button[title="\u4e0b\u8f7d"]'
                    ],
                    style: () => {
                        let style = `.KPDwCE .QxJxtg {z-index: 2;}
                                     .module-share-header .slide-show-right {width: auto;}
                                     .ex-yunpan-dropdown-button.g-dropdown-button.button-open .menu {z-index:41;}
                                     .module-share-header .slide-show-header h2 {width:210px;}
                                     .g-dropdown-button.ex-yunpan-dropdown-button {margin: 0 5px!important;}`;

                        GM_addStyle(style);
                    }
                },
                enterprise: {
                    prefix: 'business-function:',
                    product: 'enterprise',
                    containers: ['div:not(.operate)>.button-box-container>.g-button[title="\u4e0b\u8f7d"]'],
                    style: () => {
                        let style= `.ex-yunpan-dropdown-button .icon-download{background-image: url(/box-static/business-function/infos/icons_z.png);}
                                    .ex-yunpan-dropdown-button .g-button:hover .icon-download{background-position: 0px -34px;}`;

                        GM_addStyle(style);
                    }
                }
            };
            let currentPage = 'pan';

            for (let match in MATCHS) {
                if (new RegExp(match).test(URL_HREF)) {
                    currentPage = MATCHS[match];
                    break;
                }
            }
            return PAGE_CONFIG[currentPage];
        });

        define('ex-yunpan:ctx', require => {
            let {product} = require('ex-yunpan:pageInfo');
            let prefix = product === 'enterprise' ? 'business-core:' : 'system-core:';
            let {instanceForSystem: ctx} = require(`${prefix}context/context.js`);

            return ctx;
        });

        define('ex-yunpan:pluginInit', async require => {
            let ctx = require('ex-yunpan:ctx');
            let {prefix} = require('ex-yunpan:pageInfo');
            let {pageInfo: {currentProduct = 'pan'} = {currentProduct: 'pan'}} = ctx;
            let currPrdIsEyun = currentProduct === 'enterprise';

            require.async(`${prefix}download/service/guanjiaConnector.js`, gjc => {
                gjc.init = () => ctx.ui.tip({mode: 'caution',
                                             msg: 'EX-baiduyunpan: 检测到正在调用云管家，若脚本失效，请检查更新',
                                             autoClose: false,
                                             hasClose: true});
            });
            let ddsScript = currPrdIsEyun ? 'downloadDirectService.js' : 'downloadDirect.js';

            require.async(`${prefix}download/service/${ddsScript}`, dds => {
                let funName = currPrdIsEyun ? 'straightforwardDownload' : 'start';
                let _ = dds[funName];

                if (typeof _ !== 'function') return;
                dds[funName] = (...args) => {
                    ctx.ui.tip({mode: 'loading',
                                msg: 'EX-baiduyunpan: 正在开始下载...'});
                    _.apply(null, args);
                };
            });
            require.async(`${prefix}download/util/context.js`, context => {
                context.getContext = () => ctx;
            });
            let limitedIsRemoved = await new Promise((resolve, reject) => {
                unsafeWindow.addEventListener('load', () => reject(false));
                if (currPrdIsEyun) {
                    require.async(`${prefix}download/service/downloadManager.js`, dm => {
                        dm.MODE_PRE_INSTALL = dm.MODE_PRE_DOWNLOAD;
                        resolve(true);
                    });
                } else {
                    require.async(`${prefix}download/config.js`, config => {
                        [].push.apply(config.directDownloadkeysConfig, config.guanjiaDownloadkeysConig);
                        config.guanjiaDownloadkeysConig = [];
                        resolve(true);
                    });
                }
            }).catch(result => false);

            if (limitedIsRemoved) {
                let tipConfig = {
                    mode: 'success',
                    msg: 'EX-baiduyunpan: 插件加载成功'
                };

                try {
                    await require('ex-yunpan:downloadBtnInit');
                } catch (e) {
                    tipConfig = {
                        mode: 'caution',
                        msg: 'EX-baiduyunpan: 插件加载成功，按钮初始化失败',
                        autoClose: false,
                        hasClose: true
                    };
                }
                ctx.ui.tip(tipConfig);
            } else {
                if(document.querySelector('#share_nofound_des,#error-info') !== null) return;
                throw new Error('插件加载失败 core crack failed');
            }
        });

        define('ex-yunpan:downloadBtnInit', async require => {
            let ctx = require('ex-yunpan:ctx');
            let {pageInfo: {currentProduct = ''} = {currentProduct: ''}} = ctx;
            let pageInfo = require('ex-yunpan:pageInfo');
            let {prefix} = pageInfo;
            let fetchDownLinks = require('ex-yunpan:fetchDownLinks');
            let menus = [
                {
                    title: '普通下载',
                    click: () => {
                        let {start} = require(`${prefix}download/start.js`);

                        start(ctx);
                    },
                    enablePrd: ['pan', 'share', 'enterprise']
                }, {
                    title: '复制链接',
                    click: async () => {
                        let result = await fetchDownLinks();

                        if (result.length === 0) return;
                        let {show} = require('ex-yunpan:clipboardDialog');

                        show(result);
                    },
                    enablePrd: ['pan', 'share', 'enterprise']
                }, {
                    title: '复制压缩链接',
                    click: async () => {
                        let result = await fetchDownLinks('batch');

                        if (result.length === 0) return;
                        let {show} = require('ex-yunpan:clipboardDialog');

                        show(result);
                    },
                    enablePrd: ['pan', 'share', 'enterprise']
                }, {
                    title: `<iframe src="https://ghbtns.com/github-btn.html?user=gxvv&repo=ex-baiduyunpan&type=star&count=true"
                            frameborder="0" scrolling="0" style="margin-top: 6px;height: 20px;width: 170px;"></iframe>`,
                    enablePrd: ['pan', 'share', 'enterprise']
                }
            ];
            let exDlBtnConfig = {
                type: 'dropdown',
                title: 'EX-下载',
                resize: true,
                menu: menus.filter(menu => ~menu.enablePrd.indexOf(currentProduct)),
                icon: 'icon-download'
            };
            let selectors = pageInfo.containers.join();
            let elements = [].slice.call(document.querySelectorAll(selectors) || [], 0);

            elements.forEach(element => {
                let exDlBtn = ctx.ui.button(exDlBtnConfig);

                exDlBtn.dom.addClass('ex-yunpan-dropdown-button').insertAfter(element);
                exDlBtn.resizeButtonWidth();
            });
            pageInfo.style();
        });

        define('ex-yunpan:fetchDownLinks', () => {
            let ctx = require('ex-yunpan:ctx');
            let {prefix} = require('ex-yunpan:pageInfo');
            let dServ = null;

            new Promise((resolve, reject) => {
                unsafeWindow.addEventListener('load', () => reject());
                require.async(`${prefix}download/service/dlinkService.js`, dlinkService => resolve(dlinkService));
            }).then(dlinkService => dServ = dlinkService).catch(() => dServ = false);
            let fetchDownLinks = async type => {
                let selectedList = ctx.list.getSelected();

                if (selectedList.length === 0) {
                    ctx.ui.tip({mode: 'caution',
                                msg: 'EX-baiduyunpan: 您还没有选择下载的文件'});
                    return [];
                }
                let {pageInfo: {currentProduct = 'pan'} = {currentProduct: 'pan'}} = ctx;
                let foldersList = selectedList.filter(item => item.isdir === 1);
                let filesList = selectedList.filter(item => item.isdir === 0);

                if (filesList.length > 0 && currentProduct !== 'enterprise' && type === 'nolimit') {
                    foldersList.unshift(filesList);
                } else {
                    [].push.apply(foldersList, filesList);
                }
                ctx.ui.tip({mode: 'loading',
                            msg: '开始请求链接...'});
                let requestMethod;

                if (currentProduct === 'pan') {
                    requestMethod = (list, callback) => {
                        dServ.getDlinkPan(dServ.getFsidListData(list),
                                          type || (list.isdir === 1 ? 'batch' : 'nolimit'),
                                          callback,
                                          undefined,
                                          undefined,
                                          'POST');
                    };
                } else if (currentProduct === 'share') {
                    let {shareid, uk, sign, timestamp} = require('disk-share:widget/data/yunData.js').get();

                    requestMethod = (list, callback) => {
                        dServ.getDlinkShare({
                                                list,
                                                sign,
                                                timestamp,
                                                share_id: shareid,
                                                share_uk: uk,
                                                type: type || (list.isdir === 1 ? 'batch' : 'nolimit')
                                            }, callback);
                    };
                } else {
                    let {shareid, uk, sign, timestamp} = require('page-common:widget/data/yunData.js').get();

                    requestMethod = (list, callback) => {
                        dServ.getDlinkShare({
                                                sign,
                                                timestamp,
                                                share_id: shareid,
                                                share_uk: uk,
                                                list: [list],
                                                isForBatch: type === 'batch'
                                            }, callback);
                    };
                }
                let timeout = foldersList.length === 1 ? 3e4 : 3e3;
                let promises = foldersList.map(e => new Promise((resolve, reject) => {
                    setTimeout(() => resolve(Object.assign({}, e)), timeout);
                    requestMethod(e, result => resolve(Object.assign({}, e, result)));
                }));
                let result = await Promise.all(promises);

                ctx.ui.hideTip();
                let failedRes = result.filter(res => res.errno !== 0);

                if (failedRes.length > 0) {
                    try {
                        dServ.dialog.hide();
                    } catch (e) {/* do nothing */}
                    ctx.ui.tip({mode: 'caution',
                                msg: `EX-baiduyunpan: ${failedRes.length}个文件请求链接失败`});
                }
                let dlinks = [];

                result.filter(res => res.errno === 0).forEach(res => {
                    if (typeof res.dlink === 'string') {
                        let fileType = res.isdir ? '【文件夹】' : '【文件】';
                        let packNameEncode =  encodeURIComponent(`${fileType}${res.server_filename}.zip`);
                        let dlink = `${res.dlink}&zipname=${packNameEncode}`;

                        dlinks.push(res.dlink && dlink);
                    } else {
                        let linklist = res.dlink || res.list || [];

                        [].push.apply(dlinks, linklist.map(e => e.dlink));
                    }
                });
                if (dlinks.length === 0) {
                    ctx.ui.tip({mode: 'caution',
                                msg: 'EX-baiduyunpan: 未获取到下载链接，请重试'});
                }
                return dlinks;
            };

            return fetchDownLinks;
        });
        define('ex-yunpan:clipboardDialog', () => {
            let ctx = require('ex-yunpan:ctx');
            let show = list => {
                let clipboard;
                let maxrow = list.length > 10 ? 11 : list.length + 1;
                let textareaHtml = `<textarea id="ExTextArea" rows="${maxrow}"
                                    style="width: 100%;white-space: nowrap;resize: none">${list.join('\n')}</textarea>`;
                let dialog = ctx.ui.confirm({
                    title: '复制链接',
                    body: textareaHtml,
                    sureText: '复制',
                    onClose: () => {
                        if (clipboard && clipboard.destory) {
                            clipboard.destroy();
                        }
                    }
                });

                dialog.buttonIns[0].dom.attr({
                    'data-clipboard-action': 'copy',
                    'data-clipboard-target': '#ExTextArea'
                }).addClass('ex-clip-btn').off();
                clipboard = new Clipboard('.ex-clip-btn');
                clipboard.on('success', e => {
                    ctx.ui.tip({mode: 'success',
                                msg: `EX-baiduyunpan: 复制${list.length}个链接`});
                    e.clearSelection();
                    dialog.hide();
                    clipboard.destroy();
                }).on('error', e => {
                    ctx.ui.tip({mode: 'caution',
                                msg: 'EX-baiduyunpan: 复制失败，请手动复制'});
                    clipboard.destory();
                });
            };

            return {
                show
            };
        });

        require('ex-yunpan:pluginInit').catch(ex => {
            showError(ex);
        });
    })(unsafeWindow);
    /* jshint ignore:start */
]]></>).toString();
var c = Babel.transform(inline_src, { presets: ["es2015", "es2016"] });
eval(c.code);
/* jshint ignore:end */
