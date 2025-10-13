/**
 * report_enhanced.js
 * Enhanced PDF Report Generation with Unicode Support
 * Includes: Calculation Trace, Motor Contribution, Voltage Drop, Assumptions
 */

/**
 * Generate enhanced PDF report with Unicode symbols
 */
async function generateEnhancedPDF(results, projectData) {
    if (!results) {
        throw new Error('No results to export');
    }
    
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        throw new Error('jsPDF library not loaded');
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add Unicode font support - use standard fonts that support Unicode
    // jsPDF 2.x has better Unicode support with standard fonts
    doc.setFont('helvetica');
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Helper function to check page break
    function checkPageBreak(neededSpace = 20) {
        if (yPos > pageHeight - neededSpace) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    }
    
    // Helper function to add section header
    function addSectionHeader(title) {
        checkPageBreak(30);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 60, 114);
        doc.text(title, 20, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
    }
    
    // === HEADER ===
    doc.setFillColor(30, 60, 114);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('PowerSys Pro', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Comprehensive Power System Analysis Report', pageWidth / 2, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;
    
    // === EXECUTIVE SUMMARY ===
    addSectionHeader('Executive Summary');
    
    const projectName = projectData.projectName || 'Unnamed Project';
    const systemVoltage = projectData.voltage || 480;
    const standard = (projectData.standard || 'IEEE').toUpperCase();
    const frequency = projectData.frequency || 60;
    
    doc.text(`Project: ${projectName}`, 20, yPos);
    yPos += 6;
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 6;
    doc.text(`Standard: ${standard}`, 20, yPos);
    yPos += 6;
    doc.text(`System Voltage: ${systemVoltage} V`, 20, yPos);
    yPos += 6;
    doc.text(`System Frequency: ${frequency} Hz`, 20, yPos);
    yPos += 12;
    
    // === KEY RESULTS SUMMARY ===
    if (results.summary) {
        addSectionHeader('Key Results Summary');
        
        const summaryData = [
            ['Parameter', 'Value', 'Unit'],
            ['Max Fault Current (3\u03C6)', results.summary.maxFaultCurrent.toFixed(2), 'kA'],
            ['Min Fault Current', results.summary.minFaultCurrent.toFixed(2), 'kA'],
            ['Max Voltage Drop', results.summary.maxVoltageDropPercent.toFixed(2), '%'],
            ['Max Incident Energy', results.summary.maxIncidentEnergy.toFixed(2), 'cal/cm\u00B2']
        ];
        
        doc.autoTable({
            startY: yPos,
            head: [summaryData[0]],
            body: summaryData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [30, 60, 114] }
        });
        
        yPos = doc.lastAutoTable.finalY + 12;
    }
    
    // === SHORT CIRCUIT ANALYSIS ===
    if (results.shortCircuit && results.shortCircuit.length > 0) {
        addSectionHeader('Short Circuit Analysis (All Fault Types)');
        
        results.shortCircuit.forEach((scResult, index) => {
            checkPageBreak(60);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`Bus: ${scResult.busName} (${scResult.voltage.toFixed(0)} V)`, 20, yPos);
            yPos += 6;
            doc.setFont('helvetica', 'normal');
            
            const scData = [
                ['Fault Type', 'Current (kA)', 'Current (A)'],
                ['Three-Phase (3\u03C6)', scResult.faultCurrentsKA.threePhase.toFixed(2), 
                 scResult.faultCurrents.threePhase.toFixed(0)],
                ['Line-to-Ground (L-G)', scResult.faultCurrentsKA.lineToGround.toFixed(2), 
                 scResult.faultCurrents.lineToGround.toFixed(0)],
                ['Line-to-Line (L-L)', scResult.faultCurrentsKA.lineToLine.toFixed(2), 
                 scResult.faultCurrents.lineToLine.toFixed(0)],
                ['Double L-G (2L-G)', scResult.faultCurrentsKA.doubleLineToGround.toFixed(2), 
                 scResult.faultCurrents.doubleLineToGround.toFixed(0)],
                ['Asymmetrical', scResult.faultCurrentsKA.asymmetrical.toFixed(2), 
                 scResult.faultCurrents.asymmetrical.toFixed(0)],
                ['Peak', scResult.faultCurrentsKA.peak.toFixed(2), 
                 scResult.faultCurrents.peak.toFixed(0)]
            ];
            
            doc.autoTable({
                startY: yPos,
                head: [scData[0]],
                body: scData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] },
                margin: { left: 25 }
            });
            
            yPos = doc.lastAutoTable.finalY + 6;
            
            // Enhanced results section
            if (scResult.results) {
                doc.setFont('helvetica', 'bold');
                doc.text('Enhanced Results:', 25, yPos);
                yPos += 6;
                doc.setFont('helvetica', 'normal');
                
                // Use formatting utilities if available, otherwise fall back to toFixed
                const formatCurrent = (typeof window !== 'undefined' && window.FormattingUtils) ? 
                    window.FormattingUtils.formatCurrent : (v => v.toFixed(3));
                const formatImpedance = (typeof window !== 'undefined' && window.FormattingUtils) ? 
                    window.FormattingUtils.formatImpedance : (v => v.toFixed(6));
                const formatRatio = (typeof window !== 'undefined' && window.FormattingUtils) ? 
                    window.FormattingUtils.formatRatio : (v => v.toFixed(2));
                const formatTimeConstant = (typeof window !== 'undefined' && window.FormattingUtils) ? 
                    window.FormattingUtils.formatTimeConstant : (v => (v * 1000).toFixed(2) + ' ms');
                
                doc.text(`Symmetrical Current (Isym): ${formatCurrent(scResult.results.isym_kA)} kA`, 30, yPos);
                yPos += 5;
                doc.text(`Asymmetrical Current (Iasym): ${formatCurrent(scResult.results.iasym_kA)} kA`, 30, yPos);
                yPos += 5;
                doc.text(`Total Impedance: ${formatImpedance(scResult.results.z_total_ohm)} \u03A9`, 30, yPos);
                yPos += 5;
                doc.text(`X/R Ratio: ${formatRatio(scResult.results.x_over_r)}`, 30, yPos);
                yPos += 5;
                doc.text(`Fault MVA: ${scResult.results.mva_sc.toFixed(2)} MVA`, 30, yPos);
                yPos += 5;
                doc.text(`Time Constant (\u03C4): ${formatTimeConstant(scResult.results.tau_s)}`, 30, yPos);
                yPos += 5;
                doc.text(`Asymmetrical Multiplier: ${scResult.results.multiplier.toFixed(3)}`, 30, yPos);
                yPos += 8;
            } else {
                // Legacy format
                doc.text(`Impedance: R = ${scResult.impedance.r.toFixed(6)} \u03A9, ` +
                        `X = ${scResult.impedance.x.toFixed(6)} \u03A9, ` +
                        `Z = ${scResult.impedance.z.toFixed(6)} \u03A9`, 25, yPos);
                yPos += 6;
                doc.text(`X/R Ratio: ${scResult.impedance.xr.toFixed(2)}`, 25, yPos);
                yPos += 10;
            }
        });
    }
    
    // === MOTOR CONTRIBUTION ===
    if (results.motorContribution && results.motorContribution.motors.length > 0) {
        addSectionHeader('Motor Contribution Analysis (IEEE 141)');
        
        doc.text(`Total Motors: ${results.motorContribution.count}`, 20, yPos);
        yPos += 6;
        doc.text(`Total HP: ${results.motorContribution.motors.reduce((sum, m) => sum + m.hp, 0)} HP`, 20, yPos);
        yPos += 10;
        
        const motorData = [
            ['Motor', 'HP', 'Voltage (V)', 'FLA (A)', 'LRA (A)', 'First Cycle (kA)', 'Interrupt. (kA)', 'Sustained (kA)']
        ];
        
        results.motorContribution.motors.forEach(motor => {
            motorData.push([
                motor.name,
                motor.hp.toFixed(0),
                motor.voltage.toFixed(0),
                motor.fla.toFixed(1),
                motor.lra.toFixed(1),
                motor.contribution.firstCycleKA.toFixed(2),
                motor.contribution.interruptingKA.toFixed(2),
                motor.contribution.sustainedKA.toFixed(2)
            ]);
        });
        
        doc.autoTable({
            startY: yPos,
            head: [motorData[0]],
            body: motorData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Totals
        checkPageBreak(25);
        doc.setFont('helvetica', 'bold');
        doc.text('Motor Contribution Totals:', 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`First Cycle: ${results.motorContribution.totals.firstCycleKA.toFixed(2)} kA`, 25, yPos);
        yPos += 6;
        doc.text(`Interrupting Time: ${results.motorContribution.totals.interruptingKA.toFixed(2)} kA`, 25, yPos);
        yPos += 6;
        doc.text(`Sustained: ${results.motorContribution.totals.sustainedKA.toFixed(2)} kA`, 25, yPos);
        yPos += 12;
    }
    
    // === VOLTAGE DROP ANALYSIS ===
    if (results.voltageDrop && results.voltageDrop.length > 0) {
        addSectionHeader('Voltage Drop Analysis');
        
        const vdData = [
            ['Bus', 'Nominal V', 'Drop (%)', 'Drop (V)', 'Voltage at Bus (V)', 'NEC Compliance']
        ];
        
        results.voltageDrop.forEach(vdResult => {
            const compliance = vdResult.compliance?.nec ? '\u2713 Pass' : '\u2717 Fail';
            vdData.push([
                vdResult.busName,
                vdResult.nominalVoltage ? vdResult.nominalVoltage.toFixed(0) : 
                    vdResult.voltage ? vdResult.voltage.toFixed(0) : 'N/A',
                vdResult.voltageDropPercent.toFixed(2),
                vdResult.voltageDropV ? vdResult.voltageDropV.toFixed(2) : 'N/A',
                vdResult.voltageAtBus.toFixed(1),
                compliance
            ]);
        });
        
        doc.autoTable({
            startY: yPos,
            head: [vdData[0]],
            body: vdData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 9 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
        
        // NEC Limits
        checkPageBreak(20);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('NEC Voltage Drop Limits: 3% recommended, 5% maximum (feeder + branch)', 20, yPos);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos += 12;
    }
    
    // === ARC FLASH ANALYSIS ===
    if (results.arcFlash && results.arcFlash.length > 0) {
        addSectionHeader('Arc Flash Hazard Analysis (IEEE 1584-2018)');
        
        const afData = [
            ['Bus', 'Voltage (V)', 'I_bolted (kA)', 'I_arc (kA)', 'Inc. Energy (cal/cm\u00B2)', 'AFB (mm)', 'PPE Cat.', 'Status']
        ];
        
        results.arcFlash.forEach(afResult => {
            if (afResult.evaluated && afResult.applicable) {
                afData.push([
                    afResult.busName,
                    afResult.voltage.toFixed(0),
                    afResult.boltedFaultCurrent.toFixed(2),
                    (afResult.arcingCurrent || 0).toFixed(2),
                    (afResult.incidentEnergy || 0).toFixed(2),
                    (afResult.arcFlashBoundary || 0).toFixed(0),
                    afResult.ppe?.category || 'N/A',
                    afResult.method || 'Calculated'
                ]);
            } else {
                afData.push([
                    afResult.busName,
                    afResult.voltage ? afResult.voltage.toFixed(0) : 'N/A',
                    afResult.boltedFaultCurrent ? afResult.boltedFaultCurrent.toFixed(2) : 'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    'N/A',
                    afResult.status || 'Not Evaluated'
                ]);
            }
        });
        
        // Add not-evaluated details if present
        const notEvaluated = results.arcFlash.filter(af => !af.evaluated);
        if (notEvaluated.length > 0) {
            checkPageBreak(30);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(239, 68, 68);
            doc.text('Not Evaluated Buses - Missing Parameters:', 20, yPos + 5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            yPos += 11;
            
            notEvaluated.forEach(afResult => {
                checkPageBreak(20);
                doc.text(`\u2022 ${afResult.busName}:`, 25, yPos);
                yPos += 5;
                if (afResult.missingFields && afResult.missingFields.length > 0) {
                    afResult.missingFields.forEach(field => {
                        doc.text(`  - ${field}`, 30, yPos);
                        yPos += 5;
                    });
                } else {
                    doc.text(`  - ${afResult.reason || 'Unknown reason'}`, 30, yPos);
                    yPos += 5;
                }
                yPos += 2;
            });
            yPos += 3;
        }
        
        doc.autoTable({
            startY: yPos,
            head: [afData[0]],
            body: afData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Arc Flash Notes
        checkPageBreak(25);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Default Parameters: Working Distance = 450mm, Arc Duration = 100ms (6 cycles)', 20, yPos);
        yPos += 5;
        doc.text('AFB = Arc Flash Boundary (distance where incident energy = 1.2 cal/cm\u00B2)', 20, yPos);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos += 12;
    }
    
    // === CALCULATION TRACE ===
    if (results.thevenin && results.thevenin.length > 0) {
        addSectionHeader('Detailed Calculation Trace');
        
        results.thevenin.forEach((th, index) => {
            checkPageBreak(35);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`Bus: ${th.busName}`, 20, yPos);
            yPos += 6;
            doc.setFont('helvetica', 'normal');
            
            doc.text(`System Voltage: ${th.voltage.toFixed(0)} V`, 25, yPos);
            yPos += 5;
            doc.text(`Thevenin Equivalent:`, 25, yPos);
            yPos += 5;
            doc.text(`  R = ${th.r.toFixed(6)} \u03A9`, 30, yPos);
            yPos += 5;
            doc.text(`  X = ${th.x.toFixed(6)} \u03A9`, 30, yPos);
            yPos += 5;
            doc.text(`  Z = ${th.z.toFixed(6)} \u03A9`, 30, yPos);
            yPos += 5;
            doc.text(`  X/R = ${th.xr.toFixed(2)}`, 30, yPos);
            yPos += 5;
            
            // Fault current calculation
            const i3phase = th.voltage / (Math.sqrt(3) * th.z);
            doc.text(`Three-Phase Fault Current: I = V / (\u221A3 \u00D7 Z) = ${th.voltage.toFixed(0)} / ` +
                    `(${Math.sqrt(3).toFixed(3)} \u00D7 ${th.z.toFixed(6)}) = ${(i3phase/1000).toFixed(2)} kA`, 25, yPos);
            yPos += 10;
        });
    }
    
    // === ASSUMPTIONS ===
    if (results.assumptions && results.assumptions.length > 0) {
        addSectionHeader('Calculation Assumptions & Notes');
        
        results.assumptions.forEach((assumption, index) => {
            checkPageBreak(15);
            doc.text(`\u2022 [${assumption.category}] ${assumption.description}`, 20, yPos);
            yPos += 6;
        });
        
        yPos += 6;
    }
    
    // Standard assumptions if not provided
    if (!results.assumptions || results.assumptions.length === 0) {
        addSectionHeader('Standard Assumptions');
        
        const standardAssumptions = [
            'Transformer X/R ratio: 10 (if not specified)',
            'Motor X/R ratio at locked rotor: 15 (typical for induction motors)',
            'Motors modeled as parallel current sources per IEEE 141',
            'Cable temperature correction: 75\u00B0C copper, factor 1.216',
            'Arc flash working distance: 450mm (typical for low voltage equipment)',
            'Arc flash duration: 100ms (6 cycles at 60Hz)',
            'Voltage drop power factor: 0.85 (typical)',
            'Fault types: 3\u03C6 = 100%, L-G = 80%, L-L = 87%, 2L-G = 95%'
        ];
        
        standardAssumptions.forEach(assumption => {
            checkPageBreak(10);
            doc.text(`\u2022 ${assumption}`, 20, yPos);
            yPos += 6;
        });
    }
    
    // === CALCULATION LOG ===
    if (results.calculationLog && results.calculationLog.length > 0) {
        addSectionHeader('Calculation Log');
        
        doc.setFontSize(8);
        results.calculationLog.forEach((entry, index) => {
            checkPageBreak(8);
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            doc.text(`[${timestamp}] ${entry.message}`, 20, yPos);
            yPos += 5;
        });
        doc.setFontSize(10);
        yPos += 6;
    }
    
    // === FOOTER ===
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Generated by PowerSys Pro on ${new Date().toLocaleDateString()}`, 
                 pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
    
    // Save PDF
    const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    return {
        success: true,
        filename: filename,
        pages: pageCount
    };
}

/**
 * Export wrapper for enhanced PDF
 */
async function exportEnhancedPDF() {
    try {
        if (!window.calculationResults) {
            throw new Error('No calculation results available. Please run analysis first.');
        }
        
        if (typeof showToast !== 'undefined') {
            showToast('Generating enhanced PDF report...', 'info');
        }
        
        const projectData = {
            projectName: document.getElementById('projectName')?.value || 'Unnamed Project',
            voltage: parseFloat(document.getElementById('systemVoltage')?.value) || 480,
            frequency: parseFloat(document.getElementById('systemFrequency')?.value) || 60,
            standard: document.getElementById('calcStandard')?.value || 'IEEE'
        };
        
        const result = await generateEnhancedPDF(window.calculationResults, projectData);
        
        if (typeof showToast !== 'undefined') {
            showToast(`PDF generated successfully: ${result.filename}`, 'success');
        }
        
        return result;
        
    } catch (error) {
        if (typeof showToast !== 'undefined') {
            showToast('Error generating PDF: ' + error.message, 'error');
        }
        console.error('PDF generation error:', error);
        throw error;
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateEnhancedPDF,
        exportEnhancedPDF
    };
}
