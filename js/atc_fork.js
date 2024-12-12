var fabmo = new FabMoDashboard();
// ATC Tool Changer Subcomponent
class ATCToolChanger {
    constructor(toolSlots) {
        this.toolSlots = toolSlots;
        this.currentTool = null;
        this.tools = Array(toolSlots).fill({ type: "No tool", size: "Medium" });
        this.offBarTools = []; // Off Bar Tools storage
    }

    loadTools(toolData) {
        toolData.forEach((tool, i) => {
            if (i < this.toolSlots) {
                this.tools[i] = {
                    type: tool.type || "No tool",
                    size: tool.size || "No Size Saved"
                };
            } else {
                this.offBarTools.push({
                    type: tool.type || "No tool",
                    size: tool.size || "No Size Saved"
                });
            }
        });
    }

    changeTool(targetSlot) {
        if (targetSlot >= 0 && targetSlot < this.toolSlots) {
            console.log(`Changing from Tool ${this.currentTool} to Tool ${targetSlot}`);
            fabmo.runSBP('&Tool=' + targetSlot + '\nC71\n');
            if (this.tools.h === undefined) {
                fabmo.runSBP('\nC72\n');
                this.tools.h = fabmo.requestStatus('posz');
            }
            this.currentTool = targetSlot;
        } else {
            console.error("Invalid tool slot selected.");
        }
    }

    getCurrentTool() {
        return this.currentTool !== null
            ? `Current Tool: Slot ${this.currentTool + 1} - ${this.tools[this.currentTool].type} (${this.tools[this.currentTool].size}) Bit Length: ${this.tools[this.currentTool].h}`
            : "No tool is currently loaded.";
    }
}

let atc;
let bitOptions = [];
let sizeOptions = ["Small", "Medium", "Large"];

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

        // Get the number of tool slots
        const toolSlots = Number(data.opensbp.variables.ATC.NUMCLIPS);
        atc = new ATCToolChanger(toolSlots);

        // Load all tools from opensbp.json
        const toolData = Object.values(data.opensbp.variables.TOOLS || {});
        atc.loadTools(toolData);

        // Set the current tool
        atc.currentTool = data.opensbp.variables.ATC.TOOLIN - 1;

        // Display the initial tool list and current tool
        displayToolList();
        displayCurrentTool();
        displayOffBarTools();
    });
}

// Display the current tool
function displayCurrentTool() {
    document.getElementById("current-tool").textContent = atc.getCurrentTool();
}

// Display the list of ATC Tools
function displayToolList() {
    const toolListOutput = document.getElementById("tool-list-output");
    toolListOutput.innerHTML = '';
    atc.tools.forEach((tool, index) => {
        const toolRow = document.createElement("div");
        toolRow.className = "tool-row";

        const toolButton = document.createElement("button");
        toolButton.className = "tool-slot-button";
        toolButton.textContent = `Slot ${index + 1}`;
        toolButton.addEventListener('click', () => changeTool(index));

        const toolSelect = document.createElement("select");
        toolSelect.className = "tool-select";
        toolSelect.innerHTML = bitOptions.map(option =>
            `<option value="${option}" ${tool.type === option ? 'selected' : ''}>${option}</option>`
        ).join('');
        toolSelect.addEventListener('change', (event) => updateToolAttribute(index, 'type', event.target.value));

        const toolInput = document.createElement("input");
        toolInput.type = "text";
        toolInput.className = "tool-size-input";
        toolInput.value = tool.size || "No Size Saved";
        toolInput.addEventListener('change', (event) => updateToolAttribute(index, 'size', event.target.value));

        toolRow.appendChild(toolButton);
        toolRow.appendChild(toolSelect);
        toolRow.appendChild(toolInput);

        toolListOutput.appendChild(toolRow);
    });
}

// Display the Off Bar Tools
function displayOffBarTools() {
    const offBarToolsOutput = document.getElementById("off-bar-tools-output");
    offBarToolsOutput.innerHTML = '';

    atc.offBarTools.forEach((tool, index) => {
        const toolRow = document.createElement("div");
        toolRow.className = "tool-row";

        const toolButton = document.createElement("button");
        toolButton.className = "tool-slot-button";
        toolButton.textContent = `Off-Bar Tool ${index + atc.toolSlots + 1}`;
        toolButton.addEventListener('click', () => changeOffBarTool(index));

        const toolSelect = document.createElement("select");
        toolSelect.className = "tool-select";
        toolSelect.innerHTML = bitOptions.map(option =>
            `<option value="${option}" ${tool.type === option ? 'selected' : ''}>${option}</option>`
        ).join('');
        toolSelect.addEventListener('change', (event) => updateOffBarToolAttribute(index, 'type', event.target.value));

        const toolInput = document.createElement("input");
        toolInput.type = "text";
        toolInput.className = "tool-size-input";
        toolInput.value = tool.size || "No Size Saved";
        toolInput.addEventListener('change', (event) => updateOffBarToolAttribute(index, 'size', event.target.value));

        toolRow.appendChild(toolButton);
        toolRow.appendChild(toolSelect);
        toolRow.appendChild(toolInput);

        offBarToolsOutput.appendChild(toolRow);
    });
}

// Update a tool attribute for ATC Tools
function updateToolAttribute(slotIndex, attribute, newValue) {
    atc.tools[slotIndex][attribute] = newValue;
    updateCurrentToolInConfig(atc.currentTool);
}

// Update a tool attribute for Off Bar Tools
function updateOffBarToolAttribute(slotIndex, attribute, newValue) {
    atc.offBarTools[slotIndex][attribute] = newValue;
    console.log(`Updated Off Bar Tool ${slotIndex + atc.toolSlots + 1} - ${attribute}: ${newValue}`);
}

// Change Tool in the ATC Tools
function changeTool(slotIndex) {
    if (atc && slotIndex >= 0 && slotIndex < atc.tools.length) {
        atc.changeTool(slotIndex);
        displayCurrentTool();
        updateCurrentToolInConfig(slotIndex);
    } else {
        alert("Invalid tool slot number. Please select a valid slot.");
    }
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
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ATC: {
                NUMCLIPS: atc.toolSlots,
                TOOLIN: currentTool + 1,
                STATUS: atc.currentTool ? "OK" : "NOT ATTACHED"
            },
            TOOLS: Object.assign({}, ...[...atc.tools, ...atc.offBarTools].map((tool, i) => ({ [i]: tool })))
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error updating configuration');
        }
        console.log('Configuration updated successfully');
    })
    .catch(error => console.error('Error updating configuration:', error));
}
