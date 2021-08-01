"use strict"

var particles = []

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

function requestJSON() {
  hideAxes()
  createLoading()
  var xhr = new XMLHttpRequest()
  xhr.open("get", "output.json", true)
  xhr.send()
  xhr.onload = function () {
    removeLoading()
    if(this.status == 200)
    {
      particles = JSON.parse(this.responseText)
      frameFunction()
      displayAxes()
    }
    else
      alert("HTTP Error " + this.status + ": " + this.responseText)
  }
}

requestJSON()
