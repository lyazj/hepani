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

/* read-write */
var colorClass = "status"

/* read-write */
var sizeClass = "status"

/* read-write */
var statusInherit

/* read-write */
var speedRate = 1.0

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera()
const renderer = new THREE.WebGLRenderer({alpha: true})
const axesHelper = new THREE.AxesHelper(100)
const point1 = new THREE.PointLight(0xffffff)
const point2 = new THREE.PointLight(0xffffff)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const particleGeometries = { }
const particleMaterials = { }
const particleMeshes = { }

scene.add(axesHelper)
scene.add(point1)
scene.add(point2)

// @require: 0x00 < ICI < 0x80
const intersectColorEnhancement = 0x7f

const particleRadius = 0.4
const minLabeledParticleRadius = particleRadius
const minLabelDistance = 20
const arrowLengthUnit = 4

/* inner variables */
var _initializeState
var _animationTimeStamp
var _shouldDisplayLabels
var _shouldDisplayArrows
var _labelIntervalID
var _timeRecord = []
var _gifRendering
var _gifBlobURL
var _configPage
var _ctrlPressing

// @noexcept
function render() {
  for(let no in particleMeshes)
    particleMeshes[no].updateLabel()
  renderer.render(scene, camera)
  updateStatus()
}

// @noexcept
function ongetIntersect(particleMesh) {
  particleMesh.material = getIntersectMaterial(particleMesh.data)
}

// @noexcept
function onloseIntersect(particleMesh) {
  particleMesh.material = getParticleMaterial(particleMesh.data)
}

