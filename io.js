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

function requestJSON(arg) {
  if(!arg)
    arg = {}
  hideAxes()
  createLoading()
  var xhr = new XMLHttpRequest()
  xhr.open("post", "output.json", true)
  xhr.setRequestHeader("Content-Type", "application/json")
  xhr.send(JSON.stringify(arg))
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

requestJSON({
  type: "py8log"
})
