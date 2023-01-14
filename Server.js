"use strict"

var http = require("http")
var https = require("https")
var url = require("url")
var fs = require("fs")
var zlib = require("zlib")
var child_process = require("child_process")
var querystring = require("querystring")

// blacklist
var pathBlock = [
  /(^|\/)\.+($|\/)/,  // {} = {., .., ...}, */{}, {}/*, */{}/*
  /^Server\.js$/,     // Server.js
  /^[1-2]\.log$/,     // 1.log, 2.log
  /^comment\.txt$/,   // comment.txt
  /^cache\//,         // cache/*
  // ...
]

// whitelist
var fileType = {
  ico:  "image/x-icon",
  jpeg: "image/jpeg",
  png:  "image/png",
  svg:  "image/svg+xml;charset=utf-8",
  html: "text/html;charset=utf-8",
  js:   "text/javascript;charset=utf-8",
  css:  "text/css;charset=utf-8",
  json: "application/json;charset=utf-8",
  txt:  "text/plain;charset=utf-8",
  gz:   "application/x-gzip",
  pdf:   "application/pdf",
  // ...
}

fileType = Object.assign(fileType, {
  "js.map": fileType.json,
  log: fileType.txt,
  jpg: fileType.jpeg,
  // ...
})

var noGzip = [
  /.*\.png$/,
  /.*\.jpg$/,
  /.*\.jpeg$/,
  /.*\.gz$/,
]

var cacheControl = {
  static: "max-age=31536000,public,immutable",
  stable: "max-age=86400,public",
  mutable: "no-cache",
}

cacheControl = Object.assign(cacheControl, {
  default                : cacheControl.stable,
  "favicon.ico"          : cacheControl.static,
  "coming.html"          : cacheControl.static,
  "ani.html"             : cacheControl.mutable,
  "css/ani.css"          : cacheControl.mutable,
  "js/ani.js"            : cacheControl.mutable,
  "js/gif.mod.js"        : cacheControl.stable,
  "js/gif.js.map"        : cacheControl.static,
  "js/gif.worker.js"     : cacheControl.static,
  "js/gif.worker.js.map" : cacheControl.static,
  "js/three.min.js"      : cacheControl.static,
  "js/OrbitControls.js"  : cacheControl.static,
  "js/pako.min.js"       : cacheControl.static,
  "js/jquery.slim.min.js": cacheControl.static,
  "img/logo.png"         : cacheControl.static,
  "img/beian.png"        : cacheControl.static,
  "img/about.svg"        : cacheControl.static,
  "img/config.svg"       : cacheControl.static,
  "img/download.svg"     : cacheControl.static,
  "img/download_gif.svg" : cacheControl.static,
  "img/file.svg"         : cacheControl.static,
  "img/functions.svg"    : cacheControl.static,
  "img/help.svg"         : cacheControl.static,
  "img/start.svg"        : cacheControl.static,
  "img/background.jpg"   : cacheControl.static,
})

var redirect = {
  // "img/background.jpg":
  //   "https://mediaarchive.cern.ch/MediaArchive/Photo/Public/"
  //   + "2013/1308206/1308206_20/1308206_20-A4-at-144-dpi.jpg",
  // "js/three.min.js":
  //   "https://threejs.org/build/three.min.js",
  // "js/OrbitControls.js":
  //   "https://threejs.org/examples/js/controls/OrbitControls.js",
  "js/pako.min.js":
    "https://cdn.bootcdn.net/ajax/libs/pako/2.0.4/pako.min.js",
  "js/jquery.slim.min.js":
    "https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.slim.min.js",
}

var httpsKey = fs.readFileSync("../https/cert.key")
var httpsCert = fs.readFileSync("../https/cert.pem")
var httpsDomain = /^((w{3}|develop)\.)?hepani\.xyz$/
var description = JSON.parse(fs.readFileSync("cache/description.json"))
var descriptionMstring =
  fs.statSync("cache/description.json").mtime.toUTCString()
var descriptionMtime = new Date(descriptionMstring)

try {
  fs.statSync(".noredirect")
  redirect = { }
} catch(err) {
  if(err.code != "ENOENT")
    throw err
}

