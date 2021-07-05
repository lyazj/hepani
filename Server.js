"use strict"

var http = require("http")
var url = require("url")
var fs = require("fs")
var zlib = require("zlib")

// blacklist
var fileBlock = [
  /Server\.js/,
  // ...
]

// whitelist
var fileType = {
  ico:  "image/x-icon",
  html: "text/html;charset=utf-8",
  js:   "text/javascript",
  css:  "text/css",
  json: "application/json",
  // ...
}

function writeFile(response, file, type, code) {

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
      // ...
    })
    fs.createReadStream(file).pipe(zlib.createGzip()).pipe(response)

  })

}

function writeError(response, code) {
  writeFile(response, code + ".html", "text/html", code)
}

http.createServer(function (request, response) {

  console.log("Request url: " + request.url)
  var pathname = url.parse(request.url).pathname.slice(1)
  if(!pathname)
    pathname = "index.html"

  for(var type in fileType)
    if(RegExp("\\." + type + "\\b").exec(pathname))
      return writeFile(response, pathname, fileType[type])
  return writeError(response, 404)

}).listen(5861)

console.log("Server running at http://39.98.116.227/")
