'use strict'
var path = require('path')
var config = require('../config')
var Wechat = require('../wechat/wechat')
var menu = require('./menu')
var wechatApi = new Wechat(config.wechat)

// wechatApi.deleteMenu().then(function () {
//     return wechatApi.createMenu(menu)
// }).then(function (msg) {
//     console.log(msg)
// })

exports.reply = function* (next) {
  var message = this.weixin
  console.log(message)
  if (message.MsgType === 'event') {
    if (message.Event === 'subscribe') {
      if (message.EventKey) {
        console.log('扫描带参数二维码事件：' + message.EventKey + ' ' + message.ticket)
      }
      console.log('关注')
      this.body = '哈哈，你订阅了这个号\r\n'
    } else if (message.Event === 'unsubscribe') {
      console.log('取关')
      this.body = ''
    } else if (message.Event === 'SCAN') {
      this.body = '关注后扫描二维码' + message.EventKey + message.Ticket
    } else if (message.Event === 'LOCATION') {
      this.body = '您上报的位置是：' + message.Latitude + '/' + message.Longitude + '-' + message.Precision
    } else if (message.Event === 'CLICK') {
      this.body = '您点击了菜单：' + message.EventKey
    } else if (message.Event === 'VIEW') {
      this.body = '您点击了菜单中的链接' + message.EventKey
    } else if (message.Event === 'scancode_push') {
        this.body = '您点击了菜单中的扫码推事件' + message.EventKey
    } else if (message.Event === 'scancode_waitmsg') {
        this.body = '您点击了菜单中的扫码带提示' + message.EventKey
    } else if (message.Event === 'pic_sysphoto') {
        this.body = '您点击了菜单中的系统拍照发图' + message.EventKey
    } else if (message.Event === 'pic_photo_or_album') {
        this.body = '您点击了菜单中的拍照或者相册发图' + message.EventKey
    } else if (message.Event === 'pic_weixin') {
        this.body = '您点击了菜单中的微信相册发图' + message.EventKey
    } else if (message.Event === 'location_select') {
        // console.log(message)
        this.body = '您点击了菜单中的发送位置' + message.EventKey
    } else if (message.Event === 'media_id') {
        this.body = '您点击了菜单中的图片' + message.EventKey
    } else if (message.Event === 'view_limited') {
        this.body = '您点击了菜单中的图文消息' + message.EventKey
    }
  } else if (message.MsgType === 'text') {
    var content = message.Content
    var reply = '额，您说的太复杂啦'
    // 1-文本  2-图文
    // 3-临时-上传图片 4-临时-上传视频 5-临时-上传音乐
    // 6-永久-上传图片 7-永久-上传视频
    // 8-永久-上传图文 9-永久-总数和列表
    // 10-用户-用户信息 11-用户-用户列表
    // 12-标签-创建 13-标签-批量为用户打上标签
    // 14-群发-根据分组群发
    // 15-智能-语义理解
    if (content === '1') {
      reply = '您说的是1吗'
    } else if (content === '2') {
      reply = [
        {
          title: '科技改变世界',
          description: '科技改变世界de描述',
          picUrl: 'https://img4.duitang.com/uploads/item/201402/14/20140214120558_2f4NN.jpeg',
          url: 'https://www.baidu.com/'
        },
        {
          title: '知识改变命运',
          description: '知识改变命运de描述',
          picUrl: 'https://www.zcool.com.cn/community/0372d195ac1cd55a8012062e3b16810.jpg',
          url: 'https://www.baidu.com/'
        }
      ]
    } else if (content === '3') {
      var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../3.jpg'))
      reply = {
        type: 'image',
        mediaId: data.media_id
      }
    } else if (content === '4') {
        var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../4.mp4'))
        reply = {
            type: 'video',
            title: '回复视频内容',
            description: '描述：回复视频内容',
            mediaId: data.media_id
        }
    } else if (content === '5') {
        var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../3.jpg'))
        reply = {
            type: 'music',
            musicUrl: 'https://music.163.com/outchain/player?type=2&id=1296550461&auto=1&height=66',
            title: '回复音乐内容',
            description: '描述：回复音乐内容',
            mediaId: data.media_id
        }
    } else if (content === '6') {
        var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../3.jpg'), {type: 'image'})
        reply = {
            type: 'image',
            mediaId: data.media_id
        }
        console.log(JSON.stringify(data))
    } else if (content === '7') {
        var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, '../4.mp4'), {
          type: 'video',
          description: '{"title": "VIDEO_TITLE", "introduction": "INTRODUCTION"}'
        })
        reply = {
            type: 'video',
            title: '回复视频内容',
            description: '描述：回复视频内容',
            mediaId: data.media_id
        }
    } else if (content === '8') {
        var picData = yield wechatApi.uploadMaterial('image', path.join(__dirname, '../3.jpg'), {type: 'image'})
        var media = {
            articles: [{
                "title": '上传永久图文素材',
                "thumb_media_id": picData.media_id,
                "author": 'WHL',
                "digest": '摘要',
                "show_cover_pic": 1,
                "content": '文章内容',
                "content_source_url": 'https://www.baidu.com/',
                "need_open_comment":1,
                "only_fans_can_comment":1
            }]
        }
        var data = yield wechatApi.uploadMaterial('news', media, {type: 'news'})
        data = yield wechatApi.fetchMaterial(data.media_id, 'news', {type: 'news'})
        var items = data.news_item
        var news = []
        items.forEach(function (item) {
            news.push({
                title: item.title,
                description: item.digest,
                picUrl: picData.url,
                url: item.url
            })
        })
        reply = news
    } else if (content === '9') {
        var counts = yield wechatApi.countMaterial()
        console.log(JSON.stringify(counts))
        var results = yield [
            wechatApi.batchMaterial({
                type: 'image',
                offset: 0,
                count: 10
            }),
            wechatApi.batchMaterial({
                type: 'video',
                offset: 0,
                count: 10
            }),
            wechatApi.batchMaterial({
                type: 'voice',
                offset: 0,
                count: 10
            }),
            wechatApi.batchMaterial({
                type: 'news',
                offset: 0,
                count: 10
            })
        ]
        console.log(JSON.stringify(results))
        reply = '获得永久素材的总数和列表'
    } else if (content === '10') {
        var user = yield wechatApi.fetchUsers(message.FromUserName)
        console.log(user)
        var openIds = [
            {openid: message.FromUserName, lang: 'en'}
        ]
        var users = yield wechatApi.fetchUsers(openIds)
        console.log(users)
        reply = JSON.stringify(user)
    } else if (content === '11') {
        var users = yield wechatApi.listUser()
        console.log(users)
        reply = JSON.stringify(users)
    } else if (content === '12') {
        var tag = yield wechatApi.createTags('标签1')
        var tags = yield wechatApi.getTags()
        console.log(tag, tags)
        reply = JSON.stringify(tags)
    } else if (content === '13') {
        var data = yield wechatApi.batchtaggingTags([message.FromUserName], 100)
        console.log(JSON.stringify(data))
        reply = JSON.stringify(data)
    } else if (content === '14') {
        var mpnews = {
            media_id: 'IU54yYJ6rk-qpA6GGQZrhjlGZf1OFgFVuQdohK8IMAk'
        }
        var text = {
            content: 'Hello Wechat'
        }
        var msgData = yield wechatApi.sendByGroup('text', text, 100)
        console.log(msgData)
        reply = 'Yeah'
    } else if (content === '15') {
        var data = yield  wechatApi.semantic({
            "query":"查一下明天从北京到上海的南航机票",
            "city":"北京",
            "category": "flight,hotel",
            "appid":"wxaaaaaaaaaaaaaaaa",
            "uid":"123456"
        })
        reply = JSON.stringify(data)
    }
    this.body = reply
  }
  yield next
}