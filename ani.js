"use strict"

const left_min = -16
const left_max = 922
const left_span = left_max - left_min
const top_min = -16
const top_max = 546
const top_span = top_max - top_min
const x_min = -10
const x_max = 10
const x_span = x_max - x_min
const y_min = -10
const y_max = 10
const y_span = y_max - y_min
const z_std = 50

var coord
var phase

function clearParticles() {  // clear particles in div#system
  var particles = document.getElementsByClassName("particle")
  for(var i = 0; i < particles.length; ++i)
    particles[i].remove()
}

function initialize() {  // must be called after full loaded
  coord = { }
  phase = -1
  clearParticles()
  frameFunction()
}

function updateRange(elem) {  // update corresponding range bar
  var range = document.getElementById(elem.id.slice(0, -2) + "_r")
  if(range)
    range.value = elem.value
}

function onchangeInput(elem) {
  updateRange(elem)
  frameFunction()
}

function onclickReset() {  // set coordinates as default
  document.getElementsByName("input").forEach(function (elem) {
    elem.value = elem.defaultValue
    updateRange(elem)
  })
  frameFunction()
}

function onchangeTime() {
  frameFunction()
}

function onclickFresh() {  // set time as 0
  t_i.value = 0
  frameFunction()
}

function clearRanges() {  // clear range bars
  document.getElementsByName("range").forEach(function (elem) {
    elem.parentNode.removeChild(elem)
  })
}

function onchangeRange(elem) {  // update corresponding input box
  var input = document.getElementById(elem.id.slice(0, -2) + "_i")
  input.value = elem.value
  frameFunction()
}

function onclickControl(elem) {  // create/remove corresponding range bar

  var name = elem.id.slice(0, -2)
  var range = document.getElementById(name + "_r")

  if(range)
  {
    elem.parentNode.removeChild(range)
    return elem.focus()
  }
  clearRanges()

  range = document.createElement("input")
  if(name == "x0" || name == "y0" || name == "z0")
    range.max = 100, range.min = -100, range.step = 0.01
  else if(name == "psi" || name == "phi")
    range.max = Math.PI, range.min = -Math.PI, range.step = 0.001
  else if(name == "theta")
    range.max = Math.PI, range.min = 0, range.step = 0.0005
  else
    throw("invalid coordinate name: " + name)
  range.name = "range"
  range.type = "range"
  range.id = name + "_r"
  range.value = document.getElementById(name + "_i").value
  range.style.width = "80px"
  range.style.marginLeft = "-20px"
  range.onchange = function () { onchangeRange(range) }

  elem.parentNode.insertBefore(range, elem)
  range.focus()

}

var onclickStart = (function () {  // start/stop animation

  var id

  function _start() {
    start.innerHTML = "Stop"
    id = setInterval(function () {
      frameFunction()
      t_i.value = Math.round((Number(t_i.value) + 1 / fps) * 10) / 10
      if(t_i.value > particles.length)
        _stop()
    }, 1000 / fps)
  }

  function _stop() {
    start.innerHTML = "Start"
    if(id) {
      clearInterval(id)
      id = undefined
    }
  }

  return function () {
    if(start.innerHTML == "Start")
      _start()
    else
      _stop()
  }

})()

function getCoordinates() {
  var psi_v = psi_i.value
  var theta_v = theta_i.value
  var phi_v = phi_i.value
  return {
    x0:         x0_i.value,
    y0:         y0_i.value,
    z0:         z0_i.value,
    cos_psi:    Math.cos(psi_v),
    sin_psi:    Math.sin(psi_v),
    cos_theta:  Math.cos(theta_v),
    sin_theta:  Math.sin(theta_v),
    cos_phi:    Math.cos(phi_v),
    sin_phi:    Math.sin(phi_v)
  }
}

function getTime() {
  return t_i.value
}

/* TODO timeline modification support */
function getPhase() {
  return Math.floor(getTime())
}

function getTimeSpan() {
  return getTime() - phase
}

