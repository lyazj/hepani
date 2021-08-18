"use strict"

/* read / write access rules for outer only */

/* double, monitor performance, read-only */
var fps = 0

/* double, accurate position on timeline, read-write */
var time

/* unsigned, block index on timeline, read-only */
var phase

/* OrbitControls, read-only */
var controls

/* mouse over the Object3D, read-only */
var intersect

/* visibility: hidden, {DOM-id: DOM-span}, read-only */
var labelOverlaps = { }

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera()
const renderer = new THREE.WebGLRenderer({alpha: true})
const axesHelper = new THREE.AxesHelper(100)
const point = new THREE.PointLight(0xffffff)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const particleMaterials = { }
const particleMeshes = { }

scene.add(axesHelper)
scene.add(point)

// @require: 0x00 < ICI < 0x80
const intersectColorEnhancement = 0x7f

const particleRadius = 1
const minLabelDistance = 20

// // @require: labelWidth >> labelHeight
// const labelWidth = 1200
// const labelHeight = 200

/* inner variables */
var _initializeState
var _animationTimeStamp
var _shouldDisplayLabels
var _labelIntervalID
var _fpsCount = 0
var _fpsAccumulate = 0

// @noexcept
function render() {
  for(var no in particleMeshes)
    particleMeshes[no].updateLabel()
  renderer.render(scene, camera)
  updateStatus()
}

// @noexcept
function ongetIntersect(particleMesh) {
  if(!(particleMesh instanceof ParticleMesh))
    return
  particleMesh.material = getIntersectMaterial(particleMesh.data)
}

// @noexcept
function onloseIntersect(particleMesh) {
  if(!(particleMesh instanceof ParticleMesh))
    return
  particleMesh.material = getParticleMaterial(particleMesh.data)
}

// @noexcept
function onclickIntersect(particleMesh) {
  if(!(particleMesh instanceof ParticleMesh))
    return
  getDescription(particleMesh.data.id, function (description) {
    var isDisplayingOriginal = isDisplaying()
    if(isDisplayingOriginal)
      stop()
    alert(
      "Particle No." + particleMesh.data.no +
      "\n----------------------------------------\n" +
      "Birth: " + particleMesh.data.birth + "        " +
      "Death: " + particleMesh.data.death + "\n" +
      "Status: " + particleMesh.data.status + "        " +
      "Colours: " + particleMesh.data.colours + "        " +
      "Energy: " + particleMesh.data.e + " MeV\n" +
      "Velocity: (c) " + particleMesh.data.v + "\n" +
      "Position at birth: (cΔt) " + particleMesh.data.r + "\n" +
      "Mothers: " + particleMesh.data.momset + "\n" +
      "Daughters: " + particleMesh.data.dauset + "\n\n" +
      "General Description" +
      "\n----------------------------------------\n" +
      description
    )
    if(intersect)
      onloseIntersect(intersect.object)
    if(isDisplayingOriginal)
      start()
  })
}

// @noexcept
function onmousemove(evt) {
  mouse.x = evt.clientX / innerWidth * 2 - 1
  mouse.y = evt.clientY / innerHeight * -2 + 1
  updateIntersect()
}

// @noexcept
function onclick(evt) {
  if(intersect)
    onclickIntersect(intersect.object)
}

// @noexcept
// @safe: duplicate calling
function updateControls() {

  if(controls)
  {
    controls.removeEventListener("change", render)
    controls.dispose()
  }
  controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.addEventListener("change", render)

  removeEventListener("mousemove", onmousemove)
  removeEventListener("click", onclick)
  addEventListener("mousemove", onmousemove)
  addEventListener("click", onclick)

}

// @noexcept
function updateIntersect() {
  raycaster.setFromCamera(mouse, camera)
  var intersectNew = raycaster.intersectObjects(scene.children)[0]
  if(intersectNew != intersect)
  {
    if(intersect)
      onloseIntersect(intersect.object)
    intersect = intersectNew
    if(intersect)
      ongetIntersect(intersect.object)
    render()
  }
}

