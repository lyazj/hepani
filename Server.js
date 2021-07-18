"use strict"

var http = require("http")
var https = require("https")
var url = require("url")
var fs = require("fs")
var zlib = require("zlib")
var child_process = require("child_process")

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

var writeJSON = (function () {

  var cnt = 0

  function getTempJSON() {
    var num = cnt++
    cnt %= 65536
    var filename = "json_" + num + ".tmp"
    try {
      fs.accessSync(filename)
    }
    catch(err) {
      return filename
    }
  }

  return function (response, post) {

    var arg = JSON.parse(post)
    var argArray = []
    for(var i in arg)
    {
      argArray.push("--" + i)
      argArray.push(arg[i])
    }

    var inputFile = "input.txt"
    var tempJSON = getTempJSON()
    if(!tempJSON) {
      response.writeHead(500, {"Content-Type": "text/plain"})
      return response.end("Server too busy.")
    }

    var process = child_process.spawn("./Hepani", argArray, {
      stdio: [
        fs.openSync(inputFile, "r"),
        fs.openSync(tempJSON, "w"),
        "pipe"
      ]
    })

    var serr = ""
    process.stderr.on("data", function (data) {
      serr += data.toString()
    })

    process.on("close", function (code) {

      if(code) {
        response.writeHead(403, {"Content-Type": "text/plain"})
        response.end(serr)
        return fs.unlink(tempJSON, function (err) {
          if(err)
            console.error(err)
        })
      }

      writeFile(response, tempJSON, fileType.json, function () {
        fs.unlink(tempJSON, function (err) {
          if(err)
            console.error(err)
        })
      })

    })

  }

})()

function procedure(request, response) {

  console.log(request.method + ": " + request.url)
  var pathname = url.parse(request.url).pathname.slice(1)
  if(!pathname)
    pathname = "index.html"
  if(request.method == "POST" && pathname == "output.json")
  {
    var post = ""
    request.on("data", function (chunk) {
      post += chunk
    })
    return request.on("end", function () {
      writeJSON(response, post)
    })
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
