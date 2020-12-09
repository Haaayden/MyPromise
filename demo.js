const MyPromise = require('./promise')

new MyPromise((resolve) => {
  let resolvedPromise = MyPromise.resolve(111)

  resolve(resolvedPromise)
}).then((res) => {
  console.log('resolvePromise resolved', res)
})

MyPromise.resolve()
  .then(() => { console.log('promise1') })
  .then(() => { console.log('promise2') })
  .then(() => { console.log('promise3') })
MyPromise.resolve()
  .then(() => { console.log('promise11') })
  .then(() => { console.log('promise22') })
  .then(() => { console.log('promise33') })
