/**
 * topology_manager.js
 * Topology Management with fromBus/toBus connectivity
 * Manages explicit bus-to-bus connections for components
 */

/**
 * Topology Manager Class
 * Manages system topology with explicit fromBus/toBus connections
 */
class TopologyManager {
    constructor() {
        this.buses = new Map();
        this.connections = [];
        this.components = [];
        this.nextBusId = 1;
    }
    
    /**
     * Add a bus to the topology
     */
    addBus(name, voltage, type = 'load') {
        const id = this.nextBusId++;
        const bus = {
            id: id,
            name: name,
            voltage: voltage,
            type: type,
            components: [],
            connectedBuses: []
        };
        
        this.buses.set(id, bus);
        return bus;
    }
    
    /**
     * Get bus by ID
     */
    getBus(id) {
        return this.buses.get(id);
    }
    
    /**
     * Get bus by name
     */
    getBusByName(name) {
        for (const bus of this.buses.values()) {
            if (bus.name === name) {
                return bus;
            }
        }
        return null;
    }
    
    /**
     * Add component with fromBus/toBus connectivity
     */
    addComponent(component, fromBusId, toBusId) {
        const fromBus = this.getBus(fromBusId);
        const toBus = toBusId ? this.getBus(toBusId) : null;
        
        if (!fromBus) {
            throw new Error(`FromBus ${fromBusId} not found for component ${component.name}`);
        }
        
        const componentWithTopology = {
            ...component,
            fromBus: fromBusId,
            toBus: toBusId,
            fromBusName: fromBus.name,
            toBusName: toBus ? toBus.name : null
        };
        
        this.components.push(componentWithTopology);
        fromBus.components.push(componentWithTopology);
        
        if (toBus) {
            toBus.components.push(componentWithTopology);
            
            // Add connection if not already present
            if (!fromBus.connectedBuses.includes(toBusId)) {
                fromBus.connectedBuses.push(toBusId);
            }
            if (!toBus.connectedBuses.includes(fromBusId)) {
                toBus.connectedBuses.push(fromBusId);
            }
            
            this.connections.push({
                fromBus: fromBusId,
                toBus: toBusId,
                component: componentWithTopology
            });
        }
        
        return componentWithTopology;
    }
    
    /**
     * Build topology from project data
     */
    buildFromProject(projectData) {
        this.reset();
        
        const components = projectData.components || [];
        
        // Create source bus
        const sourceVoltage = projectData.voltage || 13800;
        const sourceBus = this.addBus('Source', sourceVoltage, 'source');
        
        let currentBusId = sourceBus.id;
        let currentVoltage = sourceVoltage;
        
        // Process components and create topology
        components.forEach((component, index) => {
            if (component.type === 'utility') {
                // Utility source stays at source bus
                this.addComponent(component, currentBusId, null);
                
            } else if (component.type === 'transformer') {
                // Create new bus at secondary voltage
                const secondaryVoltage = (component.secondaryV || component.voltage || 480) * 
                    (component.secondaryV ? 1000 : 1); // Convert kV to V if needed
                
                const secondaryBus = this.addBus(
                    component.name || `Bus ${index + 1}`,
                    secondaryVoltage,
                    'load'
                );
                
                // Add transformer connecting buses
                this.addComponent(component, currentBusId, secondaryBus.id);
                
                // Update current bus
                currentBusId = secondaryBus.id;
                currentVoltage = secondaryVoltage;
                
            } else if (component.type === 'cable') {
                // Cable typically doesn't create a new bus, just adds impedance
                // But we can create a bus at the end if needed
                const cableVoltage = component.voltage || currentVoltage;
                
                if (component.toBus) {
                    // Explicit toBus specified
                    let toBus = this.getBusByName(component.toBus);
                    if (!toBus) {
                        toBus = this.addBus(component.toBus, cableVoltage, 'load');
                    }
                    this.addComponent(component, currentBusId, toBus.id);
                    currentBusId = toBus.id;
                } else if (component.createsBus) {
                    // Cable creates a new bus
                    const cableBus = this.addBus(
                        component.name || `Bus ${index + 1}`,
                        cableVoltage,
                        'load'
                    );
                    this.addComponent(component, currentBusId, cableBus.id);
                    currentBusId = cableBus.id;
                } else {
                    // Cable on current bus
                    this.addComponent(component, currentBusId, null);
                }
                
            } else if (component.type === 'generator' || component.type === 'motor' || 
                       component.type === 'motor_load') {
                // Add to current bus
                this.addComponent(component, currentBusId, null);
                
            } else {
                // Other components - add to current bus
                this.addComponent(component, currentBusId, null);
            }
        });
        
        // Build bus system for compatibility
        const busSystem = this.toBusSystem();
        
        return {
            topologyManager: this,
            busSystem: busSystem,
            buses: Array.from(this.buses.values()),
            connections: this.connections,
            components: this.components
        };
    }
    
