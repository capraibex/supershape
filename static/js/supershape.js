let HALF_PI = Math.PI * 0.5;

let globe;
let camera, scene, controls, renderer, geometry, material, pmaterial, lmaterial, mesh, points, line;

let gui, f1, f2;
let guiController = new function() {
    this.bgcolor = "#000000";
    this.color = "#003e2c";
    this.detail = 200;
    this.wireframe = false;
    this.pointcloud = false;
    this.flatshading = false;
    this.autorotate = false;
    this.lockcontrols = false;
    this._2d = false;
    this.screenshot = () => takeScreenshot();
    this.exportOBJ = () => exportOBJ();
    this.exportPLY = () => exportPLY();
    this.exportGLTF = () => exportGLTF();
    this.randomshape = () => generateRandomShape();
    this.r1 = 1;
    this.a1 = 1;
    this.b1 = 1;
    this.m1 = 7
    this.n11 = 0.2;
    this.n21 = 1.7;
    this.n31 = 1.7;
    this.r2 = 1;
    this.a2 = 1;
    this.b2 = 1;
    this.m2 = 7
    this.n12 = 0.2;
    this.n22 = 1.7;
    this.n32 = 1.7;
};

init();
animate();

function init() {
    // create scene
    scene = new THREE.Scene();

    // camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100000);
    camera.position.set(-2, 2, 2);
    
    // ambient light
    scene.add(new THREE.AmbientLight(0xbbbbbb));

    // directional light
    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 0);
    scene.add(light);

    // geometry
    globe = new Array(guiController.detail+1);
    for (i=0; i<guiController.detail+1; i++)
        globe[i] = new Array(guiController.detail+1);
    
    saveShapeVertices();
    geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(createIndexedVertexArray(), 3));
    geometry.computeVertexNormals();

    // materials
    material = new THREE.MeshPhongMaterial({ color: guiController.color, specular: 0xffffff, shininess: 3, flatShading: guiController.flatshading });
    pmaterial = new THREE.PointsMaterial({ color: guiController.color, size: 2, sizeAttenuation: false });
    lmaterial = new THREE.LineBasicMaterial({ color: guiController.color, size: 2 });

    // mesh
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // points
    points = new THREE.Points(geometry, pmaterial);

    // line
    line = new THREE.Line(geometry, lmaterial);

    // helper
    // scene.add(new THREE.VertexNormalsHelper(mesh, 0.1, 0x00ff00, 1));
    // scene.add(new THREE.AxesHelper(20));
    
    // renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setSize(window.innerWidth, window.innerHeight+3);
    document.body.appendChild(renderer.domElement);

    // orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableKeys = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // create & init GUI
    gui = new dat.GUI();
    initGui();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (guiController.autorotate) {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;

        points.rotation.x += 0.01;
        points.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
    controls.update();
}

