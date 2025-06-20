// Elementos del DOM
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const resultsContainer = document.getElementById('resultsContainer');
const frequencyTableBody = document.getElementById('frequencyTableBody');
const huffmanTree = document.getElementById('huffmanTree');
const shannonFanoTree = document.getElementById('shannonFanoTree');
const decodeBtn = document.getElementById('decodeBtn');
const decodingAlgorithm = document.getElementById('decodingAlgorithm');
const decodedResult = document.getElementById('decodedResult');
const decodedText = document.getElementById('decodedText');

// Variables globales para almacenar los códigos generados
let huffmanCodes = {};
let shannonFanoCodes = {};
let frequencyData = [];
let originalText = '';

// Event Listeners
fileInput.addEventListener('change', handleFileUpload);
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

// Función principal para procesar los datos
async function processData() {
    originalText = textInput.value;
    if (!originalText) {
        alert('Por favor, ingrese texto o cargue un archivo de texto para procesar.');
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
            
            const responseData = await response.json();
            const huffmanData = responseData.data.huffman;
            const shannonFanoData = responseData.data.shannon_fano;

            // Asignar datos globales (para la tabla y el gráfico)
            huffmanCodes = huffmanData.codes;
            shannonFanoCodes = shannonFanoData.codes;

            // Disparar la descarga del archivo .json y mostrar un enlace de respaldo
            const downloadUrl = responseData.download_url;
            const downloadLinkContainer = document.getElementById('downloadLinkContainer');
            downloadLinkContainer.innerHTML = '';
            if (downloadUrl) {
                const fullUrl = `http://127.0.0.1:8000${downloadUrl}`;
                const filename = downloadUrl.split('/').pop();

                // Crear un enlace temporal para la descarga automática
                const autoLink = document.createElement('a');
                autoLink.href = fullUrl;
                autoLink.setAttribute('download', filename);
                document.body.appendChild(autoLink);
                autoLink.click();
                document.body.removeChild(autoLink);

                // Mostrar un enlace de respaldo por si la descarga automática falla
                const manualLink = document.createElement('a');
                manualLink.href = fullUrl;
                manualLink.textContent = `Descargar ${filename}`;
                manualLink.className = 'text-blue-600 hover:underline';
                manualLink.setAttribute('download', filename);
                
                const helpText = document.createElement('p');
                helpText.textContent = 'La descarga del archivo .json ha comenzado. Si no, puede descargarlo manualmente: ';
                helpText.appendChild(manualLink);
                downloadLinkContainer.appendChild(helpText);
            }

            // Preparar datos de frecuencia para la tabla y gráficos
            const symbolsTable = huffmanData.metrics.symbols_table;
            const totalFreq = symbolsTable.reduce((sum, item) => sum + item.frequency, 0);
            frequencyData = symbolsTable.map(item => ({
                symbol: item.char,
                frequency: item.frequency,
                probability: totalFreq > 0 ? item.frequency / totalFreq : 0
            }));
            
            // Actualizar la tabla de frecuencias con los códigos
            updateFrequencyTable();
            
            // Visualizar árboles
            // visualizeHuffmanTree(huffmanData.tree); 
            // visualizeShannonFanoTree(frequencyData); // Shannon-Fano visualization still uses frequency data array
            
            // Mostrar resultados
            displayEncodingResults(huffmanData.encoded_data, shannonFanoData.encoded_data, huffmanData.metrics, shannonFanoData.metrics);
            
            // Crear gráficos comparativos
            createComparisonChart();

        } catch (err) {
            alert('Error al comprimir el texto: ' + err.message);
            return;
        }
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
    // 1. Crear una lista de nodos hoja, uno para cada símbolo con su frecuencia.
    const nodes = freqData.map(item => ({
        symbol: item.symbol,
        frequency: item.frequency,
        left: null,
        right: null
    }));
    
    // 2. Construir el árbol combinando los dos nodos de menor frecuencia hasta que solo quede uno (la raíz).
    while (nodes.length > 1) {
        // Ordenar nodos por frecuencia de menor a mayor.
        nodes.sort((a, b) => a.frequency - b.frequency);
        
        // Extraer los dos nodos con las frecuencias más bajas.
        const left = nodes.shift();
        const right = nodes.shift();
        
        // Crear un nuevo nodo interno que es padre de los dos nodos extraídos.
        // La frecuencia del nuevo nodo es la suma de las frecuencias de sus hijos.
        const newNode = {
            symbol: left.symbol + right.symbol, // El símbolo es una concatenación (útil para depuración).
            frequency: left.frequency + right.frequency,
            left: left,
            right: right
        };
        
        // Añadir el nuevo nodo a la lista.
        nodes.push(newNode);
    }
    
    // 3. Devolver el único nodo que queda, que es la raíz del árbol de Huffman.
    return nodes[0];
}

