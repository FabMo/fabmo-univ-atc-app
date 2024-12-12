var fabmo = new FabMoDashboard();
let bitOptions = [];
let atc;


document.addEventListener('DOMContentLoaded', () => {
    console.log("Page is loaded, running ATC setup");
    fabmo.runSBP('\n C70 \n'); // load atc settings 
    fabmo.runSBP('\n C75 \n'); // check atc status
  });


// ATC Tool Changer Subcomponent
class ATCToolChanger {
    constructor(toolSlots) {
        this.toolSlots = toolSlots;
        this.currentTool = null;
        this.tools = Array(toolSlots).fill({ type: "No tool", size: "Medium", h: null });
        this.offBarTools = []; // Off Bar Tools storage
    }

    loadTools(toolData) {
        toolData.forEach((tool, i) => {
            if (i < this.toolSlots) {
                this.tools[i] = {
                    type: tool?.type || "No tool",
                    size: tool?.size || "No Size Saved",
                    h: tool?.h || null
                };
            } else {
                this.offBarTools.push({
                    type: tool?.type || "No tool",
                    size: tool?.size || "No Size Saved",
                    h: tool?.h || null
                });
            }
        });

        // Fill empty slots if `toolData` has fewer tools
        for (let i = toolData.length; i < this.toolSlots; i++) {
            this.tools[i] = { type: "No tool", size: "Medium", h: null }; // Default for unused slots
        }
    }

    changeTool(targetSlot) {
        if (targetSlot >= 0 && targetSlot < this.toolSlots) {
            console.log(`Changing from Tool ${this.currentTool} to Tool ${targetSlot}`);
            fabmo.runSBP(`&Tool=${targetSlot + 1}\nC71\n`);
            
            if (this.tools[targetSlot].h === undefined) {
                fabmo.runSBP('\nC72\n');
                this.tools[targetSlot].h = fabmo.requestStatus('posz');
            }
            
            this.currentTool = targetSlot;
    
            // Update the display to reflect the new current tool
            displayCurrentTool();
        } else {
            console.error("Invalid tool slot selected.");
        }
    }
    

    getCurrentTool() {
        if (this.currentTool === null || !this.tools[this.currentTool]) {
            return "No tool is currently loaded.";
        }
        const tool = this.tools[this.currentTool];
        return `Current Tool: Slot ${this.currentTool + 1} - ${tool.type} (${tool.size}) Bit Length: ${tool.h || "Unknown"}`;
    }
}

// Fetch bit information and load configuration
fetch('bit_information.json')
    .then(response => response.json())
    .then(data => {
        bitOptions = data.bitTypes || ["No tool"];
        loadATCConfiguration();
    })
    .catch(error => {
        console.error('Error fetching bit information:', error);
    });

// Function to fetch ATC configuration from opensbp.json and initialize the tool changer
function loadATCConfiguration() {
    fabmo.getConfig((err, data) => {
        if (err) {
            console.error("Error loading configuration:", err);
            return;
        }

        const toolSlots = Number(data.opensbp.variables.ATC.NUMCLIPS);
        atc = new ATCToolChanger(toolSlots);

        // Load tools from configuration
        const toolData = Object.values(data.opensbp.variables.TOOLS || {});
        atc.loadTools(toolData);

        atc.currentTool = (data.opensbp.variables.ATC.TOOLIN || 1) - 1;

        // Display tools and current tool
        displayToolList();
        displayOffBarTools();
        displayCurrentTool();
    });
}

// Display the list of ATC Tools
function displayToolList() {
    const toolListOutput = document.getElementById("tool-list-output");
    if (!toolListOutput) {
        console.error('Tool List container not found.');
        return;
    }
    toolListOutput.innerHTML = '';
    atc.tools.forEach((tool, index) => {
        if (tool) {
            const toolRow = createToolRow(tool, index, false);
            toolListOutput.appendChild(toolRow);
        } else {
            console.warn(`Tool slot ${index + 1} is undefined.`);
        }
    });
}

// Display the Off Bar Tools
function displayOffBarTools() {
    const offBarToolsOutput = document.getElementById("off-bar-tools-output");
    if (!offBarToolsOutput) {
        console.error('Off-Bar Tools container not found.');
        return;
    }
    offBarToolsOutput.innerHTML = '';
    atc.offBarTools.forEach((tool, index) => {
        if (tool) {
            const toolRow = createToolRow(tool, index, true);
            offBarToolsOutput.appendChild(toolRow);
        } else {
            console.warn(`Off-Bar Tool slot ${index + 1} is undefined.`);
        }
    });
}
function displayCurrentTool() {
    const currentToolText = atc.getCurrentTool();
    document.getElementById("current-tool").textContent = currentToolText;
    document.getElementById("current-tool-display").textContent = currentToolText;
}