// @args: {
//   description, path(*)
// }
function log(evt, args) {
  console.log(
    new Date().toLocaleString() + "  [" + evt + "] "
    + (args.description || args.path)
  )
}

// @args: {
//   path(*), stats(#), description
// }
function statSync(request, response, args) {
  try {
    args.stats = fs.statSync(args.path)
    return true
  } catch(err) {
    if(err.code == "ENOENT"
      || err.code == "ENOTDIR"
      || err.code == "ERR_INVALID_ARG_VALUE")
    {
      writeError(request, response, { code: 404 })
      log("NOT FOUND", args)
      return false
    }
    else if(err.code == "ENAMETOOLONG")
    {
      writeError(request, response, { code: 400 })
      log("NAME TOO LONG", args)
      return false
    }
    console.error(err)
    writeError(request, response, {
      code: 500, type: fileType.json, body: JSON.stringify(err),
    })
    log("EXCEPTION", args)
    return false
  }
}

// @args: {
//   stats(*), path(*), description
// }
// @FTD: file to directory
function checkFTDRedirect(request, response, args) {
  if(args.stats.isDirectory() && args.path.slice(-1) != "/")
  {
    response.writeHead(302, {Location: args.path + "/"})
    response.end()
    log("REDIRECT", args)
    return false
  }
  return true
}

// @args: {
//   path(*), type(#), description
// }
function checkFileType(request, response, args) {
  for(let t in fileType)
    if(RegExp("\\." + t + "$").exec(args.path))
    {
      args.type = fileType[t]
      break
    }
  if(!args.type)
  {
    writeError(request, response, { code: 404 })
    log("REJECTED", args)
    return false
  }
  return true
}

// @args {
//   path(*), stats(*), ifModifiedSince(*),
//   cacheControl(#), lastModified(#), description
// }
function checkCache(request, response, args) {
  args.cacheControl = cacheControl[args.path] || cacheControl.default
  args.lastModified = args.stats.mtime.toUTCString()
  if(args.ifModifiedSince &&
    new Date(args.lastModified) <= new Date(args.ifModifiedSince))
  {
    response.writeHead(304, {
      "Cache-Control": args.cacheControl,
      "X-Content-Type-Options": "nosniff",
    })
    response.end()
    log("NOT MODIFIED", args)
    return false
  }
  return true
}

// @args {
//   type(*), path(*), cacheControl(*), lastModified(*), description
// }
function writeFile(request, response, args) {
  var headObject = {
    "Content-Type": args.type,
    "Cache-Control": args.cacheControl,
    "Last-Modified": args.lastModified,
    "X-Content-Type-Options": "nosniff",
  }
  var stream = fs.createReadStream(args.path)
  stream.on("error", err => { console.error(err) })
  var gzipAccepted = request.headers["accept-encoding"]
  gzipAccepted = gzipAccepted && gzipAccepted.search("gzip") > -1
  if(gzipAccepted
    && noGzip.every(name => { return !name.exec(args.path) }))
  {
    headObject["Content-Encoding"] = "gzip"
    stream = stream.pipe(zlib.createGzip())
    stream.on("error", err => { console.error(err) })
  }
  response.writeHead(200, headObject)
  stream.pipe(response)
  log("SENT", args)
  return true
}

// @args {
//   path(*), ifModifiedSince(*),
//   stats(#), type(#), cacheControl(#), lastModified(#),
//   description
// }
function writePath(request, response, args) {
  return statSync(request, response, args)
    && checkFTDRedirect(request, response, args)
    && checkFileType(request, response, args)
    && checkCache(request, response, args)
    && writeFile(request, response, args)
}

// @args {
//   code(*), type(txt), cacheControl(mutable), body({code} {message})
// }
function writeError(request, response, args) {
  response.writeHead(args.code, {
    "Content-Type": args.type || fileType.txt,
    "Cache-Control": args.cacheControl || cacheControl.mutable,
    "X-Content-Type-Options": "nosniff",
  })
  response.end(args.body ||
    [args.code, http.STATUS_CODES[args.code]].join(" "))
  return true
}

