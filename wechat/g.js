// 中间件
'use strict'
var sha1 = require('sha1');
var getRawBody = require('raw-body');
var Wechat = require('./wechat'); // 微信实例
var util = require('./util') // 工具

module.exports = function(opts, handler) {
  var wechat = new Wechat(opts)
  return function *(next) {
    // console.log(this)
    var token = opts.token
    var signature = this.query.signature
    var echostr = this.query.echostr
    var timestamp = this.query.timestamp
    var nonce = this.query.nonce
    var str = [token, timestamp, nonce].sort().join('')
    var sha = sha1(str)

    if (this.method === 'GET') {
      if (sha === signature) {
        this.body = echostr + '';
      } else {
        this.body = 'wrong'
      }
    } else if (this.method === 'POST'){
      // POST请求表示用户请求公众号
      if (sha !== signature) {
        // 排除非法接口请求
        this.body = 'wrong'
        return false
      }
      // 获取原始xml数据，并将xml数据转换为json数据
      var data = yield getRawBody(this.req, {
        length: this.length,
        limit: '1mb',
        encoding: this.charset
      })
      // console.log(data.toString())
      var content = yield util.parseXMLAsync(data)
      // console.log(content)
      var message = util.formatMessage(content.xml)
      // console.log(message)
      // 将解析后的json数据保存在实例上
      this.weixin = message
      // 收到微信提示，判断事件类型，自定义要回复的消息 call改变上下文
      yield handler.call(this, next)
      // 回复消息
      wechat.reply.call(this)
    }
  }
}