// @noexcept
function checkTimePhase() {
  return time >= timeline[phase - 1] && time < timeline[phase]
}

// @noexcept
function updatePhase() {
  if(checkTimePhase())
    return false
  while(time >= timeline[phase])
    ++phase
  while(time < timeline[phase - 1])
    --phase
  return true
}

// @noexcept
function updateParticles(timeSpan) {
  if(updatePhase())
  {
    if(phase >= particles.length)
    {
      phase = -1
      time = 0.0
      clearParticles()
      return stop()
    }
    for(var no in particleMeshes)
      if(!particleMeshes[no].check())
        removeParticleMesh(no)
    particles[phase].forEach(function (particle) {
      createParticleMesh(particle)
    })
  }
  for(var no in particleMeshes)
    particleMeshes[no].translate(timeSpan)
}

// @noexcept
function clearParticles() {
  for(var no in particleMeshes)
    removeParticleMesh(no)
}

// @noexcept
function clearParticleMaterials() {
  for(var color in particleMaterials)
    removeParticleMaterial(color)
}

// @noexcept
function removeCanvases() {
  var canvases = document.getElementsByTagName("canvas")
  while(canvases.length)
    canvases[0].parentElement.removeChild(canvases[0])
}

// @noexcept
function updateSize() {
  camera.fov = 75
  camera.aspect = innerWidth / innerHeight
  camera.near = 0.1
  camera.far = 1000
  camera.position.set(20, 20, 20)
  camera.lookAt(scene.position)
  camera.updateProjectionMatrix()
  point.position.set(40, 40, 40)
  renderer.setSize(innerWidth, innerHeight)
  render()
}

// @noexcept
function updateStatus() {
  if(timeStatus)
    timeStatus.innerHTML = time.toFixed(3) + " s"
  if(phaseStatus)
    phaseStatus.innerHTML = phase
  _fpsAccumulate += fps
  ++_fpsCount
  if(_fpsCount == 100)
  {
    fpsStatus.innerHTML = (_fpsAccumulate / _fpsCount).toFixed(2)
    _fpsCount = _fpsAccumulate = 0
  }
}

// @noexcept
function initialize(doubleCallingNeeded) {
  if(doubleCallingNeeded && (_initializeState = !_initializeState))
    return
  time = 0.0
  phase = -1
  clearParticles()
  clearParticleMaterials()
  removeCanvases()
  document.body.appendChild(renderer.domElement)
  updateSize()
  onresize = updateSize
  enableDisplayLabels()
  enableUpdateLabelOverlaps()
}

// @noexcept
function animate() {
  render()
  if(!_animationTimeStamp)
    return
  var now = performance.now()
  var timeSpan = (now - _animationTimeStamp) / 1000
  _animationTimeStamp = now
  time += timeSpan
  fps = 1 / timeSpan
  updateParticles(timeSpan)
  requestAnimationFrame(animate)
}

// @noexcept
function start() {
  if(isLoading())
    return alert("Loading component, please wait...")
  _animationTimeStamp = performance.now()
  start_stop.innerHTML = "Stop"
  animate()
}

// @noexcept
function stop() {
  _animationTimeStamp = undefined
  start_stop.innerHTML = "Start"
  animate()
}

// @noexcept
function isDisplaying() {
  return !!_animationTimeStamp
}

// @noexcept
function startStop() {
  if(isDisplaying())
    stop()
  else
    start()
}

// @noexcept
function getParticleColor(particleData) {
  return PID.getColor(particleData.id)
  // var color = 0
  // var proportion = particleData.e / particles[0][0].e
  // if(proportion >= 0 && proportion <= 1)
  // {
  //   proportion = Math.pow(proportion, 0.5)
  //   color += proportion * 0xff0000 + (1 - proportion) * 0x0000ff
  // }
  // var ratio = particleData.m / particleData.e
  // if(ratio >= 0 && ratio <= 1)
  //   color += ratio * 0x00ff00
  // return Math.round(color)
}

