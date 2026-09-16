
const THREE = window.THREE;

const gameContainer = document.getElementById("game");

const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const steerValueEl = document.getElementById("steerValue");

const message = document.getElementById("message");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const messageIcon = document.getElementById("messageIcon");

const startBtn = document.getElementById("startBtn");
const connectBtn = document.getElementById("connectBtn");
const serialStatus = document.getElementById("serialStatus");

let scene;
let camera;
let renderer;
let clock;

let roadGroup;
let sceneryGroup;
let obstacleGroup;

let car;
let carCollisionBox = null;
let carCollisionSize = null;

let carModel;


// ============================================================
// CARRO 3D
// ============================================================

const CAR_MODEL_PATH = "./models/carro-game-comprimido.glb";
const CAR_SCALE = 1;
const CAR_HEIGHT = 0.05;
const CAR_ROTATION_Y = Math.PI;


// ============================================================
// CONFIGURAÇÃO DO JOGO
// ============================================================

let gameRunning = false;

let score = 0;

let gameSpeed = 22;
const maxGameSpeed = 80;

const acceleration = 2.5;

let distance = 0;


// ============================================================
// POSIÇÃO DO CARRO
// ============================================================

let carWorldZ = 5;

let steer = 0;
let keyboardSteer = 0;

let carX = 0;
let targetCarX = 0;

let lastSerialInput = 0;

const SERIAL_TIMEOUT = 500;

const ROAD_LIMIT = 4.8;

const STEER_RESPONSE = 14;
const STEER_SMOOTHING = 0.20;


// ============================================================
// OBSTÁCULOS
// ============================================================

const obstacles = [];

const MAX_OBSTACLES = 22;

// Intervalo atual entre geração de obstáculos
let obstacleTimer = 0;

// Começamos com bastante espaço
let obstacleInterval = 2.2;


// ============================================================
// SERIAL
// ============================================================

let port = null;
let reader = null;
let serialConnected = false;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

init();

function init() {

    clock = new THREE.Clock();

    // --------------------------------------------------------
    // CENA
    // --------------------------------------------------------

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x87ceeb);

    scene.fog = new THREE.Fog(
        0x87ceeb,
        80,
        420
    );


    // --------------------------------------------------------
    // CÂMERA
    // --------------------------------------------------------

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    camera.position.set(
        0,
        8,
        18
    );

    camera.lookAt(
        0,
        1,
        -28
    );


    // --------------------------------------------------------
    // RENDERER
    // --------------------------------------------------------

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;

    renderer.outputColorSpace =
        THREE.SRGBColorSpace;

    renderer.toneMapping =
        THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.15;

    gameContainer.appendChild(
        renderer.domElement
    );


    // --------------------------------------------------------
    // LUZES
    // --------------------------------------------------------

    createLights();


    // --------------------------------------------------------
    // MUNDO
    // --------------------------------------------------------

    createWorld();

    createRoad();

    createCar();

    createScenery();


    // --------------------------------------------------------
    // OBSTÁCULOS
    // --------------------------------------------------------

    obstacleGroup = new THREE.Group();

    scene.add(obstacleGroup);


    // --------------------------------------------------------
    // EVENTOS
    // --------------------------------------------------------

    window.addEventListener(
        "resize",
        onResize
    );

    window.addEventListener(
        "keydown",
        handleKeyDown
    );

    window.addEventListener(
        "keyup",
        handleKeyUp
    );


    if (startBtn) {
        startBtn.addEventListener(
            "click",
            startGame
        );
    }


    if (connectBtn) {
        connectBtn.addEventListener(
            "click",
            connectSerial
        );
    }


    updateHUD();

    animate();
}


// ============================================================
// LUZES
// ============================================================

function createLights() {

    const hemiLight =
        new THREE.HemisphereLight(
            0xffffff,
            0x557755,
            2.2
        );

    scene.add(hemiLight);


    const sun =
        new THREE.DirectionalLight(
            0xffffff,
            3
        );

    sun.position.set(
        -30,
        50,
        20
    );

    sun.castShadow = true;

    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;

    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;

    scene.add(sun);
}


// ============================================================
// MUNDO
// ============================================================