// Generar códigos Huffman recorriendo el árbol de forma recursiva.
function generateHuffmanCodes(node, code) {
    if (!node) return; // Condición de parada: si el nodo es nulo.
    
    // Si es un nodo hoja (tiene un símbolo de un solo carácter), se le asigna el código binario acumulado.
    if (!node.left && !node.right && node.symbol.length === 1) {
        huffmanCodes[node.symbol] = code;
        return;
    }
    
    // Para los nodos internos, se recorre recursivamente hacia la izquierda (añadiendo '0' al código)
    // y hacia la derecha (añadiendo '1' al código).
    generateHuffmanCodes(node.left, code + '0');
    generateHuffmanCodes(node.right, code + '1');
}

// Generar códigos Shannon-Fano de forma recursiva.
function generateShannonFanoCodes(freqData, start, end, code) {
    // Caso base: si solo hay un símbolo en el grupo, se le asigna el código actual.
    if (start === end) {
        shannonFanoCodes[freqData[start].symbol] = code;
        return;
    }
    
    // Caso especial: si hay dos símbolos, se asigna '0' al primero y '1' al segundo.
    if (start + 1 === end) {
        shannonFanoCodes[freqData[start].symbol] = code + '0';
        shannonFanoCodes[freqData[end].symbol] = code + '1';
        return;
    }
    
    // Encontrar el punto de división que mejor equilibra las sumas de frecuencias.
    const splitIndex = findSplitIndex(freqData, start, end);
    
    // Llamar recursivamente para la primera mitad (añadiendo '0' al código).
    generateShannonFanoCodes(freqData, start, splitIndex, code + '0');
    // Llamar recursivamente para la segunda mitad (añadiendo '1' al código).
    generateShannonFanoCodes(freqData, splitIndex + 1, end, code + '1');
}

