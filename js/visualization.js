/**
 * visualization.js
 * System diagram visualization and interactive results display
 * Uses Chart.js for charts and custom SVG for system diagrams
 */

/**
 * Draw system diagram using SVG
 */
function drawSystemDiagram(busSystem, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const buses = busSystem.getAllBuses();
    const width = container.clientWidth || 800;
    const height = 400;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.border = '1px solid #e1e8ed';
    svg.style.borderRadius = '8px';
    svg.style.background = '#f8fafc';
    
    // Calculate positions for buses
    const spacing = width / (buses.length + 1);
    
    buses.forEach((bus, index) => {
        const x = spacing * (index + 1);
        const y = height / 2;
        
        // Draw bus symbol (rectangle)
        const busRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        busRect.setAttribute('x', x - 30);
        busRect.setAttribute('y', y - 20);
        busRect.setAttribute('width', 60);
        busRect.setAttribute('height', 40);
        busRect.setAttribute('fill', bus.type === 'source' ? '#10b981' : '#3b82f6');
        busRect.setAttribute('stroke', '#1e3a8a');
        busRect.setAttribute('stroke-width', 2);
        busRect.setAttribute('rx', 5);
        svg.appendChild(busRect);
        
        // Draw bus label
        const busLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        busLabel.setAttribute('x', x);
        busLabel.setAttribute('y', y - 30);
        busLabel.setAttribute('text-anchor', 'middle');
        busLabel.setAttribute('fill', '#1e3a8a');
        busLabel.setAttribute('font-size', '12');
        busLabel.setAttribute('font-weight', 'bold');
        busLabel.textContent = bus.name;
        svg.appendChild(busLabel);
        
        // Draw voltage label
        const voltageLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        voltageLabel.setAttribute('x', x);
        voltageLabel.setAttribute('y', y + 50);
        voltageLabel.setAttribute('text-anchor', 'middle');
        voltageLabel.setAttribute('fill', '#64748b');
        voltageLabel.setAttribute('font-size', '10');
        voltageLabel.textContent = `${(bus.voltage / 1000).toFixed(1)} kV`;
        svg.appendChild(voltageLabel);
        
        // Draw connections
        bus.connections.forEach(conn => {
            const targetIndex = buses.findIndex(b => b.id === conn.bus.id);
            if (targetIndex > index) {
                const x2 = spacing * (targetIndex + 1);
                const y2 = height / 2;
                
                // Draw connection line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x + 30);
                line.setAttribute('y1', y);
                line.setAttribute('x2', x2 - 30);
                line.setAttribute('y2', y2);
                line.setAttribute('stroke', '#64748b');
                line.setAttribute('stroke-width', 2);
                line.setAttribute('stroke-dasharray', '5,5');
                svg.appendChild(line);
            }
        });
    });
    
    container.appendChild(svg);
}

/**
 * Create fault current profile chart
 */
function createFaultCurrentChart(faultData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data
    const labels = faultData.map(d => d.busName);
    const currentData = faultData.map(d => d.faultCurrent / 1000); // Convert to kA
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Fault Current (kA)',
                data: currentData,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Fault Current (kA)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Bus Location'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Fault Current Profile',
                    font: { size: 16 }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Create voltage drop profile chart
 */
function createVoltageDropChart(voltageData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data
    const labels = voltageData.map(d => d.location || `Point ${d.index}`);
    const dropData = voltageData.map(d => d.voltageDropPercent);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Voltage Drop (%)',
                data: dropData,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Voltage Drop (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Location'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Voltage Drop Profile',
                    font: { size: 16 }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 3,
                            yMax: 3,
                            borderColor: 'rgba(245, 158, 11, 0.8)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: 'NEC Recommended (3%)',
                                enabled: true,
                                position: 'end'
                            }
                        },
                        line2: {
                            type: 'line',
                            yMin: 5,
                            yMax: 5,
                            borderColor: 'rgba(220, 38, 38, 0.8)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: 'NEC Maximum (5%)',
                                enabled: true,
                                position: 'end'
                            }
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create arc flash hazard chart
 */
function createArcFlashChart(arcFlashData, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data
    const labels = arcFlashData.map(d => d.busName);
    const energyData = arcFlashData.map(d => d.arcFlash.incidentEnergyCalCm2);
    const colors = arcFlashData.map(d => {
        const energy = d.arcFlash.incidentEnergyCalCm2;
        if (energy < 1.2) return 'rgba(16, 185, 129, 0.6)';
        if (energy < 4) return 'rgba(59, 130, 246, 0.6)';
        if (energy < 8) return 'rgba(245, 158, 11, 0.6)';
        if (energy < 25) return 'rgba(249, 115, 22, 0.6)';
        return 'rgba(220, 38, 38, 0.6)';
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Incident Energy (cal/cm²)',
                data: energyData,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.6', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Incident Energy (cal/cm²)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Bus Location'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Arc Flash Hazard Analysis',
                    font: { size: 16 }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Display calculation steps in expandable format
 */
function displayCalculationSteps(steps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'calculation-step';
        stepDiv.style.cssText = `
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        `;
        
        // Step header
        const header = document.createElement('div');
        header.className = 'step-header';
        header.style.cssText = `
            background: #f1f5f9;
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        `;
        header.innerHTML = `
            <span>Step ${index + 1}: ${step.title}</span>
            <span class="toggle-icon">▼</span>
        `;
        
        // Step content
        const content = document.createElement('div');
        content.className = 'step-content';
        content.style.cssText = `
            padding: 15px;
            display: none;
            background: white;
        `;
        content.innerHTML = `
            <div style="font-family: monospace; background: #f8fafc; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                ${step.formula || 'N/A'}
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Calculation:</strong><br>
                ${step.calculation || 'N/A'}
            </div>
            <div style="color: #3b82f6; font-weight: 600;">
                <strong>Result:</strong> ${step.result || 'N/A'}
            </div>
        `;
        
        // Toggle functionality
        header.addEventListener('click', () => {
            const isVisible = content.style.display === 'block';
            content.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.toggle-icon').textContent = isVisible ? '▼' : '▲';
        });
        
        stepDiv.appendChild(header);
        stepDiv.appendChild(content);
        container.appendChild(stepDiv);
    });
}

/**
 * Create interactive comparison table
 */
function createComparisonTable(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #1e3a8a; color: white;">
                    <th style="padding: 12px; text-align: left;">Parameter</th>
                    <th style="padding: 12px; text-align: center;">IEC 60909-0</th>
                    <th style="padding: 12px; text-align: center;">IEEE/ANSI</th>
                    <th style="padding: 12px; text-align: center;">Difference</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#f8fafc' : 'white';
        const diffPercent = ((row.iec - row.ieee) / row.iec * 100).toFixed(1);
        const diffColor = Math.abs(diffPercent) > 10 ? '#dc2626' : '#10b981';
        
        html += `
            <tr style="background: ${bgColor};">
                <td style="padding: 10px; border: 1px solid #e1e8ed;">${row.parameter}</td>
                <td style="padding: 10px; border: 1px solid #e1e8ed; text-align: center;">${row.iec.toFixed(2)} ${row.unit}</td>
                <td style="padding: 10px; border: 1px solid #e1e8ed; text-align: center;">${row.ieee.toFixed(2)} ${row.unit}</td>
                <td style="padding: 10px; border: 1px solid #e1e8ed; text-align: center; color: ${diffColor};">
                    ${diffPercent}%
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawSystemDiagram,
        createFaultCurrentChart,
        createVoltageDropChart,
        createArcFlashChart,
        displayCalculationSteps,
        createComparisonTable
    };
}
