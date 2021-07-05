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
  var elem = document.createElement("p")
  elem.id = "loading"
  elem.style.left = "50%"
  elem.style.top = "50%"
  elem.style.position = "absolute"
  elem.style.fontSize = "32pt"
  elem.style.color = "Pink"
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
  xhr.open("post", "output.json")
  xhr.setRequestHeader("Content-Type", "application/json")
  xhr.send(JSON.stringify({tag: "for test only"}))
  xhr.onload = function () {
    particles = JSON.parse(xhr.responseText)
    removeLoading()
    frameFunction()
    displayAxes()
  }
}

requestJSON()
