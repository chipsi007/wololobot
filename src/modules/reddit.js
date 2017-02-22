const assign = require('object-assign')
const Promise = require('bluebird')
const request = require('request')

const debug = require('debug')('wololobot:random-reddit')

const withFullStop = str => '.,…!?‽'.indexOf(str.substr(-1)) === -1? str + '.'
                          : /* already has a punctuation mark */     str

const cleanTitle = title => withFullStop(title.trim().replace(/^"|^,,|"$/g, ''))
const enquote = str => `"${str}"`

const requestP = (...args) => new Promise((resolve, reject) =>
  request(...args, (err, res) => err?    reject(err)
                               : /* _ */ resolve(res)))

const getNextQuote = (sub, minKarma, attempts = 0) =>
  requestP({ uri: `https://www.reddit.com/r/${sub}/random.json?_=${Math.random()}`
           , json: true })
    // weeeh. property.access.is.so.much.fun()
    .then(res => res.body[0].data.children[0].data)
    .then(post =>
      attempts < 5 && post.ups < minKarma? getNextQuote(sub, minKarma, attempts + 1)
    : /* otherwise, accept a bad quote */  cleanTitle(post.title)
    )

module.exports = function (opts) {
  opts = assign({
    sub: 'random'
  , min_karma: 1
  }, opts)

  let quote = getNextQuote(opts.sub, opts.min_karma)

  return function reddit(bot) {
    bot.command('!quote', { throttle: 2000 }, (message) => {
      quote
        .then(enquote)
        .then(bot.action.bind(bot))
        .catch(e => { bot.send(`@${message.user} Could not find quote: ${e.message}`) })
      quote = getNextQuote(opts.sub, opts.min_karma)
    })
  }
}
