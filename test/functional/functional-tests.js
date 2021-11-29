"use strict";

var _helpers = require("../../../dist/main/helpers");

var os = require('os');

var stream = require('stream');

var crypto = require('crypto');

var async = require('async');

var _ = require('lodash');

var fs = require('fs');

var http = require('http');

var https = require('https');

var url = require('url');

var chai = require('chai');

var assert = chai.assert;

var superagent = require('superagent');

var uuid = require("uuid");

var step = require("mocha-steps").step;

var uos;

try {
  uos = require('../../../dist/main/uos');
} catch (err) {
  uos = require('uos');
}

require('source-map-support').install();

describe('functional tests', function () {
  this.timeout(30 * 60 * 1000);
  var playConfig = {}; // If credentials aren't given, default to 47.96.39.108.

  if (process.env['SERVER_ENDPOINT']) {
    var res = process.env['SERVER_ENDPOINT'].split(":");
    playConfig.endPoint = res[0];
    playConfig.port = parseInt(res[1]);
  } else {
    playConfig.endPoint = '10.10.0.12';
    playConfig.port = 9901;
  }

  playConfig.accessKey = process.env['ACCESS_KEY'] || 'admin';
  playConfig.secretKey = process.env['SECRET_KEY'] || 'AKiaOS45E90A'; // If the user provides ENABLE_HTTPS, 1 = secure, anything else = unsecure.
  // Otherwise default useSSL as true.

  if (process.env['ENABLE_HTTPS'] !== undefined) {
    playConfig.useSSL = process.env['ENABLE_HTTPS'] == '1';
  } else {
    playConfig.useSSL = false;
  } // dataDir is falsy if we need to generate data on the fly. Otherwise, it will be
  // a directory with files to read from, i.e. /mint/data.


  var dataDir = process.env['MINT_DATA_DIR']; // set the partSize to ensure multipart upload chunk size.
  // if not set, putObject with stream data and undefined length will use about 500Mb chunkSize (5Tb/10000).

  playConfig.partSize = 64 * 1024 * 1024;
  var client = new uos.Client(playConfig);
  var usEastConfig = playConfig;
  usEastConfig.region = 'us-east-1';
  var clientUsEastRegion = new uos.Client(usEastConfig);
  var bucketName = '15860330905-bucket';
  var objectName = uuid.v4();
  var _1byteObjectName = 'datafile-1-b';

  var _1byte = dataDir ? fs.readFileSync(dataDir + '/' + _1byteObjectName) : Buffer.alloc(1, 0);

  var _100kbObjectName = 'datafile-100-kB';

  var _100kb = dataDir ? fs.readFileSync(dataDir + '/' + _100kbObjectName) : Buffer.alloc(100 * 1024, 0);

  var _100kbObjectNameCopy = _100kbObjectName + '-copy';

  var _100kbObjectBufferName = `${_100kbObjectName}.buffer`;
  var _MultiPath100kbObjectBufferName = `path/to/${_100kbObjectName}.buffer`;

  var _100kbmd5 = crypto.createHash('md5').update(_100kb).digest('hex');

  var _100kb1kboffsetmd5 = crypto.createHash('md5').update(_100kb.slice(1024)).digest('hex');

  var _65mbObjectName = 'datafile-65-MB';

  var _65mb = dataDir ? fs.readFileSync(dataDir + '/' + _65mbObjectName) : Buffer.alloc(65 * 1024 * 1024, 0);

  var _65mbmd5 = crypto.createHash('md5').update(_65mb).digest('hex');

  var _65mbObjectNameCopy = _65mbObjectName + '-copy';

  var _5mbObjectName = 'datafile-5-MB';

  var _5mb = dataDir ? fs.readFileSync(dataDir + '/' + _5mbObjectName) : Buffer.alloc(5 * 1024 * 1024, 0);

  var _5mbmd5 = crypto.createHash('md5').update(_5mb).digest('hex'); // create new http agent to check requests release sockets


  var httpAgent = (playConfig.useSSL ? https : http).Agent({
    keepAlive: true
  });
  client.setRequestOptions({
    agent: httpAgent
  });
  var metaData = {
    'Content-Type': 'text/html',
    'Content-Language': 'en',
    'X-Amz-Meta-Testing': 1234,
    'randomstuff': 5678
  };
  var tmpDir = os.tmpdir();

  function readableStream(data) {
    var s = new stream.Readable();

    s._read = function () {};

    s.push(data);
    s.push(null);
    return s;
  }

  var traceStream; // FUNCTIONAL_TEST_TRACE env variable contains the path to which trace
  // will be logged. Set it to /dev/stdout log to the stdout.

  if (process.env['FUNCTIONAL_TEST_TRACE']) {
    var filePath = process.env['FUNCTIONAL_TEST_TRACE']; // This is necessary for windows.

    if (filePath === 'process.stdout') {
      traceStream = process.stdout;
    } else {
      traceStream = fs.createWriteStream(filePath, {
        flags: 'a'
      });
    }

    traceStream.write('====================================\n');
    client.traceOn(traceStream);
  }

  if (traceStream) {
    after(function () {
      client.traceOff();

      if (filePath !== 'process.stdout') {
        traceStream.end();
      }
    });
  }

  describe('bucketExists', function () {
    step(`bucketExists(bucketName, cb)_bucketName:${bucketName}_`, function (done) {
      return client.bucketExists(bucketName, done);
    });
    step(`bucketExists(bucketName, cb)_bucketName:${bucketName}random_`, function (done) {
      client.bucketExists(bucketName + 'random', function (e, exists) {
        if (e === null && !exists) return done();
        done(new Error());
      });
    });
    step(`bucketExists(bucketName)_bucketName:${bucketName}_`, function (done) {
      client.bucketExists(bucketName).then(function () {
        return done();
      }).catch(done);
    });
  });
  describe('tests for putObject getObject removeObject with multipath', function () {
    step(`putObject(bucketName, objectName, stream)_bucketName:${bucketName}, objectName:${_MultiPath100kbObjectBufferName}, stream:100Kib_`, function (done) {
      client.putObject(bucketName, _MultiPath100kbObjectBufferName, _100kb).then(function () {
        return done();
      }).catch(done);
    });
    step(`getObject(bucketName, objectName, callback)_bucketName:${bucketName}, objectName:${_MultiPath100kbObjectBufferName}_`, function (done) {
      var hash = crypto.createHash('md5');
      client.getObject(bucketName, _MultiPath100kbObjectBufferName, function (e, stream) {
        if (e) return done(e);
        stream.on('data', function (data) {
          return hash.update(data);
        });
        stream.on('error', done);
        stream.on('end', function () {
          if (hash.digest('hex') === _100kbmd5) return done();
          done(new Error('content mismatch'));
        });
      });
    });
    step(`removeObject(bucketName, objectName)_bucketName:${bucketName}, objectName:${_MultiPath100kbObjectBufferName}_`, function (done) {
      client.removeObject(bucketName, _MultiPath100kbObjectBufferName).then(function () {
        return done();
      }).catch(done);
    });
  });
  describe('tests for copyObject statObject', function () {
    var etag;
    var modifiedDate;
    step(`putObject(bucketName, objectName, stream, metaData, cb)_bucketName:${bucketName}, objectName:${_100kbObjectName}, stream: 100kb, metaData:${metaData}_`, function (done) {
      client.putObject(bucketName, _100kbObjectName, _100kb, metaData, done);
    });
    step(`copyObject(bucketName, objectName, srcObject, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}_`, function (done) {
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, function (e) {
        if (e) return done(e);
        done();
      });
    });
    step(`statObject(bucketName, objectName, cb)_bucketName:${bucketName}, objectName:${_100kbObjectName}_`, function (done) {
      client.statObject(bucketName, _100kbObjectName, function (e, stat) {
        if (e) return done(e);
        if (stat.size !== _100kb.length) return done(new Error('size mismatch'));
        assert.equal(stat.metaData['content-type'], metaData['Content-Type']);
        assert.equal(stat.metaData['Testing'], metaData['Testing']);
        assert.equal(stat.metaData['randomstuff'], metaData['randomstuff']);
        etag = stat.etag;
        modifiedDate = stat.modifiedDate;
        done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:ExceptIncorrectEtag_`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setMatchETagExcept('TestEtag');
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds, function (e) {
        if (e) return done(e);
        done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:ExceptCorrectEtag_`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setMatchETagExcept(etag);
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds).then(function () {
        done(new Error("CopyObject should have failed."));
      }).catch(function () {
        return done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:MatchCorrectEtag_`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setMatchETag(etag);
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds, function (e) {
        if (e) return done(e);
        done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:MatchIncorrectEtag_`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setMatchETag('TestETag');
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds).then(function () {
        done(new Error("CopyObject should have failed."));
      }).catch(function () {
        return done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:Unmodified since ${modifiedDate}`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setUnmodified(new Date(modifiedDate));
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds, function (e) {
        if (e) return done(e);
        done();
      });
    });
    step(`copyObject(bucketName, objectName, srcObject, conditions, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}, srcObject:/${bucketName}/${_100kbObjectName}, conditions:Unmodified since 2010-03-26T12:00:00Z_`, function (done) {
      var conds = new uos.CopyConditions();
      conds.setUnmodified(new Date("2010-03-26T12:00:00Z"));
      client.copyObject(bucketName, _100kbObjectNameCopy, "/" + bucketName + "/" + _100kbObjectName, conds).then(function () {
        done(new Error("CopyObject should have failed."));
      }).catch(function () {
        return done();
      });
    });
    step(`statObject(bucketName, objectName, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}_`, function (done) {
      client.statObject(bucketName, _100kbObjectNameCopy, function (e, stat) {
        if (e) return done(e);
        if (stat.size !== _100kb.length) return done(new Error('size mismatch'));
        done();
      });
    });
    step(`removeObject(bucketName, objectName, cb)_bucketName:${bucketName}, objectName:${_100kbObjectNameCopy}_`, function (done) {
      async.map([_100kbObjectName, _100kbObjectNameCopy], function (objectName, cb) {
        return client.removeObject(bucketName, objectName, cb);
      }, done);
    });
  });
  describe('listObjects', function () {
    var listObjectPrefix = 'uosjsPrefix';
    var listObjectsNum = 10;
    var objArray = [];
    var listArray = [];
    var listPrefixArray = [];
    step(`putObject(bucketName, objectName, stream, size, metaData, callback)_bucketName:${bucketName}, stream:1b, size:1_Create ${listObjectsNum} objects`, function (done) {
      _.times(listObjectsNum, function (i) {
        return objArray.push(`${listObjectPrefix}.${i}`);
      });

      objArray = objArray.sort();
      async.mapLimit(objArray, 20, function (objectName, cb) {
        return client.putObject(bucketName, objectName, readableStream(_1byte), _1byte.length, {}, cb);
      }, done);
    });
    step(`listObjects(bucketName, prefix, recursive)_bucketName:${bucketName}, prefix: uosjsprefix, recursive:true_`, function (done) {
      client.listObjects(bucketName, listObjectPrefix, true).on('error', done).on('end', function () {
        if (_.isEqual(objArray, listPrefixArray)) return done();
        return done(new Error(`listObjects lists ${listPrefixArray.length} objects, expected ${listObjectsNum}`));
      }).on('data', function (data) {
        listPrefixArray.push(data.name);
      });
    });
    step('listObjects(bucketName, prefix, recursive)_recursive:true_', function (done) {
      try {
        client.listObjects("", "", true).on('end', function () {
          return done(new Error(`listObjects should throw exception when empty bucketname is passed`));
        });
      } catch (e) {
        if (e.name === 'InvalidBucketNameError') {
          done();
        } else {
          done(e);
        }
      }
    });
    step(`listObjects(bucketName, prefix, recursive)_bucketName:${bucketName}, recursive:false_`, function (done) {
      listArray = [];
      client.listObjects(bucketName, '', false).on('error', done).on('end', function () {
        if (_.isEqual(objArray, listArray)) return done();
        return done(new Error(`listObjects lists ${listArray.length} objects, expected ${listObjectsNum}`));
      }).on('data', function (data) {
        listArray.push(data.name);
      });
    });
    step(`listObjectsV2(bucketName, prefix, recursive, startAfter)_bucketName:${bucketName}, recursive:true_`, function (done) {
      listArray = [];
      client.listObjectsV2(bucketName, '', true, '').on('error', done).on('end', function () {
        if (_.isEqual(objArray, listArray)) return done();
        return done(new Error(`listObjects lists ${listArray.length} objects, expected ${listObjectsNum}`));
      }).on('data', function (data) {
        listArray.push(data.name);
      });
    });
    step(`listObjectsV2WithMetadata(bucketName, prefix, recursive, startAfter)_bucketName:${bucketName}, recursive:true_`, function (done) {
      listArray = [];
      client.extensions.listObjectsV2WithMetadata(bucketName, '', true, '').on('error', done).on('end', function () {
        if (_.isEqual(objArray, listArray)) return done();
        return done(new Error(`listObjects lists ${listArray.length} objects, expected ${listObjectsNum}`));
      }).on('data', function (data) {
        listArray.push(data.name);
      });
    });
    step(`removeObject(bucketName, objectName, callback)_bucketName:${bucketName}_Remove ${listObjectsNum} objects`, function (done) {
      async.mapLimit(listArray, 20, function (objectName, cb) {
        return client.removeObject(bucketName, objectName, cb);
      }, done);
    });
  });
  describe('removeObjects', function () {
    var listObjectPrefix = 'uosjsPrefix';
    var listObjectsNum = 10;
    var objArray = [];
    var objectsList = [];
    step(`putObject(bucketName, objectName, stream, size, contentType, callback)_bucketName:${bucketName}, stream:1b, size:1_Create ${listObjectsNum} objects`, function (done) {
      _.times(listObjectsNum, function (i) {
        return objArray.push(`${listObjectPrefix}.${i}`);
      });

      objArray = objArray.sort();
      async.mapLimit(objArray, 20, function (objectName, cb) {
        return client.putObject(bucketName, objectName, readableStream(_1byte), _1byte.length, '', cb);
      }, done);
    });
    step(`listObjects(bucketName, prefix, recursive)_bucketName:${bucketName}, recursive:false_`, function (done) {
      client.listObjects(bucketName, listObjectPrefix, false).on('error', done).on('end', function () {
        try {
          client.removeObjects(bucketName, '', function (e) {
            if (e) {
              done();
            }
          });
        } catch (e) {
          if (e.name === "InvalidArgumentError") {
            done();
          }
        }
      }).on('data', function (data) {
        objectsList.push(data.name);
      });
    });
    objectsList = [];
    step(`listObjects(bucketName, prefix, recursive)_bucketName:${bucketName}, recursive:false_`, function (done) {
      client.listObjects(bucketName, listObjectPrefix, false).on('error', done).on('end', function () {
        client.removeObjects(bucketName, objectsList, function (e) {
          if (e) {
            done(e);
          }

          done();
        });
      }).on('data', function (data) {
        objectsList.push(data.name);
      });
    }); // Non latin characters

    step(`putObject(bucketName, objectName, stream)_bucketName:${bucketName}, objectName:fileΩ, stream:1b`, function (done) {
      client.putObject(bucketName, 'fileΩ', _1byte).then(function () {
        return done();
      }).catch(done);
    });
    step(`removeObjects with non latin charactes`, function (done) {
      client.removeObjects(bucketName, ['fileΩ']).then(function () {
        return done();
      }).catch(done);
    });
  });
});
//# sourceMappingURL=functional-tests.js.map
