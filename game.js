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

let steer = 0;
let keyboardSteer = 0;

let carX = 0;
let targetCarX = 0;

let lastSerialInput = 0;
let lastBleInput = 0;

const SERIAL_TIMEOUT = 500;
const BLE_TIMEOUT = 500;

const ROAD_LIMIT = 4.8;

const STEER_RESPONSE = 14;
const STEER_SMOOTHING = 0.20;


// ============================================================
// ESTRADA INFINITA
// ============================================================

const ROAD_WIDTH = 12;

const ROAD_SEGMENT_LENGTH = 60;

const ROAD_SEGMENT_COUNT = 22;

const scenerySegments = [];


// ============================================================
// OBSTÁCULOS
// ============================================================

const obstacles = [];

// Aumentado bastante
const MAX_OBSTACLES = 45;

let obstacleTimer = 0;

// Intervalo inicial
const INITIAL_OBSTACLE_INTERVAL = 2.0;

// Intervalo mínimo em velocidade alta
const MIN_OBSTACLE_INTERVAL = 0.70;


// ============================================================
// SERIAL
// ============================================================

let port = null;
let reader = null;
let serialConnected = false;


// ============================================================
// BLUETOOTH BLE
// ============================================================

const BLE_DEVICE_NAME = "ESP32-Volante";

const BLE_SERVICE_UUID =
    "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

const BLE_CHARACTERISTIC_UUID =
    "beb5483e-36e1-4688-b7f5-ea07361b26a8";

let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristic = null;

let bleConnected = false;


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

    scene.background =
        new THREE.Color(0x87ceeb);

    scene.fog =
        new THREE.Fog(
            0x87ceeb,
            80,
            420
        );


    // --------------------------------------------------------
    // CÂMERA
    // --------------------------------------------------------

    camera =
        new THREE.PerspectiveCamera(
            60,
            window.innerWidth /
                window.innerHeight,
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

    renderer =
        new THREE.WebGLRenderer({
            antialias: true
        });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
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

    obstacleGroup =
        new THREE.Group();

    scene.add(
        obstacleGroup
    );


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
            connectController
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

    scene.add(
        hemiLight
    );


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

    scene.add(
        sun
    );
}


// ============================================================
// MUNDO
// ============================================================

function createWorld() {

    // Grande o suficiente para não acabar visualmente
    const groundGeometry =
        new THREE.PlaneGeometry(
            10000,
            10000
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

    scene.add(
        ground
    );


    // --------------------------------------------------------
    // SOL VISUAL
    // --------------------------------------------------------

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

    scene.add(
        sun
    );
}


// ============================================================
// ESTRADA INFINITA
// ============================================================

function createRoad() {

    roadGroup =
        new THREE.Group();

    scene.add(
        roadGroup
    );


    const roadMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x303238,
            roughness: 0.95
        });


    const lineMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffffff
        });


    const edgeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xf5f5f5
        });


    // --------------------------------------------------------
    // CRIA SEGMENTOS
    // --------------------------------------------------------

    for (
        let i = 0;
        i < ROAD_SEGMENT_COUNT;
        i++
    ) {

        const segment =
            new THREE.Group();


        segment.position.z =
            -i *
            ROAD_SEGMENT_LENGTH;


        // ----------------------------------------------------
        // ASFALTO
        // ----------------------------------------------------

        const road =
            new THREE.Mesh(

                new THREE.PlaneGeometry(
                    ROAD_WIDTH,
                    ROAD_SEGMENT_LENGTH
                ),

                roadMaterial
            );


        road.rotation.x =
            -Math.PI / 2;


        road.position.y = 0;


        road.receiveShadow = true;


        segment.add(
            road
        );


        // ----------------------------------------------------
        // LINHAS CENTRAIS
        // ----------------------------------------------------

        for (
            let z = -ROAD_SEGMENT_LENGTH / 2 + 4;
            z < ROAD_SEGMENT_LENGTH / 2;
            z += 8
        ) {

            const line =
                new THREE.Mesh(

                    new THREE.BoxGeometry(
                        0.18,
                        0.04,
                        4
                    ),

                    lineMaterial
                );


            line.position.set(
                0,
                0.03,
                z
            );


            segment.add(
                line
            );
        }


        // ----------------------------------------------------
        // BORDAS
        // ----------------------------------------------------

        for (
            const x of [-5.5, 5.5]
        ) {

            const edge =
                new THREE.Mesh(

                    new THREE.BoxGeometry(
                        0.18,
                        0.04,
                        ROAD_SEGMENT_LENGTH
                    ),

                    edgeMaterial
                );


            edge.position.set(
                x,
                0.03,
                0
            );


            segment.add(
                edge
            );
        }


        roadGroup.add(
            segment
        );


        scenerySegments.push(
            segment
        );
    }
}