// Encontrar el índice para dividir el array en Shannon-Fano.
// El objetivo es que la suma de frecuencias de ambos grupos sea lo más parecida posible.
function findSplitIndex(freqData, start, end) {
    // Calcular la suma total de frecuencias en el rango actual.
    let totalFreq = 0;
    for (let i = start; i <= end; i++) {
        totalFreq += freqData[i].frequency;
    }
    
    // Encontrar el punto donde la diferencia acumulada con la mitad del total sea mínima.
    let currentSum = 0;
    let bestDiff = totalFreq;
    let splitIndex = start;
    
    for (let i = start; i < end; i++) {
        currentSum += freqData[i].frequency;
        // La diferencia se calcula como |total - 2 * suma_actual|, que es equivalente a |(total - suma_actual) - suma_actual|.
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
    if (!Array.isArray(frequencyData)) return;
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

// Visualizar el árbol de Huffman en el DOM.
// function visualizeHuffmanTree(root) {
//     huffmanTree.innerHTML = ''; // Limpiar visualización anterior.
    
//     if (!root) return; // No hacer nada si no hay árbol.
    
//     // Crear el contenedor principal para el árbol.
//     const treeDiv = document.createElement('div');
//     treeDiv.className = 'flex flex-col items-center';
    
//     // Función recursiva para crear los elementos del DOM para cada nodo del árbol.
//     function createNodeElement(node, level, path) {
//         if (!node) return null; // Condición de parada.

//         // Crear el div principal para el nodo.
//         const nodeDiv = document.createElement('div');
//         nodeDiv.className = 'flex flex-col items-center mb-4';
        
//         // Crear el contenido visible del nodo (símbolo y frecuencia/código).
//         const nodeContent = document.createElement('div');
//         nodeContent.className = 'node';
        
//         // Formatear el símbolo para que sea legible (espacios, saltos de línea, etc.).
//         // La API devuelve el `char` solo para los nodos hoja.
//         let displaySymbol = node.char || ' '; // Usar el caracter si es una hoja.
//         if (displaySymbol === ' ') displaySymbol = '␣';
//         if (displaySymbol === '\n') displaySymbol = '↵';
//         if (displaySymbol === '\t') displaySymbol = '→';
        
//         // La API devuelve la frecuencia o el código en el campo `frequency` del árbol.
//         const frequencyOrCode = node.frequency;

//         // Rellenar el contenido del nodo. Los nodos internos se marcan con '⦿'.
//         nodeContent.innerHTML = `
//             <div>${node.char ? displaySymbol : '⦿'}</div>
//             <div class="text-xs">${frequencyOrCode}</div>
//             ${path ? `<div class="text-xs font-bold">${path}</div>` : ''}
//         `;
        
//         nodeDiv.appendChild(nodeContent);
        
//         // Crear el contenedor para los hijos de este nodo.
//         const childrenDiv = document.createElement('div');
//         childrenDiv.className = 'flex justify-center gap-4';

//         // Crear los hijos recursivamente si existen.
//         if (node.left || node.right) {
//             // Procesar hijo izquierdo.
//             if (node.left) {
//                 const leftConnection = document.createElement('div');
//                 leftConnection.className = 'node-connection';
                
//                 const bitLabel = document.createElement('div');
//                 bitLabel.className = 'bit-label';
//                 bitLabel.textContent = '0'; // La rama izquierda corresponde al bit '0'.
//                 leftConnection.appendChild(bitLabel);
                
//                 const leftChild = createNodeElement(node.left, level + 1, path + '0');
                
//                 if (leftChild) {
//                     childrenDiv.appendChild(leftConnection);
//                     childrenDiv.appendChild(leftChild);
//                 }
//             }
            
//             // Procesar hijo derecho.
//             if (node.right) {
//                 const rightConnection = document.createElement('div');
//                 rightConnection.className = 'node-connection';
                
//                 const bitLabel = document.createElement('div');
//                 bitLabel.className = 'bit-label';
//                 bitLabel.textContent = '1'; // La rama derecha corresponde al bit '1'.
//                 rightConnection.appendChild(bitLabel);
                
//                 const rightChild = createNodeElement(node.right, level + 1, path + '1');
                
//                 if (rightChild) {
//                     childrenDiv.appendChild(rightConnection);
//                     childrenDiv.appendChild(rightChild);
//                 }
//             }
            
//             nodeDiv.appendChild(childrenDiv);
//         }
        
//         return nodeDiv;
//     }
    
//     // Iniciar la creación del árbol desde la raíz.
//     const rootElement = createNodeElement(root, 0, '');
//     treeDiv.appendChild(rootElement);
//     huffmanTree.appendChild(treeDiv);
// }

// Visualizar el "árbol" de Shannon-Fano (en realidad, el proceso de partición).
// function visualizeShannonFanoTree(freqData) {
//     shannonFanoTree.innerHTML = ''; // Limpiar visualización anterior.
    
//     // Crear el contenedor principal.
//     const treeDiv = document.createElement('div');
//     treeDiv.className = 'flex flex-col items-center';
    
//     // Función recursiva para visualizar cada partición.
//     function visualizePartition(data, start, end, level, path) {
//         if (start > end) return null; // Condición de parada.
        
//         // Caso base: si solo hay un símbolo, crear un nodo hoja.
//         if (start === end) {
//             const nodeDiv = document.createElement('div');
//             nodeDiv.className = 'node';
            
//             let displaySymbol = data[start].symbol;
//             if (displaySymbol === ' ') displaySymbol = '␣';
//             if (displaySymbol === '\n') displaySymbol = '↵';
//             if (displaySymbol === '\t') displaySymbol = '→';
            
//             nodeDiv.innerHTML = `
//                 <div>${displaySymbol}</div>
//                 <div class="text-xs">${data[start].frequency}</div>
//                 <div class="text-xs font-bold">${path}</div>
//             `;
            
//             return nodeDiv;
//         }
        
//         // Encontrar el punto de división para el grupo actual.
//         const splitIndex = findSplitIndex(data, start, end);
        
//         // Crear un nodo para representar el grupo actual de símbolos.
//         const nodeDiv = document.createElement('div');
//         nodeDiv.className = 'flex flex-col items-center mb-4';
        
//         // Calcular la suma de frecuencias y los símbolos del grupo.
//         let totalFreq = 0;
//         let symbols = '';
//         for (let i = start; i <= end; i++) {
//             totalFreq += data[i].frequency;
//             symbols += data[i].symbol;
//         }
        
//         const nodeContent = document.createElement('div');
//         nodeContent.className = 'node';
//         nodeContent.innerHTML = `
//             <div>${symbols.length > 10 ? symbols.substring(0, 10) + '...' : symbols}</div>
//             <div class="text-xs">${totalFreq}</div>
//             ${path ? `<div class="text-xs font-bold">${path}</div>` : ''}
//         `;
        
//         nodeDiv.appendChild(nodeContent);
        
//         // Crear el contenedor para las dos particiones (hijos).
//         const childrenDiv = document.createElement('div');
//         childrenDiv.className = 'flex justify-center gap-4';
        
//         // Visualizar recursivamente la primera mitad (rama '0').
//         if (start <= splitIndex) {
//             const leftConnection = document.createElement('div');
//             leftConnection.className = 'node-connection';
            
//             const bitLabel = document.createElement('div');
//             bitLabel.className = 'bit-label';
//             bitLabel.textContent = '0';
//             leftConnection.appendChild(bitLabel);
            
//             const leftChild = visualizePartition(data, start, splitIndex, level + 1, path + '0');
            
//             childrenDiv.appendChild(leftConnection);
//             childrenDiv.appendChild(leftChild);
//         }
        
//         // Visualizar recursivamente la segunda mitad (rama '1').
//         if (splitIndex + 1 <= end) {
//             const rightConnection = document.createElement('div');
//             rightConnection.className = 'node-connection';
            
//             const bitLabel = document.createElement('div');
//             bitLabel.className = 'bit-label';
//             bitLabel.textContent = '1';
//             rightConnection.appendChild(bitLabel);
            
//             const rightChild = visualizePartition(data, splitIndex + 1, end, level + 1, path + '1');
            
//             childrenDiv.appendChild(rightConnection);
//             childrenDiv.appendChild(rightChild);
//         }
        
//         nodeDiv.appendChild(childrenDiv);
//         return nodeDiv;
//     }
    
//     // Iniciar la visualización desde el grupo completo de símbolos.
//     const rootElement = visualizePartition(freqData, 0, freqData.length - 1, 0, '');
//     treeDiv.appendChild(rootElement);
//     shannonFanoTree.appendChild(treeDiv);
// }

// Codificar texto usando un conjunto de códigos
function encodeText(text, codes) {
    let encoded = '';
    for (let i = 0; i < text.length; i++) {
        encoded += codes[text[i]];
    }
    return encoded;
}

// Decodificar texto desde un archivo .json
async function decodeText() {
    const decodingFile = document.getElementById('decodingFile').files[0];
    const algorithm = decodingAlgorithm.value;

    if (!decodingFile) {
        alert('Por favor, seleccione un archivo .json para decodificar.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const fileContent = event.target.result;
            const compressedData = JSON.parse(fileContent);

            let encodedText = '';
            let codesToUse = {};

            if (algorithm === 'huffman') {
                if (!compressedData.huffman) throw new Error('El archivo no contiene datos de Huffman.');
                encodedText = compressedData.huffman.encoded_data;
                codesToUse = compressedData.huffman.codes;
            } else { // shannonFano
                if (!compressedData.shannon_fano) throw new Error('El archivo no contiene datos de Shannon-Fano.');
                encodedText = compressedData.shannon_fano.encoded_data;
                codesToUse = compressedData.shannon_fano.codes;
            }

            let decoded = '';
            // Corregir el nombre del endpoint para que coincida con la API (shannon_fano)
            const endpoint = algorithm === 'shannonFano' ? 'shannon_fano' : algorithm;
            const url = `http://127.0.0.1:8000/decompress/${endpoint}`;
            
            const requestBody = {
                encoded_data: encodedText,
                codes: codesToUse
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'No se pudo leer el error del servidor.' }));
                throw new Error(`Error en la descompresión: ${JSON.stringify(errorData.detail)}`);
            }

            const data = await response.json();
            // La API devuelve la clave `decoded_text` en la respuesta.
            decoded = data.decoded_text;

            // Mostrar resultado
            decodedText.textContent = decoded;
            decodedResult.classList.remove('hidden');

        } catch (err) {
            alert('Error al procesar el archivo de decodificación: ' + err.message);
        }
    };

    reader.readAsText(decodingFile);
}