// @noexcept
function getIntersectColor(particleData) {
  function enhance(val) {
    if(val < 0x7f)
      return val + intersectColorEnhancement
    else
      return val - intersectColorEnhancement
  }
  var color = getParticleColor(particleData)
  var b = enhance(color & 0xff)
  color >>= 8
  var g = enhance(color & 0xff)
  color >>= 8
  color = enhance(color & 0xff)
  color <<= 8
  color += g
  color <<= 8
  color += b
  return color
}

// @noexcept
function getParticleMaterial(particleData) {
  var particleColor = getParticleColor(particleData)
  return particleMaterials[particleColor] =
    particleMaterials[particleColor] || new THREE.MeshLambertMaterial({
      color: particleColor,
    })
}

// @noexcept
function getIntersectMaterial(particleData) {
  var particleColor = getIntersectColor(particleData)
  return particleMaterials[particleColor] =
    particleMaterials[particleColor] || new THREE.MeshLambertMaterial({
      color: particleColor,
    })
}

class ParticleMesh extends THREE.Mesh {

  static geometry = new THREE.SphereGeometry(particleRadius)

  // @noexcept: super
  constructor(data) {
    super(ParticleMesh.geometry, getParticleMaterial(data))
    this.data = data
    this.initialize()
    createLabel(data, getObjectUV(this))
    scene.add(this)
  }

  // @noexcept
  initialize() {
    this.position.fromArray(this.data.r)
  }

  // @noexcept
  getVelocity() {
    return new THREE.Vector3().fromArray(this.data.v)
  }

  // @noexcept
  getDisplacement(timeSpan) {
    return this.getVelocity().multiplyScalar(timeSpan)
  }

  // @noexcept
  translate(timeSpan) {
    this.position.add(this.getDisplacement(timeSpan))
  }

  // @noexcept
  getLabel() {
    return document.getElementById(this.data.no)
  }

  // @noexcept
  updateLabel() {
    if(!_shouldDisplayLabels)
      return
    var label = this.getLabel()
    var position = getObjectUV(this)
    if(label)
    {
      label.style.left = position[0] + "px"
      label.style.top = position[1] + "px"
      if(labelOverlaps[label.id])
        label.style.visibility = "hidden"
      else
        label.style.visibility = "visible"
    }
  }

  // @noexcept
  remove() {
    var label = this.getLabel()
    if(label)
      label.parentElement.removeChild(label)
    scene.remove(this)
  }

  // @noexcept
  check() {
    if(phase >= this.data.birth && (
      this.data.death == -1 || phase < this.data.death
    ))
      return true
    return false
  }

}

// @noexcept
// @safe: duplicate calling
function createParticleMesh(particleData) {
  var particleNo = particleData.no
  return particleMeshes[particleNo] =
    particleMeshes[particleNo] || new ParticleMesh(particleData)
}

// @noexpect
// @safe: duplicate calling
function removeParticleMesh(particleNo) {
  if(!particleMeshes[particleNo])
    return
  particleMeshes[particleNo].remove()
  delete particleMeshes[particleNo]
}

// @noexpect
// @safe: duplicate calling
function removeParticleMaterial(particleColor) {
  if(!particleMaterials[particleColor])
    return
  particleMaterials[particleColor].dispose()
  delete particleMaterials[particleColor]
}

// @noexpect
function getObjectUV(object) {
  var position = new THREE.Vector3()
  object.getWorldPosition(position)
  position = position.project(camera)
  return [
    innerWidth / 2 * (1 + position.x),
    innerHeight / 2 * (1 - position.y)
  ]
}

/* position required for repressing glitter */
// @noexpect
function createLabel(particleData, position) {
  var label = document.createElement("span")
  label.className = "label"
  label.id = particleData.no
  label.innerHTML = particleData.name
  label.style.color = "#" + new THREE.Color(
    0xffffff - getParticleColor(particleData)
  ).getHexString()
  if(_shouldDisplayLabels)
  {
    label.style.display = "inline-block"
    label.style.visibility = "hidden"
    label.style.left = position[0] + "px"
    label.style.top = position[1] + "px"
    updateLabelOverlap(label)
  }
  else
    label.style.display = "none"
  labels.appendChild(label)
  return label
}

