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
  /description\.json/,
  // ...
]

// whitelist
var fileType = {
  ico:  "image/x-icon",
  png:  "image/png",
  html: "text/html;charset=utf-8",
  js:   "text/javascript;charset=utf-8",
  css:  "text/css;charset=utf-8",
  json: "application/json;charset=utf-8",
  // ...
}

var cacheControl = {
  static: "max-age=31536000,immutable",
  stable: "max-age=86400,public",
  mutable: "no-cache",
}

cacheControl = Object.assign(cacheControl, {
  "favicon.ico": cacheControl.static,
  "beian.png": cacheControl.static,
  "404.html": cacheControl.static,
  "406.html": cacheControl.static,
  "500.html": cacheControl.static,
  "coming.html": cacheControl.static,

  "index.html": cacheControl.mutable,
  "index.css": cacheControl.mutable,
  "ani.js": cacheControl.mutable,
})

var httpsKey = fs.readFileSync("../https/5972158_hepani.xyz.key")
var httpsCert = fs.readFileSync("../https/5972158_hepani.xyz.pem")
var description = JSON.parse(fs.readFileSync("description.json"))
var descriptionMstring =
  fs.statSync("description.json").mtime.toUTCString()
var descriptionMtime = new Date(descriptionMstring)

function writeFile(response, file, type, code, ims) {

  if(type === undefined)
    type = "text/html"
  if(code === undefined)
    code = 200

  if(fileBlock.some(function (name) {
    return name.exec(file)
  }))
    return writeError(response, 404)

  fs.stat(file, function (err, stats) {

    if(err)
    {
      if(err.code != "ENOENT")
      {
        console.error(err)
        return writeError(response, 500)
      }

      if(code != 200)
      {
        console.error(err)
        response.writeHead(code, {
          "Content-Type": "text/plain;charset=utf-8",
          "Cache-Control": cacheControl.mutable,
          "X-Content-Type-Options": "nosniff",
        })
        return response.end("[" + code + "] (Cannot Load Error Page)")
      }

      return writeError(response, 404)
    }

    var thisCacheControl = cacheControl[file]
    if(!thisCacheControl)
      thisCacheControl = cacheControl.stable

    var lastModified = stats.mtime.toUTCString()
    if(code == 200 && ims && new Date(lastModified) <= new Date(ims))
    {
      response.writeHead(304, {
        "Cache-Control": thisCacheControl,
        "X-Content-Type-Options": "nosniff",
      })
      return response.end()
    }

    if(code == 200)
      response.writeHead(code, {
        "Content-Type": type,
        "Content-Encoding": "gzip",
        "Cache-Control": thisCacheControl,
        "Last-Modified": lastModified,
        "X-Content-Type-Options": "nosniff",
      })
    else
      response.writeHead(code, {
        "Content-Type": type,
        "Content-Encoding": "gzip",
        "Cache-Control": cacheControl.mutable,
        "X-Content-Type-Options": "nosniff",
      })

    fs.createReadStream(file).pipe(zlib.createGzip()).pipe(response)

  })

}

function writeError(response, code) {
  writeFile(response, code + ".html", "text/html", code)
}

function writeExample(response, type) {
  writeFile(response, type + ".json", fileType.json)
}

function procedure(request, response) {

  var URL = url.parse(request.url)
  var pathname = URL.pathname
  while(pathname[0] == '/')
    pathname = pathname.slice(1)
  if(!pathname)
    pathname = "index.html"

  console.log(new Date().toLocaleString() + "  "
    + request.method + ": " + request.url + " -> " + pathname)

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
      response.writeHead(406, {
        "Content-Type": fileType.json,
        "Cache-Control": cacheControl.mutable,
        "X-Content-Type-Options": "nosniff",
      })
      response.end(JSON.stringify(err))
    })
    gzip.on("error", function (err) {
      hasError = true
      console.error(err)
      response.writeHead(500, {
        "Content-Type": fileType.json,
        "Cache-Control": cacheControl.mutable,
        "X-Content-Type-Options": "nosniff",
      })
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
        response.writeHead(406, {
          "Content-Type": "text/plain;charset=utf-8",
          "Cache-Control": cacheControl.mutable,
          "X-Content-Type-Options": "nosniff",
        })
        return response.end(serr)
      }
      response.writeHead(200, {
        "Content-Type": fileType.json,
        "Content-Encoding": "gzip",
        "Cache-Control": cacheControl.mutable,
        "X-Content-Type-Options": "nosniff",
      })
      gzip.pipe(response)
      gzip.end(sout)
      // console.log(sout)
      // response.end(sout)
    })

    request.pipe(gunzip).pipe(process.stdin)

    /* debug */
    // process.stdout.pipe(require("process").stdout)
    // process.stderr.pipe(require("process").stderr)

    return
  }

  if(pathname == "description")
  {
    var query = querystring.parse(URL.query)
    var id = query.id
    if(typeof(id) == "undefined")
      return writeError(response, 406)

    var ims = request.headers["if-modified-since"]
    if(ims && descriptionMtime <= new Date(ims))
    {
      response.writeHead(304, {
        "Cache-Control": cacheControl["description.json"],
        "X-Content-Type-Options": "nosniff",
      })
      return response.end()
    }

    response.writeHead(200, {
      "Content-Type": "text/plain;charset=utf-8",
      // "Content-Encoding": "gzip",
      "Cache-Control": cacheControl["description.json"],
      "Last-Modified": descriptionMstring,
      "X-Content-Type-Options": "nosniff",
    })

    var result = description[id]
    if(!result)
      return response.end("No description available.")

    response.write(result)
    response.write("\n\nSource: https://github.com/scikit-hep/particle")
    response.end("\nUpdate: " + descriptionMstring)

    // var gzip = zlib.createGzip()
    // gzip.pipe(response)
    // gzip.end(description[id])

    return
  }

  for(var type in fileType)
    if(RegExp("\\." + type + "$").exec(pathname))
      return writeFile(
        response, pathname, fileType[type], 200,
        request.headers["if-modified-since"]
      )
  return writeError(response, 404)

}

http.createServer(procedure).listen(5861)
console.log("Server running at http://39.98.116.227/")

https.createServer({
  key: httpsKey, cert: httpsCert
}, procedure).listen(1122)
console.log("Server running at https://39.98.116.227/")
