"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RETENTION_VALIDITY_UNITS = exports.RETENTION_MODES = exports.LEGAL_HOLD_STATUS = void 0;
exports.extractMetadata = extractMetadata;
exports.getScope = getScope;
exports.getVersionId = getVersionId;
exports.insertContentType = insertContentType;
exports.isAmazonEndpoint = isAmazonEndpoint;
exports.isAmzHeader = isAmzHeader;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isFunction = isFunction;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isReadableStream = isReadableStream;
exports.isStorageclassHeader = isStorageclassHeader;
exports.isString = isString;
exports.isSupportedHeader = isSupportedHeader;
exports.isValidBucketName = isValidBucketName;
exports.isValidDate = isValidDate;
exports.isValidDomain = isValidDomain;
exports.isValidEndpoint = isValidEndpoint;
exports.isValidIP = isValidIP;
exports.isValidObjectName = isValidObjectName;
exports.isValidPort = isValidPort;
exports.isValidPrefix = isValidPrefix;
exports.isVirtualHostStyle = isVirtualHostStyle;
exports.makeDateLong = makeDateLong;
exports.makeDateShort = makeDateShort;
exports.pipesetup = pipesetup;
exports.prependXAMZMeta = prependXAMZMeta;
exports.probeContentType = probeContentType;
exports.promisify = promisify;
exports.readableStream = readableStream;
exports.sanitizeETag = sanitizeETag;
exports.toSha256 = exports.toMd5 = void 0;
exports.uriEscape = uriEscape;
exports.uriResourceEscape = uriResourceEscape;

var _stream = _interopRequireDefault(require("stream"));

var _mimeTypes = _interopRequireDefault(require("mime-types"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Crypto = require('crypto'); // Returns a wrapper function that will promisify a given callback function.
// It will preserve 'this'.


function promisify(fn) {
  return function () {
    var _this = this;

    // If the last argument is a function, assume its the callback.
    var callback = arguments[arguments.length - 1]; // If the callback is given, don't promisify, just pass straight in.

    if (typeof callback === 'function') return fn.apply(this, arguments); // Otherwise, create a new set of arguments, and wrap
    // it in a promise.

    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      // Add the callback function.
      args.push(function (err, value) {
        if (err) return reject(err);
        resolve(value);
      }); // Call the function with our special adaptor callback added.

      fn.apply(_this, args);
    });
  };
} // All characters in string which are NOT unreserved should be percent encoded.
// Unreserved characers are : ALPHA / DIGIT / "-" / "." / "_" / "~"
// Reference https://tools.ietf.org/html/rfc3986#section-2.2


function uriEscape(string) {
  return string.split('').reduce(function (acc, elem) {
    var buf = Buffer.from(elem);

    if (buf.length === 1) {
      // length 1 indicates that elem is not a unicode character.
      // Check if it is an unreserved characer.
      if ('A' <= elem && elem <= 'Z' || 'a' <= elem && elem <= 'z' || '0' <= elem && elem <= '9' || elem === '_' || elem === '.' || elem === '~' || elem === '-') {
        // Unreserved characer should not be encoded.
        acc = acc + elem;
        return acc;
      }
    } // elem needs encoding - i.e elem should be encoded if it's not unreserved
    // character or if it's a unicode character.


    for (var i = 0; i < buf.length; i++) {
      acc = acc + "%" + buf[i].toString(16).toUpperCase();
    }

    return acc;
  }, '');
}

function uriResourceEscape(string) {
  return uriEscape(string).replace(/%2F/g, '/');
}

function getScope(region, date) {
  return `${makeDateShort(date)}/${region}/s3/aws4_request`;
} // isAmazonEndpoint - true if endpoint is 's3.amazonaws.com' or 's3.cn-north-1.amazonaws.com.cn'


function isAmazonEndpoint(endpoint) {
  return endpoint === 's3.amazonaws.com' || endpoint === 's3.cn-north-1.amazonaws.com.cn';
} // isVirtualHostStyle - verify if bucket name is support with virtual
// hosts. bucketNames with periods should be always treated as path
// style if the protocol is 'https:', this is due to SSL wildcard
// limitation. For all other buckets and Amazon S3 endpoint we will
// default to virtual host style.


