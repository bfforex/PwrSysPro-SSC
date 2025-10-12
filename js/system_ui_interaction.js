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
    // Initialize orchestrator
    if (!window.calculationOrchestrator) {
        window.calculationOrchestrator = new CalculationOrchestrator();
    }
    
    // Run All Analysis button
    const runAllBtn = document.getElementById('runAllAnalysis');
    if (runAllBtn) {
        runAllBtn.addEventListener('click', handleRunAllAnalysis);
    }
    
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
    
    const exportEnhancedPdfBtn = document.getElementById('exportEnhancedPdf');
    if (exportEnhancedPdfBtn) {
        exportEnhancedPdfBtn.addEventListener('click', handleExportEnhancedPDF);
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
 * Handle run all analysis
 */
async function handleRunAllAnalysis() {
    try {
        // Gather project data
        const projectData = gatherProjectData();
        
        // Show loading
        showLoadingIndicator('Running comprehensive analysis...');
        disableCalculationButtons(true);
        
        // Run orchestrator
        const result = await window.calculationOrchestrator.runAllAnalysis(projectData);
        
        if (result.success) {
            // Store results globally
            window.calculationResults = result.results;
            
            // Display results
            displayComprehensiveResults(result.results);
            
            showToast('Analysis completed successfully', 'success');
        } else {
            showToast('Analysis failed: ' + result.error, 'error');
            console.error('Analysis error:', result);
        }
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        console.error('Run all analysis error:', error);
    } finally {
        hideLoadingIndicator();
        disableCalculationButtons(false);
    }
}

/**
 * Handle short circuit calculation
 */
async function handleShortCircuitCalculation() {
    try {
        // Gather project data
        const projectData = gatherProjectData();
        
        // Show loading
        showLoadingIndicator('Calculating short circuit...');
        disableCalculationButtons(true);
        
        // Run orchestrator
        const result = await window.calculationOrchestrator.runShortCircuitAnalysis(projectData);
        
        if (result.success) {
            // Store results
            window.calculationResults = window.calculationResults || {};
            window.calculationResults.shortCircuit = result.shortCircuit;
            window.calculationResults.motorContribution = result.motorContribution;
            
            // Display results
            displayShortCircuitResults(result.shortCircuit, result.motorContribution);
            
            showToast('Short circuit calculation completed', 'success');
        } else {
            showToast('Calculation failed: ' + result.error, 'error');
        }
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        console.error('Short circuit calculation error:', error);
    } finally {
        hideLoadingIndicator();
        disableCalculationButtons(false);
    }
}
/**
 * Handle arc flash calculation
 */
async function handleArcFlashCalculation() {
    try {
        // Gather project data
        const projectData = gatherProjectData();
        
        // Show loading
        showLoadingIndicator('Calculating arc flash...');
        disableCalculationButtons(true);
        
        // Run orchestrator
        const result = await window.calculationOrchestrator.runArcFlashAnalysis(projectData);
        
        if (result.success) {
            // Store results
            window.calculationResults = window.calculationResults || {};
            window.calculationResults.arcFlash = result.arcFlash;
            
            // Display results
            displayArcFlashResults(result.arcFlash);
            
            showToast('Arc flash calculation completed', 'success');
        } else {
            showToast('Calculation failed: ' + result.error, 'error');
        }
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        console.error('Arc flash calculation error:', error);
    } finally {
        hideLoadingIndicator();
        disableCalculationButtons(false);
    }
}

/**
 * Handle voltage drop calculation
 */
async function handleVoltageDropCalculation() {
    try {
        // Gather project data
        const projectData = gatherProjectData();
        
        // Show loading
        showLoadingIndicator('Calculating voltage drop...');
        disableCalculationButtons(true);
        
        // Run orchestrator
        const result = await window.calculationOrchestrator.runVoltageDropAnalysis(projectData);
        
        if (result.success) {
            // Store results
            window.calculationResults = window.calculationResults || {};
            window.calculationResults.voltageDrop = result.voltageDrop;
            
            // Display results
            displayVoltageDropResults(result.voltageDrop);
            
            showToast('Voltage drop calculation completed', 'success');
        } else {
            showToast('Calculation failed: ' + result.error, 'error');
        }
        
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        console.error('Voltage drop calculation error:', error);
    } finally {
        hideLoadingIndicator();
        disableCalculationButtons(false);
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
 * Handle comprehensive calculation
 */
async function handleComprehensiveCalculation() {
    // Same as run all analysis
    await handleRunAllAnalysis();
}

/**
 * Gather project data from UI
 */
function gatherProjectData() {
    // Gather from components global variable or UI inputs
    if (typeof components !== 'undefined' && components) {
        return {
            voltage: parseFloat(document.getElementById('systemVoltage')?.value) || 480,
            frequency: parseFloat(document.getElementById('systemFrequency')?.value) || 60,
            standard: document.getElementById('calcStandard')?.value || 'ieee',
            components: components
        };
    }
    
    // Fallback: create from UI
    return {
        voltage: parseFloat(document.getElementById('systemVoltage')?.value) || 480,
        frequency: parseFloat(document.getElementById('systemFrequency')?.value) || 60,
        standard: document.getElementById('calcStandard')?.value || 'ieee',
        components: []
    };
}

/**
 * Disable/enable calculation buttons
 */
function disableCalculationButtons(disabled) {
    const buttons = [
        'runAllAnalysis',
        'calculateShortCircuit',
        'calculateArcFlash',
        'calculateVoltageDrop',
        'calculateComprehensive'
    ];
    
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = disabled;
            btn.style.opacity = disabled ? '0.6' : '1';
            btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }
    });
}

