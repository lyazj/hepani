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
const particleMaterials = { }
const particleMeshes = { }

const intersectColorIncrement = 0x202020

scene.add(axesHelper)
scene.add(point)
addEventListener("mousemove", (evt) => {
  var mouse = new THREE.Vector2()
  mouse.x = evt.clientX / innerWidth * 2 - 1
  mouse.y = evt.clientY / innerHeight * -2 + 1
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
})
addEventListener("click", (evt) => {
  if(intersect)
    onclickIntersect(intersect.object)
})

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
  getDescription(particleMesh.data.id)
}

// @noexcept
function updateControls() {
  if(controls)
  {
    controls.removeEventListener("change", render)
    controls.dispose()
  }
  controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.addEventListener("change", render)
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
  camera.position.set(25, 25, 25)
  camera.lookAt(scene.position)
  camera.updateProjectionMatrix()
  point.position.set(60, 80, 100)
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
function startStop() {
  if(_animationDate)
    stop()
  else
    start()
}

// TODO: classify particles
function getParticleColor(particleData) {
  return 0x0000ff
}

// @noexcept
function getIntersectColor(particleData) {
  return (
    getParticleColor(particleData) + intersectColorIncrement + 0xffffff
  ) % 0xffffff
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

  static geometry = new THREE.SphereGeometry(2)

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