// @args {
//   url(#), path(#), ip(#), ipv4(#), ipv6(#),
//   description(#), query(#), ifModifiedSince(#)
// }
function parseRequestURL(request, response, args) {
  args.url = url.parse(request.url)
  args.path = args.url.pathname
    .replace(/^\/+/, "").replace(/\/$/, "/index.html") || "ani.html"
  args.ip = request.connection.remoteAddress
  if(args.ip)
  {
    args.ipv6 = args.ip.match(/^.*:/)[0]
    args.ipv4 = args.ip.replace(args.ipv6, "")
    args.ipv6 = args.ipv6.slice(0, -1)
  }
  args.description = "(" + args.ip + ") "
    + request.method + ": " + request.url + " -> " + args.path
  args.query = querystring.parse(args.url.query)
  args.ifModifiedSince = request.headers["if-modified-since"]
  log("RECEIVED", args)
  return true
}

// @args: {
//   path(*), description
// }
function checkPathBlock(request, response, args) {
  if(pathBlock.some(block => { return block.exec(args.path) }))
  {
    writeError(request, response, { code: 404 })
    log("BLOCKED", args)
    return false
  }
  return true
}

// @args: {
//   path(*), description
// }
function checkPathRedirect(request, response, args) {
  var link = redirect[args.path]
  if(link)
  {
    response.writeHead(302, {Location: link})
    response.end()
    log("REDIRECT", args)
    return false
  }
  return true
}

// @args: {
//   query(*)
// }
function checkEmptyUpload(request, response, args) {
  if(args.query.empty == "true")
  {
    writePath(request, response, Object.assign(args, {
      path: "example/" + args.query.type + ".json"
    }))
    return false
  }
  return true
}

// @args: { }
function checkUploadHeaders(request, response, args) {
  if(request.headers["content-type"] != "application/octet-stream"
    || request.headers["content-encoding"] != "gzip")
  {
    log("FORBIDDEN", args)
    writeError(request, response, {
      code: 403, body: "Gzip compressing required.",
    })
    return false
  }
  return true
}

// @args: {
//   query(*), argArray(#)
// }
function getChildArguments(request, response, args) {
  args.argArray = []
  for(let item in args.query)
  {
    args.argArray.push("--" + item)
    args.argArray.push(args.query[item])
  }
  return true
}

// @args: {
//   process(#), sout(#), serr(#), err(#), gin(#), gout(#), argArray(*)
// }
function createChildProcess(request, response, args) {
  function kill() {
    try {
      this.process.kill()
    } catch(err) { }
  }
  function errorHandler(code, err) {
    if(code >= 500)
      console.error(err)
    if(!this.err)
    {
      this.err = [code, err]
      kill.call(this)
    }
  }
  function writeOutput(code) {
    if(this.err)
    {
      if(this.err[0] < 500)
      {
        log("ERROR", this)
        if(this.err[1].code == "Z_DATA_ERROR")
          return writeError(request, response, {
            code: this.err[0], body: "Invalid gzip format.",
          })
      }
      else
        log("EXCEPTION", this)
      return writeError(request, response, {
        code: this.err[0], type: fileType.json,
        body: JSON.stringify(this.err[1]),
      })
    }
    if(code)
    {
      log("ERROR", this)
      return writeError(request, response, {
        code: 400, body: this.serr,
      })
    }
    response.writeHead(200, {
      "Content-Type": fileType.json,
      "Content-Encoding": "gzip",
      "Cache-Control": cacheControl.mutable,
      "X-Content-Type-Options": "nosniff",
    })
    this.gout = zlib.createGzip()
    this.gout.on("error", errorHandler.bind(this, 500))
    this.gout.pipe(response)
    this.gout.end(this.sout)
    log("SENT", this)
  }
  args.process = child_process.spawn("bin/Hepani", args.argArray)
  args.process.on("error", errorHandler.bind(args, 500))
  request.on("error", kill.bind(args))
  response.on("error", kill.bind(args))
  args.gin = zlib.createGunzip()
  args.gin.on("error", errorHandler.bind(args, 400))
  args.sout = ""
  args.process.stdout.on("data", chunk => { args.sout += chunk })
  args.process.stdout.on("error", errorHandler.bind(args, 500))
  args.serr = ""
  args.process.stderr.on("data", chunk => { args.serr += chunk })
  args.process.stderr.on("error", errorHandler.bind(args, 500))
  args.process.on("close", writeOutput.bind(args))
  args.process.stdin.on("error", errorHandler.bind(args, 500))
  args.gin.pipe(args.process.stdin)
  request.on("data", chunk => { if(!args.err) args.gin.write(chunk) })
  request.on("end", () => { if(!args.err) args.gin.end() })
  return true
}

