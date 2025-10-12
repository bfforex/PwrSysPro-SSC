/**
 * bus_model.js
 * Bus modeling and connection logic for power system analysis
 * Supports multi-voltage level systems
 */

/**
 * Bus class for power system modeling
 */
class Bus {
    constructor(id, name, voltage, type = 'load') {
        this.id = id;
        this.name = name;
        this.voltage = voltage; // Nominal voltage in V
        this.type = type; // 'source', 'load', 'junction'
        this.connections = []; // Connected buses
        this.components = []; // Components connected to this bus
        this.impedance = { r: 0, x: 0 }; // Bus impedance
        this.faultCurrent = null; // Calculated fault current
    }
    
    /**
     * Add a connection to another bus
     */
    addConnection(bus, impedance = null) {
        this.connections.push({
            bus: bus,
            impedance: impedance
        });
    }
    
    /**
     * Add a component to this bus
     */
    addComponent(component) {
        this.components.push(component);
    }
    
    /**
     * Calculate total impedance seen from this bus
     */
    calculateTotalImpedance() {
        let totalR = this.impedance.r;
        let totalX = this.impedance.x;
        
        // Add impedances from all components
        this.components.forEach(comp => {
            if (comp.impedance) {
                totalR += comp.impedance.r;
                totalX += comp.impedance.x;
            }
        });
        
        return {
            r: totalR,
            x: totalX,
            magnitude: Math.sqrt(totalR * totalR + totalX * totalX)
        };
    }
    
    /**
     * Calculate fault current at this bus
     */
    calculateFaultCurrent(sourceVoltage = null) {
        const voltage = sourceVoltage || this.voltage;
        const impedance = this.calculateTotalImpedance();
        
        // Three-phase fault current: I = V / (√3 × Z)
        const faultCurrent = voltage / (Math.sqrt(3) * impedance.magnitude);
        this.faultCurrent = faultCurrent;
        
        return faultCurrent;
    }
}

/**
 * Bus System Manager
 */
class BusSystem {
    constructor() {
        this.buses = new Map();
        this.nextBusId = 1;
    }
    
    /**
     * Add a new bus to the system
     */
    addBus(name, voltage, type = 'load') {
        const id = this.nextBusId++;
        const bus = new Bus(id, name, voltage, type);
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
     * Remove bus from system
     */
    removeBus(id) {
        // Remove connections to this bus from other buses
        this.buses.forEach(bus => {
            bus.connections = bus.connections.filter(conn => conn.bus.id !== id);
        });
        
        this.buses.delete(id);
    }
    
    /**
     * Connect two buses
     */
    connectBuses(bus1Id, bus2Id, impedance = null) {
        const bus1 = this.getBus(bus1Id);
        const bus2 = this.getBus(bus2Id);
        
        if (!bus1 || !bus2) {
            throw new Error('One or both buses not found');
        }
        
        bus1.addConnection(bus2, impedance);
        bus2.addConnection(bus1, impedance);
    }
    
    /**
     * Get all buses
     */
    getAllBuses() {
        return Array.from(this.buses.values());
    }
    
    /**
     * Get buses by voltage level
     */
    getBusesByVoltage(minVoltage, maxVoltage) {
        return this.getAllBuses().filter(bus => 
            bus.voltage >= minVoltage && bus.voltage <= maxVoltage
        );
    }
    
    /**
     * Calculate system-wide fault currents
     */
    calculateSystemFaultCurrents() {
        const results = [];
        
        this.buses.forEach(bus => {
            const faultCurrent = bus.calculateFaultCurrent();
            results.push({
                busId: bus.id,
                busName: bus.name,
                voltage: bus.voltage,
                faultCurrent: faultCurrent,
                impedance: bus.calculateTotalImpedance()
            });
        });
        
        return results;
    }
    
    /**
     * Export system configuration
     */
    exportConfiguration() {
        const config = {
            buses: [],
            connections: []
        };
        
        this.buses.forEach(bus => {
            config.buses.push({
                id: bus.id,
                name: bus.name,
                voltage: bus.voltage,
                type: bus.type,
                components: bus.components.length
            });
            
            bus.connections.forEach(conn => {
                // Only add connection once (from lower ID to higher ID)
                if (bus.id < conn.bus.id) {
                    config.connections.push({
                        from: bus.id,
                        to: conn.bus.id,
                        impedance: conn.impedance
                    });
                }
            });
        });
        
        return config;
    }
}

/**
 * Create bus from component data
 */
function createBusFromComponent(component, busSystem) {
    const voltage = component.voltage || component.secondaryV || component.primaryV || 400;
    const busName = component.name || `Bus ${busSystem.nextBusId}`;
    
    const bus = busSystem.addBus(busName, voltage, 'load');
    bus.addComponent(component);
    
    return bus;
}

/**
 * Build bus model from component list
 */
function buildBusModelFromComponents(components) {
    const busSystem = new BusSystem();
    
    // Create source bus
    const sourceBus = busSystem.addBus('Source', components[0]?.voltage || 13800, 'source');
    
    let currentBus = sourceBus;
    
    // Add components and create buses
    components.forEach((component, index) => {
        if (component.type === 'transformer') {
            // Create a new bus at secondary voltage
            const newBus = busSystem.addBus(
                `Bus ${index + 1}`,
                component.secondaryV * 1000, // Convert to V
                'load'
            );
            
            // Add transformer as component
            newBus.addComponent(component);
            
            // Connect to previous bus with transformer impedance
            const zBase = (component.secondaryV * component.secondaryV * 1000) / (component.power * 1e6);
            const zOhm = zBase * component.impedance / 100;
            const xrRatio = component.rx || 10;
            const r = zOhm / Math.sqrt(1 + xrRatio * xrRatio);
            const x = r * xrRatio;
            
            busSystem.connectBuses(currentBus.id, newBus.id, { r, x });
            currentBus = newBus;
        } else if (component.type === 'cable') {
            // Add cable impedance to current bus
            const r = component.resistance * component.length / 1000;
            const x = component.reactance * component.length / 1000;
            currentBus.impedance.r += r;
            currentBus.impedance.x += x;
            currentBus.addComponent(component);
        } else {
            // Other components
            currentBus.addComponent(component);
        }
    });
    
    return busSystem;
}

// Export classes and functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Bus,
        BusSystem,
        createBusFromComponent,
        buildBusModelFromComponents
    };
}