// @noexcept
function onclickIntersect(particleMesh) {
  if(isLocal)
  {
    stop()
    return alert("Not available in local mode.")
  }
  getDescription(particleMesh.data.id, function (description) {
    // var isDisplayingOriginal = isDisplaying()
    // if(isDisplayingOriginal)
    //   stop()
    stop()
    alert(
      "Particle No." + particleMesh.data.no +
      "\n----------------------------------------\n" +
      "Birth: " + particleMesh.data.birth + "        " +
      "Death: " + particleMesh.data.death + "\n" +
      "Status: " + particleMesh.data.status + " " +
      "(" + STATUS.getStatusMatch(particleMesh.data).slice(2) + ")        " +
      "PID: " + particleMesh.data.id + " " +
      "(" + PID.getPIDMatch(particleMesh.data).slice(2) + ")\n" +
      "Colours: " + particleMesh.data.colours + "        " +
      "Energy: " + particleMesh.data.e + " MeV\n" +
      "Velocity: (c) " + particleMesh.data.v + "\n" +
      "Position at birth: (cΔt) " + particleMesh.data.r + "\n" +
      "Mothers: " + particleMesh.data.momset + "\n" +
      "Daughters: " + particleMesh.data.dauset + "\n" +
      "Main Mother: " + particleMesh.data.mainMother + "\n\n" +
      "General Description" +
      "\n----------------------------------------\n" +
      description
    )
    if(intersect)
    {
      onloseIntersect(intersect)
      intersect = undefined
    }
    // if(isDisplayingOriginal)
    //   start()
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
  if(config.style.display == "block")
    return
  if(intersect)
    onclickIntersect(intersect)
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
  var intersects = raycaster.intersectObjects(scene.children)
  var intersectNew = undefined
  for(let i = 0; i < intersects.length; ++i)
  {
    var object = intersects[i].object
    if(object instanceof ParticleMesh)
    {
      intersectNew = object
      break
    }
  }
  if(intersectNew != intersect)
  {
    if(intersect)
      onloseIntersect(intersect)
    intersect = intersectNew
    if(intersect)
      ongetIntersect(intersect)
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
  while(phase > -1 && time < timeline[phase - 1])
    --phase
  if(phase == centralPhase)
    playAudio("audio-collide")
  return true
}

// @noexcept
function updateParticles(timeSpan) {
  if(updatePhase())
  {
    if(phase <= -1 || phase >= particles.length)
    {
      phase = -1
      time = 0.0
      clearParticles()
      return stop()
    }
    for(let no in particleMeshes)
      if(!particleMeshes[no].check())
        removeParticleMesh(no)
    particles[phase].forEach(function (particle) {
      createParticleMesh(particle)
    })
  }
  for(let no in particleMeshes)
    particleMeshes[no].translate(timeSpan)
}

// @noexcept
function clearParticles() {
  for(let no in particleMeshes)
    removeParticleMesh(no)
}

// @noexcept
function clearParticleGeometries() {
  for(let size in particleGeometries)
    removeParticleGeometry(size)
}

// @noexcept
function clearParticleMaterials() {
  for(let color in particleMaterials)
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
  camera.position.set(-15, 5, 5)
  camera.lookAt(scene.position)
  camera.updateProjectionMatrix()
  point1.position.copy(camera.position).multiplyScalar(10)
  point2.position.copy(point1.position).negate()
  renderer.setSize(innerWidth, innerHeight)
  render()
}

// @noexcept
function updateStatus() {
  if(timeStatus && timeline && timeline[-1] == 0)
    timeStatus.innerHTML = time.toFixed(3)
      + " / " + timeline[timeline.length - 1].toFixed(3) + " s"
  if(speedStatus)
    speedStatus.innerHTML = speedRate.toFixed(2) + " x"
  if(phaseStatus)
    phaseStatus.innerHTML = phase + " / " + (timeline.length - 1)
  if(_timeRecord.length >= 20)
  {
    var times = _timeRecord
    _timeRecord = []
    var timeSum = 0
    for(let i = 0; i < times.length; ++i)
      timeSum += times[i]
    var fps = times.length / timeSum * speedRate
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
  clearParticleGeometries()
  clearParticleMaterials()
  removeCanvases()
  document.body.appendChild(renderer.domElement)
  updateSize()
  onresize = updateSize
  enableDisplayLabels()
  enableUpdateLabelOverlaps()
  enableInherit()
  disableDisplayArrows()
  document.getElementById("color-class-" + colorClass)
    .checked = "checked"
  document.getElementById("size-class-" + sizeClass)
    .checked = "checked"
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
  var timeSpan = (now - _animationTimeStamp) / 1000 * speedRate
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
  playAudio("audio-background")
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
function getParticleSize(particleData) {
  if(sizeClass == "class")
    return PID.getSize(particleData)
  if(sizeClass == "status")
    return STATUS.getSize(particleData)
}

// @noexcept
function getParticleColor(particleData) {
  if(colorClass == "class")
    return PID.getColor(particleData)
  if(colorClass == "status")
    return STATUS.getColor(particleData)
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
function getParticleGeometry(particleData) {
  var particleSize = getParticleSize(particleData)
  return particleGeometries[particleSize] =
    particleGeometries[particleSize] || new THREE.SphereGeometry(particleSize)
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

  // @noexcept: super
  constructor(data) {
    super(getParticleGeometry(data), getParticleMaterial(data))
    this.data = data
    this.initialize()
    createLabel(this)
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
  updateLabelColor() {
    if(!_shouldDisplayLabels)
      return
    var label = this.getLabel()
    label.style.color = "#" + new THREE.Color(
      0xffffff - this.material.color.getHex()
    ).getHexString()
  }

  // @noexcept
  remove() {
    removeLabel(this)
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
function removeParticleGeometry(particleSize) {
  if(!particleGeometries[particleSize])
    return
  particleGeometries[particleSize].dispose()
  delete particleGeometries[particleSize]
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
// @safe: duplicate calling
function removeParticleMesh(particleNo) {
  if(!particleMeshes[particleNo])
    return
  particleMeshes[particleNo].remove()
  delete particleMeshes[particleNo]
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
function createLabel(particleMesh) {
  if(getParticleSize(particleMesh.data) < minLabeledParticleRadius)
    return
  var label = document.createElement("span")
  label.className = "label"
  label.id = particleMesh.data.no
  label.innerHTML = particleMesh.data.name
  label.style.color = "#" + new THREE.Color(
    0xffffff - particleMesh.material.color.getHex()
  ).getHexString()
  if(_shouldDisplayLabels)
  {
    label.style.display = "inline-block"
    var position = getObjectUV(particleMesh)
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

/* position required for repressing glitter */
// @noexpect
function removeLabel(particleMesh) {
  var label = particleMesh.getLabel()
  if(label)
    label.parentElement.removeChild(label)
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
  var overlap = undefined
  if(!STATUS.shouldInherit(STATUS.getStatusMatch(particleDatas[label.id])))
    for(let i = 0; i < all.length; ++i)
    {
      var l = all[i]
      if(!l)
        break
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
  for(let i = 0; i < all.length; ++i)
  {
    var l1 = all[i]
    if(!l1)
      break
    for(let j = 0; j < i; ++j)
    {
      var l2 = all[j]
      if(!l2)
        break
      if(getLabelDistance(l1, l2) < minLabelDistance)
      {
        if(!STATUS.shouldInherit(
          STATUS.getStatusMatch(particleDatas[l1.id])
        ))
          overlaps[l1.id] = overlaps[l1.id] || !overlaps[l2.id]
        else if(!STATUS.shouldInherit(
          STATUS.getStatusMatch(particleDatas[l2.id])
        ))
          overlaps[l2.id] = overlaps[l2.id] || !overlaps[l1.id]
      }
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
  for(let i = 0; i < all.length; ++i)
    all[i].style.display = "inline-block"
}

// @noexcept
function disableDisplayLabels() {
  _shouldDisplayLabels = false
  var checkDisplayLabels = document.getElementById("checkDisplayLabels")
  if(checkDisplayLabels)
    checkDisplayLabels.checked = false
  var all = labels.children
  for(let i = 0; i < all.length; ++i)
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
  for(let i = 0; i < all.length; ++i)
  {
    label = all[i]
    if(!label)
      break
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
function enableInherit() {
  for(let i = 1; i <= 2; ++i)
  {
    var checkInherit = document.getElementById("check-inherit-" + i)
    if(checkInherit)
      checkInherit.checked = true
  }
  try {
    STATUS.enableInherit()
  } catch(err) {
    statusInherit = true
  }
}

// @noexcept
function disableInherit() {
  for(let i = 1; i <= 2; ++i)
  {
    var checkInherit = document.getElementById("check-inherit-" + i)
    if(checkInherit)
      checkInherit.checked = false
  }
  try {
    STATUS.disableInherit()
  } catch(err) {
    statusInherit = false
  }
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
    for(let p = 0; p <= phase; ++p)
      for(let i = 0; i < particles[p].length; ++i)
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
function changeSpeed(speedNew) {
  if(Number.isNaN(speedNew = Number.parseFloat(speedNew)))
    return false
  if(Math.abs(speedNew) > 1e2)
    speedNew = speedNew >= 0 ? 1e2 : -1e2
  if(Math.abs(speedNew) < 1e-2)
    speedNew = speedNew >= 0 ? 1e-2 : -1e-2
  speedRate = speedNew
  _timeRecord = []
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

// @noexcept
function promptChangeSpeed() {
  stop()
  var speedInput = prompt("Change speed:")
  if(speedInput == null)
    return
  if(!changeSpeed(speedInput))
    return alert("Not changed: Invalid speed!")
}

// @noexcept
function downloadGIF() {
  if(_gifRendering)
    return alert("Please wait for GIF rendering...")
  if(!GIF)
    return alert("No GIF support yet.")
  _gifRendering = true
  var gif = new GIF({
    repeat: 0,  // forever
    quality: 10,  // pixel sample interval
    workers: 8,
    workerScript: "js/gif.worker.js",
    debug: true,
  })
  stop()
  for(let t = 0; t < timeline[timeline.length - 1]; t += 0.1 * speedRate)
  {
    changeTime(t)
    gif.addFrame(renderer.domElement, {
      delay: 100,
      copy: true,
    })
  }
  start()
  gif.on("finished", (blob) => {
    _gifRendering = false
    if(_gifBlobURL)
      URL.revokeObjectURL(_gifBlobURL)
    var a = document.createElement("a")
    _gifBlobURL = a.href = URL.createObjectURL(blob)
    a.download = "animation.gif"
    a.click()
  })
  gif.render()
  alert("Rendering started. " +
    "File downloading will be started after rendering finished.")
}

// @noexcept
function hideConfig() {
  config.style.display = "none"
}

// @noexcept
function displayConfig() {
  stop()
  config.style.display = "block"
  var page = document.getElementById("config-" + _configPage)
  if(page)
    page.style.display = "none"
  _configPage = 1
  page = document.getElementById("config-" + _configPage)
  page.style.display = "block"
}

// @noexcept
function configNextPage() {
  var page = document.getElementById("config-" + _configPage)
  if(page)
    page.style.display = "none"
  ++_configPage
  page = document.getElementById("config-" + _configPage)
  if(!page)
  {
    --_configPage
    page = document.getElementById("config-" + _configPage)
    page.style.display = "block"
    return alert("Already last page!")
  }
  page.style.display = "block"
}

// @noexcept
function configPreviousPage() {
  var page = document.getElementById("config-" + _configPage)
  if(page)
    page.style.display = "none"
  --_configPage
  page = document.getElementById("config-" + _configPage)
  if(!page)
  {
    ++_configPage
    page = document.getElementById("config-" + _configPage)
    page.style.display = "block"
    return alert("Already first page!")
  }
  page.style.display = "block"
}

// @noexcept
function onchangeColorClass(radio) {
  colorClass = radio.value
  updateColorConfig()
  updateParticleColors()
}

// @noexcept
function onchangeSizeClass(radio) {
  sizeClass = radio.value
  updateSizeConfig()
  updateParticleSizes()
}

// @noexcept
function onchangeInherit(checkbox) {
  if(checkbox.checked)
    enableInherit()
  else
    disableInherit()
}

// @noexcept
function updateConfig() {
  updateColorConfig()
  updateSizeConfig()
}

// @noexcept
function updateColorConfig() {

  var prefix
  if(colorClass == "class")
    prefix = "PID"
  else if(colorClass == "status")
    prefix = "STATUS"
  else
    throw new Error("Invalid color classfication: " + colorClass)
  var colors = window[prefix].colors
  var scheme = window[prefix].colorScheme
  var schemes = window[prefix].colorSchemes

  var colorSchemes = document.getElementById("color-schemes")
  var colorSchemeChildren = document.getElementsByClassName("color-scheme-choice")
  while(colorSchemeChildren.length)
    colorSchemes.removeChild(colorSchemeChildren[0])
  for(let scheme in schemes)
  {
    var input = document.createElement("input")
    var label = document.createElement("label")
    var span = document.createElement("span")
    input.type = "radio"
    input.name = "color-scheme"
    input.onchange = new Function(
      prefix + ".setColorScheme(this.value); updateColorConfig();" +
      "updateParticleColors()"
    )
    label.htmlFor = input.id = "color-scheme-" +
      (label.innerHTML = input.value = scheme)
    span.className = "choice color-scheme-choice"
    span.appendChild(input)
    span.appendChild(label)
    var children = colorSchemes.children
    var lastChild = children[children.length - 1]
    colorSchemes.insertBefore(span, lastChild)
  }
  document.getElementById("color-scheme-" + scheme).checked = true

  var colorSelectors = document.getElementById("color-selectors")
  while(colorSelectors.children.length)
    colorSelectors.removeChild(colorSelectors.children[0])
  for(let func in colors)
  {
    var input = document.createElement("input")
    var label = document.createElement("label")
    var div = document.createElement("div")
    input.type = "color"
    input.value = "#" +
      new THREE.Color(colors[func]).getHexString()
    input.onchange = new Function(
      prefix + ".colors." + func +
      " = new THREE.Color(this.value).getHex(); updateParticleColors()"
    )
    label.htmlFor = input.id = "color" + (label.innerHTML = func.slice(2))
    div.className = "color-selector"
    div.appendChild(input)
    div.appendChild(document.createElement("br"))
    div.appendChild(label)
    colorSelectors.appendChild(div)
  }

}

// @noexcept
function updateSizeConfig() {

  var prefix
  if(sizeClass == "class")
    prefix = "PID"
  else if(sizeClass == "status")
    prefix = "STATUS"
  else
    throw new Error("Invalid size classfication: " + sizeclass)
  var sizes = window[prefix].sizes
  var scheme = window[prefix].sizeScheme
  var schemes = window[prefix].sizeSchemes

  var sizeSchemes = document.getElementById("size-schemes")
  var sizeSchemeChildren = document.getElementsByClassName("size-scheme-choice")
  while(sizeSchemeChildren.length)
    sizeSchemes.removeChild(sizeSchemeChildren[0])
  for(let scheme in schemes)
  {
    var input = document.createElement("input")
    var label = document.createElement("label")
    var span = document.createElement("span")
    input.type = "radio"
    input.name = "size-scheme"
    input.onchange = new Function(
      prefix + ".setSizeScheme(this.value); updateSizeConfig();" +
      "updateParticleSizes()"
    )
    label.htmlFor = input.id = "size-scheme-" +
      (label.innerHTML = input.value = scheme)
    span.className = "choice size-scheme-choice"
    span.appendChild(input)
    span.appendChild(label)
    var children = sizeSchemes.children
    var lastChild = children[children.length - 1]
    sizeSchemes.insertBefore(span, lastChild)
  }
  document.getElementById("size-scheme-" + scheme).checked = true

  var sizeEditors = document.getElementById("size-editors")
  while(sizeEditors.children.length)
    sizeEditors.removeChild(sizeEditors.children[0])
  for(let func in sizes)
  {
    var input = document.createElement("input")
    var label = document.createElement("label")
    var div = document.createElement("div")
    input.type = "text"
    input.value = sizes[func]
    input.onchange = new Function(
      prefix + ".sizes." + func + " = this.value; updateParticleSizes()"
    )
    label.htmlFor = input.id = "size-" + (label.innerHTML = func.slice(2))
    div.className = "size-editor"
    div.appendChild(input)
    div.appendChild(document.createElement("br"))
    div.appendChild(label)
    sizeEditors.appendChild(div)
  }
}

// @noexcept
function updateParticleColors() {
  scene.children.forEach(function (mesh) {
    if(!(mesh instanceof ParticleMesh))
      return
    mesh.material = getParticleMaterial(mesh.data)
    mesh.updateLabelColor()
  })
  render()
}

// @noexcept
function updateParticleSizes() {
  scene.children.forEach(function (mesh) {
    if(!(mesh instanceof ParticleMesh))
      return
    mesh.geometry = getParticleGeometry(mesh.data)
    if(getParticleSize(mesh.data) < minLabeledParticleRadius)
      removeLabel(mesh)
  })
  render()
}

// @noexcept
function onkeydownBody(evt) {

  switch(evt.key) {

  case "ArrowLeft":
    var timeNew = time - (_ctrlPressing ? 1 : 0.1)
    if(timeNew < 0)
      timeNew = 0
    changeTime(timeNew)
    break

  case "ArrowRight":
    var timeNew = time + (_ctrlPressing ? 1 : 0.1)
    if(timeNew > timeline[timeline.length - 1])
      timeNew = timeline[timeline.length - 1]
    changeTime(timeNew)
    break

  case " ":
    if(_ctrlPressing)
      break
    document.getElementById("link-start").click()
    break

  case "r":  // case "R":
    if(_ctrlPressing)
      break
    changeTime(0)
    break

  case "Control":
    _ctrlPressing = true
    break

  case "[":
    if(_ctrlPressing)
      break
    changeSpeed(speedRate / 1.2)
    break

  case "]":
    if(_ctrlPressing)
      break
    changeSpeed(speedRate * 1.2)
    break

  case "s":  // case "S":
    if(_ctrlPressing)
    {
      document.getElementById("link-download").click()
      return false
    }
    break

  case "f":  // case "F":
    if(_ctrlPressing)
    {
      document.getElementById("link-file").click()
      return false
    }
    break

  case "c":  // case "C":
    if(_ctrlPressing)
    {
      document.getElementById("link-config").click()
      return false
    }
    break

  case "h":  // case "H":
    if(_ctrlPressing)
    {
      document.getElementById("link-help").click()
      return false
    }
    break

  case "a":  // case "A":
    if(_ctrlPressing)
    {
      document.getElementById("link-about").click()
      return false
    }
    break

  case "Escape":
    if(_ctrlPressing)
      break
    hideConfig()
    break

  case "F12":
    if(_ctrlPressing)
      break
    updateConsole()
    break

  case "=":
    if(_ctrlPressing)
      break
    increaseVolume()
    break

  case "-":
    if(_ctrlPressing)
      break
    decreaseVolume()
    break

  case "m":
    if(_ctrlPressing)
      break
    playPauseAudio("audio-background")
    break

  default:
    // console.log(evt.key)
    break

  }

  return true

}

// @noexcept
function onkeyupBody(evt) {

  switch(evt.key) {

  case "Control":
    _ctrlPressing = false
    break

  default:
    break

  }

  return true

}

// @noexcept
function playAudio(id) {
  var audio = document.getElementById(id)
  if(!audio || !audio.paused)
    return
  audio.play()
}

// @noexcept
function pauseAudio(id) {
  var audio = document.getElementById(id)
  if(!audio || audio.paused)
    return
  audio.pause()
}

// @noexcept
function audioPaused(id) {
  var audio = document.getElementById(id)
  if(!audio)
    return undefined
  return audio.paused
}

// @noexcept
function playPauseAudio(id) {
  var audio = document.getElementById(id)
  if(!audio)
    return
  if(audioPaused(id))
    playAudio(id)
  else
    pauseAudio(id)
}

// @noexcept
function increaseVolume() {
  var audios = document.getElementsByTagName("audio")
  for(let i = 0; i < audios.length; ++i)
    audios[i].volume = Math.min(audios[i].volume + 0.1, 1)
}

// @noexcept
function decreaseVolume() {
  var audios = document.getElementsByTagName("audio")
  for(let i = 0; i < audios.length; ++i)
    audios[i].volume = Math.max(audios[i].volume - 0.1, 0)
}
