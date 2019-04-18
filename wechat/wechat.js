'use strict'
var Promise = require('bluebird')
var request = Promise.promisify(require('request'))
var util = require('./util')
var fs = require('fs')
var _ = require('lodash')

var prefix = 'https://api.weixin.qq.com/cgi-bin/'

var api = {
  accessToken: prefix + 'token?grant_type=client_credential',
  temporary: {
      upload: prefix + 'media/upload?',
      fetch: prefix + '/media/get?' // 获取下载链接
  },
  permanent: {
      upload: prefix + 'material/add_material?',
      uploadNews: prefix + 'material/add_news?',
      uploadNewsPic: prefix + 'media/uploadimg?',
      fetch: prefix + 'material/get_material?', // 获取下载链接
      delete: prefix + 'material/del_material?',
      update: prefix + 'material/update_news?',
      count: prefix + 'material/get_materialcount?',
      batch: prefix + 'material/batchget_material?'
  },
  tags: {
      create: prefix + 'tags/create?',
      get: prefix + 'tags/get?',
      update: prefix + 'tags/update?',
      delete: prefix + 'tags/delete?',
      a: prefix + 'user/tag/get?',
      batchtagging: prefix + 'tags/members/batchtagging?',
      c: prefix + 'tags/members/batchuntagging?',
      d: prefix + 'tags/getidlist?'
  },
  user: {
     remark: prefix + 'user/info/updateremark?',
     fetch: prefix + 'user/info?',
     batchFetch: prefix + 'user/info/batchget?',
     list: prefix + 'user/get?'
  },
  mass: {
     group: prefix + 'message/mass/sendall?'
  },
  menu: {
     create: prefix + 'menu/create?',
     get: prefix + 'menu/get?',
     del: prefix + 'menu/delete?',
     current: prefix + 'get_current_selfmenu_info?'
  },
  semantic: 'https://api.weixin.qq.com/semantic/semproxy/search?',
  ticket: {
      get: prefix + 'ticket/getticket?'
  }
}

