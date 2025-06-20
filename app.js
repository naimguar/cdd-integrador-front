// Elementos del DOM
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const imageInput = document.getElementById('imageInput');
const imageCanvas = document.getElementById('imageCanvas');
const processBtn = document.getElementById('processBtn');
const resultsContainer = document.getElementById('resultsContainer');
const frequencyTableBody = document.getElementById('frequencyTableBody');
const huffmanTree = document.getElementById('huffmanTree');
const shannonFanoTree = document.getElementById('shannonFanoTree');
const decodeBtn = document.getElementById('decodeBtn');
const decodingInput = document.getElementById('decodingInput');
const decodingAlgorithm = document.getElementById('decodingAlgorithm');
const decodedResult = document.getElementById('decodedResult');
const decodedText = document.getElementById('decodedText');
const imageCompressionResults = document.getElementById('imageCompressionResults');

// Variables globales para almacenar los códigos generados
let huffmanCodes = {};
let shannonFanoCodes = {};
let frequencyData = [];
let originalText = '';
let imageData = null;

// Event Listeners
fileInput.addEventListener('change', handleFileUpload);
imageInput.addEventListener('change', handleImageUpload);
processBtn.addEventListener('click', processData);
decodeBtn.addEventListener('click', decodeText);

// Función para manejar la carga de archivos de texto
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        textInput.value = e.target.result;
    };
    reader.readAsText(file);
}

// Función para manejar la carga de imágenes
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Mostrar el canvas y configurar su tamaño
            imageCanvas.classList.remove('hidden');
            const ctx = imageCanvas.getContext('2d');
            
            // Ajustar el tamaño del canvas al de la imagen
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            
            // Dibujar la imagen en el canvas
            ctx.drawImage(img, 0, 0);
            
            // Convertir a blanco y negro
            const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Convertir a escala de grises primero
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                // Umbral para convertir a blanco y negro (0 o 255)
                const bw = avg > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = bw;
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // Guardar los datos de la imagen para procesamiento posterior
            window.imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Función principal para procesar los datos
async function processData() {
    originalText = textInput.value;
    if (!originalText && !window.imageData) {
        alert('Por favor, ingrese texto o cargue una imagen para procesar.');
        return;
    }

    // Procesar texto si está disponible
    if (originalText) {
        // Llamar a la API para comprimir el texto
        try {
            const response = await fetch('http://127.0.0.1:8000/compress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: originalText })
            });
            if (!response.ok) throw new Error('Error en la compresión');
            const data = await response.json();
            // Asumimos que la respuesta contiene: frequencyData, huffmanCodes, shannonFanoCodes, huffmanEncoded, shannonFanoEncoded
            frequencyData = data.frequencyData;
            huffmanCodes = data.huffmanCodes;
            shannonFanoCodes = data.shannonFanoCodes;
            // Actualizar la tabla de frecuencias con los códigos
            updateFrequencyTable();
            // Visualizar árboles
            visualizeHuffmanTree(data.huffmanTree); // Puede requerir adaptar el formato del árbol
            visualizeShannonFanoTree(frequencyData);
            // Mostrar resultados
            displayEncodingResults(data.huffmanEncoded, data.shannonFanoEncoded);
            // Crear gráficos comparativos
            createComparisonChart();
        } catch (err) {
            alert('Error al comprimir el texto: ' + err.message);
            return;
        }
    }

    // Procesar imagen si está disponible
    if (window.imageData) {
        processImageCompression();
    }

    // Mostrar resultados
    resultsContainer.classList.remove('hidden');
}

// Calcular frecuencias de caracteres en el texto
function calculateFrequencies(text) {
    const frequencies = {};
    
    // Contar ocurrencias de cada carácter
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    // Convertir a array y ordenar por frecuencia descendente
    const freqArray = Object.keys(frequencies).map(char => ({
        symbol: char,
        frequency: frequencies[char],
        probability: frequencies[char] / text.length
    }));
    
    freqArray.sort((a, b) => b.frequency - a.frequency);
    return freqArray;
}

