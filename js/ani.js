"use strict"

/* read / write access rules for outer only */

/* double, accurate position on timeline, read-only */
var time = 0.0

/* unsigned, block index on timeline, read-only */
var phase = -1

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
const arrowLengthUnit = 4

// // @require: labelWidth >> labelHeight
// const labelWidth = 1200
// const labelHeight = 200

/* inner variables */
var _initializeState
var _animationTimeStamp
var _shouldDisplayLabels
var _shouldDisplayArrows
var _labelIntervalID
var _timeRecord = []

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
    {
      onloseIntersect(intersect.object)
      intersect = undefined
    }
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
  if(timeStatus && timeline && timeline[-1] == 0)
    timeStatus.innerHTML = time.toFixed(3)
      + " / " + timeline[timeline.length - 1].toFixed(3) + " s"
  if(phaseStatus)
    phaseStatus.innerHTML = phase + " / " + timeline.length
  if(_timeRecord.length >= 20)
  {
    var times = _timeRecord
    _timeRecord = []
    var timeSum = 0
    for(var i = 0; i < times.length; ++i)
      timeSum += times[i]
    var fps = times.length / timeSum
    fpsStatus.innerHTML = fps.toFixed(2)
    if(fps < 24)
    {
      if(fps < 12)
        fpsStatus.style.color = "red"
      else
        fpsStatus.style.color = "yellow"
    }
    else
      fpsStatus.style.color = ""
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
  disableDisplayArrows()
}

// @noexcept
function procedure(timeSpan) {
  render()
  time += timeSpan
  updateParticles(timeSpan)
}

// @noexcept
function animate() {
  if(!_animationTimeStamp)
    return
  var now = performance.now()
  var timeSpan = (now - _animationTimeStamp) / 1000
  _animationTimeStamp = now
  _timeRecord.push(timeSpan)
  procedure(timeSpan)
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
  render()
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
    if(_shouldDisplayArrows)
      this.createArrow()
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
    var displacement = this.getDisplacement(timeSpan)
    this.position.add(displacement)
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

  // @noexcept
  createArrow() {
    if(!this.velocityArrow)
    {
      var velocity = this.getVelocity()
      var length = velocity.length()
      this.velocityArrow = new THREE.ArrowHelper(
        velocity.normalize(),
        new THREE.Vector3(),
        length * arrowLengthUnit,
        this.material.color.getHex()
      )
      this.add(this.velocityArrow)
    }
  }

  // @noexcept
  hideArrow() {
    if(this.velocityArrow)
      this.velocityArrow.visible = false
  }

  // @noexcept
  displayArrow() {
    if(this.velocityArrow)
      this.velocityArrow.visible = true
    else
      this.createArrow()
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
    label.style.left = position[0] + "px"
    label.style.top = position[1] + "px"
    if(_labelIntervalID)
    {
      label.style.visibility = "hidden"
      updateLabelOverlap(label)
    }
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
  var labels = document.getElementById("labels")
  if(!labels)
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
  var labels = document.getElementById("labels")
  if(!labels)
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
  _shouldDisplayLabels = true
  var checkDisplayLabels = document.getElementById("checkDisplayLabels")
  if(checkDisplayLabels)
    checkDisplayLabels.checked = true
  var all = labels.children
  for(var i = 0; i < all.length; ++i)
    all[i].style.display = "inline-block"
}

// @noexcept
function disableDisplayLabels() {
  _shouldDisplayLabels = false
  var checkDisplayLabels = document.getElementById("checkDisplayLabels")
  if(checkDisplayLabels)
    checkDisplayLabels.checked = false
  var all = labels.children
  for(var i = 0; i < all.length; ++i)
    all[i].style.display = "none"
}

// @noexcept
function enableUpdateLabelOverlaps() {
  var checkUpdateLabelOverlaps =
    document.getElementById("checkUpdateLabelOverlaps")
  if(checkUpdateLabelOverlaps)
    checkUpdateLabelOverlaps.checked = true
  if(_labelIntervalID)
    clearInterval(_labelIntervalID)
  _labelIntervalID = setInterval(updateLabelOverlaps, 500)
}

// @noexcept
function disableUpdateLabelOverlaps() {
  var checkUpdateLabelOverlaps =
    document.getElementById("checkUpdateLabelOverlaps")
  if(checkUpdateLabelOverlaps)
    checkUpdateLabelOverlaps.checked = false
  clearInterval(_labelIntervalID)
  _labelIntervalID = undefined
  var all = labels.children
  for(var i = 0; i < all.length; ++i)
  {
    label = all[i]
    if(!label)
      return
    label[i].style.visibility = "visible"
  }
}

// @noexcept
function enableDisplayArrows() {
  _shouldDisplayArrows = true
  var checkDisplayArrows = document.getElementById("checkDisplayArrows")
  if(checkDisplayArrows)
    checkDisplayArrows.checked = true
  scene.children.forEach(function (mesh) {
    if(mesh instanceof ParticleMesh)
      mesh.displayArrow()
  })
}

// @noexcept
function disableDisplayArrows() {
  _shouldDisplayArrows = false
  var checkDisplayArrows = document.getElementById("checkDisplayArrows")
  if(checkDisplayArrows)
    checkDisplayArrows.checked = false
  scene.children.forEach(function (mesh) {
    if(mesh instanceof ParticleMesh)
      mesh.hideArrow()
  })
}

// @noexcept
function onchangeCheckDisplayLabels() {
  if(checkDisplayLabels.checked)
    enableDisplayLabels()
  else
    disableDisplayLabels()
}

// @noexcept
function onchangeCheckUpdateLabelOverlaps() {
  if(checkUpdateLabelOverlaps.checked)
    enableUpdateLabelOverlaps()
  else
    disableUpdateLabelOverlaps()
}

// @noexcept
function onchangeCheckDisplayArrows() {
  if(checkDisplayArrows.checked)
    enableDisplayArrows()
  else
    disableDisplayArrows()
}

// @noexcept
function changeTime(timeNew) {
  var timeMax = timeline[timeline.length - 1]
  if(!(timeNew >= 0 && timeNew <= timeMax))
    return false
  var timeOriginal = time
  time = timeNew
  if(checkTimePhase())
    updateParticles(time - timeOriginal)
  else
  {
    clearParticles()
    phase = 0
    while(timeline[phase] <= time)
      ++phase
    for(var p = 0; p <= phase; ++p)
      for(var i = 0; i < particles[p].length; ++i)
      {
        var particle = particles[p][i]
        if(particle.death == -1 || particle.death > phase)
          createParticleMesh(particle)
            .translate(time - timeline[particle.birth - 1])
      }
  }
  render()
  return true
}

// @noexcept
function promptChangeTime() {
  stop()
  var timeMax = timeline[timeline.length - 1]
  var timeInput =
    prompt("Change time: (second, 0~" + timeMax.toFixed(3) + ")")
  if(timeInput == null)
    return
  if(!changeTime(Number.parseFloat(timeInput)))
    alert("Not changed: Invalid time!")
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
//   New
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