// @noexcept
function updateLabelOverlap(label) {
  if(!_shouldDisplayLabels)
    return
  var all = labels.children
  var overlaps = labelOverlaps
  var overlap
  for(var i = 0; i < all.length; ++i)
  {
    var l = all[i]
    if(!l)
      return
    if(l == label)
      continue
    if(getLabelDistance(l, label) < minLabelDistance)
      overlap = overlap || !overlaps[l.id]
  }
  overlaps[label.id] = overlap
}

// @noexpect
function updateLabelOverlaps() {
  if(!_shouldDisplayLabels)
    return
  var all = labels.children
  var overlaps = { }
  for(var i = 0; i < all.length; ++i)
  {
    var l1 = all[i]
    if(!l1)
      return
    for(var j = 0; j < i; ++j)
    {
      var l2 = all[j]
      if(!l2)
        return
      if(getLabelDistance(l1, l2) < minLabelDistance)
        overlaps[l1.id] = overlaps[l1.id] || !overlaps[l2.id]
    }
  }
  labelOverlaps = overlaps
}

/* donot use offset... */
// @noexpect
function getLabelDistance(l1, l2) {
  return new THREE.Vector2(
    l1.style.left.slice(0, -2) - l2.style.left.slice(0, -2),
    l1.style.top.slice(0, -2) - l2.style.top.slice(0, -2)
  ).length()
}

// @noexcept
function enableDisplayLabels() {
  checkDisplayLabels.checked = _shouldDisplayLabels = true
  var all = labels.children
  for(var i = 0; i < all.length; ++i)
    all[i].style.display = "inline-block"
}

// @noexcept
function disableDisplayLabels() {
  checkDisplayLabels.checked = _shouldDisplayLabels = false
  var all = labels.children
  for(var i = 0; i < all.length; ++i)
    all[i].style.display = "none"
}

// @noexcept
function enableUpdateLabelOverlaps() {
  checkUpdateLabelOverlaps.checked = true
  if(_labelIntervalID)
    clearInterval(_labelIntervalID)
  _labelIntervalID = setInterval(updateLabelOverlaps, 500)
}

// @noexcept
function disableUpdateLabelOverlaps() {
  checkUpdateLabelOverlaps.checked = false
  clearInterval(_labelIntervalID)
  _labelIntervalID = undefined
}

checkDisplayLabels.onchange = function() {
  if(checkDisplayLabels.checked)
    enableDisplayLabels()
  else
    disableDisplayLabels()
}

checkUpdateLabelOverlaps.onchange = function() {
  if(checkUpdateLabelOverlaps.checked)
    enableUpdateLabelOverlaps()
  else
    disableUpdateLabelOverlaps()
}

// function createLabelCanvas(particleData) {
//   var canvas = document.createElement("canvas")
//   canvas.width = labelWidth
//   canvas.height = labelWidth
//   var context = canvas.getContext("2d")
//   context.font = labelHeight + "px Arial"
//   context.textAlign = "center"
//   context.textBaseline = "middle"
//   context.fillStyle = "#00ff00"
//   context.fillText(particleData.name,
//     canvas.width / 2, canvas.height / 2, labelWidth
//   )
//   return canvas
// }
// 
// function createLabelTexture(particleData) {
//   return new THREE.CanvasTexture(createLabelCanvas(particleData))
// }
// 
// function createLabelMaterial(particleData) {
//   return new THREE.SpriteMaterial({
//     color: 0xff00ff,
//     map: createLabelTexture(particleData),
//   })
// }
// 
// function createLabel(particleData) {
//   var label = new THREE.Sprite(createLabelMaterial(particleData))
//   label.position.setZ(particleRadius * 2)
//   label.scale.set(10, 10, 1)
//   return label
// }