// Helper function to create tool row
function createToolRow(tool, index, isOffBar = false) {
    const toolRow = document.createElement("div");
    toolRow.className = "tool-row";

    // Tool Change Button
    const toolButton = document.createElement("button");
    toolButton.className = "tool-slot-button";
    toolButton.textContent = `${isOffBar ? 'Off-Bar Tool' : 'Slot'} ${isOffBar ? atc.toolSlots + index + 1 : index + 1}`;
    toolButton.addEventListener('click', () => {
        if (isOffBar) {
            changeOffBarTool(index);
        } else {
            atc.changeTool(index);
            displayCurrentTool();
        }
    });

    // Tool Select Dropdown
    const toolSelect = document.createElement("select");
    toolSelect.className = "tool-select";
    toolSelect.innerHTML = bitOptions.map(option =>
        `<option value="${option}" ${tool.type === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    toolSelect.addEventListener('change', (event) => updateToolAttribute(index, 'type', event.target.value, isOffBar));

    // Tool Size Input
    const toolInput = document.createElement("input");
    toolInput.type = "text";
    toolInput.className = "tool-size-input";
    toolInput.value = tool.size || "No Size Saved";
    toolInput.addEventListener('change', (event) => updateToolAttribute(index, 'size', event.target.value, isOffBar));

    // Measure Tool Button
    const measureToolButton = document.createElement("button");
    measureToolButton.className = "measure-tool-button";
    measureToolButton.textContent = "Measure Tool";
    measureToolButton.addEventListener('click', () => {
        fabmo.runSBP(`\n&tool=${index + 1}\nC72\n`);
        console.log(`Measuring Tool in ${isOffBar ? 'Off-Bar' : 'Slot'} ${index + 1}`);
    });

    toolRow.append(toolButton, toolSelect, toolInput, measureToolButton);
    return toolRow;
}

// Update a tool attribute for ATC Tools
function updateToolAttribute(slotIndex, attribute, newValue, isOffBar = false) {
    const toolList = isOffBar ? atc.offBarTools : atc.tools;
    toolList[slotIndex][attribute] = newValue;
    updateCurrentToolInConfig(atc.currentTool);
}

// Change Off Bar Tool
function changeOffBarTool(slotIndex) {
    if (atc && slotIndex >= 0 && slotIndex < atc.offBarTools.length) {
        console.log(`Changing to Off Bar Tool ${slotIndex + atc.toolSlots + 1}`);
    } else {
        alert("Invalid tool slot number. Please select a valid off-bar tool.");
    }
}

// Update the current tool in the configuration
function updateCurrentToolInConfig(currentTool) {
    fetch('config/opensbp.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ATC: { NUMCLIPS: atc.toolSlots, TOOLIN: currentTool + 1, STATUS: atc.currentTool ? "OK" : "NOT ATTACHED" },
            TOOLS: Object.assign({}, ...[...atc.tools, ...atc.offBarTools].map((tool, i) => ({ [i]: tool })))
        })
    })
    .then(response => response.ok ? console.log('Configuration updated successfully') : Promise.reject('Error updating configuration'))
    .catch(error => console.error('Error updating configuration:', error));
}

// Event listeners for control buttons
document.addEventListener("DOMContentLoaded", () => {
    // Button functionality
    const buttonActions = {
        "C2-Zero": () => fabmo.runSBP('C2'),
        "C3-Home": () => fabmo.runSBP('C3'),
        "C72-Measure-all-Tools": () => fabmo.runSBP('C72'),
        "C73-Get-plate-offset": () => fabmo.runSBP('C73'),
        "C74-Calibrate": () => fabmo.runSBP('C74')
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
        const button = document.getElementById(id);
        if (button) button.addEventListener("click", action);
    });
    
});

document.addEventListener('DOMContentLoaded', () => {
    const settingsPane = document.getElementById('settings-pane');
    const backdrop = document.querySelector('.backdrop');
    const closeButton = document.querySelector('.settings-pane .close-button');
    const settingsButton = document.getElementById('settings-button');

    function openSettingsPane() {
        settingsPane.classList.add('show');
        settingsPane.classList.remove('hidden');
        backdrop.classList.add('show');
        backdrop.classList.remove('hidden');
    }

    function closeSettingsPane() {
        settingsPane.classList.remove('show');
        settingsPane.classList.add('hidden');
        backdrop.classList.remove('show');
        backdrop.classList.add('hidden');
    }

    settingsButton.addEventListener('click', openSettingsPane);
    closeButton.addEventListener('click', closeSettingsPane);
    backdrop.addEventListener('click', closeSettingsPane);
});

// Function to remove the current tool
function removeCurrentTool() {
    if (atc.currentTool === null) {
        alert("No tool is currently loaded.");
        return;
    }
    
    const toolSlot = atc.currentTool;
    atc.tools[toolSlot] = { type: "No tool", size: "Medium", h: null }; // Reset the slot
    
    atc.currentTool = null; // Reset the current tool
    displayToolList(); // Update the tool list display
    displayCurrentTool(); // Update the current tool display
    console.log(`Tool removed from Slot ${toolSlot + 1}`);
}

document.addEventListener("DOMContentLoaded", () => {
    const removeToolButton = document.getElementById("remove-tool");
    if (removeToolButton) {
        removeToolButton.addEventListener("click", removeCurrentTool);
    }
});