function createWorld() {

    const groundGeometry =
        new THREE.PlaneGeometry(
            5000,
            5000
        );

    const groundMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4f7d42,
            roughness: 1
        });

    const ground =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );

    ground.rotation.x =
        -Math.PI / 2;

    ground.position.y = -0.05;

    ground.receiveShadow = true;

    scene.add(ground);


    // Sol visual

    const sunGeometry =
        new THREE.SphereGeometry(
            5,
            24,
            24
        );

    const sunMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffdd88
        });

    const sun =
        new THREE.Mesh(
            sunGeometry,
            sunMaterial
        );

    sun.position.set(
        -45,
        45,
        -100
    );

    scene.add(sun);
}


// ============================================================
// ESTRADA
// ============================================================

function createRoad() {

    roadGroup =
        new THREE.Group();

    scene.add(roadGroup);


    // --------------------------------------------------------
    // ASFALTO
    // --------------------------------------------------------

    const roadGeometry =
        new THREE.PlaneGeometry(
            12,
            4000
        );

    const roadMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x303238,
            roughness: 0.95
        });

    const road =
        new THREE.Mesh(
            roadGeometry,
            roadMaterial
        );

    road.rotation.x =
        -Math.PI / 2;

    road.position.y = 0;

    road.position.z = -1990;

    road.receiveShadow = true;

    roadGroup.add(road);


    // --------------------------------------------------------
    // LINHAS CENTRAIS
    // --------------------------------------------------------

    const lineGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.04,
            4
        );

    const lineMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffffff
        });


    for (
        let z = 15;
        z > -3990;
        z -= 8
    ) {

        const line =
            new THREE.Mesh(
                lineGeometry,
                lineMaterial
            );

        line.position.set(
            0,
            0.03,
            z
        );

        roadGroup.add(line);
    }


    // --------------------------------------------------------
    // BORDAS
    // --------------------------------------------------------

    const edgeGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.04,
            4000
        );


    const edgeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xf5f5f5
        });


    for (const x of [-5.5, 5.5]) {

        const edge =
            new THREE.Mesh(
                edgeGeometry,
                edgeMaterial
            );

        edge.position.set(
            x,
            0.03,
            -1990
        );

        roadGroup.add(edge);
    }
}


// ============================================================
// CARRO
// ============================================================

function createCar() {

    car = new THREE.Group();

    car.position.set(
        0,
        CAR_HEIGHT,
        5
    );

    scene.add(car);

    loadCarModel();
}


// ============================================================
// CARRO GLB
// ============================================================

function loadCarModel() {

    if (!window.GLTFLoader) {

        console.error(
            "GLTFLoader não encontrado."
        );

        createFallbackCar();

        return;
    }


    const loader =
        new window.GLTFLoader();


    loader.load(
        CAR_MODEL_PATH,

        (gltf) => {

            carModel =
                new THREE.Group();

            carModel.add(
                gltf.scene
            );


            gltf.scene.traverse(
                (child) => {

                    if (child.isMesh) {

                        child.castShadow = true;

                        child.receiveShadow = true;

                        child.frustumCulled = false;


                        if (child.material) {

                            child.material.needsUpdate =
                                true;
                        }
                    }
                }
            );


            // ------------------------------------------------
            // DIMENSÕES INICIAIS
            // ------------------------------------------------

            const initialBox =
                new THREE.Box3()
                    .setFromObject(
                        gltf.scene
                    );

            const initialSize =
                new THREE.Vector3();

            initialBox.getSize(
                initialSize
            );


            // ------------------------------------------------
            // CENTRALIZA MODELO
            // ------------------------------------------------

            const initialCenter =
                new THREE.Vector3();

            initialBox.getCenter(
                initialCenter
            );


            gltf.scene.position.sub(
                initialCenter
            );


            // ------------------------------------------------
            // ESCALA
            // ------------------------------------------------

            const largestDimension =
                Math.max(
                    initialSize.x,
                    initialSize.y,
                    initialSize.z
                );


            const scale =
                4 / largestDimension;


            gltf.scene.scale.setScalar(
                scale
            );


            // ------------------------------------------------
            // COLOCA NO CHÃO
            // ------------------------------------------------

            const scaledBox =
                new THREE.Box3()
                    .setFromObject(
                        gltf.scene
                    );


            const minY =
                scaledBox.min.y;


            gltf.scene.position.y -=
                minY;


            // ------------------------------------------------
            // ROTAÇÃO
            // ------------------------------------------------

            gltf.scene.rotation.y =
                CAR_ROTATION_Y;


            car.add(
                carModel
            );


            // ------------------------------------------------
            // BOX DE COLISÃO
            // ------------------------------------------------

            carCollisionBox =
                new THREE.Box3()
                    .setFromObject(
                        car
                    );


            carCollisionSize =
                new THREE.Vector3();

            carCollisionBox.getSize(
                carCollisionSize
            );


            console.log(
                "🚗 Carro 3D carregado"
            );

            console.log(
                "Dimensões:",
                carCollisionSize
            );
        },


        undefined,


        (error) => {

            console.error(
                "Erro ao carregar carro.glb:",
                error
            );

            createFallbackCar();
        }
    );
}


