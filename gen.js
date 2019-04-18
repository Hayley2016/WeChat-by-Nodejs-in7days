var gen = function *(n) {
  for (var i = 0; i < 3; i++) {
    n++
    // 暂停执行后面的方法
    yield n
  }
}
var genObj = gen(2) //迭代器对象，并不会执行，只有调用next才会执行
console.log(genObj.next()) // 3
console.log(genObj.next()) // 4
console.log(genObj.next()) // 5
console.log(genObj.next())  // undefined