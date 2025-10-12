/**
 * system_ui_interaction.js
 * UI interaction handlers for power system calculator
 * Coordinates between UI and calculation modules
 */

/**
 * Initialize UI interactions
 */
function initializeUIInteractions() {
    // Set up real-time validation
    setupRealtimeValidationHandlers();
    
    // Set up bus management
    setupBusManagementHandlers();
    
    // Set up calculation triggers
    setupCalculationHandlers();
    
    // Set up export handlers
    setupExportHandlers();
}

/**
 * Setup real-time validation handlers
 */
function setupRealtimeValidationHandlers() {
    // Voltage input
    const voltageInput = document.getElementById('systemVoltage');
    if (voltageInput) {
        setupRealtimeValidation('systemVoltage', 'voltage');
    }
    
    // Frequency input
    const frequencyInput = document.getElementById('systemFrequency');
    if (frequencyInput) {
        setupRealtimeValidation('systemFrequency', 'frequency');
    }
    
    // Working distance for arc flash
    const workingDistInput = document.getElementById('workingDistance');
    if (workingDistInput) {
        setupRealtimeValidation('workingDistance', 'workingDistance');
    }
    
    // Arc duration
    const arcDurationInput = document.getElementById('arcDuration');
    if (arcDurationInput) {
        setupRealtimeValidation('arcDuration', 'arcDuration');
    }
}

/**
 * Setup bus management handlers
 */
function setupBusManagementHandlers() {
    const addBusBtn = document.getElementById('addBusBtn');
    if (addBusBtn) {
        addBusBtn.addEventListener('click', handleAddBus);
    }
    
    const removeBusBtn = document.getElementById('removeBusBtn');
    if (removeBusBtn) {
        removeBusBtn.addEventListener('click', handleRemoveBus);
    }
    
    const connectBusesBtn = document.getElementById('connectBusesBtn');
    if (connectBusesBtn) {
        connectBusesBtn.addEventListener('click', handleConnectBuses);
    }
}

/**
 * Setup calculation handlers
 */
function setupCalculationHandlers() {
    const calcShortCircuitBtn = document.getElementById('calculateShortCircuit');
    if (calcShortCircuitBtn) {
        calcShortCircuitBtn.addEventListener('click', handleShortCircuitCalculation);
    }
    
    const calcArcFlashBtn = document.getElementById('calculateArcFlash');
    if (calcArcFlashBtn) {
        calcArcFlashBtn.addEventListener('click', handleArcFlashCalculation);
    }
    
    const calcVoltageDropBtn = document.getElementById('calculateVoltageDrop');
    if (calcVoltageDropBtn) {
        calcVoltageDropBtn.addEventListener('click', handleVoltageDropCalculation);
    }
    
    const calcComprehensiveBtn = document.getElementById('calculateComprehensive');
    if (calcComprehensiveBtn) {
        calcComprehensiveBtn.addEventListener('click', handleComprehensiveCalculation);
    }
}

/**
 * Setup export handlers
 */
function setupExportHandlers() {
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', handleExportPDF);
    }
    
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', handleExportExcel);
    }
}

/**
 * Handle add bus
 */
function handleAddBus() {
    const busName = document.getElementById('busName')?.value || 'New Bus';
    const busVoltage = parseFloat(document.getElementById('busVoltage')?.value) || 400;
    const busType = document.getElementById('busType')?.value || 'load';
    
    // Validate inputs
    const validation = validatePhysicalConstraint(busVoltage, 'voltage');
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    // Add bus to system
    if (window.globalBusSystem) {
        const bus = window.globalBusSystem.addBus(busName, busVoltage, busType);
        updateBusDisplay();
        showToast('Bus added successfully', 'success');
    }
}

/**
 * Handle remove bus
 */
function handleRemoveBus() {
    const busId = parseInt(document.getElementById('busIdToRemove')?.value);
    
    if (window.globalBusSystem && busId) {
        window.globalBusSystem.removeBus(busId);
        updateBusDisplay();
        showToast('Bus removed successfully', 'success');
    }
}

/**
 * Handle connect buses
 */
