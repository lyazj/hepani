"use strict"

function submitUpload() {

  var fileType = type.value
  var file = input.files[0]
  var gzipChecked = gzip.checked
  var timeText = timetext.value
  var eventText = eventtext.value

  function readJSON() {
    var fileReader = new FileReader()
    fileReader.readAsText(file)
    fileReader.onload = function () {
      receiveJSONContent(fileReader.result)
      shouldRequestJSON = false
      writePage("/")
    }
  }

  if(fileType == "hepani")
  {
    if(!file)
    {
      writePage("/")
      return false
    }

    if(gzipChecked)
    {
      var fileReader = new FileReader()
      fileReader.readAsArrayBuffer(file)
      fileReader.onload = function () {
        file = new File(
          [pako.ungzip(fileReader.result)], jsonName,
          {type: "application/json"}
        )
        readJSON()
      }
    }
    else
      readJSON()

    return false
  }

  var url = "upload"
  if(!eventText)
    eventText = "notset"
  else
  {
    eventText = Number.parseInt(eventText)
    if(!(eventText >= 0))
    {
      alert("Invalid event index.")
      return false
    }
  }
  var requireArguments = {
    type: fileType,
    empty: !file,
    event: eventText,
  }
  try {
    var timeObject = new Function("return new Object(" + timeText + ")")()
    for(var index in timeObject)
    {
      var indexValue = Number.parseInt(index)
      if(Number.isNaN(indexValue))
        throw index
      requireArguments["d" + indexValue] = timeObject[index]
    }
  } catch(err) {
    alert("Invalid Timeline input.")
    return false
  }

  var first = true
  for(var item in requireArguments)
  {
    if(first)
    {
      url += "?"
      first = false
    }
    else
      url += "&"
    url += encodeURIComponent(item) + "="
      + encodeURIComponent(requireArguments[item])
  }

  function sendRequest(buf) {
    var xhr = new XMLHttpRequest()
    xhr.open("post", url, true)
    xhr.setRequestHeader("Content-Type", "application/octet-stream")
    xhr.setRequestHeader("Content-Encoding", "gzip")
    xhr.send(buf)
    xhr.onload = function () {
      onloadJSON(this)
    }
  }

  onrequestJSON()
  if(file)
  {
    var fileReader = new FileReader()
    fileReader.readAsArrayBuffer(file)
    fileReader.onload = function () {
      var buffer = fileReader.result
      if(!gzipChecked)
        buffer = pako.gzip(buffer/* , {level: 9} */)
      sendRequest(buffer)
    }
  }
  else
    sendRequest()

  shouldRequestJSON = false
  writePage("/")

  return false

}