// ============================================================
// CARRO RESERVA
// ============================================================

function createFallbackCar() {

    carModel =
        new THREE.Group();


    const bodyGeometry =
        new THREE.BoxGeometry(
            2.2,
            0.7,
            4
        );

    const bodyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd62828,
            roughness: 0.45
        });


    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );

    body.position.y = 0.65;

    body.castShadow = true;

    carModel.add(body);


    const cabinGeometry =
        new THREE.BoxGeometry(
            1.7,
            0.8,
            2
        );

    const cabinMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.35
        });


    const cabin =
        new THREE.Mesh(
            cabinGeometry,
            cabinMaterial
        );

    cabin.position.set(
        0,
        1.25,
        0
    );

    cabin.castShadow = true;

    carModel.add(cabin);


    car.add(
        carModel
    );
}


// ============================================================
// CENÁRIO
// ============================================================

function createScenery() {

    sceneryGroup =
        new THREE.Group();

    scene.add(
        sceneryGroup
    );


    // --------------------------------------------------------
    // ÁRVORES
    // --------------------------------------------------------

    for (
        let i = 0;
        i < 90;
        i++
    ) {

        const side =
            Math.random() < 0.5
                ? -1
                : 1;


        const tree =
            createTree();


        tree.position.set(

            side *
                (
                    9 +
                    Math.random() * 18
                ),

            0,

            10 -
                Math.random() *
                1800
        );


        const scale =
            0.7 +
            Math.random() * 1.2;


        tree.scale.setScalar(
            scale
        );


        sceneryGroup.add(
            tree
        );
    }


    // --------------------------------------------------------
    // MONTANHAS
    // --------------------------------------------------------

    for (
        let i = 0;
        i < 25;
        i++
    ) {

        const mountain =
            createMountain();


        mountain.position.set(

            (Math.random() < 0.5 ? -1 : 1) *
                (
                    25 +
                    Math.random() * 40
                ),

            0,

            -20 -
                Math.random() *
                1200
        );


        const scale =
            0.8 +
            Math.random() * 1.5;


        mountain.scale.setScalar(
            scale
        );


        sceneryGroup.add(
            mountain
        );
    }
}


function createTree() {

    const group =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(

            new THREE.CylinderGeometry(
                0.25,
                0.35,
                2,
                8
            ),

            new THREE.MeshStandardMaterial({
                color: 0x6b4226
            })
        );


    trunk.position.y = 1;

    trunk.castShadow = true;

    group.add(
        trunk
    );


    const leaves =
        new THREE.Mesh(

            new THREE.ConeGeometry(
                1.4,
                3.2,
                8
            ),

            new THREE.MeshStandardMaterial({
                color: 0x246b2b
            })
        );


    leaves.position.y = 3;

    leaves.castShadow = true;

    group.add(
        leaves
    );


    return group;
}


function createMountain() {

    const mountain =
        new THREE.Mesh(

            new THREE.ConeGeometry(
                12,
                25,
                6
            ),

            new THREE.MeshStandardMaterial({
                color: 0x5b6658,
                roughness: 1
            })
        );


    mountain.position.y = 12.5;

    mountain.castShadow = true;


    return mountain;
}


// ============================================================
// CRIA OBSTÁCULO
// ============================================================

function createObstacle() {

    const group =
        new THREE.Group();


    // --------------------------------------------------------
    // BLOCO PRINCIPAL
    // --------------------------------------------------------

    const bodyGeometry =
        new THREE.BoxGeometry(
            1.6,
            1.3,
            1.6
        );


    const bodyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe03131,
            roughness: 0.55
        });


    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );


    body.position.y = 0.65;

    body.castShadow = true;

    body.receiveShadow = true;

    group.add(body);


    // --------------------------------------------------------
    // FAIXA
    // --------------------------------------------------------

    const stripeGeometry =
        new THREE.BoxGeometry(
            1.65,
            0.25,
            0.35
        );


    const stripeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffffff
        });


    const stripe =
        new THREE.Mesh(
            stripeGeometry,
            stripeMaterial
        );


    stripe.position.set(
        0,
        0.75,
        0
    );


    group.add(stripe);


    return group;
}