    /**
     * Get transformer power in MVA with unit enforcement
     * Applies migration heuristic if powerUnit not specified
     */
    getTransformerPowerMVA(transformer) {
        // If powerUnit is explicitly specified, use it
        if (transformer.powerUnit === 'kVA') {
            return transformer.power / 1000;
        } else if (transformer.powerUnit === 'MVA') {
            return transformer.power;
        }
        
        // Migration heuristic: default based on secondary voltage
        const secondaryV = (transformer.secondaryV || 0.48) * 1000; // Convert to V
        const powerUnit = (secondaryV <= 1000) ? 'kVA' : 'MVA';
        
        // Log warning if defaulting
        if (!transformer.hasOwnProperty('_powerUnitWarningLogged')) {
            const powerValue = transformer.power || 1;
            console.warn(`Transformer "${transformer.name || 'Unnamed'}" missing powerUnit field. ` +
                `Defaulting to ${powerUnit} based on secondary voltage ${secondaryV}V. ` +
                `Interpreted as ${powerUnit === 'kVA' ? powerValue + ' kVA' : powerValue + ' MVA'}. ` +
                `Add "powerUnit": "${powerUnit}" to override.`);
            transformer._powerUnitWarningLogged = true;
        }
        
        return powerUnit === 'kVA' ? (transformer.power || 1) / 1000 : (transformer.power || 1);
    }
    
    /**
     * Convert to BusSystem for compatibility
     */
    toBusSystem() {
        const busSystem = new BusSystem();
        
        // Create buses
        const busMap = new Map();
        this.buses.forEach((topoBus, id) => {
            const bus = busSystem.addBus(topoBus.name, topoBus.voltage, topoBus.type);
            busMap.set(id, bus);
            
            // Set bus ID to match
            bus.id = topoBus.id;
        });
        
        // Add components to buses
        this.components.forEach(comp => {
            const fromBus = busMap.get(comp.fromBus);
            if (fromBus) {
                fromBus.addComponent(comp);
                
                // Add impedance to bus if applicable
                if (comp.type === 'cable' && comp.resistance && comp.reactance) {
                    const length = comp.length || 0;
                    const tempFactor = 1.216; // 75°C copper temperature correction
                    fromBus.impedance.r += (comp.resistance * length / 1000) * tempFactor;
                    fromBus.impedance.x += comp.reactance * length / 1000;
                }
                
                if (comp.type === 'utility') {
                    // Calculate utility impedance
                    const voltage = comp.voltage || fromBus.voltage;
                    let zSource = 0;
                    
                    if (comp.faultCurrent) {
                        // ISC in kA
                        const iscKA = comp.faultCurrent;
                        zSource = voltage / (Math.sqrt(3) * iscKA * 1000);
                    } else if (comp.shortCircuitMVA) {
                        // SC MVA
                        zSource = (voltage * voltage) / (comp.shortCircuitMVA * 1e6);
                    }
                    
                    // Guardrail: detect implausibly small Zsource at HV
                    // For common distribution voltages (4-35 kV), Zsource should typically be > 1e-6 Ω
                    if (zSource > 0 && zSource < 1e-6 && voltage >= 4000 && voltage <= 35000) {
                        console.warn(`⚠️ Utility source "${comp.name || 'Unnamed'}" has very small impedance ` +
                            `(${zSource.toExponential(3)} Ω at ${voltage}V). ` +
                            `This may indicate unit confusion. Check if fault current or MVA values are correct.`);
                    }
                    
                    // Split into R and X using X/R ratio
                    const xr = comp.xr || 10;
                    const rSource = zSource / Math.sqrt(1 + xr * xr);
                    const xSource = rSource * xr;
                    
                    fromBus.impedance.r += rSource;
                    fromBus.impedance.x += xSource;
                }
                
                if (comp.type === 'transformer') {
                    // Transformer impedance calculated on secondary side
                    const secondaryV = (comp.secondaryV || 0.48) * 1000;
                    const powerMVA = this.getTransformerPowerMVA(comp);
                    const zBase = (secondaryV * secondaryV) / (powerMVA * 1e6);
                    const zPU = (comp.impedance || 5.75) / 100;
                    const zOhms = zPU * zBase;
                    
                    const xr = comp.rx ? (1 / comp.rx) : 10;
                    const rXfmr = zOhms / Math.sqrt(1 + xr * xr);
                    const xXfmr = rXfmr * xr;
                    
                    // Add to toBus if exists
                    if (comp.toBus) {
                        const toBus = busMap.get(comp.toBus);
                        if (toBus) {
                            toBus.impedance.r += rXfmr;
                            toBus.impedance.x += xXfmr;
                        }
                    }
                }
            }
        });
        
        // Add connections
        this.connections.forEach(conn => {
            const fromBus = busMap.get(conn.fromBus);
            const toBus = busMap.get(conn.toBus);
            
            if (fromBus && toBus) {
                // Calculate impedance for connection
                let impedance = null;
                
                if (conn.component.type === 'cable') {
                    const length = conn.component.length || 0;
                    const tempFactor = 1.216;
                    impedance = {
                        r: (conn.component.resistance * length / 1000) * tempFactor,
                        x: conn.component.reactance * length / 1000
                    };
                } else if (conn.component.type === 'transformer') {
                    const secondaryV = (conn.component.secondaryV || 0.48) * 1000;
                    const powerMVA = this.getTransformerPowerMVA(conn.component);
                    const zBase = (secondaryV * secondaryV) / (powerMVA * 1e6);
                    const zPU = (conn.component.impedance || 5.75) / 100;
                    const zOhms = zPU * zBase;
                    
                    const xr = conn.component.rx ? (1 / conn.component.rx) : 10;
                    const rXfmr = zOhms / Math.sqrt(1 + xr * xr);
                    const xXfmr = rXfmr * xr;
                    
                    impedance = { r: rXfmr, x: xXfmr };
                }
                
                fromBus.addConnection(toBus, impedance);
            }
        });
        
        return busSystem;
    }
    
