"use strict"

var time
var phase
var controls
var intersect

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera()
const renderer = new THREE.WebGLRenderer({alpha: true})
const axesHelper = new THREE.AxesHelper(100)
const point = new THREE.PointLight(0xffffff)
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const particleMaterials = { }
const particleMeshes = { }

// @require: 0x00 < ICI < 0x80
const intersectColorEnhancement = 0x7f

scene.add(axesHelper)
scene.add(point)

/* inner variables */
var _initializeState
var _animationDate

// @noexcept
function render() {
  renderer.render(scene, camera)
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
  camera.position.set(20, 10, 0)
  camera.lookAt(scene.position)
  camera.updateProjectionMatrix()
  point.position.set(40, 20, 0)
  renderer.setSize(innerWidth, innerHeight)
  render()
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
}

// @noexcept
function animate() {
  render()
  if(!_animationDate)
    return
  var now = new Date()
  var timeSpan = (now - _animationDate) / 1000
  _animationDate = now
  time += timeSpan
  updateParticles(timeSpan)
  requestAnimationFrame(animate)
}

// @noexcept
function start() {
  _animationDate = new Date()
  start_stop.innerHTML = "Stop"
  animate()
}

// @noexcept
function stop() {
  _animationDate = undefined
  start_stop.innerHTML = "Start"
  animate()
}

// @noexcept
function isDisplaying() {
  return !!_animationDate
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
  var color = 0
  var proportion = particleData.e / particles[0][0].e
  if(proportion >= 0 && proportion <= 1)
  {
    proportion = Math.pow(proportion, 0.5)
    color += proportion * 0xff0000 + (1 - proportion) * 0x0000ff
  }
  var ratio = particleData.m / particleData.e
  if(ratio >= 0 && ratio <= 1)
    color += ratio * 0x00ff00
  return Math.round(color)
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

  static geometry = new THREE.SphereGeometry(1)

  // @noexcept: super
  constructor(data) {
    super(ParticleMesh.geometry, getParticleMaterial(data))
    this.data = data
    this.initialize()
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
  remove() {
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