// ============================================================
// CENÁRIO INFINITO
// ============================================================

function createScenery() {

    sceneryGroup =
        new THREE.Group();

    scene.add(
        sceneryGroup
    );


    // Adiciona árvores/montanhas dentro dos segmentos
    for (
        const segment of scenerySegments
    ) {

        createSegmentScenery(
            segment
        );
    }
}


// ============================================================
// CENÁRIO DE CADA SEGMENTO
// ============================================================

function createSegmentScenery(
    segment
) {

    // --------------------------------------------------------
    // ÁRVORES
    // --------------------------------------------------------

    for (
        let i = 0;
        i < 5;
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
                    Math.random() * 20
                ),

            0,

            -ROAD_SEGMENT_LENGTH / 2 +
                Math.random() *
                ROAD_SEGMENT_LENGTH
        );


        const scale =
            0.7 +
            Math.random() * 1.2;


        tree.scale.setScalar(
            scale
        );


        segment.add(
            tree
        );
    }


    // --------------------------------------------------------
    // ARBUSTOS
    // --------------------------------------------------------

    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const side =
            Math.random() < 0.5
                ? -1
                : 1;


        const bush =
            createBush();


        bush.position.set(

            side *
                (
                    8 +
                    Math.random() * 22
                ),

            0,

            -ROAD_SEGMENT_LENGTH / 2 +
                Math.random() *
                ROAD_SEGMENT_LENGTH
        );


        segment.add(
            bush
        );
    }


    // --------------------------------------------------------
    // MONTANHAS
    // --------------------------------------------------------

    if (
        Math.random() < 0.55
    ) {

        const side =
            Math.random() < 0.5
                ? -1
                : 1;


        const mountain =
            createMountain();


        mountain.position.set(

            side *
                (
                    28 +
                    Math.random() * 35
                ),

            0,

            -ROAD_SEGMENT_LENGTH / 2 +
                Math.random() *
                ROAD_SEGMENT_LENGTH
        );


        const scale =
            0.8 +
            Math.random() * 1.4;


        mountain.scale.setScalar(
            scale
        );


        segment.add(
            mountain
        );
    }
}


// ============================================================
// ÁRVORE
// ============================================================

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


// ============================================================
// ARBUSTO
// ============================================================

function createBush() {

    const group =
        new THREE.Group();


    const material =
        new THREE.MeshStandardMaterial({
            color: 0x285c2b,
            roughness: 1
        });


    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const part =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.5 +
                        Math.random() * 0.3,
                    8,
                    8
                ),

                material
            );


        part.position.set(

            (Math.random() - 0.5) *
                0.8,

            0.35 +
                Math.random() *
                0.3,

            (Math.random() - 0.5) *
                0.8
        );


        part.castShadow = true;

        group.add(
            part
        );
    }


    return group;
}


// ============================================================
// MONTANHA
// ============================================================

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


    mountain.position.y =
        12.5;


    mountain.castShadow = true;


    return mountain;
}