function initGui() {
    gui.addColor(guiController, 'bgcolor').onChange(() => {
        scene.background = new THREE.Color(guiController.bgcolor);
    });
    gui.addColor(guiController, 'color').onChange(() => {
        material.setValues({color: guiController.color});
        pmaterial.setValues({color: guiController.color});
        lmaterial.setValues({color: guiController.color});
    });
    gui.add(guiController, 'detail', 10, 300, 1).onChange(() => {
        globe = new Array(guiController.detail+1);
        for(i=0; i<guiController.detail+1; i++)
            globe[i] = new Array(guiController.detail+1);
        redraw();
    });
    gui.add(guiController, 'wireframe', false).onChange(() => material.wireframe = guiController.wireframe);
    gui.add(guiController, 'pointcloud', false).onChange(() => {
        material.needsUpdate = true;
        if (guiController.pointcloud) {
            guiController._2d ? scene.remove(line) : scene.remove(mesh);
            scene.add(points);
        }
        else {
            scene.remove(points);
            guiController._2d ? scene.add(line) : scene.add(mesh);
        }
        redraw();
    });
    gui.add(guiController, 'flatshading', false).onChange(() => { 
        material.needsUpdate = true;
        material.flatShading = guiController.flatshading;
    });
    gui.add(guiController, 'autorotate', false);
    gui.add(guiController, 'lockcontrols', false).name('Sync Controls').onChange(() => {
        f1.name = guiController.lockcontrols ? 'Control 1 = Control 2' : 'Control 1';
        f2.domElement.style.display = guiController.lockcontrols ? 'none' : '';
        updateGuiControls();
        redraw();
    });
    gui.add(guiController, '_2d', false).name('2D Mode').onChange(() => {
        material.needsUpdate = true;
        guiController._2d ? camera.position.set(0, 0, 2) : null;//camera.position.set(-2, 2, 2);
        controls.enableRotate = !guiController._2d;
        guiController.lockcontrols = guiController._2d;
        f1.name = guiController.lockcontrols ? 'Controls' : 'Control 1';
        f2.domElement.style.display = guiController.lockcontrols ? 'none' : '';
        updateGuiControls();
        
        if (guiController._2d) {
            scene.remove(mesh);
            scene.add(line);
            redraw2d();
        }
        else {
            scene.remove(line);
            scene.add(mesh);
            redraw();
        }
    });
    f0 = gui.addFolder('Export');
    f0.add(guiController, 'screenshot').name('as .png');
    f0.add(guiController, 'exportOBJ').name('as .obj');
    f0.add(guiController, 'exportPLY').name('as .ply');
    f0.add(guiController, 'exportGLTF').name('as .gltf');
    gui.add(guiController, 'randomshape').name('Random Shape');
    f1 = gui.addFolder('Control 1');
    f1.add(guiController, 'r1', 1, 10).onChange(redraw);
    f1.add(guiController, 'a1', 0, 2, 0.01).onChange(redraw);
    f1.add(guiController, 'b1', 0, 2, 0.01).onChange(redraw);
    f1.add(guiController, 'm1', 0, 20).onChange(redraw);
    f1.add(guiController, 'n11', 0.1, 10).onChange(redraw);
    f1.add(guiController, 'n21', -5, 5).onChange(redraw);
    f1.add(guiController, 'n31', -5, 5).onChange(redraw);
    f1.open();
    f2 = gui.addFolder('Control 2');
    f2.add(guiController, 'r2', 1, 10).onChange(redraw);
    f2.add(guiController, 'a2', 0, 2, 0.01).onChange(redraw);
    f2.add(guiController, 'b2', 0, 2, 0.01).onChange(redraw);
    f2.add(guiController, 'm2', 0, 20).onChange(redraw);
    f2.add(guiController, 'n12', 0.1, 10).onChange(redraw);
    f2.add(guiController, 'n22', -5, 5).onChange(redraw);
    f2.add(guiController, 'n32', -5, 5).onChange(redraw);
    f2.open();
}

function updateGuiControls() {
    guiController.r2 = guiController.r1;
    guiController.a2 = guiController.a1;
    guiController.b2 = guiController.b1;
    guiController.m2 = guiController.m1;
    guiController.n12 = guiController.n11;
    guiController.n22 = guiController.n21;
    guiController.n32 = guiController.n31;
    updateDisplay(gui);
}

function generateRandomShape() {
    guiController.r1 = THREE.Math.randFloat(0, 3);
    guiController.a1 = THREE.Math.randFloat(0, 2);
    guiController.b1 = THREE.Math.randFloat(0, 2);
    guiController.m1 = THREE.Math.randFloat(0, 20);
    guiController.n11 = THREE.Math.randFloat(0.1, 1000);
    guiController.n21 = THREE.Math.randFloat(-500, 500);
    guiController.n31 = THREE.Math.randFloat(-500, 500);
    guiController.r2 = THREE.Math.randFloat(0, 3);
    guiController.a2 = THREE.Math.randFloat(0, 2);
    guiController.b2 = THREE.Math.randFloat(0, 2);
    guiController.m2 = THREE.Math.randFloat(0, 20);
    guiController.n12 = THREE.Math.randFloat(0.1, 1000);
    guiController.n22 = THREE.Math.randFloat(-500, 500);
    guiController.n32 = THREE.Math.randFloat(-500, 500);
    updateDisplay(gui);
    redraw();
}

function updateDisplay(g) {
    for (var i in g.__controllers) {
        g.__controllers[i].updateDisplay();
    }
    for (var f in g.__folders) {
        updateDisplay(g.__folders[f]);
    }
}

function redraw() {
    if (guiController.lockcontrols)
        updateGuiControls();
    
    if (guiController._2d) {
        redraw2d();
        return;
    }
    
    saveShapeVertices();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(createIndexedVertexArray(), 3));
    geometry.computeVertexNormals();
    if (guiController.pointcloud)
        points.geometry = geometry;
    else
        mesh.geometry = geometry;
}

function redraw2d() {
    saveShapeVertices2d();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(createIndexedVertexArray2d(), 2));
    
    if (guiController.pointcloud)
        points.geometry = geometry;
    else
        line.geometry = geometry;
}

