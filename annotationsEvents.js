let globaIDIndex = 0;
let currentAnnotationId = null;
let editingZoneElement = null;
let pendingExport = false; // To track if an export is pending

// Utility function to check if all zones have custom names
function checkZonesForCustomNames() {
    let allCustomNames = true;
    $('#zones .input-row').each(function () {
        const zoneName = $(this).attr('zone-name');
        if (zoneName.startsWith('Zone ')) {
            allCustomNames = false;
            return false; // Break out of the loop if a default name is found
        }
    });
    // Enable or disable the export button based on the check
    $('#exportButton').prop('disabled', !allCustomNames);
}

anno.on('createAnnotation', async (annotation, overrideId) => {
    overrideId(String(globaIDIndex));
    currentAnnotationId = globaIDIndex;

    // Show the modal to get the zone options (only for initial creation)
    $('#zoneOptionsModal').modal('show');
});

$('#saveZoneOptionsButton').click(function () {
    let zoneName = $('#zoneNameInput').val();
    const allowPvP = $('#allowPvPInput').is(':checked');
    const allowPalPvp = $('#allowPalPvpInput').is(':checked');

    // Assign a default name if no name is provided
    if (!zoneName.trim()) {
        zoneName = `Zone ${currentAnnotationId + 1}`;
    }

    if (editingZoneElement) {
        // Update existing zone
        editingZoneElement.attr('zone-name', zoneName);
        editingZoneElement.find('.zone-name-label').text(zoneName);
        editingZoneElement.find('.allow-pvp-checkbox').prop('checked', allowPvP);
        editingZoneElement.find('.allow-pal-pvp-checkbox').prop('checked', allowPalPvp);

        editingZoneElement = null; // Reset after editing
    } else {
        // Create new zone (enabled by default)
        $('#zones').append(CreateInput(zoneName, currentAnnotationId, allowPvP, allowPalPvp));
        globaIDIndex++;
    }

    $('#zoneOptionsModal').modal('hide');

    // Check if all zones have custom names and update the export button state
    checkZonesForCustomNames();

    // If an export was pending, trigger the export process now
    if (pendingExport) {
        pendingExport = false;
        $('#exportButton').trigger('click');
    }
});

anno.on('selectAnnotation', function (annotation) {
    // Select the zone for possible editing in the side panel
    editingZoneElement = $(`div[zone-id='${annotation.id}']`);
});

anno.on('deleteAnnotation', function (annotation) {
    $(`div[zone-id='${annotation.id}']`).remove();
    checkZonesForCustomNames(); // Recheck after deletion
});

$('.input-overlay').on('click', '.zone-name-label', function () {
    const zoneNameLabel = $(this);
    const currentZoneElement = zoneNameLabel.closest('.input-row');

    // Get current zone values
    const currentName = currentZoneElement.attr('zone-name');
    const allowPvP = currentZoneElement.find('.allow-pvp-checkbox').is(':checked');
    const allowPalPvp = currentZoneElement.find('.allow-pal-pvp-checkbox').is(':checked');

    // Populate the modal with the current values
    $('#zoneNameInput').val(currentName);
    $('#allowPvPInput').prop('checked', allowPvP);
    $('#allowPalPvpInput').prop('checked', allowPalPvp);

    // Set the editing element
    editingZoneElement = currentZoneElement;

    // Show the modal to edit the zone options
    $('#zoneOptionsModal').modal('show');
});

$('#exportButton').click(function () {
    const zones = [];

    $('#zones .input-row').each(function () {
        const row = $(this);
        const zoneId = row.attr('zone-id');
        const zoneName = row.attr('zone-name');
        const allowPvP = row.find('.allow-pvp-checkbox').is(':checked');
        const allowPalPvp = row.find('.allow-pal-pvp-checkbox').is(':checked');
        const cords = [];

        // Get the annotation associated with this zone
        const annotation = anno.getAnnotationById(zoneId);
        if (annotation) {
            const vectorPoints = annotation.target.selector.value;
            const pointsMatch = vectorPoints.match(/points=['"]([^'"]+)['"]/);

            if (pointsMatch && pointsMatch.length > 1) {
                const pointsString = pointsMatch[1];
                const pointsArray = pointsString.split(/\s+/);

                pointsArray.forEach(point => {
                    const coords = point.split(',');
                    const mappedX = ((parseFloat(coords[0]) / 8192) * 2000 - 1000) * 463 + 157664;
                    const mappedY = ((parseFloat(coords[1]) / 8192) * -2000 + 1000) * 463 - 123467;
                    cords.push({ x: mappedX, y: mappedY });
                });
            }
        }

        // Only add the zone if it has valid coordinates
        if (cords.length > 0) {
            zones.push({
                name: zoneName,
                enabled: true, // All zones are enabled by default
                allowPvP: allowPvP,
                allowPalPvp: allowPalPvp,
                cords: cords
            });
        }
    });

    // Build the Lua string
    let luaString = `return {\n    SafeWorld = false, -- Toggle to prevent players from damaging objects across the whole map\n\n    restrictedZones = {\n`;

    zones.forEach(zone => {
        luaString += `        -- ${zone.name}\n`;
        luaString += `        {\n            enabled = true, -- Zone is always enabled\n            allowPvP = ${zone.allowPvP}, -- Toggle for allowing PvP damage\n            allowPalPvp = ${zone.allowPalPvp}, -- Toggle for player-controlled NPCs\n            cords = {\n`;
        zone.cords.forEach(cord => {
            luaString += `                { x = ${cord.x}, y = ${cord.y} },\n`;
        });
        luaString += `            }\n        },\n`;
    });

    luaString += `    }\n}`;

    // Create a Blob and trigger download
    const blob = new Blob([luaString], { type: "application/lua" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restrictedzones.lua';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

function CreateInput(zoneName, annotationId, allowPvP, allowPalPvp) {
    const inputRow = $(`
    <div class="input-row row no-gutters" zone-id="${annotationId}" zone-name="${zoneName}" style="background-color: rgba(0, 0, 0, 0.7); border: 1px solid #ccc; box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.5); padding: 2px; margin-bottom: 3px;">
        <div class="col-12 d-flex align-items-center">
            <span class="zone-name-label" style="margin-right: 5px; color: white; font-weight: bold; font-size: 18px; cursor: pointer;">${zoneName}</span>
            <input type="checkbox" class="allow-pvp-checkbox" ${allowPvP ? 'checked' : ''} title="Allow PvP" style="margin-left: 5px; margin-right: 3px;"> <span style="color: white; font-size: 16px;">Allow PvP</span>
            <input type="checkbox" class="allow-pal-pvp-checkbox" ${allowPalPvp ? 'checked' : ''} title="Allow Pal PvP" style="margin-left: 5px; margin-right: 3px;"> <span style="color: white; font-size: 16px;">Allow Pal PvP</span>
        </div>
    </div>
    `);

    return inputRow;
}

// Initial check when the page loads
$(document).ready(function() {
    checkZonesForCustomNames();
});