function isVirtualHostStyle(endpoint, protocol, bucket, pathStyle) {
  if (protocol === 'https:' && bucket.indexOf('.') > -1) {
    return false;
  }

  return isAmazonEndpoint(endpoint) || !pathStyle;
}

var ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;

function isValidIP(ip) {
  return ipv4Regex.test(ip);
} // isValidEndpoint - true if endpoint is valid domain.


function isValidEndpoint(endpoint) {
  if (!isValidDomain(endpoint) && !isValidIP(endpoint)) {
    return false;
  } // Return true.


  return true;
} // isValidDomain - true if input host is a valid domain.


function isValidDomain(host) {
  if (!isString(host)) return false; // See RFC 1035, RFC 3696.

  if (host.length === 0 || host.length > 255) {
    return false;
  } // Host cannot start or end with a '-'


  if (host[0] === '-' || host.substr(-1) === '-') {
    return false;
  } // Host cannot start or end with a '_'


  if (host[0] === '_' || host.substr(-1) === '_') {
    return false;
  } // Host cannot start with a '.'


  if (host[0] === '.') {
    return false;
  }

  var alphaNumerics = '`~!@#$%^&*()+={}[]|\\"\';:><?/'.split(''); // All non alphanumeric characters are invalid.

  for (var i in alphaNumerics) {
    if (host.indexOf(alphaNumerics[i]) > -1) {
      return false;
    }
  } // No need to regexp match, since the list is non-exhaustive.
  // We let it be valid and fail later.


  return true;
} // Probes contentType using file extensions.
// For example: probeContentType('file.png') returns 'image/png'.


function probeContentType(path) {
  var contentType = _mimeTypes.default.lookup(path);

  if (!contentType) {
    contentType = 'application/octet-stream';
  }

  return contentType;
} // isValidPort - is input port valid.


function isValidPort(port) {
  // verify if port is a number.
  if (!isNumber(port)) return false; // port cannot be negative.

  if (port < 0) return false; // port '0' is valid and special case return true.

  if (port === 0) return true;
  var min_port = 1;
  var max_port = 65535; // Verify if port is in range.

  return port >= min_port && port <= max_port;
}

function isValidBucketName(bucket) {
  if (!isString(bucket)) return false; // bucket length should be less than and no more than 63
  // characters long.

  if (bucket.length < 3 || bucket.length > 63) {
    return false;
  } // bucket with successive periods is invalid.


  if (bucket.indexOf('..') > -1) {
    return false;
  } // bucket cannot have ip address style.


  if (bucket.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)) {
    return false;
  } // bucket should begin with alphabet/number and end with alphabet/number,
  // with alphabet/number/.- in the middle.


  if (bucket.match(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/)) {
    return true;
  }

  return false;
} // check if objectName is a valid object name


function isValidObjectName(objectName) {
  if (!isValidPrefix(objectName)) return false;
  if (objectName.length === 0) return false;
  return true;
} // check if prefix is valid


function isValidPrefix(prefix) {
  if (!isString(prefix)) return false;
  if (prefix.length > 1024) return false;
  return true;
} // check if typeof arg number


function isNumber(arg) {
  return typeof arg === 'number';
} // check if typeof arg function


function isFunction(arg) {
  return typeof arg === 'function';
} // check if typeof arg string


function isString(arg) {
  return typeof arg === 'string';
} // check if typeof arg object


function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
} // check if object is readable stream


function isReadableStream(arg) {
  return isObject(arg) && isFunction(arg._read);
} // check if arg is boolean


function isBoolean(arg) {
  return typeof arg === 'boolean';
} // check if arg is array


function isArray(arg) {
  return Array.isArray(arg);
} // check if arg is a valid date


function isValidDate(arg) {
  return arg instanceof Date && !isNaN(arg);
} // Create a Date string with format:
// 'YYYYMMDDTHHmmss' + Z


function makeDateLong(date) {
  date = date || new Date(); // Gives format like: '2017-08-07T16:28:59.889Z'

  date = date.toISOString();
  return date.substr(0, 4) + date.substr(5, 2) + date.substr(8, 5) + date.substr(14, 2) + date.substr(17, 2) + 'Z';
} // Create a Date string with format:
// 'YYYYMMDD'


function makeDateShort(date) {
  date = date || new Date(); // Gives format like: '2017-08-07T16:28:59.889Z'

  date = date.toISOString();
  return date.substr(0, 4) + date.substr(5, 2) + date.substr(8, 2);
} // pipesetup sets up pipe() from left to right os streams array
// pipesetup will also make sure that error emitted at any of the upstream Stream
// will be emitted at the last stream. This makes error handling simple


