/**
 * ppe_selection.js
 * NFPA 70E-2024 PPE Category Determination and Selection
 * Maps incident energy to appropriate PPE requirements
 */

/**
 * NFPA 70E-2024 PPE Categories
 */
const NFPA_70E_2024_PPE_CATEGORIES = {
    0: {
        name: 'PPE Category 0',
        arcRating: 0,
        incidentEnergyMin: 0,
        incidentEnergyMax: 1.2, // cal/cm²
        requirements: {
            arcRatedShirt: false,
            arcRatedPants: false,
            arcFlashSuit: false,
            arcRatedHood: false,
            safetyGlasses: true,
            hearingProtection: true,
            leatherGloves: false,
            arcRatedGloves: false
        },
        description: 'Non-melting or untreated natural fiber clothing',
        color: '#10b981'
    },
    1: {
        name: 'PPE Category 1',
        arcRating: 4,
        incidentEnergyMin: 1.2,
        incidentEnergyMax: 4, // cal/cm²
        requirements: {
            arcRatedShirt: true,
            arcRatedPants: true,
            arcFlashSuit: false,
            arcRatedHood: false,
            safetyGlasses: true,
            hearingProtection: true,
            leatherGloves: true,
            arcRatedGloves: false
        },
        description: 'Arc-rated shirt and pants or arc-rated coverall (minimum 4 cal/cm²)',
        color: '#3b82f6'
    },
    2: {
        name: 'PPE Category 2',
        arcRating: 8,
        incidentEnergyMin: 4,
        incidentEnergyMax: 8, // cal/cm²
        requirements: {
            arcRatedShirt: true,
            arcRatedPants: true,
            arcFlashSuit: false,
            arcRatedHood: true,
            safetyGlasses: true,
            hearingProtection: true,
            leatherGloves: true,
            arcRatedGloves: true
        },
        description: 'Arc-rated shirt, pants and arc-rated hood (minimum 8 cal/cm²)',
        color: '#f59e0b'
    },
    3: {
        name: 'PPE Category 3',
        arcRating: 25,
        incidentEnergyMin: 8,
        incidentEnergyMax: 25, // cal/cm²
        requirements: {
            arcRatedShirt: true,
            arcRatedPants: true,
            arcFlashSuit: false,
            arcRatedHood: true,
            safetyGlasses: true,
            hearingProtection: true,
            leatherGloves: true,
            arcRatedGloves: true
        },
        description: 'Arc-rated shirt, pants and arc-rated suit (minimum 25 cal/cm²)',
        color: '#f97316'
    },
    4: {
        name: 'PPE Category 4',
        arcRating: 40,
        incidentEnergyMin: 25,
        incidentEnergyMax: 40, // cal/cm²
        requirements: {
            arcRatedShirt: true,
            arcRatedPants: true,
            arcFlashSuit: true,
            arcRatedHood: true,
            safetyGlasses: true,
            hearingProtection: true,
            leatherGloves: true,
            arcRatedGloves: true
        },
        description: 'Arc-rated shirt, pants and multi-layer arc flash suit (minimum 40 cal/cm²)',
        color: '#dc2626'
    }
};

/**
 * Determine PPE category based on incident energy
 */
function getPPECategory(incidentEnergyCalCm2) {
    // Check each category
    for (let category = 0; category <= 4; category++) {
        const ppeCategory = NFPA_70E_2024_PPE_CATEGORIES[category];
        if (incidentEnergyCalCm2 >= ppeCategory.incidentEnergyMin && 
            incidentEnergyCalCm2 < ppeCategory.incidentEnergyMax) {
            return category;
        }
    }
    
    // If incident energy exceeds Category 4, still return 4 but with warning
    if (incidentEnergyCalCm2 >= 40) {
        return 4;
    }
    
    return 0; // Default to Category 0
}

/**
 * Get PPE requirements for a specific category
 */