// Construir el árbol de Huffman
function buildHuffmanTree(freqData) {
    // Crear nodos hoja para cada símbolo
    const nodes = freqData.map(item => ({
        symbol: item.symbol,
        frequency: item.frequency,
        left: null,
        right: null
    }));
    
    // Construir el árbol combinando nodos
    while (nodes.length > 1) {
        // Ordenar nodos por frecuencia
        nodes.sort((a, b) => a.frequency - b.frequency);
        
        // Tomar los dos nodos con menor frecuencia
        const left = nodes.shift();
        const right = nodes.shift();
        
        // Crear un nuevo nodo interno
        const newNode = {
            symbol: left.symbol + right.symbol,
            frequency: left.frequency + right.frequency,
            left: left,
            right: right
        };
        
        // Añadir el nuevo nodo a la lista
        nodes.push(newNode);
    }
    
    // Devolver la raíz del árbol
    return nodes[0];
}

// Generar códigos Huffman recorriendo el árbol
function generateHuffmanCodes(node, code) {
    if (!node) return;
    
    // Si es un nodo hoja (un solo carácter), asignar el código
    if (!node.left && !node.right && node.symbol.length === 1) {
        huffmanCodes[node.symbol] = code;
        return;
    }
    
    // Recorrer subárbol izquierdo (añadir 0)
    generateHuffmanCodes(node.left, code + '0');
    
    // Recorrer subárbol derecho (añadir 1)
    generateHuffmanCodes(node.right, code + '1');
}

// Generar códigos Shannon-Fano
function generateShannonFanoCodes(freqData, start, end, code) {
    // Caso base: un solo símbolo
    if (start === end) {
        shannonFanoCodes[freqData[start].symbol] = code;
        return;
    }
    
    // Caso base: dos símbolos
    if (start + 1 === end) {
        shannonFanoCodes[freqData[start].symbol] = code + '0';
        shannonFanoCodes[freqData[end].symbol] = code + '1';
        return;
    }
    
    // Encontrar el punto de división que equilibra las frecuencias
    const splitIndex = findSplitIndex(freqData, start, end);
    
    // Generar códigos para cada mitad
    generateShannonFanoCodes(freqData, start, splitIndex, code + '0');
    generateShannonFanoCodes(freqData, splitIndex + 1, end, code + '1');
}

// Encontrar el índice para dividir el array en Shannon-Fano
function findSplitIndex(freqData, start, end) {
    // Calcular suma total de frecuencias
    let totalFreq = 0;
    for (let i = start; i <= end; i++) {
        totalFreq += freqData[i].frequency;
    }
    
    // Encontrar el punto donde la diferencia entre las sumas es mínima
    let currentSum = 0;
    let bestDiff = totalFreq;
    let splitIndex = start;
    
    for (let i = start; i < end; i++) {
        currentSum += freqData[i].frequency;
        const diff = Math.abs(totalFreq - 2 * currentSum);
        
        if (diff < bestDiff) {
            bestDiff = diff;
            splitIndex = i;
        }
    }
    
    return splitIndex;
}

// Actualizar la tabla de frecuencias con los códigos generados
function updateFrequencyTable() {
    frequencyTableBody.innerHTML = '';
    
    frequencyData.forEach(item => {
        const row = document.createElement('tr');
        
        // Formatear el símbolo para mostrar espacios y saltos de línea
        let displaySymbol = item.symbol;
        if (displaySymbol === ' ') displaySymbol = '␣';
        if (displaySymbol === '\n') displaySymbol = '↵';
        if (displaySymbol === '\t') displaySymbol = '→';
        
        row.innerHTML = `
            <td class="py-2 px-4 border-b border-gray-200">${displaySymbol}</td>
            <td class="py-2 px-4 border-b border-gray-200">${item.frequency}</td>
            <td class="py-2 px-4 border-b border-gray-200">${(item.probability * 100).toFixed(2)}%</td>
            <td class="py-2 px-4 border-b border-gray-200">${huffmanCodes[item.symbol] || '-'}</td>
            <td class="py-2 px-4 border-b border-gray-200">${shannonFanoCodes[item.symbol] || '-'}</td>
        `;
        
        frequencyTableBody.appendChild(row);
    });
}

