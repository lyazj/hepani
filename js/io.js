"use strict"

/* must be an 2D-Array containing particle Object(s) */
var particles = []

/* must be an 1D-Array containing ending time(s) */
var timeline = []

/* set it as false to disable JSON auto-requesting once */
var shouldRequestJSON = true

/* nonnegtive required */
var loadingCount = loadingCount || 0

const jsonName = "animation.json"

/* inner variables */
var _jsonFile
var _jsonBlobURL

// @noexcept
function isLoading() {
  return !!loadingCount
}

/* should be called when body.onload emits at home page */
// @noexcept
function updateLoading(is) {
  if(typeof(is) != "undefined")
    loadingCount += !!is * 2 - 1
  if(loadingCount < 0)
    loadingCount = 0
  if(loadingCount)
  {
    hideAxes()
    createLoading()
  }
  else
  {
    removeLoading()
    displayAxes()
  }
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
function createError() {
  createLoading()
  loading.id = "error"
  error.innerHTML = "Error"
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
function hideElements() {
  var children = document.body.children
  for(var i = 0; i < children.length; ++i)
  {
    children[i].styleDisplay = children[i].style.display
    children[i].style.display = "none"
  }
  document.body.style.background = "none"
}

// @noexcept
function displayElements() {
  var children = document.body.children
  for(var i = 0; i < children.length; ++i)
    if(typeof(children[i].styleDisplay) != "undefined")
    {
      children[i].style.display = children[i].styleDisplay
      delete children[i].styleDisplay
    }
  document.body.style.background = ""
}

// @noexcept
function enterIframe(url) {
  hideElements()
  var iframe = document.createElement("iframe")
  iframe.src = url
  iframe.style.position = "absolute"
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.top = 0
  iframe.style.left = 0
  iframe.style.margin = 0
  iframe.style.padding = 0
  iframe.style.border = "none"
  document.body.appendChild(iframe)
}

// @noexcept
function leaveIframe() {
  var iframes = document.getElementsByTagName("iframe")
  while(iframes.length)
  {
    console.log(iframes[0])
    iframes[0].parentElement.removeChild(iframes[0])
  }
  displayElements()
}

// @noexcept
function receiveJSONContent(content) {
  try {
    var data = JSON.parse(content)
    particles = data.particles
    timeline = data.timeline
    timeline[-1] = 0
  } catch(err) {
    particles = []
    timeline = []
    if(content)
      alert("Invalid JSON content: " + content)
    content = undefined
  }
  initialize(true)
  if(_jsonFile)
    URL.revokeObjectURL(_jsonFile)
  _jsonFile = content && new File(
    [content], jsonName, {type: "application/json"}
  )
  _jsonBlobURL = _jsonFile && URL.createObjectURL(_jsonFile)
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
  xhr.open("get", "example/output.json", true)
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
  var xhr = new XMLHttpRequest()
  xhr.open("get", "description?id=" + encodeURIComponent(id || 0), true)
  xhr.send()
  xhr.onload = function () {
    if(this.status == 200)
      (callback || alert)(this.responseText)
    else
      alert("HTTP Error " + this.status + ": " + this.responseText)
  }
}