// ============================================================
// LOOP INFINITO DO MUNDO
// ============================================================
function updateInfiniteWorld() {
    if (!car || !roadGroup) return;

    /*
     * Descobre o segmento que está mais à frente
     * do jogador.
     */
    let furthestZ = Infinity;

    for (const segment of roadGroup.children) {
        if (segment.position.z < furthestZ) {
            furthestZ = segment.position.z;
        }
    }

    /*
     * Quando um segmento fica muito atrás do carro,
     * coloca ele novamente no final da estrada.
     */
    for (const segment of roadGroup.children) {
        if (
            segment.position.z >
            car.position.z + 70
        ) {
            furthestZ -= ROAD_SEGMENT_LENGTH;

            segment.position.z =
                furthestZ;
        }
    }
}


// ============================================================
// CARRO
// ============================================================

function createCar() {

    car =
        new THREE.Group();


    car.position.set(
        0,
        CAR_HEIGHT,
        5
    );


    scene.add(
        car
    );


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

                    if (
                        child.isMesh
                    ) {

                        child.castShadow = true;

                        child.receiveShadow = true;

                        child.frustumCulled = false;


                        if (
                            child.material
                        ) {

                            child.material.needsUpdate =
                                true;
                        }
                    }
                }
            );


            // ------------------------------------------------
            // DIMENSÕES
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
            // CENTRALIZA
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
                4 /
                largestDimension;


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


    const body =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                2.2,
                0.7,
                4
            ),

            new THREE.MeshStandardMaterial({
                color: 0xd62828,
                roughness: 0.45
            })
        );


    body.position.y =
        0.65;


    body.castShadow = true;


    carModel.add(
        body
    );


    const cabin =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                1.7,
                0.8,
                2
            ),

            new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.35
            })
        );


    cabin.position.set(
        0,
        1.25,
        0
    );


    cabin.castShadow = true;


    carModel.add(
        cabin
    );


    car.add(
        carModel
    );
}


// ============================================================
// CRIA OBSTÁCULO
// ============================================================

function createObstacle() {

    const group =
        new THREE.Group();


    const body =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                1.6,
                1.3,
                1.6
            ),

            new THREE.MeshStandardMaterial({
                color: 0xe03131,
                roughness: 0.55
            })
        );


    body.position.y =
        0.65;


    body.castShadow = true;

    body.receiveShadow = true;


    group.add(
        body
    );


    const stripe =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                1.65,
                0.25,
                0.35
            ),

            new THREE.MeshStandardMaterial({
                color: 0xffffff
            })
        );


    stripe.position.set(
        0,
        0.75,
        0
    );


    group.add(
        stripe
    );


    return group;
}


// ============================================================
// FAIXAS POSSÍVEIS
// ============================================================

const obstacleLanes = [
    -4,
    -2,
    0,
    2,
    4
];


// ============================================================
// RANDOM X
// ============================================================

function randomRoadX() {

    const index =
        Math.floor(
            Math.random() *
            obstacleLanes.length
        );


    return obstacleLanes[index];
}


// ============================================================
// DISTÂNCIA DO OBSTÁCULO
// ============================================================

