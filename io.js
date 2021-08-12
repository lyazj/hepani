"use strict"

/* must be an 2D-Array containing particle Object(s) */
var particles = []

/* must be an 1D-Array containing ending time(s) */
var timeline = []

/* set it as false to disable JSON auto-requesting once */
var shouldRequestJSON = true

const jsonName = "animation.json"

/* inner variables */
var _jsonFile
var _jsonBlobURL
var _isLoading = false

/* should be called when body.onload emits at home page */
// @noexcept
function updateLoading(is) {
  if(typeof(is) != "undefined")
    _isLoading = is
  if(_isLoading)
  {
    hideAxes()
    createLoading()
  }
  else
  {
    removeLoading()
    displayAxes()
  }
  return _isLoading
}

// @effective: sync
// @noexcept
function hideAxes() {
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "hidden"
  })
}

// @effective: sync
// @noexcept
function displayAxes() {
  document.getElementsByName("axis").forEach(function (elem) {
    elem.style.visibility = "visible"
  })
}

// @effective: sync
// @noexcept
function createLoading() {
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

// @effective: sync
// @noexcept
function removeLoading() {
  if(typeof(loading) != "undefined")
    loading.parentNode.removeChild(loading)
}

/* callback called only if state 200 returned */
// @effective: async
// @noexcept: &callback
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

// @noexcept
function receiveJSONContent(content) {
  try {
    var data = JSON.parse(content)
    particles = data.particles
    timeline = data.timeline
  } catch(err) {
    particles = []
    timeline = []
    if(content)
      alert("Invalid JSON content: " + content)
    content = undefined
  }
  try {
    initialize()
  } catch(err) { }
  if(_jsonFile)
    URL.revokeObjectURL(_jsonFile)
  _jsonFile = content ? new File(
    [content], jsonName, {type: "application/json"}
  ) : undefined
  _jsonBlobURL = _jsonFile ? URL.createObjectURL(_jsonFile) : undefined
}

// @noexcept
function onrequestJSON(xhr) {
  updateLoading(true)
}

// @noexcept
function onloadJSON(xhr) {
  updateLoading(false)
  if(xhr.status == 200)
    receiveJSONContent(xhr.responseText)
  else
  {
    receiveJSONContent()
    alert("HTTP Error " + xhr.status + ": " + xhr.responseText)
  }
}

/* request JSON automatically */
// to disable it once, set shouldRequestJSON as false
// @effective: async
// @noexcept
function requestJSON() {

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

// @noexcept
function downloadJSON() {
  if(!_jsonBlobURL)
    return alert("No json available.")

  var a = document.createElement("a")
  a.href = _jsonBlobURL
  a.download = jsonName
  a.click()
}

/* callback called only if state 200 returned */
// @effective: async
// @noexcept
function getDescription(id, callback) {
  if(!id)
    id = 0
  if(!callback)
    callback = alert
  var xhr = new XMLHttpRequest()
  xhr.open("get", "description?id=" + encodeURIComponent(id), true)
  xhr.send()
  xhr.onload = function () {
    if(this.status == 200)
      callback(this.responseText)
    else
      return alert("HTTP Error " + this.status + ": " + this.responseText)
  }
}