function getPPERequirements(category) {
    if (category < 0 || category > 4) {
        category = 0;
    }
    
    return NFPA_70E_2024_PPE_CATEGORIES[category];
}

/**
 * Get detailed PPE recommendations
 */
function getDetailedPPERecommendations(incidentEnergyCalCm2) {
    const category = getPPECategory(incidentEnergyCalCm2);
    const requirements = getPPERequirements(category);
    
    const recommendations = {
        category: category,
        categoryName: requirements.name,
        arcRating: requirements.arcRating,
        incidentEnergy: incidentEnergyCalCm2,
        color: requirements.color,
        description: requirements.description,
        equipment: []
    };
    
    // Build equipment list
    if (requirements.requirements.arcRatedShirt) {
        recommendations.equipment.push({
            item: 'Arc-Rated Shirt',
            rating: `${requirements.arcRating} cal/cm² minimum`,
            required: true
        });
    }
    
    if (requirements.requirements.arcRatedPants) {
        recommendations.equipment.push({
            item: 'Arc-Rated Pants',
            rating: `${requirements.arcRating} cal/cm² minimum`,
            required: true
        });
    }
    
    if (requirements.requirements.arcFlashSuit) {
        recommendations.equipment.push({
            item: 'Arc Flash Suit',
            rating: `${requirements.arcRating} cal/cm² minimum`,
            required: true
        });
    }
    
    if (requirements.requirements.arcRatedHood) {
        recommendations.equipment.push({
            item: 'Arc-Rated Hood',
            rating: `${requirements.arcRating} cal/cm² minimum`,
            required: true
        });
    }
    
    if (requirements.requirements.safetyGlasses) {
        recommendations.equipment.push({
            item: 'Safety Glasses or Safety Goggles',
            rating: 'Standard',
            required: true
        });
    }
    
    if (requirements.requirements.hearingProtection) {
        recommendations.equipment.push({
            item: 'Hearing Protection',
            rating: 'Standard',
            required: true
        });
    }
    
    if (requirements.requirements.leatherGloves) {
        recommendations.equipment.push({
            item: 'Leather Gloves',
            rating: 'Heavy-duty leather',
            required: true
        });
    }
    
    if (requirements.requirements.arcRatedGloves) {
        recommendations.equipment.push({
            item: 'Arc-Rated Gloves',
            rating: `${requirements.arcRating} cal/cm² minimum`,
            required: true
        });
    }
    
    // Add warnings for high incident energy
    if (incidentEnergyCalCm2 > 40) {
        recommendations.warning = `Incident energy (${incidentEnergyCalCm2.toFixed(1)} cal/cm²) exceeds Category 4 maximum. Consider engineering controls to reduce arc flash hazard.`;
    }
    
    return recommendations;
}

/**
 * NFPA 70E Approach Boundaries
 */
function calculateNFPA70EBoundaries(voltage) {
    // Shock protection boundaries in mm
    let limited, restricted, prohibited;
    
    // Based on NFPA 70E-2024 Table 130.4(D)(a)
    if (voltage <= 50) {
        limited = 0;
        restricted = 0;
        prohibited = 0;
    } else if (voltage <= 300) {
        limited = 3050; // 10 ft
        restricted = 305; // 1 ft
        prohibited = 0; // Contact
    } else if (voltage <= 750) {
        limited = 3050; // 10 ft
        restricted = 305; // 1 ft
        prohibited = 0; // Contact
    } else if (voltage <= 15000) {
        limited = 3050;
        restricted = 610; // 2 ft
        prohibited = 305; // 1 ft
    } else if (voltage <= 36000) {
        limited = 3050;
        restricted = 910; // 3 ft
        prohibited = 610; // 2 ft
    } else if (voltage <= 72500) {
        limited = 3660; // 12 ft
        restricted = 1070; // 3 ft 6 in
        prohibited = 760; // 2 ft 6 in
    } else if (voltage <= 121000) {
        limited = 4270; // 14 ft
        restricted = 1220; // 4 ft
        prohibited = 850; // 2 ft 10 in
    } else {
        limited = 4570; // 15 ft
        restricted = 1520; // 5 ft
        prohibited = 1070; // 3 ft 6 in
    }
    
    return {
        limited: limited,
        restricted: restricted,
        prohibited: prohibited,
        unit: 'mm'
    };
}