// Visualizar el árbol de Huffman
function visualizeHuffmanTree(root) {
    huffmanTree.innerHTML = '';
    
    if (!root) return;
    
    // Crear representación visual simplificada del árbol
    const treeDiv = document.createElement('div');
    treeDiv.className = 'flex flex-col items-center';
    
    function createNodeElement(node, level, path) {
        if (!node) return null;
        
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'flex flex-col items-center mb-4';
        
        const nodeContent = document.createElement('div');
        nodeContent.className = 'node';
        
        // Formatear el símbolo para mostrar espacios y saltos de línea
        let displaySymbol = node.symbol;
        if (displaySymbol === ' ') displaySymbol = '␣';
        if (displaySymbol === '\n') displaySymbol = '↵';
        if (displaySymbol === '\t') displaySymbol = '→';
        
        nodeContent.innerHTML = `
            <div>${displaySymbol}</div>
            <div class="text-xs">${node.frequency}</div>
            ${path ? `<div class="text-xs font-bold">${path}</div>` : ''}
        `;
        
        nodeDiv.appendChild(nodeContent);
        
        // Crear contenedor para hijos
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'flex justify-center gap-4';
        
        // Crear hijos recursivamente
        if (node.left || node.right) {
            if (node.left) {
                const leftConnection = document.createElement('div');
                leftConnection.className = 'node-connection';
                
                const bitLabel = document.createElement('div');
                bitLabel.className = 'bit-label';
                bitLabel.textContent = '0';
                leftConnection.appendChild(bitLabel);
                
                const leftChild = createNodeElement(node.left, level + 1, path + '0');
                
                childrenDiv.appendChild(leftConnection);
                childrenDiv.appendChild(leftChild);
            }
            
            if (node.right) {
                const rightConnection = document.createElement('div');
                rightConnection.className = 'node-connection';
                
                const bitLabel = document.createElement('div');
                bitLabel.className = 'bit-label';
                bitLabel.textContent = '1';
                rightConnection.appendChild(bitLabel);
                
                const rightChild = createNodeElement(node.right, level + 1, path + '1');
                
                childrenDiv.appendChild(rightConnection);
                childrenDiv.appendChild(rightChild);
            }
            
            nodeDiv.appendChild(childrenDiv);
        }
        
        return nodeDiv;
    }
    
    const rootElement = createNodeElement(root, 0, '');
    treeDiv.appendChild(rootElement);
    huffmanTree.appendChild(treeDiv);
}

