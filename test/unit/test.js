"use strict";

var _chai = require("chai");

var _nock = _interopRequireDefault(require("nock"));

var _stream = _interopRequireDefault(require("stream"));

var UOS = _interopRequireWildcard(require("../../../dist/main/uos"));

var _helpers = require("../../../dist/main/helpers");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('source-map-support').install();

var Package = require('../../../package.json');

describe('Helpers', function () {
  it('should validate for s3 endpoint', function () {
    _chai.assert.equal((0, _helpers.isValidEndpoint)('s3.amazonaws.com'), true);
  });
  it('should validate for s3 china', function () {
    _chai.assert.equal((0, _helpers.isValidEndpoint)('s3.cn-north-1.amazonaws.com.cn'), true);
  });
  it('should validate for us-west-2', function () {
    _chai.assert.equal((0, _helpers.isValidEndpoint)('s3-us-west-2.amazonaws.com'), true);
  });
  it('should fail for invalid endpoint characters', function () {
    _chai.assert.equal((0, _helpers.isValidEndpoint)('111.#2.11'), false);
  });
  it('should validate for valid ip', function () {
    _chai.assert.equal((0, _helpers.isValidIP)('1.1.1.1'), true);
  });
  it('should fail for invalid ip', function () {
    _chai.assert.equal((0, _helpers.isValidIP)('1.1.1'), false);
  });
  it('should make date short', function () {
    var date = new Date('2012-12-03T17:25:36.331Z');

    _chai.assert.equal((0, _helpers.makeDateShort)(date), '20121203');
  });
  it('should make date long', function () {
    var date = new Date('2017-08-11T17:26:34.935Z');

    _chai.assert.equal((0, _helpers.makeDateLong)(date), '20170811T172634Z');
  });
});
describe('CopyConditions', function () {
  var date = 'Fri, 11 Aug 2017 19:34:18 GMT';
  var cc = new UOS.CopyConditions();
  describe('#setModified', function () {
    it('should take a date argument', function () {
      cc.setModified(new Date(date));

      _chai.assert.equal(cc.modified, date);
    });
    it('should throw without date', function () {
      _chai.assert.throws(function () {
        cc.setModified();
      }, /date must be of type Date/);

      _chai.assert.throws(function () {
        cc.setModified({
          hi: 'there'
        });
      }, /date must be of type Date/);
    });
  });
  describe('#setUnmodified', function () {
    it('should take a date argument', function () {
      cc.setUnmodified(new Date(date));

      _chai.assert.equal(cc.unmodified, date);
    });
    it('should throw without date', function () {
      _chai.assert.throws(function () {
        cc.setUnmodified();
      }, /date must be of type Date/);

      _chai.assert.throws(function () {
        cc.setUnmodified({
          hi: 'there'
        });
      }, /date must be of type Date/);
    });
  });
});
describe('Client', function () {
  var nockRequests = [];
  this.timeout(5000);
  beforeEach(function () {
    _nock.default.cleanAll();

    nockRequests = [];
  });
  afterEach(function () {
    nockRequests.forEach(function (element) {
      if (!element.request.isDone()) {
        element.request.done();
      }
    });
  });
  var client = new UOS.Client({
    endPoint: 'localhost',
    port: 9000,
    accessKey: 'accesskey',
    secretKey: 'secretkey',
    useSSL: false
  });
  describe('new client', function () {
    it('should work with https', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        accessKey: 'accesskey',
        secretKey: 'secretkey'
      });

      _chai.assert.equal(client.port, 443);
    });
    it('should override port with http', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'accesskey',
        secretKey: 'secretkey',
        useSSL: false
      });

      _chai.assert.equal(client.port, 9000);
    });
    it('should work with http', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        accessKey: 'accesskey',
        secretKey: 'secretkey',
        useSSL: false
      });

      _chai.assert.equal(client.port, 80);
    });
    it('should override port with https', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        port: 9000,
        accessKey: 'accesskey',
        secretKey: 'secretkey'
      });

      _chai.assert.equal(client.port, 9000);
    });
    it('should fail with url', function (done) {
      try {
        new UOS.Client({
          endPoint: 'http://localhost:9000',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
    it('should fail with alphanumeric', function (done) {
      try {
        new UOS.Client({
          endPoint: 'localhost##$@3',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
    it('should fail with no url', function (done) {
      try {
        new UOS.Client({
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
    it('should fail with bad port', function (done) {
      try {
        new UOS.Client({
          endPoint: 'localhost',
          port: -1,
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
    it('should fail when secure param is passed', function (done) {
      try {
        new UOS.Client({
          endPoint: 'localhost',
          secure: false,
          port: 9000,
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
    it('should fail when secure param is passed', function (done) {
      try {
        new UOS.Client({
          endPoint: 'localhost',
          secure: true,
          port: 9000,
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
      } catch (e) {
        done();
      }
    });
  });
  describe('User Agent', function () {
    it('should have a default user agent', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        accessKey: 'accesskey',
        secretKey: 'secretkey'
      });

      _chai.assert.equal(`UOS (${process.platform}; ${process.arch}) uos-js/${Package.version}`, client.userAgent);
    });
    it('should set user agent', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        accessKey: 'accesskey',
        secretKey: 'secretkey'
      });
      client.setAppInfo('test', '3.2.1');

      _chai.assert.equal(`UOS (${process.platform}; ${process.arch}) uos-js/${Package.version} test/3.2.1`, client.userAgent);
    });
    it('should set user agent without comments', function () {
      var client = new UOS.Client({
        endPoint: 'localhost',
        accessKey: 'accesskey',
        secretKey: 'secretkey'
      });
      client.setAppInfo('test', '3.2.1');

      _chai.assert.equal(`UOS (${process.platform}; ${process.arch}) uos-js/${Package.version} test/3.2.1`, client.userAgent);
    });
    it('should not set user agent without name', function (done) {
      try {
        var client = new UOS.Client({
          endPoint: 'localhost',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
        client.setAppInfo(null, '3.2.1');
      } catch (e) {
        done();
      }
    });
    it('should not set user agent with empty name', function (done) {
      try {
        var client = new UOS.Client({
          endPoint: 'localhost',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
        client.setAppInfo('', '3.2.1');
      } catch (e) {
        done();
      }
    });
    it('should not set user agent without version', function (done) {
      try {
        var client = new UOS.Client({
          endPoint: 'localhost',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
        client.setAppInfo('test', null);
      } catch (e) {
        done();
      }
    });
    it('should not set user agent with empty version', function (done) {
      try {
        var client = new UOS.Client({
          endPoint: 'localhost',
          accessKey: 'accesskey',
          secretKey: 'secretkey'
        });
        client.setAppInfo('test', '');
      } catch (e) {
        done();
      }
    });
  });
  describe('object level', function () {
    describe('#getObject(bucket, object, callback)', function () {
      it('should fail on null bucket', function (done) {
        try {
          client.getObject(null, 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.getObject('', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.getObject('  \n  \t  ', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on null object', function (done) {
        try {
          client.getObject('hello', null, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty object', function (done) {
        try {
          client.getObject('hello', '', function () {});
        } catch (e) {
          done();
        }
      });
    });
    describe('#putObject(bucket, object, source, size, contentType, callback)', function () {
      describe('with small objects using single put', function () {
        // it('should fail when data is smaller than specified', (done) => {
        //   var s = new Stream.Readable()
        //   s._read = function() {}
        //   s.push('hello world')
        //   s.push(null)
        //   client.putObject('bucket', 'object', s, 12, '', (e) => {
        //     if (e) {
        //       done()
        //     }
        //   })
        // })
        // it('should fail when data is larger than specified', (done) => {
        //   var s = new Stream.Readable()
        //   s._read = function() {}
        //   s.push('hello world')
        //   s.push(null)
        //   client.putObject('bucket', 'object', s, 10, '', (e) => {
        //     if (e) {
        //       done()
        //     }
        //   })
        // })
        it('should fail with invalid bucket name', function () {
          _chai.assert.throws(function () {
            client.putObject('ab', 'object', function () {});
          }, /Invalid bucket name/);
        });
        it('should fail with invalid object name', function () {
          _chai.assert.throws(function () {
            client.putObject('bucket', '', function () {});
          }, /Invalid object name/);
        });
        it('should error with size > maxObjectSize', function () {
          _chai.assert.throws(function () {
            client.putObject('bucket', 'object', new _stream.default.Readable(), client.maxObjectSize + 1, function () {});
          }, /size should not be more than/);
        });
        it('should fail on null bucket', function (done) {
          try {
            client.putObject(null, 'hello', null, 1, '', function () {});
          } catch (e) {
            done();
          }
        });
        it('should fail on empty bucket', function (done) {
          try {
            client.putObject(' \n \t ', 'hello', null, 1, '', function () {});
          } catch (e) {
            done();
          }
        });
        it('should fail on empty bucket', function (done) {
          try {
            client.putObject('', 'hello', null, 1, '', function () {});
          } catch (e) {
            done();
          }
        });
        it('should fail on null object', function (done) {
          try {
            client.putObject('hello', null, null, 1, '', function () {});
          } catch (e) {
            done();
          }
        });
        it('should fail on empty object', function (done) {
          try {
            client.putObject('hello', '', null, 1, '', function () {});
          } catch (e) {
            done();
          }
        });
      });
    });
    describe('#statObject(bucket, object, callback)', function () {
      it('should fail on null bucket', function (done) {
        try {
          client.statObject(null, 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.statObject('', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.statObject('  \n  \t  ', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on null object', function (done) {
        try {
          client.statObject('hello', null, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty object', function (done) {
        try {
          client.statObject('hello', '', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on incompatible argument type (number) for statOpts object', function (done) {
        try {
          client.statObject('hello', 'testStatOpts', 1, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on incompatible argument type (null) for statOpts object', function (done) {
        try {
          client.statObject('hello', 'testStatOpts', null, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on incompatible argument type (sting) for statOpts object', function (done) {
        try {
          client.statObject('hello', 'testStatOpts', '  ', function () {});
        } catch (e) {
          done();
        }
      });
    });
    describe('#removeObject(bucket, object, callback)', function () {
      it('should fail on null bucket', function (done) {
        try {
          client.removeObject(null, 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.removeObject('', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty bucket', function (done) {
        try {
          client.removeObject('  \n  \t  ', 'hello', function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on null object', function (done) {
        try {
          client.removeObject('hello', null, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty object', function (done) {
        try {
          client.removeObject('hello', '', function () {});
        } catch (e) {
          done();
        }
      }); //Versioning related options as removeOpts

      it('should fail on empty (null) removeOpts object', function (done) {
        try {
          client.removeObject('hello', 'testRemoveOpts', null, function () {});
        } catch (e) {
          done();
        }
      });
      it('should fail on empty (string) removeOpts', function (done) {
        try {
          client.removeObject('hello', 'testRemoveOpts', '', function () {});
        } catch (e) {
          done();
        }
      });
    });
  });
});
//# sourceMappingURL=test.js.map