/**
 * Generate PPE selection report
 */
function generatePPEReport(arcFlashResults) {
    const incidentEnergyCalCm2 = arcFlashResults.incidentEnergyCalCm2 || 
                                  arcFlashResults.incidentEnergy / 4.184;
    
    const ppeRecommendations = getDetailedPPERecommendations(incidentEnergyCalCm2);
    const boundaries = calculateNFPA70EBoundaries(arcFlashResults.voltage);
    
    return {
        arcFlashResults: {
            voltage: arcFlashResults.voltage,
            incidentEnergy: incidentEnergyCalCm2,
            arcFlashBoundary: arcFlashResults.arcFlashBoundary,
            workingDistance: arcFlashResults.workingDistance,
            arcDuration: arcFlashResults.arcDuration
        },
        ppe: ppeRecommendations,
        boundaries: boundaries,
        compliance: {
            standard: 'NFPA 70E-2024',
            applicable: true,
            notes: []
        }
    };
}

/**
 * Validate PPE selection
 */
function validatePPESelection(selectedPPE, requiredCategory) {
    const required = getPPERequirements(requiredCategory);
    const validation = {
        adequate: true,
        missingItems: [],
        warnings: []
    };
    
    // Check if selected PPE meets minimum arc rating
    if (selectedPPE.arcRating < required.arcRating) {
        validation.adequate = false;
        validation.warnings.push(
            `Selected PPE arc rating (${selectedPPE.arcRating} cal/cm²) is below required minimum (${required.arcRating} cal/cm²)`
        );
    }
    
    // Check required items
    for (const [item, isRequired] of Object.entries(required.requirements)) {
        if (isRequired && !selectedPPE.items[item]) {
            validation.adequate = false;
            validation.missingItems.push(item);
        }
    }
    
    return validation;
}

/**
 * Get PPE category color for visual display
 */
function getPPECategoryColor(category) {
    const ppeCategory = NFPA_70E_2024_PPE_CATEGORIES[category];
    return ppeCategory ? ppeCategory.color : '#6b7280';
}

/**
 * Format PPE information for display
 */
function formatPPEDisplay(ppeRecommendations) {
    let html = `
        <div style="background: ${ppeRecommendations.color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0;">${ppeRecommendations.categoryName}</h3>
            <p style="margin: 0; font-size: 14px;">${ppeRecommendations.description}</p>
        </div>
        <div style="margin-bottom: 15px;">
            <strong>Incident Energy:</strong> ${ppeRecommendations.incidentEnergy.toFixed(2)} cal/cm²<br>
            <strong>Required Arc Rating:</strong> ${ppeRecommendations.arcRating} cal/cm² minimum
        </div>
        <h4>Required PPE Equipment:</h4>
        <ul>
    `;
    
    ppeRecommendations.equipment.forEach(item => {
        html += `<li><strong>${item.item}:</strong> ${item.rating}</li>`;
    });
    
    html += '</ul>';
    
    if (ppeRecommendations.warning) {
        html += `
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin-top: 15px;">
                <strong style="color: #dc2626;">⚠️ Warning:</strong><br>
                ${ppeRecommendations.warning}
            </div>
        `;
    }
    
    return html;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NFPA_70E_2024_PPE_CATEGORIES,
        getPPECategory,
        getPPERequirements,
        getDetailedPPERecommendations,
        calculateNFPA70EBoundaries,
        generatePPEReport,
        validatePPESelection,
        getPPECategoryColor,
        formatPPEDisplay
    };
}
