'use strict'
var Koa = require('koa');
var wechat = require('./wechat/g') // 中间件
var config = require('./config') // 配置
var wxReply = require('./wx/reply') // 自定义微信返回数据
var Wechat = require('./wechat/wechat')

var app = new Koa();

var ejs = require('ejs')
var crypto = require('crypto')
var heredoc = require('heredoc')
var tpl = heredoc(function () {/*
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>搜电影</title>
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, minimum-scale=1">
</head>
<body>
    <h1>点击标题，开始录音翻译</h1>
    <p id="title"></p>
    <div id="director"></div>
    <div id="year"></div>
    <div id="poster"></div>
    <script src="https://cdn.bootcss.com/zepto/1.2.0/zepto.js"></script>
    <script src="http://res.wx.qq.com/open/js/jweixin-1.4.0.js"></script>
    <script>
        wx.config({
            debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
            appId: 'wx7d40804a6b10949c', // 必填，公众号的唯一标识
            timestamp: '<%= timestamp %>', // 必填，生成签名的时间戳
            nonceStr: '<%= noncestr %>', // 必填，生成签名的随机串
            signature: '<%= signature %>', // 必填，签名
            jsApiList: [
                'onMenuShareAppMessage',
                'startRecord',
                'stopRecord',
                'onVoiceRecordEnd',
                'translateVoice'
            ] // 必填，需要使用的JS接口列表
        });
        wx.ready(function(){
            // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
            wx.checkJsApi({
                jsApiList: ['onVoiceRecordEnd'], // 需要检测的JS接口列表，所有JS接口列表见附录2,
                success: function(res) {
                    console.log(res)
                    // 以键值对的形式返回，可用的api值true，不可用为false
                    // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
                }
            });
            // 初始化分享
            var shareContent = {
                title: 'hahaaaaahhahah', // 分享标题
                desc: '', // 分享描述
                link: '', // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                imgUrl: '', // 分享图标
                type: '', // 分享类型,music、video或link，不填默认为link
                dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
                success: function () { // 用户点击了分享后执行的回调函数
                    window.alert('分享成功')
                },
                cancel: function () {
                    window.alert('分享失败')
                }
            }
            wx.onMenuShareAppMessage(shareContent)

            var isRecording = false
            $('h1').on('click', function () {
                if (!isRecording) {
                    isRecording = true
                    wx.startRecord({
                        cancel: function () {
                            window.alert('那就不能搜索电影啦')
                        }
                    })
                    return
                } else {
                    isRecording = false
                    wx.stopRecord({
                        success: function (res) {
                            var localId = res.localId;
                            wx.translateVoice({
                                localId: localId, // 需要识别的音频的本地Id，由录音相关接口获得
                                isShowProgressTips: 1, // 默认为1，显示进度提示
                                success: function (res) {
                                    var result = res.translateResult // 语音识别的结果
                                    $.ajax({
                                        type: 'get',
                                        url: 'https://api.douban.com/v2/movie/search?q=' + result,
                                        dataType: 'jsonp',
                                        jsonp: 'callback',
                                        success: function (data) {
                                            var subject = data.subjects[0]
                                            // console.log(subject)
                                            $('#title').html(subject.title)
                                            $('#director').html(subject.directors[0].name)
                                            $('#year').html(subject.year)
                                            $('#poster').html('<img src="' + subject.images.large + '">')
                                            shareContent = Object.assign({}, shareContent, {
                                                title: subject.title, // 分享标题
                                                desc: '我搜出来的电影' + subject.title, // 分享描述
                                                link: 'www.baidu.com', // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
                                                dataUrl: subject.images.large,
                                                type: 'link', // 分享类型,music、video或link，不填默认为link
                                            })
                                            wx.onMenuShareAppMessage(shareContent)
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            })
        });
    </script>
</body>
</html>

*/})

// 创建随机字符串
var createNonce = function () {
    return Math.random().toString(36).substr(2, 15)
}
// 创建时间戳
var createTimestamp = function () {
    return parseInt(new Date().getTime() / 1000, 10) + ''
}
// 加密算法
var _sign = function (noncestr, ticket, timestamp, url) {
    var params = [
        'noncestr=' + noncestr,
        'jsapi_ticket=' + ticket,
        'timestamp=' + timestamp,
        'url=' + url
    ]
    var str = params.sort().join('&')
    var shasum = crypto.createHash('sha1')
    shasum.update(str)
    return shasum.digest('hex')
}

// 签名算法
function sign (ticket, url) {
    var noncestr = createNonce()
    var timestamp = createTimestamp()
    var signature = _sign(noncestr, ticket, timestamp, url)
    return {
        noncestr: noncestr,
        timestamp: timestamp,
        signature: signature
    }
}

app.use(function *(next) {
    // 若访问链接匹配movie，则返回html页面
    if (this.url.indexOf('/movie') > -1) {
        var wechatApi = new Wechat(config.wechat)
        var data = yield wechatApi.fetchAccessToken()
        var access_token = data.access_token
        var ticketData = yield wechatApi.fetchTicket(access_token)
        var ticket = ticketData.ticket
        var url = this.href.replace(':1234', '')
        var params = sign(ticket, url)
        this.body = ejs.render(tpl, params)
        return next
    }
    yield next
})
app.use(wechat(config.wechat, wxReply.reply));

app.listen(80);
console.log('Listening: 1234');