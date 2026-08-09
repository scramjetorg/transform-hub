'use strict'

var Transform = require('stream').Transform
var util = require('util')

exports = module.exports = function(opts) {
  return new Decoder(opts)
}
exports.decode = exports

var Decoder = exports.Decoder = function(opts) {
  this.opts = Object.assign({
    lengthSize: 4,
    maxSize: 0,
    unbuffered: false
  }, opts)

  this.getLength = this.opts.getLength || createGetLengthMethod(this.opts.lengthSize)
  this.buffer = null
  this.frameLength = -1
  this.framePos = 0

  Transform.call(this, opts)
}

util.inherits(Decoder, Transform)

Decoder.prototype._transform = function(chunk, enc, cont) {
  while (chunk.length > 0) {
    var start = this.opts.lengthSize

    if (this.buffer) {
      chunk = Buffer.concat([this.buffer, chunk])
      this.buffer = null
    }

    if (this.frameLength < 0) {
      if (chunk.length < this.opts.lengthSize) {
        this.buffer = chunk
        return cont()
      }

      this.frameLength = this.getLength(chunk)

      if (this.frameLength < 0) {
        return cont(new Error('Message length is less than zero'))
      }

      // prevent denial-of-service attacks
      if (this.opts.maxSize > 0 && this.frameLength > this.opts.maxSize) {
        return cont(new Error('Message is larger than the allowed maximum of ' + this.opts.maxSize))
      }
    } else if (this.opts.unbuffered) {
      start = 0
    }

    var end = start + this.frameLength - this.framePos

    if (this.opts.unbuffered) {
      end = Math.min(end, chunk.length)
    } else if (chunk.length < end) {
      this.buffer = chunk
      return cont()
    }

    var buf = chunk.slice(start, end)

    buf.framePos = this.framePos
    buf.frameLength = this.frameLength

    this.framePos += end - start
    buf.frameEnd = this.framePos === this.frameLength

    if (buf.frameEnd) {
      this.frameLength = -1
      this.framePos = 0
    }

    this.push(buf)

    if (chunk.length > end) {
      chunk = chunk.slice(end)
    } else {
      return cont()
    }
  }
  cont()
}

exports.encode = function(opts) {
  return new Encoder(opts)
}

var Encoder = exports.Encoder = function(opts) {
  this.opts = Object.assign({ lengthSize: 4 }, opts)

  this.setLength = this.opts.setLength || createSetLengthMethod(this.opts.lengthSize)

  Transform.call(this, opts)
}

util.inherits(Encoder, Transform)

Encoder.prototype._transform = function(message, enc, cont) {
  var length = Buffer.alloc(this.opts.lengthSize)
  this.setLength(length, message.length)
  this._pushFrameData([length, message])
  cont()
}

Encoder.prototype._pushFrameData = function(bufs) {
  this.push(Buffer.concat(bufs))
}

// backwards compatibility
exports.prefix = exports.encode
exports.FrameStream = Decoder
exports.LengthPrefixStream = Encoder

function createGetLengthMethod(lengthSize) {
  switch (lengthSize) {
    case 1:
      return function(buffer) {
        return buffer.readUInt8(0)
      }
    case 2:
      return function(buffer) {
        return buffer.readUInt16BE(0)
      }
    case 4:
      return function(buffer) {
        return buffer.readUInt32BE(0)
      }
    default:
      throw new Error('Invalid frame length size')
  }
}

function createSetLengthMethod(lengthSize) {
  switch (lengthSize) {
    case 1:
      return function(buffer, value) {
        return buffer.writeUInt8(value, 0)
      }
    case 2:
      return function(buffer, value) {
        return buffer.writeUInt16BE(value, 0)
      }
    case 4:
      return function(buffer, value) {
        return buffer.writeUInt32BE(value, 0)
      }
    default:
      throw new Error('Invalid frame length size')
  }
}
