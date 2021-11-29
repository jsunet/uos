# JavaScript Client API

## 初始化UOS Client object

```js
var uosClient = new UOS.Client({
    endPoint: '47.96.39.108',
    port: 9901,
    useSSL: true,
    accessKey: 'admin',
    secretKey: 'AKiaOS45E90A'
});
```

### 相关方法
| 存储桶操作    | 文件对象操作         |
| :---------- | :----------------- |
| [bucketExists](#判断存储桶是否存在) | [uploadObject](#文件对象上传) |
| [listObjects](#列出指定存储桶的所有对象信息)|[copyObject](#将源对象拷贝到指定存储桶的新对象中。) |
|                                  | [downloadObject](#将对象的数据下载到文件) |
|                                  | [removeObject](#删除一个文件对象) |
|                                  | [removeObjects](#删除多个文件对象) |

## 存储桶操作

### 判断存储桶是否存在

bucketExists(bucketName[, callback])

#### 参数：

| 参数名称 | 参数类型         | 描述                   |
| :------- | :--------------- | :--------------------- |
| bucketName   | string | 存储桶名称。 |
| callback(err)   | function | 如果存储桶存在的话err就是null，否则err.code是NoSuchBucket。如果没有传callback的话，则返回一个Promise对象。 |

#### 示例：
```js
// 检查存储桶 'my-bucketname' 是否存在.
uosClient.bucketExists('mybucket', function(err) {
  if (err) {
     if (err.code == 'NoSuchBucket') return console.log("bucket does not exist.")
     return console.log(err)
  }
  // if err is null it indicates that the bucket exists.
  console.log('Bucket exists.')
})
```

### 列出存储桶中所有对象
listObjects(bucketName, prefix, recursive)

#### 参数：

| 参数名称     | 参数类型       | 描述           |
| :-------   | :------------- | :------------- |
| bucketName | string         | 存储桶名称。 |
| prefix | string         | 要列出的对象的前缀 (可选，默认值是'')。|
| recursive | bool         | true代表递归查找，false代表类似文件夹查找，以'/'分隔，不查子文件夹。（可选，默认值是false）|

#### 返回值：

| 参数名称     | 参数类型       | 描述           |
| :-------   | :------------- | :------------- |
| stream | Stream         | 存储桶中对象信息的流。 |

#### 对象的格式如下：

| 参数名称                | 参数类型         | 描述           |
| :-------               | :------------- | :------------- |
| obj.name	             | string         | 对象名称。 |
| obj.prefix             | string         | 对象名称的前缀。 |
| obj.size	             | number         | 对象的大小。 |
| obj.etag	             | string         | 对象的etag值。 |
| obj.lastModified		 | Date           | 最后修改时间。|

#### 示例：

```js
var stream = minioClient.listObjects('mybucket','', true)
stream.on('data', function(obj) { console.log(obj) } )
stream.on('error', function(err) { console.log(err) } )
```

## 文件对象操作

### 从一个stream/Buffer中上传一个对象。
putObject(bucketName, objectName, stream, size, contentType[, callback])


#### 从stream中上传

#### 参数：

| 参数名称      | 参数类型              | 描述             |
| :----------- | :------------------ | :--------------- |
| bucketName   | string              | 存储桶名称。       |
| objectName   | string              | 对象名称。         |
| stream       | Stream              | 可以读的流。       |
| size         | number              | 对象的大小（可选）。|
| contentType  | string              | 对象的Content-Type（可选，默认是application/octet-stream）。       |
| callback(err, etag)   | function              | 如果err不是null则代表有错误，etag string是上传的对象的etag值。如果没有传callback的话，则返回一个Promise对象。       |

#### 示例：

单个对象的最大大小限制在5TB。putObject在对象大于5MiB时，自动使用multiple parts方式上传。这样的话，当上传失败的时候，客户端只需要上传未成功的部分即可（类似断点上传）。上传的对象使用MD5SUM签名进行完整性验证。

```js
var Fs = require('fs')
var file = '/tmp/40mbfile'
var fileStream = Fs.createReadStream(file)
var fileStat = Fs.stat(file, function(err, stats) {
  if (err) {
    return console.log(err)
  }
  uosClient.putObject('mybucket', '40mbfile', fileStream, stats.size, function(err, etag) {
    return console.log(err, etag) // err should be null
  })
})
```

#### 从"Buffer"或者"string"上传

#### 参数：

| 参数名称      | 参数类型              | 描述             |
| :----------- | :------------------ | :--------------- |
| bucketName   | string              | 存储桶名称。       |
| objectName   | string              | 对象名称。         |
| string or Buffer	       | Stream or Buffer	       | 字符串可者缓冲区  |
| contentType  | string              | 对象的Content-Type（可选，默认是application/octet-stream）。       |
| callback(err, etag)   | function              | 如果err不是null则代表有错误，etag string是上传的对象的etag值。如果没有传callback的话，则返回一个Promise对象。       |

#### 示例：

```js
var buffer = 'Hello World'
minioClient.putObject('mybucket', 'hello-file', buffer, function(err, etag) {
  return console.log(err, etag) // err should be null
})
```

### 获取文件对象信息

getObject(bucketName, objectName[, callback])

#### 参数：

| 参数名称   | 参数类型       | 描述                 |
| :----------- | :------------ | :------------------- |
| bucketName   | string | 存储桶名称。    |
| objectName   | string | 对象名称。    |
| callback(err, stream)   | function | 回调函数，第一个参数是错误信息。stream是对象的内容。如果没有传callback的话，则返回一个Promise对象。   |

#### 示例：

```js
var size = 0
uosClient.getObject('mybucket', 'photo.jpg', function(err, dataStream) {
  if (err) {
    return console.log(err)
  }
  dataStream.on('data', function(chunk) {
    size += chunk.length
  })
  dataStream.on('end', function() {
    console.log('End. Total size = ' + size)
  })
  dataStream.on('error', function(err) {
    console.log(err)
  })
})
```



### 获取文件对象的对象信息和元数据
statObject(bucketName, objectName[, callback])

#### 参数：

| 参数名称   | 参数类型       | 描述                 |
| :----------- | :------------ | :------------------- |
| bucketName   | string | 存储桶名称。    |
| objectName   | string | 对象名称。    |
| callback(err, stat)   | function | 如果err不是null则代表有错误，stat含有对象的元数据信息，格式如下所示。如果没有传callback的话，则返回一个Promise对象。    |

| 参数名称   | 参数类型       | 描述                 |
| :----------- | :------------ | :------------------- |
| stat.size	   | number | 对象的大小。    |
| stat.etag	   | string | 对象的etag值。    |
| stat.contentType | string | 对象的Content-Type。 |
| stat.lastModified	 | string | Last 最后修改时间。 |

#### 示例：

```js
minioClient.statObject('mybucket', 'photo.jpg', function(err, stat) {
  if (err) {
    return console.log(err)
  }
  console.log(stat)
})
```

### 将源对象拷贝到指定存储桶的新对象中。
copyObject(bucketName, objectName, sourceObject, conditions[, callback])

#### 参数：

| 参数名称 | 参数类型       | 描述                                               |
| :------- | :------------- | :------------------------------------------------- |
| bucketName  | string | 存储桶名称。 |
| objectName  | string | 对象名称。 |
| sourceObject  | string | 源对象的名称 |
| conditions  | CopyConditions | 允许拷贝需要满足的条件。 |
| callback(err, {etag, lastModified})  | function | 如果err不是null则代表有错误，etag string是上传的对象的etag值，lastModified Date是新拷贝对象的最后修改时间。如果没有传callback的话，则返回一个Promise对象。 |

#### 示例：

```js
var conds = new Minio.CopyConditions()
conds.setMatchETag('bd891862ea3e22c93ed53a098218791d')
minioClient.copyObject('mybucket', 'newobject', '/mybucket/srcobject', conds, function(e, data) {
  if (e) {
    return console.log(e)
  }
  console.log("Successfully copied the object:")
  console.log("etag = " + data.etag + ", lastModified = " + data.lastModified)
})
```
### 删除一个文件对象
removeObject(bucketName, objectName[, callback])

#### 参数：

| 参数名称          | 参数类型         | 描述             |
| :--------------- | :--------------- | :--------------- |
| bucketName       | string        | 存储桶名称。 |
| objectName       | string | 对象名称。 |
| callback(err)	   | function | 如果err不是null则代表有错误。如果没有传callback的话，则返回一个Promise对象。 |

#### 示例：

```js
uosClient.removeObject('mybucket', 'photo.jpg', function(err) {
  if (err) {
    return console.log('Unable to remove object', err)
  }
  console.log('Removed the object')
})
```

### 删除多个文件对象
removeObjects(bucketName, objectsList[, callback])


#### 参数：

| 参数名称 | 参数类型          | 描述             |
| :------- | :---------------- | :--------------- |
| bucketName   | string | 存储桶名称。 |
| objectsList   | object | 需要删除的对象列表 |
| callback(err)	   | function | 如果err不是null则代表有错误。如果没有传callback的话，则返回一个Promise对象。 |
#### 示例：

```js
var objectsList = []

var objectsStream = uosClient.listObjects('my-bucketname', 'my-prefixname', true)

objectsStream.on('data', function(obj) {
  objectsList.push(obj.name);
})

objectsStream.on('error', function(e) {
  console.log(e);
})

objectsStream.on('end', function() {

  uosClient.removeObjects('my-bucketname',objectsList, function(e) {
    if (e) {
        return console.log('Unable to remove Objects ',e)
    }
    console.log('Removed the objects successfully')
  })

})
```