# 🏎️ Jogo de Carro 3D com ESP32 e MPU6050

Jogo 3D de corrida infinita em que o jogador controla um carro usando um volante físico desenvolvido com **ESP32** e **sensor MPU6050**.

O objetivo é dirigir pela estrada, desviar dos obstáculos e alcançar a maior pontuação possível. A velocidade aumenta progressivamente e a quantidade de obstáculos também aumenta, mantendo o desafio dinâmico e jogável.

## 🎮 Demonstração

O jogo pode ser acessado pelo GitHub Pages:

**https://murilloeduardo323.github.io/Jogo_Carro_ESP-32/**

> Para utilizar o volante via Bluetooth, abra o jogo em um navegador compatível com Web Bluetooth, como o Google Chrome ou Microsoft Edge.

---

## ✨ Funcionalidades

* Estrada 3D infinita com reposicionamento automático dos segmentos.
* Cenário com árvores, arbustos e montanhas.
* Carro 3D carregado a partir de um modelo `.glb`.
* Controle por volante usando ESP32 e MPU6050.
* Comunicação via Bluetooth Low Energy — BLE.
* Controle alternativo pelo teclado.
* Velocidade progressiva.
* Quantidade de obstáculos aumenta conforme a velocidade.
* Obstáculos distribuídos em diferentes faixas da estrada.
* Sistema de pontuação.
* Detecção de colisões.
* Tela de início e reinício da partida.
* Interface responsiva.
* Compatível com publicação no GitHub Pages.

---

## 🧰 Tecnologias utilizadas

### Frontend

* HTML5
* CSS3
* JavaScript
* Three.js
* GLTFLoader
* Web Bluetooth API
* Web Serial API

### Hardware

* ESP32 Dev Module
* Sensor MPU6050 — GY-521
* Cabo USB
* Computador com Bluetooth ou conexão USB

### Modelo 3D

* Formato: GLB
* Arquivo: `models/carro-game-comprimido.glb`

---

## 📁 Estrutura do projeto

```text
Jogo_Carro_ESP-32/
│
├── index.html
├── style.css
├── game.js
├── README.md
├── package.json
├── package-lock.json
│
└── models/
    └── carro-game-comprimido.glb
```

---

## 🔌 Montagem do hardware

O MPU6050 utiliza comunicação I2C com o ESP32.

| MPU6050 | ESP32   |
| ------- | ------- |
| VCC     | 3V3     |
| GND     | GND     |
| SCL     | GPIO 22 |
| SDA     | GPIO 21 |
| AD0     | GND     |

### Diagrama simplificado

```text
MPU6050 GY-521       ESP32
----------------     ----------------
VCC   --------------> 3V3
GND   --------------> GND
SCL   --------------> GPIO 22
SDA   --------------> GPIO 21
AD0   --------------> GND
```

O endereço I2C utilizado pelo sensor é:

```text
0x68
```

---

## 🧠 Funcionamento do volante

O ESP32 realiza a leitura do acelerômetro do MPU6050 e identifica a inclinação do volante.

O valor de direção é convertido para uma escala de:

```text
-100 = esquerda
0    = centro
100  = direita
```

Esses valores são enviados pelo ESP32 utilizando Bluetooth Low Energy.

O jogo recebe os valores e movimenta o carro lateralmente na estrada.

---

## 📡 Comunicação Bluetooth

O dispositivo Bluetooth aparece com o nome:

```text
ESP32-Volante
```

### UUID do serviço

```text
4fafc201-1fb5-459e-8fcc-c5c9c331914b
```

### UUID da característica

```text
beb5483e-36e1-4688-b7f5-ea07361b26a8
```

A característica BLE envia valores numéricos entre `-100` e `100`.

Exemplos:

```text
-100
-50
0
50
100
```

---

## 💻 Como executar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/MurilloEduardo323/Jogo_Carro_ESP-32.git
```

### 2. Entre na pasta

```bash
cd Jogo_Carro_ESP-32
```

### 3. Execute com um servidor local

O projeto utiliza módulos JavaScript e precisa ser executado por um servidor HTTP.

Uma opção é utilizar a extensão **Live Server** no Visual Studio Code.

Outra opção é utilizar o Python:

```bash
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

> Não abra o arquivo `index.html` diretamente pelo explorador de arquivos, pois o navegador pode bloquear o carregamento dos módulos e do modelo 3D.

---

## 🎮 Como jogar

1. Ligue o ESP32.
2. Aguarde o dispositivo Bluetooth iniciar.
3. Abra o jogo no navegador.
4. Clique em **Conectar Volante**.
5. Selecione o dispositivo `ESP32-Volante`.
6. Clique em **Jogar**.
7. Incline o volante para controlar o carro.
8. Desvie dos obstáculos.
9. Após uma colisão, clique em **Jogar Novamente**.

### Controle pelo teclado

Também é possível jogar sem o volante:

| Tecla      | Ação                  |
| ---------- | --------------------- |
| `A` ou `←` | Mover para a esquerda |
| `D` ou `→` | Mover para a direita  |

---

## 🛣️ Sistema de estrada infinita

A estrada é dividida em vários segmentos de tamanho fixo.

Quando um segmento fica para trás do carro, ele é reposicionado no final da estrada. Dessa forma, o jogo consegue criar a sensação de movimento infinito sem precisar criar uma estrada com tamanho ilimitado.

O cenário acompanha os segmentos da estrada, permitindo que árvores, arbustos e montanhas também sejam reutilizados.

---

## 🚧 Sistema de obstáculos

Os obstáculos são distribuídos em cinco faixas:

```text
-4
-2
 0
 2
 4
```

A quantidade de obstáculos aumenta conforme a velocidade do carro.

O jogo também utiliza verificações para evitar que obstáculos sejam colocados muito próximos na mesma faixa, mantendo caminhos possíveis para o jogador.

A velocidade começa em aproximadamente:

```text
22 unidades
```

E pode aumentar até:

```text
80 unidades
```

---

## 📈 Pontuação

A pontuação aumenta sempre que o carro passa por um obstáculo sem colidir.

Ao ocorrer uma colisão, o jogo é pausado e a pontuação final é exibida na tela.

---

## 🌐 Publicação no GitHub Pages

Para publicar novas alterações:

```bash
git add .
git commit -m "Atualiza jogo 3D"
git push origin main
```

Depois, aguarde o GitHub Pages atualizar o site.

Repositório:

```text
https://github.com/MurilloEduardo323/Jogo_Carro_ESP-32
```

Página do jogo:

```text
https://murilloeduardo323.github.io/Jogo_Carro_ESP-32/
```

---

## ⚠️ Observações

* O Bluetooth precisa estar habilitado no computador.
* O navegador deve oferecer suporte à Web Bluetooth API.
* O GitHub Pages utiliza HTTPS, requisito necessário para o funcionamento do Bluetooth no navegador.
* O modelo GLB deve permanecer dentro da pasta `models`.
* O nome e os UUIDs do dispositivo devem ser iguais no código do ESP32 e no arquivo `game.js`.
* Se o modelo 3D não carregar, o jogo utiliza um carro simples como alternativa.
* Para testar a comunicação USB, o navegador precisa oferecer suporte à Web Serial API.

---

## 👨‍💻 Autor

**Murillo Eduardo Borges**

Estudante de Sistemas de Informação.

GitHub:

https://github.com/MurilloEduardo323

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos, experimentais e de aprendizado.