/**
 * Display comprehensive results
 */
function displayComprehensiveResults(results) {
    const container = document.getElementById('comprehensiveResults') || 
                      document.getElementById('resultsContainer');
    if (!container) return;
    
    let html = `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h3 style="color: #1e3a8a; margin-bottom: 15px;">🔍 Comprehensive Analysis Results</h3>
    `;
    
    // Short Circuit Results
    if (results.shortCircuit && results.shortCircuit.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0c4a6e;">⚡ Short Circuit Analysis</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background: #f0f9ff; font-weight: 600;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Bus</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Voltage (V)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">I<sub>3φ</sub> (kA)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">X/R</th>
                    </tr>
        `;
        
        results.shortCircuit.forEach(scResult => {
            html += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${scResult.busName}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${scResult.voltage.toFixed(0)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${scResult.faultCurrentsKA.threePhase.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${scResult.impedance.xr.toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `</table></div>`;
    }
    
    // Motor Contribution
    if (results.motorContribution) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0c4a6e;">🔌 Motor Contribution</h4>
                <p><strong>First Cycle:</strong> ${results.motorContribution.totals.firstCycleKA.toFixed(2)} kA</p>
                <p><strong>Interrupting:</strong> ${results.motorContribution.totals.interruptingKA.toFixed(2)} kA</p>
                <p><strong>Sustained:</strong> ${results.motorContribution.totals.sustainedKA.toFixed(2)} kA</p>
            </div>
        `;
    }
    
    // Voltage Drop Results
    if (results.voltageDrop && results.voltageDrop.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0c4a6e;">📉 Voltage Drop Analysis</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background: #f0f9ff; font-weight: 600;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Bus</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Voltage Drop (%)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Voltage at Bus (V)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">NEC Compliance</th>
                    </tr>
        `;
        
        results.voltageDrop.forEach(vdResult => {
            const compliance = vdResult.compliance?.nec ? '✓ Pass' : '✗ Fail';
            html += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vdResult.busName}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vdResult.voltageDropPercent.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vdResult.voltageAtBus.toFixed(1)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${compliance}</td>
                </tr>
            `;
        });
        
        html += `</table></div>`;
    }
    
    // Arc Flash Results
    if (results.arcFlash && results.arcFlash.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0c4a6e;">⚠️ Arc Flash Analysis</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr style="background: #f0f9ff; font-weight: 600;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Bus</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Incident Energy (cal/cm²)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">AFB (mm)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">PPE Category</th>
                    </tr>
        `;
        
        results.arcFlash.forEach(afResult => {
            if (afResult.applicable) {
                const ppeCategory = afResult.ppe?.category || 'N/A';
                html += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${afResult.busName}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${(afResult.incidentEnergy || 0).toFixed(2)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${(afResult.arcFlashBoundary || 0).toFixed(0)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${ppeCategory}</td>
                    </tr>
                `;
            }
        });
        
        html += `</table></div>`;
    }
    
    // Summary
    if (results.summary) {
        html += `
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
                <h4 style="color: #0c4a6e;">📋 Summary</h4>
                <p><strong>Max Fault Current:</strong> ${results.summary.maxFaultCurrent.toFixed(2)} kA</p>
                <p><strong>Max Voltage Drop:</strong> ${results.summary.maxVoltageDropPercent.toFixed(2)}%</p>
                <p><strong>Max Incident Energy:</strong> ${results.summary.maxIncidentEnergy.toFixed(2)} cal/cm²</p>
            </div>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Handle enhanced PDF export with auto-run
 */
async function handleExportEnhancedPDF() {
    try {
        // Check if results exist in ResultsStore
        let results = null;
        if (window.resultsStore && window.resultsStore.hasResults()) {
            results = window.resultsStore.getResults();
            console.log('[Export] Using stored results from ResultsStore');
        }
        
        // If no results, auto-run analysis
        if (!results) {
            console.log('[Export] No results found, auto-running analysis...');
            showToast('No calculation results found. Running analysis...', 'info');
            
            // Show loading
            showLoadingIndicator('Running analysis before export...');
            disableCalculationButtons(true);
            
            // Gather project data and run analysis
            const projectData = gatherProjectData();
            const analysisResult = await window.calculationOrchestrator.runAllAnalysis(projectData);
            
            if (!analysisResult.success) {
                throw new Error('Analysis failed: ' + analysisResult.error);
            }
            
            results = analysisResult.results;
            hideLoadingIndicator();
            disableCalculationButtons(false);
        }
        
        // Generate PDF
        if (!results) {
            throw new Error('No calculation results available for export');
        }
        
        showLoadingIndicator('Generating PDF report...');
        
        const projectData = results.projectData || gatherProjectData();
        const pdfResult = await generateEnhancedPDF(results, projectData);
        
        hideLoadingIndicator();
        
        if (pdfResult.success) {
            showToast(`PDF exported successfully: ${pdfResult.filename}`, 'success');
        } else {
            throw new Error('PDF generation failed');
        }
        
    } catch (error) {
        hideLoadingIndicator();
        disableCalculationButtons(false);
        console.error('[Export] Error:', error);
        showToast('Export error: ' + error.message, 'error');
    }
}

/**
 * Handle export PDF (legacy)
 */
function handleExportPDF() {
    // Delegate to enhanced export
    handleExportEnhancedPDF();
}

/**
 * Handle export Excel
 */
function handleExportExcel() {
    showToast('Excel export not yet implemented', 'info');
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