function getLeft(x) {
  x = (x - x_min) / x_span * left_span + left_min
  return (x < left_min || x > left_max) ? Number.NaN : x
}

function getTop(y) {
  y = (y - y_min) / y_span * top_span + top_min
  return (y < top_min || y > top_max) ? Number.NaN : y
}

function getScale(z) {
  return z_std / z
}

function rotate(x, y, arg) {
  return [
    x * coord["cos_" + arg] + y * coord["sin_" + arg],
    x *-coord["sin_" + arg] + y * coord["cos_" + arg]
  ]
}

function trans(r) {
  r[0] -= coord.x0
  r[1] -= coord.y0
  r[2] -= coord.z0
  var t
  t = rotate(r[0], r[1], "psi"), r[0] = t[0], r[1] = t[1]
  t = rotate(r[1], r[2], "theta"), r[1] = t[0], r[2] = t[1]
  t = rotate(r[0], r[1], "phi"), r[0] = t[0], r[1] = t[1]
  return r
}

function clearParticle() {
  if(phase < 0 || phase >= particles.length)
    return
  particles[phase].forEach(function (particle) {
    var elem = document.getElementById(particle.no)
    if(elem)
      elem.parentNode.removeChild(elem)
  })
}

function generateParticle() {
  if(phase < 0 || phase >= particles.length)
    return
  particles[phase].forEach(function (particle) {
    var elem = document.createElement("div")
    elem.className = "particle"
    elem.id = particle.no
    elem.name = particle.name
    elem.innerHTML = particle.name
    if(elem.innerHTML[0] == '(')
      elem.innerHTML = elem.innerHTML.slice(1)
    if(elem.innerHTML.slice(-1) == ')')
      elem.innerHTML = elem.innerHTML.slice(0, -1)
    system.appendChild(elem)
  })
}

function getPolar(r) {
  var r_abs = Math.sqrt(r[0]*r[0] + r[1]*r[1])
  var theta = Math.acos(r[0] / r_abs)
  if(r[1] >= 0)
    theta = 2 * Math.PI - theta
  return [r_abs, theta]
}

function applyPosition(elem, r) {
  r = trans(r)
  if(r[2] < 0)
  {
    elem.style.background = "lightblue"
    r[2] = -r[2]
  }
  else
    elem.style.background = "blue"
  var scale = getScale(r[2])
  if(scale && !isNaN(r[0]) && !isNaN(r[1]))
  {
    elem.style.display = "inline"
    elem.style.left = getLeft(r[0] * scale) + "px"
    elem.style.top = getTop(r[1] * scale) + "px"
  }
  else
    elem.style.display = "none"
}

var fps = 10

function frameFunction () {  // update globally

  coord = getCoordinates()
  var axes_1 = { }
  axes_1["ax"] = trans([1, 0, 0])
  axes_1["ay"] = trans([0, 1, 0])
  axes_1["az"] = trans([0, 0, 1])
  document.getElementsByName("axis").forEach(function (axis) {
    applyPosition(axis, [0, 0, 0])
    var scale = getScale(axes_1[axis.id][2])
    var t = getPolar(axes_1[axis.id]), len = t[0] * scale, theta = t[1]
    axis.style.transform = "rotate(" + (2*Math.PI - theta) + "rad)"
    axis.style.paddingLeft = 716 * len + "px"
    axis.style.marginTop = "6px"
    axis.style.left = axis.offsetLeft - 358 * len + "px"
  })

  var phase_new = getPhase()
  if(phase != phase_new)
  {
    clearParticle()
    phase = phase_new
    generateParticle()
  }

  if(phase < 0 || phase >= particles.length)
    return
  particles[phase].forEach(function (particle) {
    var elem = document.getElementById(particle.no)
    if(!elem)
      return
    var t = getTimeSpan()
    var r = [ ]
    for(var i = 0; i < 3; ++i)
      r[i] = particle.r[i] + particle.v[i] * t
    applyPosition(elem, r)
  })

}