// ============================================================
// POSIÇÃO X DOS OBSTÁCULOS
// ============================================================

function randomRoadX() {

    return (
        -4.2 +
        Math.random() * 8.4
    );
}


// ============================================================
// CRIA OBSTÁCULO
// ============================================================

function spawnObstacle(
    distanceAhead = null
) {

    if (
        obstacles.length >= MAX_OBSTACLES
    ) {
        return;
    }


    const obstacle =
        createObstacle();


    const ahead =
        distanceAhead !== null

            ? distanceAhead

            : getNextObstacleDistance();


    let x =
        randomRoadX();


    // --------------------------------------------------------
    // EVITA OBSTÁCULOS MUITO JUNTOS
    // --------------------------------------------------------

    let attempts = 0;

    while (
        attempts < 10 &&
        isTooCloseToAnotherObstacle(
            x,
            car.position.z - ahead
        )
    ) {

        x = randomRoadX();

        attempts++;
    }


    obstacle.position.set(

        x,

        0,

        car.position.z - ahead
    );


    obstacle.userData = {

        counted: false,

        halfWidth: 0.8,

        halfDepth: 0.8
    };


    obstacleGroup.add(
        obstacle
    );

    obstacles.push(
        obstacle
    );
}


// ============================================================
// DISTÂNCIA ENTRE OBSTÁCULOS
// ============================================================

function getNextObstacleDistance() {

    /*
        Quanto maior a velocidade,
        maior a distância física entre
        obstáculos.

        Isso evita que o jogo fique
        impossível em alta velocidade.
    */


    const speedFactor =
        (gameSpeed - 22) /
        (maxGameSpeed - 22);


    const minDistance =
        THREE.MathUtils.lerp(
            55,
            95,
            speedFactor
        );


    const maxDistance =
        THREE.MathUtils.lerp(
            90,
            145,
            speedFactor
        );


    return (
        minDistance +
        Math.random() *
        (
            maxDistance -
            minDistance
        )
    );
}


// ============================================================
// EVITA OBSTÁCULOS MUITO PRÓXIMOS
// ============================================================

function isTooCloseToAnotherObstacle(
    x,
    z
) {

    for (
        const obstacle of obstacles
    ) {

        const dx =
            Math.abs(
                obstacle.position.x - x
            );


        const dz =
            Math.abs(
                obstacle.position.z - z
            );


        /*
            Mantemos distância lateral
            suficiente para sempre existir
            pelo menos uma passagem.
        */

        if (
            dx < 2.0 &&
            dz < 25
        ) {

            return true;
        }
    }


    return false;
}


// ============================================================
// ATUALIZA OBSTÁCULOS
// ============================================================

function updateObstacles(dt) {

    /*
        IMPORTANTE:

        Os obstáculos ficam PARADOS
        no mundo.

        Quem anda é o carro.
    */


    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const obstacle =
            obstacles[i];


        // ----------------------------------------------------
        // PASSOU DO OBSTÁCULO
        // ----------------------------------------------------

        if (
            !obstacle.userData.counted &&

            car.position.z <
                obstacle.position.z - 1
        ) {

            obstacle.userData.counted =
                true;

            score++;
        }


        // ----------------------------------------------------
        // REMOVE OBSTÁCULOS QUE FICARAM PARA TRÁS
        // ----------------------------------------------------

        if (
            obstacle.position.z >
                car.position.z + 30
        ) {

            obstacleGroup.remove(
                obstacle
            );

            obstacles.splice(
                i,
                1
            );
        }
    }


    // --------------------------------------------------------
    // GERAÇÃO PROGRESSIVA
    // --------------------------------------------------------

    obstacleTimer += dt;


    /*
        O intervalo diminui conforme
        a velocidade aumenta.

        Mas nunca chega perto de zero.
    */

    const speedFactor =
        (gameSpeed - 22) /
        (maxGameSpeed - 22);


    const currentInterval =
        THREE.MathUtils.lerp(
            2.2,
            0.95,
            speedFactor
        );


    if (
        obstacleTimer >= currentInterval
    ) {

        obstacleTimer = 0;

        spawnObstacle();
    }
}


// ============================================================
// DIREÇÃO
// ============================================================

