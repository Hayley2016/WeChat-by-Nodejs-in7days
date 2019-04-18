'use strict'
var path = require('path');
var util = require('./libs/util')
var wechat_file = path.join(__dirname, './config/wechat.txt')
var wechat_ticket_file = path.join(__dirname, './config/wechat_ticket.txt')
var config = {
  wechat: {
    appID: 'wx7d40804a6b10949c',
    appSecret: '8ff4dc0ca54b738b7256567f368fc23b',
    token: 'qwertyuiop123',
    getAccessToken: function () {
      return util.readFileAsync(wechat_file, 'utf-8')
    },
    saveAccessToken: function (data) {
      data = JSON.stringify(data)
      return util.writeFileAsync(wechat_file, data)
    },
    getTicket: function () {
        return util.readFileAsync(wechat_ticket_file, 'utf-8')
    },
    saveTicket: function (data) {
        data = JSON.stringify(data)
        return util.writeFileAsync(wechat_ticket_file, data)
    }
  }
};
module.exports = config