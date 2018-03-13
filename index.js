const commonVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }`;

const edgesFragmentShader = `
#include <packing>
varying vec2 vUv;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

float readDepth (sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
  return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
  float oldDepth = readDepth(tDepth, vUv);
  float fragCoordZ = gl_FragCoord.z;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
  float currentDepth = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
  // if (oldDepth > gl_FragCoord.z) {
  //   discard;
  //   return;
  // }
  // if (oldDepth > currentDepth) {
  //   // gl_FragColor = vec4(1, 0, 0, 1);
  //   discard;
  // } else {
    gl_FragColor = vec4(0.18, 0.18, 0.18, 1);
  // }
}
`;

const frameFragmentShader = `
varying vec2 vUv;
uniform sampler2D tDiffuse;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
`;


function addLights(scene) {
  const x = new THREE.Vector3(1, 0, 0);
  const nx = new THREE.Vector3(-1, 0, 0);
  const y = new THREE.Vector3(0, 1, 0);
  const ny = new THREE.Vector3(0, -1, 0);
  const z = new THREE.Vector3(0, 0, 1);
  const nz = new THREE.Vector3(0, 0, -1);
  const positions = [x, nx, y, ny, z, nz];
  positions.forEach(position => {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.copy(position.multiplyScalar(1));
    scene.add(light);
  });
}

function addEdges(mesh, scene) {
  if (!(mesh instanceof THREE.Mesh)) return;
  const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
  const line = new THREE.LineSegments(edges, new THREE.ShaderMaterial({
    defines: {},
    uniforms: {
      tDepth: { value: target.depthTexture },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far }
    },
    vertexShader: commonVertexShader,
    fragmentShader: edgesFragmentShader
  }));
  scene.add(line);
}

function createFrameScene() {
  window.frameCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  window.frameScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2));
  quad.frustumCulled = false; // Avoid getting clipped
  const frameMaterial = new THREE.ShaderMaterial({
    defines: {},
    uniforms: {
      tDiffuse: { value: target.texture },
      tDepth: { value: target.depthTexture },
      resolution: { value: new THREE.Vector2(1 / 1024, 1 / 512) }
    },
    vertexShader: commonVertexShader,
    fragmentShader: frameFragmentShader,
  });
  quad.material = frameMaterial;
  frameScene.add(quad);
}

function initScene(obj) {
  window.scene = new THREE.Scene();
  window.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.copy(new THREE.Vector3(0.5874745675273501, 0.6554984701940583, 1.08064672475596));
  camera.rotation.copy(new THREE.Euler(-0.5452435447847281, 0.43509835311327705, 0.2503109179406694));
  controls = new OrbitControls(camera);
  addLights(scene);

  window.edgesScene = new THREE.Scene();
  obj.traverse(mesh => {
    if (mesh.type !== 'Mesh') return;
    addEdges(mesh, edgesScene);
  });
  scene.add(obj);
}

function createTargets() {
  window.target = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    }
  );
  target.depthTexture = new THREE.DepthTexture();
  target.depthTexture.type = THREE.UnsignedShortType;
  
  window.renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.autoClear = false;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

var animate = function() {
  requestAnimationFrame(animate);

  renderer.clearTarget(target, true, true, true);
  renderer.clear(true, true, true);
  renderer.render(scene, camera, target);
  renderer.render(frameScene, frameCamera);
  // renderer.clearDepth();
  renderer.render(edgesScene, camera);
};

function start(obj) {
  createTargets();
  initScene(obj);
  createFrameScene();
  animate();
}
// start();
const loader = new THREE.OBJLoader();


var g = new THREE.BoxGeometry(1, 1, 1);
var m = new THREE.MeshPhongMaterial({color: 0xd4d400});
var mesh = new THREE.Mesh(g, m);

// loader.load("c20.obj", start);
start(mesh)
