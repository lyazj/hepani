"use strict"

var time
var phase

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera()
const renderer = new THREE.WebGLRenderer({alpha: true})
const axesHelper = new THREE.AxesHelper(100)
const controls = new THREE.OrbitControls(camera, renderer.domElement)
const point = new THREE.PointLight(0xffffff)
const particleMaterials = { }
const particleMeshes = { }

scene.add(axesHelper)
scene.add(point)
controls.addEventListener('change', function () {
  renderer.render(scene, camera)
})

/* inner variables */
var _initializeState
var _animationDate

function checkTimePhase() {
  return time >= timeline[phase - 1] && time < timeline[phase]
}

function updatePhase() {
  if(checkTimePhase())
    return false
  while(time >= timeline[phase])
    ++phase
  while(time < timeline[phase - 1])
    --phase
  return true
}

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
      {
        particleMeshes[no].remove()
        delete particleMeshes[no]
      }
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
  {
    particleMeshes[no].remove()
    delete particleMeshes[no]
  }
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
  renderer.render(scene, camera)
}

// @noexcept
function initialize(doubleCallingNeeded) {
  if(doubleCallingNeeded && (_initializeState = !_initializeState))
    return
  time = 0.0
  phase = -1
  clearParticles()
  removeCanvases()
  document.body.appendChild(renderer.domElement)
  updateSize()
  onresize = updateSize
}

// @noexcept
function animate() {
  renderer.render(scene, camera)
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

function getParticleMaterial(particleData) {
  var particleColor = getParticleColor(particleData)
  return particleMaterials[particleColor] =
    particleMaterials[particleColor] || new THREE.MeshLambertMaterial({
      color: particleColor,
    })
}

class ParticleMesh extends THREE.Mesh {

  static geometry = new THREE.SphereGeometry(2)

  constructor(data) {
    super(ParticleMesh.geometry, getParticleMaterial(data))
    this.data = data
    this.initialize()
    scene.add(this)
  }

  initialize() {
    this.position.x = this.data.r[0]
    this.position.y = this.data.r[1]
    this.position.z = this.data.r[2]
  }

  translate(timeSpan) {
    this.position.x += this.data.v[0] * timeSpan
    this.position.y += this.data.v[1] * timeSpan
    this.position.z += this.data.v[2] * timeSpan
  }

  remove() {
    scene.remove(this)
  }

  check() {
    if(phase >= this.data.birth &&
      (this.data.death == -1 || phase < this.data.death))
      return true
    return false
  }

}

function createParticleMesh(particleData) {
  var particleNo = particleData.no
  return particleMeshes[particleNo] =
    particleMeshes[particleNo] || new ParticleMesh(particleData)
}

function removeParticleMesh(particleData) {
  var particleMesh = particleMeshes[particleData.no]
  if(!particleMesh)
    return false
  particleMesh.remove()
  return true
}
