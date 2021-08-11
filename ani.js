"use strict"

var fps = 60

var width
var height
var k
var s
var x0
var y0
var z0

function updateParameters() {
  width = innerWidth
  height = innerHeight
  k = width / height
  s = 200
  x0 = 100
  y0 = 100
  z0 = 100
}

var camera
var controls
var background
var scene = new THREE.Scene()
var renderer = new THREE.WebGLRenderer()
renderer.setClearColor(0xb9d3ff, 1)
document.body.appendChild(renderer.domElement)

var textureLoader = new THREE.TextureLoader()
var fontLoader = new THREE.FontLoader()

function updateCamera() {
  camera = new THREE.OrthographicCamera(
    -s * k, s * k, s, -s, 1, 1000
  )
  camera.position.set(x0, y0, z0)
  camera.lookAt(scene.position)
  controls = new THREE.OrbitControls(camera, renderer.domElement)
}

function updateRenderer() {
  renderer.setSize(width, height)
}

function updateBackground() {
  if(background)
    scene.remove(background)
  var geometry = new THREE.SphereGeometry(
    Math.sqrt(width*width + height*height) / 2, 36, 36
  )
  var material = new THREE.MeshLambertMaterial({
    map: textureLoader.load("bg.png"),
    side: THREE.BackSide,
  })
  background = new THREE.Mesh(geometry, material)
  scene.add(background)
}

function updateGraphics() {
  updateParameters()
  updateCamera()
  updateRenderer()
  updateBackground()
}

(onresize = updateGraphics)()

function addAxes() {
  var axes = new THREE.AxesHelper(150)
  scene.add(axes)
}

function addLights() {
  var point = new THREE.PointLight(0xffffff)
  point.position.set(0, 0, 300)
  scene.add(point)
  var ambient = new THREE.AmbientLight(0x444444)
  scene.add(ambient)
}

function addMeshes() {
  var geometry = new THREE.BoxGeometry(20, 20, 20)
  var material = new THREE.MeshLambertMaterial({
    color: 0x0000ff,
    opacity: 0.75,
    transparent: true,
  })
  var mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  setInterval(() => { mesh.rotateY(0.01) }, 20)
}

function render() {
  renderer.render(scene, camera)
}

var particleGeometry = new THREE.SphereGeometry(20, 36, 36)
var particleMaterial = new THREE.MeshLambertMaterial({
  color: 0x0000ff,
})
var particleMesh = new THREE.Mesh(particleGeometry, particleMaterial)
scene.add(particleMesh)

addAxes()
addLights()
addMeshes()
setInterval(render, 1 / fps)