// Mostrar resultados de codificación
function displayEncodingResults(huffmanEncoded, shannonFanoEncoded, huffmanMetrics, shannonFanoMetrics) {
    // Mostrar resultados de Huffman en la interfaz
    document.getElementById('huffmanEncoded').textContent = huffmanEncoded.length > 100 
        ? huffmanEncoded.substring(0, 100) + '...' 
        : huffmanEncoded;
    document.getElementById('huffmanOriginalLength').textContent = huffmanMetrics.original_size_bits;
    document.getElementById('huffmanCompressedLength').textContent = huffmanMetrics.compressed_size_bits;
    document.getElementById('huffmanCompressionRatio').textContent = huffmanMetrics.compression_ratio.toFixed(2) + ':1';
    document.getElementById('huffmanAverageLength').textContent = huffmanMetrics.avg_code_length.toFixed(2);
    document.getElementById('huffmanEfficiency').textContent = (huffmanMetrics.efficiency * 100).toFixed(2);
    
    // Mostrar resultados de Shannon-Fano en la interfaz
    document.getElementById('shannonFanoEncoded').textContent = shannonFanoEncoded.length > 100 
        ? shannonFanoEncoded.substring(0, 100) + '...' 
        : shannonFanoEncoded;
    document.getElementById('shannonFanoOriginalLength').textContent = shannonFanoMetrics.original_size_bits;
    document.getElementById('shannonFanoCompressedLength').textContent = shannonFanoMetrics.compressed_size_bits;
    document.getElementById('shannonFanoCompressionRatio').textContent = shannonFanoMetrics.compression_ratio.toFixed(2) + ':1';
    document.getElementById('shannonFanoAverageLength').textContent = shannonFanoMetrics.avg_code_length.toFixed(2);
    document.getElementById('shannonFanoEfficiency').textContent = (shannonFanoMetrics.efficiency * 100).toFixed(2);
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
    
    const huffmanLengths = frequencyData.map(item => huffmanCodes[item.symbol] ? huffmanCodes[item.symbol].length : 0);
    const shannonFanoLengths = frequencyData.map(item => shannonFanoCodes[item.symbol] ? shannonFanoCodes[item.symbol].length : 0);
    
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