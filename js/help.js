"use strict"

!function insertTOC() {

  var stack = [document.createElement("ul")]
  var headers = $("main h2, main h3, main h4, main h5, main h6")
  for(let i = 0; i < headers.length; ++i)
  {
    var header = headers[i]
    var index = header.tagName.slice(1)
    while(stack.length > index - 1)
      stack.pop()
    while(stack.length < index - 1)
    {
      var table = stack[stack.length - 1]
      var ul = $(table.id + " > li > ul:last-of-type")[0]
      if(!ul)
      {
        ul = document.createElement("ul")
        ul.id = "toc-" + i
        var li = document.createElement("li")
        li.style.listStyle = "none"
        li.appendChild(ul)
        table.appendChild(li)
      }
      stack.push(ul)
    }
    var a = document.createElement("a")
    a.href = "#" + (
      header.id = header.innerHTML.toLowerCase().replace(/ /g, "-")
    )
    a.innerHTML = header.innerHTML
    var li = document.createElement("li")
    li.appendChild(a)
    stack[stack.length - 1].appendChild(li)
  }
  toc.appendChild(stack[0])

}()

!function updateTable() {
  [
    "emj",
    "hj800",
    "main300",
    "mmvbszz",
    "ppww",
    "ppzh",
    "vbszz4mu",
    "wwa",
  ].forEach(item => {
    var tr = document.createElement("tr")
    var td = document.createElement("td")
    var a = document.createElement("a")
    a.target = "_black"
    a.href = ".?load=example/" + item + ".js"
    a.innerHTML = item
    td.appendChild(a)
    tr.appendChild(td)
    var td = document.createElement("td")
    var a = document.createElement("a")
    a.href = "example/" + item + ".log"
    a.download = item + ".log"
    a.innerHTML = "log"
    td.appendChild(a)
    tr.appendChild(td)
    $("#example-table")[0].appendChild(tr)
  })
}()