function pipesetup() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }

  return streams.reduce(function (src, dst) {
    src.on('error', function (err) {
      return dst.emit('error', err);
    });
    return src.pipe(dst);
  });
} // return a Readable stream that emits data


function readableStream(data) {
  var s = new _stream.default.Readable();

  s._read = function () {};

  s.push(data);
  s.push(null);
  return s;
} // Process metadata to insert appropriate value to `content-type` attribute


function insertContentType(metaData, filePath) {
  // check if content-type attribute present in metaData
  for (var key in metaData) {
    if (key.toLowerCase() === 'content-type') {
      return metaData;
    }
  } // if `content-type` attribute is not present in metadata,
  // then infer it from the extension in filePath


  var newMetadata = Object.assign({}, metaData);
  newMetadata['content-type'] = probeContentType(filePath);
  return newMetadata;
} // Function prepends metadata with the appropriate prefix if it is not already on


function prependXAMZMeta(metaData) {
  var newMetadata = Object.assign({}, metaData);

  for (var key in metaData) {
    if (!isAmzHeader(key) && !isSupportedHeader(key) && !isStorageclassHeader(key)) {
      newMetadata["X-Amz-Meta-" + key] = newMetadata[key];
      delete newMetadata[key];
    }
  }

  return newMetadata;
} // Checks if it is a valid header according to the AmazonS3 API


function isAmzHeader(key) {
  var temp = key.toLowerCase();
  return temp.startsWith("x-amz-meta-") || temp === "x-amz-acl" || temp.startsWith("x-amz-server-side-encryption-") || temp === "x-amz-server-side-encryption";
} //Checks if it is a supported Header


function isSupportedHeader(key) {
  var supported_headers = ['content-type', 'cache-control', 'content-encoding', 'content-disposition', 'content-language', 'x-amz-website-redirect-location'];
  return supported_headers.indexOf(key.toLowerCase()) > -1;
} //Checks if it is a storage header


function isStorageclassHeader(key) {
  return key.toLowerCase() === "x-amz-storage-class";
}

function extractMetadata(metaData) {
  var newMetadata = {};

  for (var key in metaData) {
    if (isSupportedHeader(key) || isStorageclassHeader(key) || isAmzHeader(key)) {
      if (key.toLowerCase().startsWith("x-amz-meta-")) {
        newMetadata[key.slice(11, key.length)] = metaData[key];
      } else {
        newMetadata[key] = metaData[key];
      }
    }
  }

  return newMetadata;
}

function getVersionId() {
  var headers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var versionIdValue = headers["x-amz-version-id"];
  return versionIdValue || null;
}

function sanitizeETag() {
  var etag = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var replaceChars = {
    '"': '',
    '&quot;': '',
    '&#34;': '',
    '&QUOT;': '',
    '&#x00022': ''
  };
  return etag.replace(/^("|&quot;|&#34;)|("|&quot;|&#34;)$/g, function (m) {
    return replaceChars[m];
  });
}

var RETENTION_MODES = {
  GOVERNANCE: "GOVERNANCE",
  COMPLIANCE: "COMPLIANCE"
};
exports.RETENTION_MODES = RETENTION_MODES;
var RETENTION_VALIDITY_UNITS = {
  DAYS: "Days",
  YEARS: "Years"
};
exports.RETENTION_VALIDITY_UNITS = RETENTION_VALIDITY_UNITS;
var LEGAL_HOLD_STATUS = {
  ENABLED: "ON",
  DISABLED: "OFF"
};
exports.LEGAL_HOLD_STATUS = LEGAL_HOLD_STATUS;

var objectToBuffer = function objectToBuffer(payload) {
  var payloadBuf = Buffer.from(Buffer.from(JSON.stringify(payload)));
  return payloadBuf;
};

var toMd5 = function toMd5(payload) {
  return Crypto.createHash('md5').update(objectToBuffer(payload)).digest().toString('base64');
};

exports.toMd5 = toMd5;

var toSha256 = function toSha256(payload) {
  return Crypto.createHash('sha256').update(payload).digest('hex');
};

exports.toSha256 = toSha256;
//# sourceMappingURL=helpers.js.map