function Wechat(opts) {
  var that = this
  this.appID = opts.appID
  this.appSecret = opts.appSecret
  this.getAccessToken = opts.getAccessToken
  this.saveAccessToken = opts.saveAccessToken
  this.getTicket = opts.getTicket
  this.saveTicket = opts.saveTicket
  this.fetchAccessToken()
}
// 验证票据是否合法
Wechat.prototype.isValidAccessToken = function (data) {
  if (!data || !data.access_token || !data.expires_in) {
    return false
  }
  var expires_in = data.expires_in
  var now = new Date().getTime()
  if (now < expires_in) {
    return true
  } else {
    return false
  }
}
// 更新票据access_token
Wechat.prototype.updataAccessToken = function () {
  var appID = this.appID
  var appSecret = this.appSecret
  var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret
  return new Promise(function (resolve, reject) {
      request({
          url: url,
          json: true
      }).then(function (response) {
          console.log(response)
          var data = response.body
          var now = new Date().getTime()
          var expires_in = now + (data.expires_in - 20) * 1000
          data.expires_in = expires_in
          resolve(data)
      }).catch(function (err) {
          reject(err)
      })
  })
}
// 获得票据access_token
Wechat.prototype.fetchAccessToken = function () {
  var that = this
  return this.getAccessToken().then(function (data) {
      try {
          data = JSON.parse(data)
      } catch (e) {
          return that.updataAccessToken()
      }
      if (that.isValidAccessToken(data)) {
          return Promise.resolve(data)
      } else {
          return that.updataAccessToken()
      }
  }).then(function (data) {
      // that.access_token = data.access_token
      // that.expires_in = data.expires_in
      that.saveAccessToken(data)
      return Promise.resolve(data)
  })
}
// 获得-临时素材或永久素材
Wechat.prototype.fetchMaterial = function (mediaId, type, permanent) {
    var that = this
    var fetchUrl = api.temporary.fetch
    var form = {}
    if (permanent) {
        fetchUrl = api.permanent.fetch
        _.extend(form, permanent)
    }
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = fetchUrl + 'access_token=' + data.access_token
            var form = {}
            var options = { method: "POST", url: url, json: true }
            if (permanent) {
                form.media_id = mediaId
                form.access_token = data.access_token
                options.body = form
            } else {
                if (type === 'video') {
                    url = url.replace('https://', 'http://')
                }
                url += '&media_id=' + mediaId
            }
            if (type === 'news' || type === 'video') {
                request(options).then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Fetch material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            } else {
                resolve(url)
            }
        })
    })
}
// 删除-永久素材
Wechat.prototype.deleteMaterial = function (mediaId) {
    var that = this
    var form = {
        media_id: mediaId
    }
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.permanent.delete + 'access_token=' + data.access_token + '&media_id=' + mediaId
            request({
                method: 'POST',
                url: url,
                body: form,
                json: true
            }).then(function (response) {
                var _data = response.body
                if (_data) {
                    resolve(_data)
                } else {
                    throw new Error('Delete material fails')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}
// 更新-永久素材
Wechat.prototype.updateMaterial = function (mediaId, news) {
    var that = this
    var form = {
        media_id: mediaId
    }
    _.extend(form, news)
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId
            request({
                method: 'POST',
                url: url,
                body: form,
                json: true
            }).then(function (response) {
                var _data = response.body
                if (_data) {
                    resolve(_data)
                } else {
                    throw new Error('Update material fails')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}
// 总数-永久素材
Wechat.prototype.countMaterial = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.permanent.count + 'access_token=' + data.access_token
            request({
                method: 'GET',
                url: url,
                json: true
            }).then(function (response) {
                var _data = response.body
                if (_data) {
                    resolve(_data)
                } else {
                    throw new Error('Count material fails')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}
// 列表-永久素材
Wechat.prototype.batchMaterial = function (options) {
    var that = this
    options.type = options.type || 'image'
    options.offset = options.offset || 0
    options.count = options.count || 1
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.permanent.batch + 'access_token=' + data.access_token
            request({
                method: 'POST',
                url: url,
                body: options,
                json: true
            }).then(function (response) {
                var _data = response.body
                if (_data) {
                    resolve(_data)
                } else {
                    throw new Error('Batch material fails')
                }
            }).catch(function (err) {
                reject(err)
            })
        })
    })
}
// 上传-临时素材或永久素材
Wechat.prototype.uploadMaterial = function (type, material, permanent) {
  // material 图文-数组，图片或视频其他-字符串
  var that = this
  var form = {}
  var uploadUrl = api.temporary.upload
  if (permanent) {
      uploadUrl = api.permanent.upload
      _.extend(form, permanent)
  }
  if (type === 'pic') {
      uploadUrl = api.permanent.uploadNewsPic
  }
  if (type === 'news') {
      uploadUrl = api.permanent.uploadNews
      form = material
  } else {
      form.media = fs.createReadStream(material)
  }
  return new Promise(function (resolve, reject) {
    that.fetchAccessToken().then(function (data) {
      var url = uploadUrl + 'access_token=' + data.access_token
      if (!permanent) {
        url += '&type=' + type
      } else {
        form.access_token = data.access_token
      }
      var options = {
          method: 'POST',
          url: url,
          json: true
      }
      if (type === 'news') {
          options.body = form
      } else {
          options.formData = form
      }
      request(options).then(function (response) {
        var _data = response.body
        if (_data) {
          resolve(_data)
        } else {
          throw new Error('Upload material fails')
        }
      }).catch(function (err) {
        reject(err)
      })
    })
  })
}
// 回复
Wechat.prototype.reply = function () {
  var content = this.body
  var message = this.weixin
  var xml = util.tpl(content, message)
  this.status = 200
  this.type = 'application/xml'
  this.body = xml
}
// 用户-重命名
Wechat.prototype.remarkUser = function (openId, remark) {
    var that = this
    var form = {
        openid: openId,
        remark: remark
    }
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.user.remark + 'access_token=' + data.access_token
            request({ method: 'POST', url: url, body: form, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Remark user fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 用户-获得批量信息-获得信息
Wechat.prototype.fetchUsers = function (openIds, lang) {
    var that = this
    lang = lang || 'zh_CN'
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var options = {
                    json: true
                }
                if (_.isArray(openIds)) {
                    options.url = api.user.batchFetch + 'access_token=' + data.access_token
                    options.body = {
                        user_list: openIds
                    }
                    options.method = 'POST'
                } else {
                    options.url = api.user.fetch + 'access_token=' + data.access_token + '&openid=' + openIds + '&lang=' + lang
                    options.method = 'GET'
                }
                request(options)
                    .then(function (response) {
                        var _data = response.body
                        if (_data) {
                            resolve(_data)
                        } else {
                            throw new Error('Fetch users fails')
                        }
                    })
                    .catch(function (err) {
                        reject(err)
                    })
            })
    })
}
// 用户-列表
Wechat.prototype.listUser = function (openId) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.user.list + 'access_token=' + data.access_token
            if (openId) {
                url += '&next_openid=' + openId
            }
            request({ method: 'GET', url: url, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('List user fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 标签-创建
Wechat.prototype.createTags = function (name) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.tags.create + 'access_token=' + data.access_token
            var form = {
                tag : { name : name }
            }
            request({ method: 'POST', url: url, body: form, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Create tags fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 标签-列表
Wechat.prototype.getTags = function (name) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.tags.get + 'access_token=' + data.access_token
            request({ url: url, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Get tags fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 标签-批量为用户打上标签
Wechat.prototype.batchtaggingTags = function (openIds, tagId) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.tags.batchtagging + 'access_token=' + data.access_token
            var form = {
                openid_list: openIds,
                tagid: tagId
            }
            request({ method: 'POST', url: url, body: form, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Batchtagging tags fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 群发-根据标签进行群发
Wechat.prototype.sendByGroup = function (type, message, groupId) {
    var that = this
    var msg = {
        filter: {},
        msgtype: type
    }
    msg[type] = message
    if (!groupId) {
        msg.filter.is_to_all = true
    } else {
        msg.filter = {
            is_to_all: false,
            tag_id: groupId
        }
    }
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.mass.group + 'access_token=' + data.access_token
            request({ method: 'POST', url: url, body: msg, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Send to group fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 菜单-创建
Wechat.prototype.createMenu = function (menu) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.menu.create + 'access_token=' + data.access_token
            request({ method: 'POST', url: url, body: menu, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Create menu fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 菜单-获取
Wechat.prototype.getMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.menu.get + 'access_token=' + data.access_token
            request({ url: url, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Get menu fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 菜单-删除
Wechat.prototype.deleteMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.menu.del + 'access_token=' + data.access_token
            request({ url: url, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Delete menu fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 菜单-当前菜单
Wechat.prototype.currentMenu = function () {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.menu.current + 'access_token=' + data.access_token
            request({ url: url, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Current menu fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 智能语音
Wechat.prototype.semantic = function (semanticData) {
    var that = this
    return new Promise(function (resolve, reject) {
        that.fetchAccessToken().then(function (data) {
            var url = api.semantic + 'access_token=' + data.access_token
            semanticData.appid = data.appId
            request({ method: 'POST', url: url, body: data, json: true })
                .then(function (response) {
                    var _data = response.body
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Semantic fails')
                    }
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    })
}
// 获得ticket
Wechat.prototype.fetchTicket = function (access_token) {
    var that = this
    return this.getTicket().then(function (data) {
        try {
            data = JSON.parse(data)
        } catch (e) {
            return that.updataTicket(access_token)
        }
        if (that.isValidTicket(data)) {
            return Promise.resolve(data)
        } else {
            return that.updataTicket(access_token)
        }
    }).then(function (data) {
        that.saveAccessToken(data)
        return Promise.resolve(data)
    })
}
// 更新ticket
Wechat.prototype.updataTicket = function (access_token) {
    var url = api.ticket.get + '&access_token=' + access_token + '&type=jsapi'
    return new Promise(function (resolve, reject) {
        request({
            url: url,
            json: true
        }).then(function (response) {
            var data = response.body
            var now = new Date().getTime()
            var expires_in = now + (data.expires_in - 20) * 1000
            data.expires_in = expires_in
            resolve(data)
        }).catch(function (err) {
            reject(err)
        })
    })
}
// 验证ticket是否合法
Wechat.prototype.isValidTicket = function (data) {
    if (!data || !data.ticket || !data.expires_in) {
        return false
    }
    var ticket = data.ticket
    var expires_in = data.expires_in
    var now = new Date().getTime()
    if (ticket && now < expires_in) {
        return true
    } else {
        return false
    }
}
module.exports = Wechat