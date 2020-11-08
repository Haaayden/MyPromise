// 定义三个常量表示状态
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

function MyPromise(exec) {
  this.status = PENDING  // 初始状态为 pending
  this.value = null      // 完成值
  this.reason = null     // 拒因

  // 使用数组存储 resolve 和 reject 回调函数
  this.onFulfilledCallbacks = []
  this.onRejectedCallbacks = []

  const self = this

  function resolve(value) {
    if (self.status === PENDING) {
      self.status = FULFILLED
      self.value = value
      // 执行所有 resolve 回调
      // 这里不需要 setTimeout，因为 callback 在被推入时已经用 setTimeout 包装过
      self.onFulfilledCallbacks.forEach(callback => {
        callback(value)
      })
    }
  }
  function reject(reason) {
    if (self.status === PENDING) {
      self.status = REJECTED
      self.reason = reason
      // 执行所有 reject 回调
      self.onRejectedCallbacks.forEach(callback => {
        callback(reason)
      })
    }
  }

  try {
    exec(resolve, reject)
  } catch (error) {
    reject(error)
  }
}

MyPromise.prototype.then = function(onFulfilled, onRejected) {
  const self = this

  if (self.status === FULFILLED) {
    const promise2 = new MyPromise(function(resolve, reject) {
      // 使用 setTimeout 包裹，保证异步执行
      setTimeout(function () {
        try {
          // onFulfilled 是函数时，对函数执行返回值 x 进行 resolvePromise
          if (typeof onFulfilled === 'function') {
            const x = onFulfilled(self.value)
            resolvePromise(promise2, x, resolve, reject)
          } else {
            // onFulfilled 不是函数时，promise2 必须成功执行并返回相同的值
            // 注意这里返回的并不是 onFulfilled
            resolve(self.value)
          }
        } catch (error) {
          // onFulfilled 执行异常时，promise2 必须拒绝执行，并返回拒因 error
          reject(error)
        }
      }, 0)
    })
    return promise2
  }

  if (self.status === REJECTED) {
    const promise2 = new MyPromise(function(resolve, reject) {
      setTimeout(function() {
        try {
          if (typeof onRejected === 'function') {
            const x = onRejected(self.reason)
            resolvePromise(promise2, x, resolve, reject)
          } else {
            reject(self.reason)
          }
        } catch (error) {
          reject(error)
        }
      }, 0)
    })
    return promise2
  }

  // 如果是 pending 状态，将回调保存起来（回调与上边相同）
  if (self.status === PENDING) {
    const promise2 = new MyPromise(function(resolve, reject) {
      self.onFulfilledCallbacks.push(() => {
        setTimeout(function () {
          try {
            if (typeof onFulfilled === 'function') {
              const x = onFulfilled(self.value)
              resolvePromise(promise2, x, resolve, reject)
            } else {
              resolve(self.value)
            }
          } catch (error) {
            reject(error)
          }
        }, 0)
      })
      self.onRejectedCallbacks.push(() => {
        setTimeout(function() {
          try {
            if (typeof onRejected === 'function') {
              const x = onRejected(self.reason)
              resolvePromise(promise2, x, resolve, reject)
            } else {
              reject(self.reason)
            }
          } catch (error) {
            reject(error)
          }
        }, 0)
      })
    })
    return promise2
  }


}

function resolvePromise(promise, x, resolve, reject) {
  // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
  // 这是为了防止死循环
  if (promise === x) {
    return reject(new TypeError('type error'))
  }

  // 如果 x 为对象或者函数
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let then = null
    try {
      then = x.then
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 error ，则以 error 为据因拒绝 promise
      return reject(error)
    }

    // 如果 then 是函数, （即 x 为 thenable）
    // 如果 then 是函数，将 x 作为函数的作用域 this 调用之。
    // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
    if (typeof then === 'function') {
      let called = false
      try {
        then.call(
          x,
          // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          function(y) {
            if (called) return
            called = true
            resolvePromise(promise, y, resolve, reject)
          },
          // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          function(r) {
            if (called) return
            called = true
            reject(r)
          },
        )
      } catch (error) {
        // 如果调用 then 方法抛出了异常 e, 以 e 为据因拒绝 promise
        if (called) return
        called = true
        reject(error)
      }
    } else {
      // then 不是函数时
      resolve(x)
    }

    return
  }

  // 如果 x 不为对象或者函数，以 x 为参数执行 promise
  resolve(x)


}

MyPromise.deferred = function () {
  const result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })

  return result
}

MyPromise.all = function(promiseList) {
  return new MyPromise((resolve, reject) => {
    let res = []
    const count = promiseList.length
    let current = 0

    if (current >= count) return resolve(res)

    promiseList.forEach((promise, index) => {
      MyPromise.resolve(promise).then((value) => {
        res[index] = value
        current++
        if (current >= count) resolve(res)
      }, reason => {
        reject(reason)
      })
    })

  })
}

MyPromise.race = function(promiseList) {
  return new MyPromise((resolve, reject) => {

    // 如果传的迭代是空的，则返回的 promise 将永远等待。
    if (promiseList.length <= 0) return

    promiseList.forEach((promise) => {
      MyPromise.resolve(promise).then(resolve, reject)
    })

  })
}

MyPromise.prototype.finally = function(callback) {
  return this.then(
    value => MyPromise.resolve(callback()).then(() => value),
    reason => MyPromise.resolve(callback()).then(() => { throw reason }),
  )
}

module.exports = MyPromise