function handleConnectBuses() {
    const bus1Id = parseInt(document.getElementById('bus1Id')?.value);
    const bus2Id = parseInt(document.getElementById('bus2Id')?.value);
    
    if (window.globalBusSystem && bus1Id && bus2Id) {
        try {
            window.globalBusSystem.connectBuses(bus1Id, bus2Id);
            updateSystemDiagram();
            showToast('Buses connected successfully', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

/**
 * Handle short circuit calculation
 */
function handleShortCircuitCalculation() {
    // Gather inputs
    const voltage = parseFloat(document.getElementById('systemVoltage')?.value);
    const standard = document.getElementById('standard')?.value || 'IEC';
    
    // Validate inputs
    const validation = validateAllInputs({ voltage });
    if (!validation.valid) {
        alert('Validation errors:\n' + validation.errors.join('\n'));
        return;
    }
    
    // Show loading
    showLoadingIndicator('Calculating...');
    
    // Perform calculation (setTimeout to allow UI update)
    setTimeout(() => {
        try {
            let results;
            if (standard === 'IEC') {
                results = calculateIECShortCircuit({
                    voltage: voltage,
                    impedanceR: 0.1,
                    impedanceX: 1.0,
                    faultType: 'max'
                });
            } else {
                results = calculateIEEEShortCircuit({
                    voltage: voltage,
                    impedanceR: 0.1,
                    impedanceX: 1.0,
                    faultLocation: 'remote'
                });
            }
            
            // Verify results
            const verification = verifyCalculationResults(results, standard);
            
            // Display results
            displayShortCircuitResults(results, verification);
            
            hideLoadingIndicator();
            showToast('Calculation completed successfully', 'success');
        } catch (error) {
            hideLoadingIndicator();
            showToast('Calculation error: ' + error.message, 'error');
        }
    }, 100);
}

/**
 * Handle arc flash calculation
 */
function handleArcFlashCalculation() {
    const voltage = parseFloat(document.getElementById('systemVoltage')?.value);
    const faultCurrent = parseFloat(document.getElementById('faultCurrent')?.value);
    const workingDistance = parseFloat(document.getElementById('workingDistance')?.value) || 450;
    const arcDuration = parseFloat(document.getElementById('arcDuration')?.value) || 0.1;
    
    // Validate
    const validation = validateAllInputs({
        voltage,
        faultCurrent,
        workingDistance,
        arcDuration
    });
    
    if (!validation.valid) {
        alert('Validation errors:\n' + validation.errors.join('\n'));
        return;
    }
    
    showLoadingIndicator('Calculating arc flash...');
    
    setTimeout(() => {
        try {
            const results = calculateArcFlashIEEE1584_2018({
                voltage: voltage,
                boltedFaultCurrent: faultCurrent,
                workingDistance: workingDistance,
                arcDuration: arcDuration,
                equipmentGap: 32,
                enclosureType: 'VCB'
            });
            
            if (results.applicable) {
                const ppeReport = generatePPEReport(results);
                displayArcFlashResults(results, ppeReport);
            } else {
                alert(results.error);
            }
            
            hideLoadingIndicator();
            showToast('Arc flash calculation completed', 'success');
        } catch (error) {
            hideLoadingIndicator();
            showToast('Calculation error: ' + error.message, 'error');
        }
    }, 100);
}

/**
 * Handle voltage drop calculation
 */
function handleVoltageDropCalculation() {
    const voltage = parseFloat(document.getElementById('voltageDropVoltage')?.value);
    const current = parseFloat(document.getElementById('voltageDropCurrent')?.value);
    const length = parseFloat(document.getElementById('voltageDropLength')?.value);
    const conductorSize = document.getElementById('conductorSize')?.value || '10';
    const phaseType = document.getElementById('phaseType')?.value || 'three-phase';
    
    showLoadingIndicator('Calculating voltage drop...');
    
    setTimeout(() => {
        try {
            const results = performVoltageDropAnalysis({
                voltage: voltage,
                current: current,
                length: length,
                conductorSize: conductorSize,
                phaseType: phaseType,
                powerFactor: 0.85
            });
            
            displayVoltageDropResults(results);
            
            hideLoadingIndicator();
            showToast('Voltage drop calculation completed', 'success');
        } catch (error) {
            hideLoadingIndicator();
            showToast('Calculation error: ' + error.message, 'error');
        }
    }, 100);
}

/**
 * Handle comprehensive calculation
 */
function handleComprehensiveCalculation() {
    if (!window.globalPowerSystem) {
        alert('Power system not initialized');
        return;
    }
    
    showLoadingIndicator('Performing comprehensive analysis...');
    
    setTimeout(() => {
        try {
            const results = window.globalPowerSystem.performSystemAnalysis('all');
            displayComprehensiveResults(results);
            
            hideLoadingIndicator();
            showToast('Comprehensive analysis completed', 'success');
        } catch (error) {
            hideLoadingIndicator();
            showToast('Analysis error: ' + error.message, 'error');
        }
    }, 100);
}

/**
 * Update bus display
 */
function updateBusDisplay() {
    const busListContainer = document.getElementById('busList');
    if (!busListContainer || !window.globalBusSystem) return;
    
    const buses = window.globalBusSystem.getAllBuses();
    
    let html = '<div style="display: grid; gap: 10px;">';
    buses.forEach(bus => {
        html += `
            <div style="border: 1px solid #e1e8ed; padding: 12px; border-radius: 8px; background: white;">
                <strong>${bus.name}</strong> (ID: ${bus.id})<br>
                <span style="color: #64748b; font-size: 14px;">
                    ${(bus.voltage / 1000).toFixed(1)} kV | Type: ${bus.type} | Connections: ${bus.connections.length}
                </span>
            </div>
        `;
    });
    html += '</div>';
    
    busListContainer.innerHTML = html;
}

/**
 * Update system diagram
 */
function updateSystemDiagram() {
    if (window.globalBusSystem) {
        drawSystemDiagram(window.globalBusSystem, 'systemDiagramContainer');
    }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator(message = 'Loading...') {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="spinner"></div>
                <p style="margin-top: 10px; color: #667eea;">${message}</p>
            </div>
        `;
        indicator.style.display = 'block';
    }
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Display short circuit results
 */
function displayShortCircuitResults(results, verification) {
    const container = document.getElementById('shortCircuitResults');
    if (!container) return;
    
    let html = `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h3 style="color: #1e3a8a; margin-bottom: 15px;">Short Circuit Results (${results.standard})</h3>
    `;
    
    if (results.symmetricalCurrent) {
        html += `<p><strong>Symmetrical Current:</strong> ${results.symmetricalCurrent.toFixed(2)} kA</p>`;
    }
    
    if (results.peakCurrent) {
        html += `<p><strong>Peak Current:</strong> ${results.peakCurrent.toFixed(2)} kA</p>`;
    }
    
    if (verification && verification.warnings.length > 0) {
        html += `<div style="background: #fef3c7; padding: 10px; border-radius: 4px; margin-top: 10px;">`;
        html += `<strong>⚠️ Warnings:</strong><ul>`;
        verification.warnings.forEach(w => html += `<li>${w}</li>`);
        html += `</ul></div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Display arc flash results
 */
function displayArcFlashResults(arcFlash, ppeReport) {
    const container = document.getElementById('arcFlashResults');
    if (!container) return;
    
    const html = `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h3 style="color: #1e3a8a; margin-bottom: 15px;">Arc Flash Analysis Results</h3>
            <p><strong>Incident Energy:</strong> ${arcFlash.incidentEnergyCalCm2.toFixed(2)} cal/cm²</p>
            <p><strong>Arc Flash Boundary:</strong> ${(arcFlash.arcFlashBoundary / 304.8).toFixed(2)} feet</p>
            ${formatPPEDisplay(ppeReport.ppe)}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Display voltage drop results
 */
function displayVoltageDropResults(results) {
    const container = document.getElementById('voltageDropResults');
    if (!container) return;
    
    const calc = results.calculation;
    const nec = results.compliance.nec;
    
    let html = `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h3 style="color: #1e3a8a; margin-bottom: 15px;">Voltage Drop Analysis</h3>
            <p><strong>Voltage Drop:</strong> ${calc.voltageDrop.toFixed(2)} V (${calc.voltageDropPercent.toFixed(2)}%)</p>
            <p><strong>NEC Compliance:</strong> ${nec.level === 'good' ? '✓ Compliant' : nec.level === 'warning' ? '⚠️ Warning' : '✗ Non-compliant'}</p>
            <div style="margin-top: 10px;">
                ${nec.messages.join('<br>')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Display comprehensive results
 */
function displayComprehensiveResults(results) {
    const container = document.getElementById('comprehensiveResults');
    if (!container) return;
    
    let html = `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h3 style="color: #1e3a8a; margin-bottom: 15px;">Comprehensive Analysis Results</h3>
    `;
    
    if (results.shortCircuit) {
        html += `
            <h4>Short Circuit Analysis</h4>
            <p>Maximum Fault Current: ${results.shortCircuit.maxFaultCurrent.toFixed(2)} A</p>
        `;
    }
    
    if (results.systemSummary) {
        html += `
            <h4>System Summary</h4>
            <p>Buses: ${results.systemSummary.buses}</p>
            <p>Transformers: ${results.systemSummary.transformers}</p>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

// Initialize on DOM load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeUIInteractions);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeUIInteractions,
        updateBusDisplay,
        updateSystemDiagram,
        showToast,
        displayShortCircuitResults,
        displayArcFlashResults,
        displayVoltageDropResults
    };
}
