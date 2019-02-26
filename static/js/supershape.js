let HALF_PI = Math.PI * 0.5;

let globe;
let camera, scene, controls, renderer, geometry, material, mesh;

let gui;
let guiController = new function() {
    this.color = "#003e2c";
    this.detail = 300;
    this.wireframe = false;
    this.autorotate = false;
    this.r = 1;
    this.a = 1;
    this.b = 1;
    this.m = 7
    this.n1 = 0.2;
    this.n2 = 1.7;
    this.n3 = 1.7;
};

init();
animate();

function init() {
    // create scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100000 );
    camera.position.set(-2, 2, 2);
    
    // ambient light
    scene.add(new THREE.AmbientLight(0xbbbbbb));

    // directional light
    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 0);
    scene.add(light);

    // scene.add( new THREE.AxesHelper( 20 ) );
    
    // geometry
    globe = new Array(guiController.detail+1);
    for(i=0; i<guiController.detail+1; i++)
        globe[i] = new Array(guiController.detail+1);
    
    saveShapeVertices();
    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(createVertexArray(), 3));

    // material
    material = new THREE.MeshPhongMaterial({ color: 0x003e2c, specular: 0xffffff, shininess: 3, flatShading: THREE.SmoothShading });

    // mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.drawMode = THREE.TriangleStripDrawMode;
    scene.add(mesh);
    
    // renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight+3);
    document.body.appendChild(renderer.domElement);

    // orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // create & init GUI
    gui = new dat.GUI();
    initGui();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (guiController.autorotate) {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
    }

	renderer.render(scene, camera);
}

function initGui() {
    gui.addColor(guiController, 'color').onChange(d => material.setValues({color: guiController.color}));
    gui.add(guiController, 'detail', 10, 500, 1).onChange(d => {
        globe = new Array(guiController.detail+1);
        for(i=0; i<guiController.detail+1; i++)
            globe[i] = new Array(guiController.detail+1);
        redraw();
    });
    gui.add(guiController, 'wireframe', false).onChange(d => material.wireframe = guiController.wireframe);
    gui.add(guiController, 'autorotate', false);
    gui.add(guiController, 'r', 1, 10).onChange(redraw);
    gui.add(guiController, 'a', 0, 2, 0.01).onChange(redraw);
    gui.add(guiController, 'b', 0, 2, 0.01).onChange(redraw);
    gui.add(guiController, 'm', 0, 100).onChange(redraw);
    gui.add(guiController, 'n1', 0.1, 10).onChange(redraw);
    gui.add(guiController, 'n2', 0, 5).onChange(redraw);
    gui.add(guiController, 'n3', 0, 5).onChange(redraw);
}

function redraw() {
    saveShapeVertices();
    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(createVertexArray(), 3));
    mesh.geometry = geometry;
}

function saveShapeVertices() {
    for (i = 0; i < guiController.detail+1; i++) {
        let lat = THREE.Math.mapLinear(i, 0, guiController.detail, -HALF_PI, HALF_PI);
        let  r2 = supershape(lat, guiController.a, guiController.b, guiController.m, guiController.n1, guiController.n2, guiController.n3);
        for (j = 0; j < guiController.detail+1; j++) {
            let lon = THREE.Math.mapLinear(j, 0, guiController.detail, -Math.PI, Math.PI);
            let r1 = supershape(lon, guiController.a, guiController.b, guiController.m, guiController.n1, guiController.n2, guiController.n3);
            let x = guiController.r * r1 * Math.cos(lon) * r2 * Math.cos(lat);
            let y = guiController.r * r1 * Math.sin(lon) * r2 * Math.cos(lat);
            let z = guiController.r * r2 * Math.sin(lat);
            globe[i][j] = new THREE.Vector3(x, y, z);
        }
    }
}

function createVertexArray() {
    vertices = [];
    for (i = 0; i < guiController.detail; i++) {
        for (j = 0; j < guiController.detail+1; j++) {
            let v1 = globe[i][j];
            let v2 = globe[i+1][j];
            vertices.push(v2.x, v2.y, v2.z);
            vertices.push(v1.x, v1.y, v1.z); 
        }
    }
    return new Float32Array(vertices);
}

function supershape(theta, a, b, m, n1, n2, n3) {
    return Math.pow(Math.pow(Math.abs((1/a)*Math.cos(m * theta * 0.25)), n2) + Math.pow(Math.abs((1/b)*Math.sin(m * theta * 0.25)), n3), -1/n1);
}