function updateSteering(dt) {

    let currentSteer =
        keyboardSteer;


    if (
        serialConnected &&
        Date.now() - lastSerialInput <
            SERIAL_TIMEOUT
    ) {

        currentSteer =
            steer;
    }


    const desiredX =
        THREE.MathUtils.clamp(
            currentSteer / 100,
            -1,
            1
        ) *
        ROAD_LIMIT;


    targetCarX =
        desiredX;


    carX +=
        (
            targetCarX -
            carX
        ) *
        Math.min(
            1,
            STEER_SMOOTHING +
                dt *
                STEER_RESPONSE
        );


    car.position.x =
        carX;


    // --------------------------------------------------------
    // INCLINAÇÃO VISUAL
    // --------------------------------------------------------

    const normalizedSteer =
        carX /
        ROAD_LIMIT;


    car.rotation.z =
        -normalizedSteer *
        0.12;


    car.rotation.y =
        -normalizedSteer *
        0.08;
}


// ============================================================
// COLISÃO
// ============================================================

function checkCollisions() {

    if (
        !car ||
        !carModel
    ) {
        return;
    }


    carCollisionBox =
        new THREE.Box3()
            .setFromObject(
                car
            );


    for (
        const obstacle of obstacles
    ) {

        const obstacleBox =
            new THREE.Box3()
                .setFromObject(
                    obstacle
                );


        /*
            Pequena tolerância para
            deixar a colisão mais justa.
        */

        const collisionBox =
            obstacleBox.clone();


        collisionBox.expandByScalar(
            -0.12
        );


        if (
            carCollisionBox.intersectsBox(
                collisionBox
            )
        ) {

            console.log(
                "💥 COLISÃO!"
            );


            endGame();

            return;
        }
    }
}


// ============================================================
// ATUALIZAÇÃO DO JOGO
// ============================================================

function update(dt) {

    if (!gameRunning) {
        return;
    }


    // --------------------------------------------------------
    // DIREÇÃO
    // --------------------------------------------------------

    updateSteering(dt);


    // --------------------------------------------------------
    // MOVIMENTO DO CARRO
    // --------------------------------------------------------

    car.position.z -=
        gameSpeed *
        dt;


    // --------------------------------------------------------
    // DISTÂNCIA
    // --------------------------------------------------------

    distance +=
        gameSpeed *
        dt;


    // --------------------------------------------------------
    // ACELERAÇÃO
    // --------------------------------------------------------

    gameSpeed =
        Math.min(
            maxGameSpeed,

            gameSpeed +
                acceleration *
                dt
        );


    // --------------------------------------------------------
    // OBSTÁCULOS
    // --------------------------------------------------------

    updateObstacles(dt);


    // --------------------------------------------------------
    // COLISÃO
    // --------------------------------------------------------

    checkCollisions();


    // --------------------------------------------------------
    // HUD
    // --------------------------------------------------------

    updateHUD();
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    if (scoreEl) {

        scoreEl.textContent =
            Math.floor(score);
    }


    if (speedEl) {

        /*
            Conversão visual para km/h.

            22 unidades ≈ 66 km/h
            80 unidades ≈ 240 km/h
        */

        speedEl.textContent =
            Math.round(
                gameSpeed * 3
            );
    }


    if (steerValueEl) {

        steerValueEl.textContent =
            Math.round(
                steer
            );
    }
}


// ============================================================
// INICIAR JOGO
// ============================================================

function startGame() {

    // --------------------------------------------------------
    // REMOVE OBSTÁCULOS ANTIGOS
    // --------------------------------------------------------

    for (
        const obstacle of obstacles
    ) {

        obstacleGroup.remove(
            obstacle
        );
    }


    obstacles.length = 0;


    // --------------------------------------------------------
    // RESET
    // --------------------------------------------------------

    score = 0;

    distance = 0;

    gameSpeed = 22;

    obstacleTimer = 0;


    carX = 0;

    targetCarX = 0;


    car.position.x = 0;

    car.position.z = 5;


    car.rotation.z = 0;

    car.rotation.y = 0;


    gameRunning = true;


    // --------------------------------------------------------
    // MENSAGEM
    // --------------------------------------------------------

    messageIcon.textContent =
        "🏎️";

    messageTitle.textContent =
        "Volante MPU6050 3D";

    messageText.textContent =
        "Dirija e desvie dos obstáculos!";


    startBtn.textContent =
        "JOGAR NOVAMENTE";


    message.style.display =
        "none";


    // --------------------------------------------------------
    // PRIMEIROS OBSTÁCULOS
    // --------------------------------------------------------

    spawnObstacle(90);


    setTimeout(() => {

        if (gameRunning) {

            spawnObstacle(180);
        }

    }, 500);


    setTimeout(() => {

        if (gameRunning) {

            spawnObstacle(275);
        }

    }, 1000);


    updateHUD();
}


