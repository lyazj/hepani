"use strict"

var particles = []
var shouldRequestJSON = true
var xhrJSON

function hideAxes() {
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "hidden"
  })
}

function displayAxes() {
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "visible"
  })
}

function createLoading() {
  var elem = document.createElement("div")
  elem.id = "loading"
  elem.style.width = "400pt"
  elem.style.height = "32pt"
  elem.style.left = "50%"
  elem.style.top = "50%"
  elem.style.marginLeft = "-200pt"
  elem.style.marginTop = "-16pt"
  elem.style.position = "absolute"
  elem.style.fontSize = "32pt"
  elem.style.color = "Pink"
  elem.style.textAlign = "center"
  elem.innerHTML = "Loading..."
  system.appendChild(elem)
}

function removeLoading() {
  loading.parentNode.removeChild(loading)
}

var writePage = function (url) {
  var xhr = new XMLHttpRequest()
  xhr.open("get", url, true)
  xhr.send()
  xhr.onload = function () {
    if(this.status == 200)
    {
      document.write(this.responseText)
      document.close()
    }
    else
      alert("HTTP Error " + this.status + ": " + this.responseText)
  }
}

function requestJSON() {  // must be called after 'ani.js' full loaded

  if(shouldRequestJSON == false)
  {
    shouldRequestJSON = true
    initialize()
    return
  }

  hideAxes()
  createLoading()
  var xhr = xhrJSON
  if(xhr)
    xhrJSON = undefined
  else
  {
    xhr = new XMLHttpRequest()
    xhr.open("get", "output.json", true)
    xhr.send()
  }
  xhr.onload = function () {
    removeLoading()
    if(this.status == 200)
    {
      particles = JSON.parse(this.responseText)
      initialize()
      displayAxes()
    }
    else
      alert("HTTP Error " + this.status + ": " + this.responseText)
  }

}