function getNextObstacleDistance() {

    const speedFactor =
        THREE.MathUtils.clamp(
            (gameSpeed - 22) /
            (maxGameSpeed - 22),
            0,
            1
        );


    // Quanto maior a velocidade,
    // menor a distância média.
    const minDistance =
        THREE.MathUtils.lerp(
            60,
            52,
            speedFactor
        );


    const maxDistance =
        THREE.MathUtils.lerp(
            110,
            82,
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
// VERIFICA SE A FAIXA ESTÁ LIVRE
// ============================================================

function isLaneAvailable(
    x,
    z
) {

    for (
        const obstacle of obstacles
    ) {

        const dx =
            Math.abs(
                obstacle.position.x -
                x
            );


        const dz =
            Math.abs(
                obstacle.position.z -
                z
            );


        if (
            dx < 1.7 &&
            dz < 24
        ) {

            return false;
        }
    }


    return true;
}


// ============================================================
// CRIA OBSTÁCULO
// ============================================================

function spawnObstacle(
    distanceAhead = null,
    forcedX = null
) {

    if (
        obstacles.length >=
        MAX_OBSTACLES
    ) {
        return null;
    }


    const obstacle =
        createObstacle();


    const ahead =
        distanceAhead !== null

            ? distanceAhead

            : getNextObstacleDistance();


    const z =
        car.position.z -
        ahead;


    let x =
        forcedX !== null
            ? forcedX
            : randomRoadX();


    // --------------------------------------------------------
    // PROCURA UMA FAIXA LIVRE
    // --------------------------------------------------------

    if (
        forcedX === null
    ) {

        let foundLane = false;


        for (
            let attempt = 0;
            attempt < 12;
            attempt++
        ) {

            const possibleLane =
                randomRoadX();


            if (
                isLaneAvailable(
                    possibleLane,
                    z
                )
            ) {

                x =
                    possibleLane;

                foundLane = true;

                break;
            }
        }


        if (!foundLane) {

            return null;
        }
    }


    // --------------------------------------------------------
    // POSIÇÃO
    // --------------------------------------------------------

    obstacle.position.set(
        x,
        0,
        z
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


    return obstacle;
}


// ============================================================
// TENTA CRIAR UM SEGUNDO OBSTÁCULO
// ============================================================

function spawnSecondObstacle(
    distanceAhead
) {

    if (
        obstacles.length >=
        MAX_OBSTACLES
    ) {
        return;
    }


    const possibleLanes =
        [...obstacleLanes];


    // Embaralha as faixas
    possibleLanes.sort(
        () =>
            Math.random() - 0.5
    );


    for (
        const lane of possibleLanes
    ) {

        const z =
            car.position.z -
            distanceAhead;


        if (
            isLaneAvailable(
                lane,
                z
            )
        ) {

            spawnObstacle(
                distanceAhead,
                lane
            );

            return;
        }
    }
}


// ============================================================
// ATUALIZA OBSTÁCULOS
// ============================================================

function updateObstacles(dt) {

    // --------------------------------------------------------
    // ATUALIZA OBSTÁCULOS EXISTENTES
    // --------------------------------------------------------

    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const obstacle =
            obstacles[i];


        // ----------------------------------------------------
        // PONTUAÇÃO
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
        // REMOVE QUANDO FICA PARA TRÁS
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
    // GERADOR
    // --------------------------------------------------------

    obstacleTimer += dt;


    const speedFactor =
        THREE.MathUtils.clamp(
            (gameSpeed - 22) /
            (maxGameSpeed - 22),
            0,
            1
        );


    const currentInterval =
        THREE.MathUtils.lerp(
            INITIAL_OBSTACLE_INTERVAL,
            MIN_OBSTACLE_INTERVAL,
            speedFactor
        );


    if (
        obstacleTimer >=
        currentInterval
    ) {

        obstacleTimer = 0;


        const distanceAhead =
            getNextObstacleDistance();


        const first =
            spawnObstacle(
                distanceAhead
            );


        // ----------------------------------------------------
        // MAIS OBSTÁCULOS EM VELOCIDADE ALTA
        // ----------------------------------------------------

        if (
            first &&
            gameSpeed >= 42 &&
            Math.random() < 0.28
        ) {

            spawnSecondObstacle(
                distanceAhead
            );
        }


        // ----------------------------------------------------
        // AINDA MAIS DENSIDADE EM VELOCIDADE MUITO ALTA
        // ----------------------------------------------------

        if (
            first &&
            gameSpeed >= 62 &&
            Math.random() < 0.12
        ) {

            const secondDistance =
                distanceAhead +
                28 +
                Math.random() * 18;


            spawnSecondObstacle(
                secondDistance
            );
        }
    }
}


// ============================================================
// DIREÇÃO
// ============================================================

function updateSteering(dt) {

    let currentSteer =
        keyboardSteer;


    // --------------------------------------------------------
    // BLE
    // --------------------------------------------------------

    if (
        bleConnected &&
        Date.now() -
            lastBleInput <
            BLE_TIMEOUT
    ) {

        currentSteer =
            steer;
    }


    // --------------------------------------------------------
    // SERIAL
    // --------------------------------------------------------

    else if (
        serialConnected &&
        Date.now() -
            lastSerialInput <
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


        const collisionBox =
            obstacleBox.clone();


        // Deixa a colisão um pouco mais justa
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

    updateSteering(
        dt
    );


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
    // ESTRADA + CENÁRIO INFINITOS
    // --------------------------------------------------------

    updateInfiniteWorld();


    // --------------------------------------------------------
    // OBSTÁCULOS
    // --------------------------------------------------------

    updateObstacles(
        dt
    );


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
    // ============================================================
    // REMOVE OBSTÁCULOS ANTIGOS
    // ============================================================

    for (const obstacle of obstacles) {
        obstacleGroup.remove(obstacle);
    }

    obstacles.length = 0;

    // ============================================================
    // RESET DOS VALORES
    // ============================================================

    score = 0;
    distance = 0;
    gameSpeed = 22;
    obstacleTimer = 0;

    carX = 0;
    targetCarX = 0;

    // ============================================================
    // RESET DO CARRO
    // ============================================================

    car.position.x = 0;
    car.position.z = 5;

    car.rotation.z = 0;
    car.rotation.y = 0;

    // ============================================================
    // RESET DA ESTRADA INFINITA
    // ============================================================

    if (roadGroup) {
        roadGroup.children.forEach((segment, index) => {
            /*
             * O primeiro segmento começa exatamente abaixo
             * do carro e os demais continuam para frente.
             *
             * Como cada segmento tem 60 unidades:
             *
             * segmento 0 = z 5
             * segmento 1 = z -55
             * segmento 2 = z -115
             * segmento 3 = z -175
             * ...
             */

            segment.position.z =
                car.position.z -
                index * ROAD_SEGMENT_LENGTH;
        });
    }

    // ============================================================
    // INICIA O JOGO
    // ============================================================

    gameRunning = true;

    messageIcon.textContent = "🏎️";

    messageTitle.textContent =
        "Volante MPU6050 3D";

    messageText.textContent =
        "Dirija e desvie dos obstáculos!";

    startBtn.textContent =
        "JOGAR NOVAMENTE";

    message.style.display = "none";

    // ============================================================
    // OBSTÁCULOS INICIAIS
    // ============================================================

    spawnObstacle(95);
    spawnObstacle(190);
    spawnObstacle(290);

    setTimeout(() => {
        if (gameRunning) {
            spawnObstacle(390);
        }
    }, 500);

    setTimeout(() => {
        if (gameRunning) {
            spawnObstacle(500);
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

        if (
            keyboardSteer < 0
        ) {

            keyboardSteer = 0;
        }
    }


    if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
    ) {

        if (
            keyboardSteer > 0
        ) {

            keyboardSteer = 0;
        }
    }
}


// ============================================================
// BOTÃO DE CONEXÃO
// ============================================================

async function connectController() {

    // --------------------------------------------------------
    // BLE JÁ CONECTADO
    // --------------------------------------------------------

    if (bleConnected) {

        disconnectBluetooth();

        return;
    }


    // --------------------------------------------------------
    // WEB BLUETOOTH
    // --------------------------------------------------------

    if (
        !("bluetooth" in navigator)
    ) {

        console.warn(
            "Web Bluetooth não disponível. Tentando Web Serial."
        );


        await connectSerial();


        return;
    }


    await connectBluetooth();
}


// ============================================================
// BLUETOOTH BLE
// ============================================================

async function connectBluetooth() {

    if (
        !("bluetooth" in navigator)
    ) {

        alert(
            "Seu navegador não suporta Bluetooth BLE."
        );


        return;
    }


    try {

        updateConnectionStatus(
            "🔎 Procurando ESP32..."
        );


        bleDevice =
            await navigator.bluetooth.requestDevice({

                filters: [
                    {
                        name:
                            BLE_DEVICE_NAME
                    }
                ],

                optionalServices: [
                    BLE_SERVICE_UUID
                ]
            });


        if (!bleDevice) {

            throw new Error(
                "Nenhum dispositivo selecionado."
            );
        }


        bleDevice.addEventListener(
            "gattserverdisconnected",
            handleBluetoothDisconnect
        );


        updateConnectionStatus(
            "🔗 Conectando ao ESP32..."
        );


        bleServer =
            await bleDevice.gatt.connect();


        bleService =
            await bleServer.getPrimaryService(
                BLE_SERVICE_UUID
            );


        bleCharacteristic =
            await bleService.getCharacteristic(
                BLE_CHARACTERISTIC_UUID
            );


        await bleCharacteristic.startNotifications();


        bleCharacteristic.addEventListener(
            "characteristicvaluechanged",
            receiveBluetoothData
        );


        bleConnected = true;

        steer = 0;

        lastBleInput =
            Date.now();


        updateConnectionStatus(
            "🎮 Volante conectado via Bluetooth"
        );


        if (connectBtn) {

            connectBtn.textContent =
                "DESCONECTAR VOLANTE";
        }


        console.log(
            "✅ ESP32 conectado via BLE"
        );
    }


    catch (error) {

        console.error(
            "Erro ao conectar via BLE:",
            error
        );


        bleConnected = false;

        bleDevice = null;
        bleServer = null;
        bleService = null;
        bleCharacteristic = null;


        updateConnectionStatus(
            "Volante não conectado"
        );


        alert(
            "Não foi possível conectar ao ESP32 via Bluetooth."
        );
    }
}


// ============================================================
// RECEBE DADOS BLE
// ============================================================

function receiveBluetoothData(
    event
) {

    try {

        const value =
            event.target.value;


        const decoder =
            new TextDecoder(
                "utf-8"
            );


        const text =
            decoder
                .decode(value)
                .trim();


        const numericValue =
            parseInt(
                text,
                10
            );


        if (
            Number.isNaN(
                numericValue
            )
        ) {

            return;
        }


        steer =
            THREE.MathUtils.clamp(
                numericValue,
                -100,
                100
            );


        lastBleInput =
            Date.now();


        updateHUD();

    }
    catch (error) {

        console.error(
            "Erro ao interpretar dados BLE:",
            error
        );
    }
}


// ============================================================
// DESCONECTAR BLUETOOTH
// ============================================================

function disconnectBluetooth() {

    try {

        if (
            bleDevice &&
            bleDevice.gatt &&
            bleDevice.gatt.connected
        ) {

            bleDevice.gatt.disconnect();
        }

    }
    catch (error) {

        console.error(
            "Erro ao desconectar BLE:",
            error
        );
    }


    bleConnected = false;

    bleServer = null;
    bleService = null;
    bleCharacteristic = null;

    steer = 0;


    updateConnectionStatus(
        "Volante desconectado"
    );


    if (connectBtn) {

        connectBtn.textContent =
            "CONECTAR VOLANTE";
    }
}


// ============================================================
// DESCONECTOU BLUETOOTH
// ============================================================

function handleBluetoothDisconnect() {

    bleConnected = false;

    bleServer = null;
    bleService = null;
    bleCharacteristic = null;

    steer = 0;


    updateConnectionStatus(
        "Volante Bluetooth desconectado"
    );


    if (connectBtn) {

        connectBtn.textContent =
            "CONECTAR VOLANTE";
    }


    console.warn(
        "⚠️ ESP32 desconectado do Bluetooth"
    );
}


// ============================================================
// STATUS
// ============================================================

function updateConnectionStatus(
    text
) {

    if (serialStatus) {

        serialStatus.textContent =
            text;
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
                "🎮 Volante conectado via USB";
        }


        if (connectBtn) {

            connectBtn.textContent =
                "DESCONECTAR VOLANTE";
        }


        readSerial();

    }
    catch (error) {

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
                        buffer.split(
                            "\n"
                        );


                    buffer =
                        lines.pop();


                    for (
                        const rawLine
                        of lines
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


                        updateHUD();
                    }
                }

            }
            finally {

                reader.releaseLock();
            }
        }

    }
    catch (error) {

        console.error(
            "Erro na leitura Serial:",
            error
        );


        serialConnected = false;


        if (serialStatus) {

            serialStatus.textContent =
                "Volante USB desconectado";
        }


        if (connectBtn) {

            connectBtn.textContent =
                "CONECTAR VOLANTE";
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


    update(
        dt
    );


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