// ============================================================
// FIM DE JOGO
// ============================================================

function endGame() {

    gameRunning = false;


    messageIcon.textContent =
        "💥";

    messageTitle.textContent =
        "COLISÃO!";


    messageText.textContent =
        `Você fez ${Math.floor(score)} pontos.`;


    startBtn.textContent =
        "JOGAR NOVAMENTE";


    message.style.display =
        "block";
}


// ============================================================
// TECLADO
// ============================================================

function handleKeyDown(event) {

    if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
    ) {

        keyboardSteer = -100;
    }


    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {

        keyboardSteer = 100;
    }
}


function handleKeyUp(event) {

    if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() === "a"
    ) {

        if (keyboardSteer < 0) {

            keyboardSteer = 0;
        }
    }


    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {

        if (keyboardSteer > 0) {

            keyboardSteer = 0;
        }
    }
}


// ============================================================
// SERIAL
// ============================================================

async function connectSerial() {

    if (
        !("serial" in navigator)
    ) {

        alert(
            "Seu navegador não suporta Web Serial."
        );

        return;
    }


    try {

        port =
            await navigator.serial.requestPort();


        await port.open({
            baudRate: 115200
        });


        serialConnected = true;


        if (serialStatus) {

            serialStatus.textContent =
                "🎮 Volante conectado";
        }


        readSerial();


    } catch (error) {

        console.error(
            "Erro Serial:",
            error
        );


        serialConnected = false;


        if (serialStatus) {

            serialStatus.textContent =
                "Volante não conectado";
        }
    }
}


// ============================================================
// LEITURA SERIAL
// ============================================================

async function readSerial() {

    if (!port) {
        return;
    }


    const decoder =
        new TextDecoder();


    let buffer = "";


    try {

        while (
            port.readable &&
            serialConnected
        ) {

            reader =
                port.readable.getReader();


            try {

                while (true) {

                    const {
                        value,
                        done
                    } =
                        await reader.read();


                    if (done) {
                        break;
                    }


                    buffer +=
                        decoder.decode(
                            value,
                            {
                                stream: true
                            }
                        );


                    const lines =
                        buffer.split("\n");


                    buffer =
                        lines.pop();


                    for (
                        const rawLine of lines
                    ) {

                        const line =
                            rawLine.trim();


                        const match =
                            line.match(
                                /^STEER:\s*(-?\d+(?:\.\d+)?)$/
                            );


                        if (!match) {
                            continue;
                        }


                        const value =
                            parseFloat(
                                match[1]
                            );


                        steer =
                            THREE.MathUtils.clamp(
                                value,
                                -100,
                                100
                            );


                        lastSerialInput =
                            Date.now();
                    }
                }

            } finally {

                reader.releaseLock();
            }
        }

    } catch (error) {

        console.error(
            "Erro na leitura Serial:",
            error
        );


        serialConnected = false;


        if (serialStatus) {

            serialStatus.textContent =
                "Volante desconectado";
        }
    }
}


// ============================================================
// RESIZE
// ============================================================

function onResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}


// ============================================================
// CÂMERA
// ============================================================

function animate() {

    requestAnimationFrame(
        animate
    );


    const dt =
        Math.min(
            clock.getDelta(),
            0.05
        );


    update(dt);


    // --------------------------------------------------------
    // CÂMERA SEGUE O CARRO
    // --------------------------------------------------------

    const targetCameraX =
        car
            ? car.position.x * 0.55
            : 0;


    const targetCameraZ =
        car
            ? car.position.z + 13
            : 18;


    camera.position.x +=
        (
            targetCameraX -
            camera.position.x
        ) *
        Math.min(
            1,
            dt * 4
        );


    camera.position.z +=
        (
            targetCameraZ -
            camera.position.z
        ) *
        Math.min(
            1,
            dt * 5
        );


    camera.lookAt(

        camera.position.x * 0.25,

        1,

        car
            ? car.position.z - 25
            : -28
    );


    renderer.render(
        scene,
        camera
    );
}