function saveShapeVertices() {
    for (i = 0; i < guiController.detail+1; i++) {
        let lat = THREE.Math.mapLinear(i, 0, guiController.detail, -HALF_PI, HALF_PI);
        let  r2 = supershape(lat, guiController.a2, guiController.b2, guiController.m2, guiController.n12, guiController.n22, guiController.n32);
        for (j = 0; j < guiController.detail+1; j++) {
            let lon = THREE.Math.mapLinear(j, 0, guiController.detail, -Math.PI, Math.PI);
            let r1 = supershape(lon, guiController.a1, guiController.b1, guiController.m1, guiController.n11, guiController.n21, guiController.n31);
            let x = guiController.r1 * r1 * Math.cos(lon) * guiController.r2 * r2 * Math.cos(lat);
            let y = guiController.r1 * r1 * Math.sin(lon) * guiController.r2 * r2 * Math.cos(lat);
            let z = guiController.r2 * r2 * Math.sin(lat);
            globe[i][j] = new THREE.Vector4(x, y, z, null);
        }
    }
}

function saveShapeVertices2d() {
    for (i = 0; i < guiController.detail; i++) {
        let theta = THREE.Math.mapLinear(i, 0, guiController.detail, -Math.PI, Math.PI);
        let r = supershape(theta, guiController.a1, guiController.b1, guiController.m1, guiController.n11, guiController.n21, guiController.n31);
        let x = guiController.r1 * r * Math.cos(theta);
        let y = guiController.r1 * r * Math.sin(theta);
        globe[i][0] = new THREE.Vector2(x, y);
    }
}

function createIndexedVertexArray() {
    vertices = [];
    indices = [];
    index = 0;
    for (i = 0; i < guiController.detail; i++) {
        for (j = 0; j < guiController.detail; j++) {
            /*  
                add vertices for two triangles in following order
                0---1
                | / |
                2---3
            */
            for (oi = 0; oi <= 1; oi++) {
                for (oj = 0; oj <= 1; oj++) {
                    let v = globe[i+oi][j+oj];
                    if (v.w == null) {
                        vertices.push(v.x, v.y, v.z);
                        v.w = index;
                        indices.push(index++);
                    }
                    else {
                        indices.push(v.w);
                    }
                }
            }
            indices.push(globe[i+1][j].w);
            indices.push(globe[i][j+1].w);
        }
    }
    
    let arrayConstructor = (indices.length >= Math.pow(2, 16)) ? Uint32Array : (indices.length >= Math.pow(2, 8)) ? Uint16Array : Uint8Array;
    geometry.setIndex(new THREE.BufferAttribute(new arrayConstructor(indices), 1))
    geometry.attributes.normal = undefined;

    return vertices;
}

function createIndexedVertexArray2d() {
    vertices = [];
    indices = [];
    for (i = 0; i < guiController.detail; i++) {
        let v = globe[i][0];
        vertices.push(v.x, v.y);
        indices.push(i);
    }
    indices.push(0);

    let arrayConstructor = (indices.length >= Math.pow(2, 16)) ? Uint32Array : (indices.length >= Math.pow(2, 8)) ? Uint16Array : Uint8Array;
    geometry.setIndex(new THREE.BufferAttribute(new arrayConstructor(indices), 1));

    return vertices;
}

function supershape(theta, a, b, m, n1, n2, n3) {
    return Math.pow(Math.pow(Math.abs((1/a)*Math.cos(m * theta * 0.25)), n2) + Math.pow(Math.abs((1/b)*Math.sin(m * theta * 0.25)), n3), -1/n1);
}

function takeScreenshot() {
    downloadFile(renderer.domElement.toDataURL(), 'screenshot.png');
}

function exportPLY() {
    let exporter = new THREE.PLYExporter();
    let data = exporter.parse(scene);
    downloadFile(URL.createObjectURL(new Blob([data], { type: 'text/plain' })), 'shape.ply');
}

function exportOBJ() {
    let exporter = new THREE.OBJExporter();
    let data = exporter.parse(scene);
    downloadFile(URL.createObjectURL(new Blob([data], { type: 'text/plain' })), 'shape.obj');
}

function exportGLTF() {
    var exporter = new THREE.GLTFExporter();
    exporter.parse(scene, function (data) {
        downloadFile(URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' })), 'shape.gltf');
    });
}

function downloadFile(data, filename) {
    let a = document.createElement('a');
    a.setAttribute('type', 'hidden');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}