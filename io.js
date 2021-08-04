"use strict"

var particles = []
var jsonContent
var shouldDisplayAxes = true
var shouldDisplayLoading = false
var shouldRequestJSON = true

const jsonName = "animation.json"

function updateUI() {
  if(shouldDisplayAxes)
    displayAxes()
  else
    hideAxes()
  if(shouldDisplayLoading)
    createLoading()
  else
    removeLoading()
}

function hideAxes() {
  shouldDisplayAxes = false
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "hidden"
  })
}

function displayAxes() {
  shouldDisplayAxes = true
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "visible"
  })
}

function createLoading() {
  shouldDisplayLoading = true
  if(typeof(loading) != "undefined")
    return
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
  document.body.appendChild(elem)
}

function removeLoading() {
  shouldDisplayLoading = false
  if(typeof(loading) != "undefined")
    loading.parentNode.removeChild(loading)
}

function writePage(url, callback) {
  var xhr = new XMLHttpRequest()
  xhr.open("get", url, true)
  xhr.send()
  xhr.onload = function () {
    if(this.status == 200)
    {
      document.write(this.responseText)
      document.close()
      if(callback)
        callback()
    }
    else
      alert("HTTP Error " + this.status + ": " + this.responseText)
  }
}

function receiveJSONContent(content) {
  jsonContent = content
  particles = content ? JSON.parse(content) : []
  initialize()
}

function onrequestJSON(xhr) {
  hideAxes()
  createLoading()
}

function onloadJSON(xhr) {
  removeLoading()
  if(xhr.status == 200)
  {
    receiveJSONContent(xhr.responseText)
    displayAxes()
  }
  else
  {
    receiveJSONContent()
    alert("HTTP Error " + xhr.status + ": " + xhr.responseText)
  }
}

function requestJSON() {  // must be called after 'ani.js' full loaded

  if(shouldRequestJSON == false)
  {
    shouldRequestJSON = true
    return
  }

  var xhr = new XMLHttpRequest()
  onrequestJSON(xhr)
  xhr.open("get", "output.json", true)
  xhr.send()
  xhr.onload = function () {
    onloadJSON(this)
  }

}

function getJSONURL() {
  return jsonContent ? URL.createObjectURL(new File(
    [jsonContent], jsonName, {type: "application/json"}
  )) : undefined
}

function downloadJSON() {
  var url = getJSONURL()
  if(!url)
    return alert("No json available.")

  var a = document.createElement("a")
  a.href = url
  a.download = jsonName
  a.click()
}