// @args: {
//   query(*), ...(#)
// }
function receiveUpload(request, response, args) {
  return checkEmptyUpload(request, response, args)
    && checkUploadHeaders(request, response, args)
    && getChildArguments(request, response, args)
    && createChildProcess(request, response, args)
}

// @args: {
//   query(*), ifModifiedSince(*), description
// }
function sendDescription(request, response, args) {
  var id = args.query.id
  if(typeof(id) == "undefined")
  {
    writeError(request, response, {
      code: 403, body: "Missing argument \"id\".",
    })
    log("FORBIDDEN", args)
    return false
  }
  if(args.ifModifiedSince
    && descriptionMtime <= new Date(args.ifModifiedSince))
  {
    response.writeHead(304, {
      "Cache-Control": cacheControl.stable,
      "X-Content-Type-Options": "nosniff",
    })
    response.end()
    log("NOT MODIFIED", args)
    return true
  }
  response.writeHead(200, {
    "Content-Type": "text/plain;charset=utf-8",
    "Cache-Control": cacheControl.stable,
    "Last-Modified": descriptionMstring,
    "X-Content-Type-Options": "nosniff",
  })
  var result = description[id]
  if(!result)
    response.write("No description available.")
  else
  {
    response.write(result)
    response.write("\n\nSource: https://github.com/scikit-hep/particle")
    response.write("\nUpdate: " + descriptionMstring)
  }
  response.end()
  log("SENT", args)
  return true
}

// @args {
//   ipv4(*), query(*), description
// }
function receiveComment(request, response, args)
{
  var content = args.query.content
  if(content === undefined)
  {
    writeError(request, response, {
      code: 403, body: "Missing argument \"content\".",
    })
    log("FORBIDDEN", args)
    return false
  }
  content = content.slice(0, 256)
  fs.writeFile(
    "comment.txt",
    new Date().toLocaleString() + " (" + args.ipv4 + "): " + content + "\n",
    { flag: "a" }, err => {
      if(err)
      {
        console.error(err)
        log("EXCEPTION", args)
        return writeError(request, response, {
          code: 500, type: fileType.json, body: JSON.stringify(err)
        })
      }
      response.writeHead(200, {
        "Content-Type": "text/plain;charset=utf-8",
        "Cache-Control": "no-cache",
      })
      response.end(content.length.toString())
      log("SENT", args)
    }
  )
  return true
}

// @args: {
//   path(*), ...
// }
function routeRequest(request, response, args) {
  if(request.method == "POST" && args.path == "upload")
    return receiveUpload(request, response, args)
  if(request.method == "GET" && args.path == "description")
    return sendDescription(request, response, args)
  if(request.method == "PUT" && args.path == "comment")
    return receiveComment(request, response, args)
  if(request.method == "GET")
    return writePath(request, response, args)
  log("FORBIDDEN", args)
  return writeError(request, response, { code: 403 })
}

function procedure(request, response) {
  request.on("error", err => { console.error(err) })
  response.on("error", err => { console.error(err) })
  var args = { }
  return parseRequestURL(request, response, args)
    && checkPathBlock(request, response, args)
    && checkPathRedirect(request, response, args)
    && routeRequest(request, response, args)
}

https.createServer({
  key: httpsKey, cert: httpsCert
}, procedure).listen(5414)
console.log("Server running at https://localhost:5414/")

http.createServer(function (request, response) {
  var host = request.headers.host
  if(httpsDomain.exec(host))
  {
    response.writeHead(301, {Location: "https://" + host + request.url})
    return response.end()
  }
  procedure(request, response)
}).listen(5861)
console.log("Server running at http://localhost:5861/")
