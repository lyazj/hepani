"use strict"

var http = require("http")
var https = require("https")
var url = require("url")
var fs = require("fs")
var zlib = require("zlib")
var child_process = require("child_process")
var querystring = require("querystring")

// blacklist
var fileBlock = [
  /Server\.js/,
  // ...
]

// whitelist
var fileType = {
  ico:  "image/x-icon",
  png:  "image/png",
  html: "text/html;charset=utf-8",
  js:   "text/javascript",
  css:  "text/css",
  json: "application/json",
  // ...
}

var httpsKey = fs.readFileSync("../https/5972158_hepani.xyz.key")
var httpsCert = fs.readFileSync("../https/5972158_hepani.xyz.pem")

function writeFile(response, file, type, code, callback) {

  if(typeof code == "function")
  {
    callback = code
    code = undefined
  }
  if(type === undefined)
    type = "text/html"
  if(code === undefined)
    code = 200

  if(fileBlock.some(function (name) {
    return name.exec(file)
  }))
    return writeError(response, 404)

  fs.access(file, fs.constants.R_OK, function (err) {

    if(err)
    {
      if(code != 200)
      {
        console.error(err)
        response.writeHead(code, {"Content-Type": "text/plain"})
        return response.end("[" + code + "] (Cannot Load Error Page)")
      }
      return writeError(response, 404)
    }

    response.writeHead(code, {
      "Content-Type": type,
      "Content-Encoding": "gzip",
      "Cache-Control": "max-age=3600",
      // ...
    })
    fs.createReadStream(file).pipe(zlib.createGzip()).pipe(response)
    if(callback)
      callback()

  })

}

function writeError(response, code) {
  writeFile(response, code + ".html", "text/html", code)
}

function writeExample(response, type) {
  writeFile(response, type + ".json", "application/json")
}

function procedure(request, response) {

  console.log(request.method + ": " + request.url)

  var URL = url.parse(request.url)
  var pathname = URL.pathname.slice(1)
  if(!pathname)
    pathname = "index.html"

  if(request.method == "POST" && pathname == "upload")
  {
    var query = querystring.parse(URL.query)

    if(query.empty == "true")
      return writeExample(response, query.type)

    if(request.headers["content-type"] != "application/octet-stream"
      || request.headers["content-encoding"] != "gzip")
      return writeError(response, 406)

    var gunzip = zlib.createGunzip()
    var gzip = zlib.createGzip()
    var hasError = false
    gunzip.on("error", function (err) {
      hasError = true
      response.writeHead(406, {"Content-Type": "application/josn"})
      response.end(JSON.stringify(err))
    })
    gzip.on("error", function (err) {
      hasError = true
      response.writeHead(406, {"Content-Type": "application/josn"})
      response.end(JSON.stringify(err))
    })

    var argArray = []
    for(var item in query)
    {
      argArray.push("--" + item)
      argArray.push(query[item])
    }

    var process = child_process.spawn("./Hepani", argArray)

    var sout = ""
    var serr = ""
    process.stdout.on("data", function (chunk) {
      sout += chunk
    })
    process.stderr.on("data", function (chunk) {
      serr += chunk
    })
    process.on("close", function (code) {
      if(hasError)
        return
      if(code)
      {
        response.writeHead(403, {"Content-Type": "text/plain"})
        return response.end(serr)
      }
      response.writeHead(200, {
        "Content-Type": "application/json",
        // "Content-Encoding": "gzip",
      })
      // gzip.write(sout)
      // gzip.pipe(response)
      // console.log(sout)
      response.write(sout)
      response.end()
    })

    request.pipe(gunzip).pipe(process.stdin)

    /* debug */
    // process.stdout.pipe(require("process").stdout)
    // process.stderr.pipe(require("process").stderr)

    return
  }

  for(var type in fileType)
    if(RegExp("\\." + type + "\\b").exec(pathname))
      return writeFile(response, pathname, fileType[type])
  return writeError(response, 404)

}

http.createServer(procedure).listen(5861)
console.log("Server running at http://39.98.116.227/")

https.createServer({
  key: httpsKey, cert: httpsCert
}, procedure).listen(1122)
console.log("Server running at https://39.98.116.227/")