// Visualizar el árbol de Shannon-Fano
function visualizeShannonFanoTree(freqData) {
    shannonFanoTree.innerHTML = '';
    
    // Crear representación visual del árbol Shannon-Fano
    const treeDiv = document.createElement('div');
    treeDiv.className = 'flex flex-col items-center';
    
    // Función recursiva para visualizar la partición Shannon-Fano
    function visualizePartition(data, start, end, level, path) {
        if (start > end) return null;
        
        // Caso base: un solo símbolo
        if (start === end) {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'node';
            
            // Formatear el símbolo para mostrar espacios y saltos de línea
            let displaySymbol = data[start].symbol;
            if (displaySymbol === ' ') displaySymbol = '␣';
            if (displaySymbol === '\n') displaySymbol = '↵';
            if (displaySymbol === '\t') displaySymbol = '→';
            
            nodeDiv.innerHTML = `
                <div>${displaySymbol}</div>
                <div class="text-xs">${data[start].frequency}</div>
                <div class="text-xs font-bold">${path}</div>
            `;
            
            return nodeDiv;
        }
        
        // Encontrar el punto de división
        const splitIndex = findSplitIndex(data, start, end);
        
        // Crear nodo para este nivel
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'flex flex-col items-center mb-4';
        
        // Calcular la suma de frecuencias para este grupo
        let totalFreq = 0;
        let symbols = '';
        for (let i = start; i <= end; i++) {
            totalFreq += data[i].frequency;
            symbols += data[i].symbol;
        }
        
        const nodeContent = document.createElement('div');
        nodeContent.className = 'node';
        nodeContent.innerHTML = `
            <div>${symbols.length > 10 ? symbols.substring(0, 10) + '...' : symbols}</div>
            <div class="text-xs">${totalFreq}</div>
            ${path ? `<div class="text-xs font-bold">${path}</div>` : ''}
        `;
        
        nodeDiv.appendChild(nodeContent);
        
        // Crear contenedor para hijos
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'flex justify-center gap-4';
        
        // Crear conexiones y subárboles
        if (start <= splitIndex) {
            const leftConnection = document.createElement('div');
            leftConnection.className = 'node-connection';
            
            const bitLabel = document.createElement('div');
            bitLabel.className = 'bit-label';
            bitLabel.textContent = '0';
            leftConnection.appendChild(bitLabel);
            
            const leftChild = visualizePartition(data, start, splitIndex, level + 1, path + '0');
            
            childrenDiv.appendChild(leftConnection);
            childrenDiv.appendChild(leftChild);
        }
        
        if (splitIndex + 1 <= end) {
            const rightConnection = document.createElement('div');
            rightConnection.className = 'node-connection';
            
            const bitLabel = document.createElement('div');
            bitLabel.className = 'bit-label';
            bitLabel.textContent = '1';
            rightConnection.appendChild(bitLabel);
            
            const rightChild = visualizePartition(data, splitIndex + 1, end, level + 1, path + '1');
            
            childrenDiv.appendChild(rightConnection);
            childrenDiv.appendChild(rightChild);
        }
        
        nodeDiv.appendChild(childrenDiv);
        return nodeDiv;
    }
    
    // Iniciar la visualización desde la raíz
    const rootElement = visualizePartition(freqData, 0, freqData.length - 1, 0, '');
    treeDiv.appendChild(rootElement);
    shannonFanoTree.appendChild(treeDiv);
}

// Codificar texto usando un conjunto de códigos
function encodeText(text, codes) {
    let encoded = '';
    for (let i = 0; i < text.length; i++) {
        encoded += codes[text[i]];
    }
    return encoded;
}

// Decodificar texto
async function decodeText() {
    const encodedText = decodingInput.value.trim();
    const algorithm = decodingAlgorithm.value;
    if (!encodedText) {
        alert('Por favor, ingrese el texto codificado.');
        return;
    }
    let decoded = '';
    let url = '';
    if (algorithm === 'huffman') {
        url = 'http://127.0.0.1:8000/decompress/huffman';
    } else {
        url = 'http://127.0.0.1:8000/decompress/shannon_fano';
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encoded: encodedText })
        });
        if (!response.ok) throw new Error('Error en la descompresión');
        const data = await response.json();
        decoded = data.decoded;
    } catch (err) {
        alert('Error al decodificar: ' + err.message);
        return;
    }
    // Mostrar resultado
    decodedText.textContent = decoded;
    decodedResult.classList.remove('hidden');
}

