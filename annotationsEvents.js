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
    const allowBuild = $('#allowBuildInput').is(':checked');
    const allowDismantle = $('#allowDismantleInput').is(':checked');
    const allowObjectDamage = $('#allowObjectDamageInput').is(':checked');
    const allowPvP = $('#allowPvPInput').is(':checked');
    const allowPalPvp = $('#allowPalPvpInput').is(':checked');
    const allowNpcDamage = $('#allowNpcDamageInput').is(':checked');
    const allowPlayerDamageToNpc = $('#allowPlayerDamageToNpcInput').is(':checked');
    const allowPalDamageToNpc = $('#allowPalDamageToNpcInput').is(':checked');

    // Assign a default name if no name is provided
    if (!zoneName.trim()) {
        zoneName = `Zone ${currentAnnotationId + 1}`;
    }

    if (editingZoneElement) {
        // Update existing zone
        editingZoneElement.attr('zone-name', zoneName);
        editingZoneElement.find('.zone-name-label').text(zoneName);

        // Update data attributes for the zone
        editingZoneElement.data('allow-build', allowBuild);
        editingZoneElement.data('allow-dismantle', allowDismantle);
        editingZoneElement.data('allow-object-damage', allowObjectDamage);
        editingZoneElement.data('allow-pvp', allowPvP);
        editingZoneElement.data('allow-pal-pvp', allowPalPvp);
        editingZoneElement.data('allow-npc-damage', allowNpcDamage);
        editingZoneElement.data('allow-player-damage-to-npc', allowPlayerDamageToNpc);
        editingZoneElement.data('allow-pal-damage-to-npc', allowPalDamageToNpc);

        editingZoneElement = null; // Reset after editing
    } else {
        // Create new zone with data attributes
        const newZoneElement = CreateInput(zoneName, currentAnnotationId);
        newZoneElement.data('allow-build', allowBuild);
        newZoneElement.data('allow-dismantle', allowDismantle);
        newZoneElement.data('allow-object-damage', allowObjectDamage);
        newZoneElement.data('allow-pvp', allowPvP);
        newZoneElement.data('allow-pal-pvp', allowPalPvp);
        newZoneElement.data('allow-npc-damage', allowNpcDamage);
        newZoneElement.data('allow-player-damage-to-npc', allowPlayerDamageToNpc);
        newZoneElement.data('allow-pal-damage-to-npc', allowPalDamageToNpc);

        $('#zones').append(newZoneElement);
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
    const allowBuild = currentZoneElement.data('allow-build');
    const allowDismantle = currentZoneElement.data('allow-dismantle');
    const allowObjectDamage = currentZoneElement.data('allow-object-damage');
    const allowPvP = currentZoneElement.data('allow-pvp');
    const allowPalPvp = currentZoneElement.data('allow-pal-pvp');
    const allowNpcDamage = currentZoneElement.data('allow-npc-damage');
    const allowPlayerDamageToNpc = currentZoneElement.data('allow-player-damage-to-npc');
    const allowPalDamageToNpc = currentZoneElement.data('allow-pal-damage-to-npc');

    // Populate the modal with the current values
    $('#zoneNameInput').val(currentName);
    $('#allowBuildInput').prop('checked', allowBuild);
    $('#allowDismantleInput').prop('checked', allowDismantle);
    $('#allowObjectDamageInput').prop('checked', allowObjectDamage);
    $('#allowPvPInput').prop('checked', allowPvP);
    $('#allowPalPvpInput').prop('checked', allowPalPvp);
    $('#allowNpcDamageInput').prop('checked', allowNpcDamage);
    $('#allowPlayerDamageToNpcInput').prop('checked', allowPlayerDamageToNpc);
    $('#allowPalDamageToNpcInput').prop('checked', allowPalDamageToNpc);

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
        const allowBuild = row.data('allow-build');
        const allowDismantle = row.data('allow-dismantle');
        const allowObjectDamage = row.data('allow-object-damage');
        const allowPvP = row.data('allow-pvp');
        const allowPalPvp = row.data('allow-pal-pvp');
        const allowNpcDamage = row.data('allow-npc-damage');
        const allowPlayerDamageToNpc = row.data('allow-player-damage-to-npc');
        const allowPalDamageToNpc = row.data('allow-pal-damage-to-npc');
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
                allowBuild: allowBuild,
                allowDismantle: allowDismantle,
                allowObjectDamage: allowObjectDamage,
                allowPvP: allowPvP,
                allowPalPvp: allowPalPvp,
                allowNpcDamage: allowNpcDamage,
                allowPlayerDamageToNpc: allowPlayerDamageToNpc,
                allowPalDamageToNpc: allowPalDamageToNpc,
                cords: cords
            });
        }
    });

    // Build the Lua string
    let luaString = `return {\n    restrictedZones = {\n`;

    zones.forEach(zone => {
        luaString += `        -- ${zone.name}\n`;
        luaString += `        {\n            allowBuild = ${zone.allowBuild},\n`;
        luaString += `            allowDismantle = ${zone.allowDismantle},\n`;
        luaString += `            allowObjectDamage = ${zone.allowObjectDamage},\n`;
        luaString += `            allowPvP = ${zone.allowPvP},\n`;
        luaString += `            allowPalPvp = ${zone.allowPalPvp},\n`;
        luaString += `            allowNpcDamage = ${zone.allowNpcDamage},\n`;
        luaString += `            allowPlayerDamageToNpc = ${zone.allowPlayerDamageToNpc},\n`;
        luaString += `            allowPalDamageToNpc = ${zone.allowPalDamageToNpc},\n`;
        luaString += `            cords = {\n`;
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

function CreateInput(zoneName, annotationId) {
    const inputRow = $(`
    <div class="input-row row no-gutters" zone-id="${annotationId}" zone-name="${zoneName}" style="background-color: rgba(0, 0, 0, 0.7); border: 1px solid #ccc; box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.5); padding: 2px; margin-bottom: 3px;">
        <div class="col-12 d-flex align-items-center">
            <span class="zone-name-label" style="margin-right: 5px; color: white; font-weight: bold; font-size: 18px; cursor: pointer;" data-bs-toggle="tooltip" title="Click to update settings">${zoneName}</span>
        </div>
    </div>
    `);

    return inputRow;
}

// Utility function to hide tooltips on checkbox click
function hideTooltipOnCheckboxClick() {
    $('input[type="checkbox"]').on('click', function () {
        $(this).tooltip('hide'); // Explicitly hide tooltip on click
    });
}

// Initial check when the page loads
$(document).ready(function() {
    // Initialize tooltips with no delay
    $('[data-bs-toggle="tooltip"]').tooltip({
        delay: { show: 100, hide: 0 } // Reduce the show delay to 100ms
    });

    hideTooltipOnCheckboxClick();
    checkZonesForCustomNames(); // Ensure the button is disabled on page load
});
