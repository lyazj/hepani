"use strict"

var loadedJS
if(!loadedJS)
  loadedJS = { }

var isLocal = false

function loadJS(url, callback) {
  if(loadedJS[url])
  {
    if(callback)
      callback(loadedJS[url])
    return
  }
  var script = document.createElement("script")
  loadedJS[url] = script
  script.src = url
  if(callback)
    script.onload = function () {
      callback(script)
    }
  document.body.appendChild(script)
}

function unloadJS(url) {
  if(!loadedJS[url])
    return
  try {
    document.body.removeChild(loadedJS[url])
  } catch(err) { }
  delete loadedJS[url]
}

function reloadJS(url, callback) {
  unloadJS(url)
  loadJS(url, callback)
}

function updateConsole() {
  console.log("%cWelcome to HEP animation page!", "color: #8b0012;")
  console.log("We are working for popularization of physics!")
  console.log(
    "Contact us: %chttps://github.com/lyazj/hepani/issues",
    "color: blue"
  )
}

!function () {
  var searchParams = new URLSearchParams(location.search)
  var loads = searchParams.getAll("load")
  if(searchParams.has("local"))
    isLocal = true
  else
    loads.push(
      "https://hm.baidu.com/hm.js?4f48d998dfeca15149d06a6e7f6b61d1"
    )
  loads.forEach(load => {
    reloadJS(load)
  })
}()