// Mostrar resultados de codificación
function displayEncodingResults(huffmanEncoded, shannonFanoEncoded) {
    // Calcular métricas para Huffman
    const originalBits = originalText.length * 8; // Asumiendo 8 bits por carácter ASCII
    const huffmanBits = huffmanEncoded.length;
    const huffmanRatio = (originalBits / huffmanBits).toFixed(2);
    
    // Calcular longitud promedio de código Huffman
    let huffmanTotalLength = 0;
    let totalSymbols = 0;
    
    for (const item of frequencyData) {
        const codeLength = huffmanCodes[item.symbol].length;
        huffmanTotalLength += item.frequency * codeLength;
        totalSymbols += item.frequency;
    }
    
    const huffmanAvgLength = (huffmanTotalLength / totalSymbols).toFixed(2);
    
    // Calcular entropía para medir eficiencia
    let entropy = 0;
    for (const item of frequencyData) {
        entropy -= item.probability * Math.log2(item.probability);
    }
    
    const huffmanEfficiency = ((entropy / huffmanAvgLength) * 100).toFixed(2);
    
    // Calcular métricas para Shannon-Fano
    const shannonFanoBits = shannonFanoEncoded.length;
    const shannonFanoRatio = (originalBits / shannonFanoBits).toFixed(2);
    
    // Calcular longitud promedio de código Shannon-Fano
    let shannonFanoTotalLength = 0;
    
    for (const item of frequencyData) {
        const codeLength = shannonFanoCodes[item.symbol].length;
        shannonFanoTotalLength += item.frequency * codeLength;
    }
    
    const shannonFanoAvgLength = (shannonFanoTotalLength / totalSymbols).toFixed(2);
    const shannonFanoEfficiency = ((entropy / shannonFanoAvgLength) * 100).toFixed(2);
    
    // Mostrar resultados en la interfaz
    document.getElementById('huffmanEncoded').textContent = huffmanEncoded.length > 100 
        ? huffmanEncoded.substring(0, 100) + '...' 
        : huffmanEncoded;
    document.getElementById('huffmanOriginalLength').textContent = originalBits;
    document.getElementById('huffmanCompressedLength').textContent = huffmanBits;
    document.getElementById('huffmanCompressionRatio').textContent = huffmanRatio + ':1';
    document.getElementById('huffmanAverageLength').textContent = huffmanAvgLength;
    document.getElementById('huffmanEfficiency').textContent = huffmanEfficiency;
    
    document.getElementById('shannonFanoEncoded').textContent = shannonFanoEncoded.length > 100 
        ? shannonFanoEncoded.substring(0, 100) + '...' 
        : shannonFanoEncoded;
    document.getElementById('shannonFanoOriginalLength').textContent = originalBits;
    document.getElementById('shannonFanoCompressedLength').textContent = shannonFanoBits;
    document.getElementById('shannonFanoCompressionRatio').textContent = shannonFanoRatio + ':1';
    document.getElementById('shannonFanoAverageLength').textContent = shannonFanoAvgLength;
    document.getElementById('shannonFanoEfficiency').textContent = shannonFanoEfficiency;
    
    // Preparar datos para decodificación
    decodingInput.value = huffmanEncoded.length > 100 
        ? huffmanEncoded.substring(0, 100) 
        : huffmanEncoded;
}

