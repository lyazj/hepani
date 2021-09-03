"use strict"

var loadedJS
if(!loadedJS)
  loadedJS = { }

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
  document.body.removeChild(loadedJS[url])
  delete loadedJS[url]
}

function reloadJS(url, callback) {
  unloadJS(url)
  loadJS(url, callback)
}

// for access statistics
reloadJS("https://hm.baidu.com/hm.js?4f48d998dfeca15149d06a6e7f6b61d1")