    /**
     * Validate topology connectivity
     */
    validateTopology() {
        const errors = [];
        const warnings = [];
        
        // Check for isolated buses
        this.buses.forEach((bus, id) => {
            if (bus.type !== 'source' && bus.connectedBuses.length === 0) {
                warnings.push(`Bus ${bus.name} (ID: ${id}) is not connected to any other bus`);
            }
        });
        
        // Check for components without buses
        this.components.forEach((comp, index) => {
            if (!comp.fromBus) {
                errors.push(`Component ${index + 1} (${comp.name || comp.type}) has no fromBus`);
            }
        });
        
        // Check for source bus
        let hasSourceBus = false;
        this.buses.forEach(bus => {
            if (bus.type === 'source') {
                hasSourceBus = true;
            }
        });
        
        if (!hasSourceBus) {
            errors.push('No source bus defined in topology');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
    
    /**
     * Export topology as JSON
     */
    exportTopology() {
        return {
            buses: Array.from(this.buses.values()),
            connections: this.connections,
            components: this.components
        };
    }
    
    /**
     * Reset topology
     */
    reset() {
        this.buses.clear();
        this.connections = [];
        this.components = [];
        this.nextBusId = 1;
    }
    
    /**
     * Get all buses
     */
    getAllBuses() {
        return Array.from(this.buses.values());
    }
    
    /**
     * Get connections for a bus
     */
    getConnectionsForBus(busId) {
        return this.connections.filter(c => c.fromBus === busId || c.toBus === busId);
    }
    
    /**
     * Get path between two buses
     */
    getPathBetweenBuses(fromBusId, toBusId) {
        // BFS to find path
        const visited = new Set();
        const queue = [[fromBusId]];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const currentBusId = path[path.length - 1];
            
            if (currentBusId === toBusId) {
                return path.map(id => this.getBus(id));
            }
            
            if (visited.has(currentBusId)) {
                continue;
            }
            visited.add(currentBusId);
            
            const currentBus = this.getBus(currentBusId);
            if (currentBus) {
                currentBus.connectedBuses.forEach(nextBusId => {
                    if (!visited.has(nextBusId)) {
                        queue.push([...path, nextBusId]);
                    }
                });
            }
        }
        
        return null; // No path found
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TopologyManager
    };
}

// Export to window for browser usage
if (typeof window !== 'undefined') {
    window.TopologyManager = TopologyManager;
}