// Crear gráfico comparativo
function createComparisonChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    // Calcular datos para el gráfico
    const symbols = frequencyData.map(item => {
        // Formatear el símbolo para mostrar espacios y saltos de línea
        let displaySymbol = item.symbol;
        if (displaySymbol === ' ') displaySymbol = '␣';
        if (displaySymbol === '\n') displaySymbol = '↵';
        if (displaySymbol === '\t') displaySymbol = '→';
        return displaySymbol;
    });
    
    const frequencies = frequencyData.map(item => item.frequency);
    
    const huffmanLengths = frequencyData.map(item => huffmanCodes[item.symbol].length);
    const shannonFanoLengths = frequencyData.map(item => shannonFanoCodes[item.symbol].length);
    
    // Limitar a los 15 símbolos más frecuentes para mejor visualización
    const maxSymbols = 15;
    if (symbols.length > maxSymbols) {
        symbols.length = maxSymbols;
        frequencies.length = maxSymbols;
        huffmanLengths.length = maxSymbols;
        shannonFanoLengths.length = maxSymbols;
    }
    
    // Crear el gráfico
    if (window.comparisonChartInstance) {
        window.comparisonChartInstance.destroy();
    }
    
    window.comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: symbols,
            datasets: [
                {
                    label: 'Frecuencia',
                    data: frequencies,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Longitud Huffman',
                    data: huffmanLengths,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                },
                {
                    label: 'Longitud Shannon-Fano',
                    data: shannonFanoLengths,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Frecuencia'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Longitud de código (bits)'
                    },
                    min: 0,
                    max: Math.max(...huffmanLengths, ...shannonFanoLengths) + 1,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación de Frecuencias y Longitudes de Código'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.raw;
                            return `${datasetLabel}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

// Procesar compresión de imagen
function processImageCompression() {
    if (!window.imageData) return;
    
    const imageData = window.imageData;
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convertir datos de imagen a una cadena binaria (0s y 1s)
    let binaryString = '';
    for (let i = 0; i < data.length; i += 4) {
        // Solo necesitamos un canal ya que es blanco y negro
        binaryString += data[i] === 0 ? '0' : '1';
    }
    
    // Calcular frecuencias de secuencias de bits
    const runLengths = [];
    let currentRun = 1;
    let currentBit = binaryString[0];
    
    for (let i = 1; i < binaryString.length; i++) {
        if (binaryString[i] === currentBit) {
            currentRun++;
        } else {
            runLengths.push({ bit: currentBit, length: currentRun });
            currentBit = binaryString[i];
            currentRun = 1;
        }
    }
    
    // Añadir la última secuencia
    runLengths.push({ bit: currentBit, length: currentRun });
    
    // Codificar usando Huffman
    const runFrequencies = {};
    for (const run of runLengths) {
        const key = run.bit + run.length;
        runFrequencies[key] = (runFrequencies[key] || 0) + 1;
    }
    
    const runFreqArray = Object.keys(runFrequencies).map(key => ({
        symbol: key,
        frequency: runFrequencies[key],
        probability: runFrequencies[key] / runLengths.length
    }));
    
    runFreqArray.sort((a, b) => b.frequency - a.frequency);
    
    // Construir árbol Huffman para la imagen
    const imageHuffmanTree = buildHuffmanTree(runFreqArray);
    const imageHuffmanCodes = {};
    generateImageHuffmanCodes(imageHuffmanTree, '', imageHuffmanCodes);
    
    // Codificar la imagen
    let encodedImage = '';
    for (const run of runLengths) {
        const key = run.bit + run.length;
        encodedImage += imageHuffmanCodes[key];
    }
    
    // Calcular tamaños y tasa de compresión
    const originalSize = binaryString.length / 8; // bytes
    const compressedSize = (encodedImage.length + Object.keys(imageHuffmanCodes).length * 16) / 8; // bytes (incluyendo diccionario)
    const compressionRatio = (originalSize / compressedSize).toFixed(2);
    
    // Mostrar resultados
    imageCompressionResults.classList.remove('hidden');
    
    // Mostrar imagen original
    const originalImageContainer = document.getElementById('originalImageContainer');
    originalImageContainer.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = '100%';
    
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    originalImageContainer.appendChild(canvas);
    
    // Mostrar información de compresión
    document.getElementById('originalImageSize').textContent = originalSize;
    document.getElementById('compressedImageSize').textContent = compressedSize;
    document.getElementById('imageCompressionRatio').textContent = compressionRatio + ':1';
}

// Generar códigos Huffman para la compresión de imagen
function generateImageHuffmanCodes(node, code, codes) {
    if (!node) return;
    
    // Si es un nodo hoja, asignar el código
    if (!node.left && !node.right) {
        codes[node.symbol] = code;
        return;
    }
    
    // Recorrer subárbol izquierdo (añadir 0)
    generateImageHuffmanCodes(node.left, code + '0', codes);
    
    // Recorrer subárbol derecho (añadir 1)
    generateImageHuffmanCodes(node.right, code + '1', codes);
}

// Inicializar con un texto de ejemplo
textInput.value = "Este es un ejemplo de texto para comprimir utilizando los algoritmos de Huffman y Shannon-Fano. La compresión de datos es fundamental en la era digital para optimizar el almacenamiento y la transmisión de información.";