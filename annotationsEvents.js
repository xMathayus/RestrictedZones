let globaIDIndex = 0;

anno.on('createAnnotation', async (annotation, overrideId) => {
    overrideId(String(globaIDIndex));
    const zoneName = prompt("Enter a name or comment for this zone:");
    $('#zones').append(CreateInput(zoneName, globaIDIndex));
    globaIDIndex++;
});

anno.on('selectAnnotation', function (annotation) {
    // Allow the user to edit the name/comment for the selected zone
    const currentZoneElement = $(`div[zone-id='${annotation.id}']`);
    const currentName = currentZoneElement.attr('zone-name');
    const newName = prompt("Edit the name or comment for this zone:", currentName);

    if (newName !== null) {
        currentZoneElement.attr('zone-name', newName);
    }
});

anno.on('deleteAnnotation', function (annotation) {
    $(`div[zone-id='${annotation.id}']`).remove();
});

$('.input-overlay').on('click', '.close-button', function () {
    $(this).closest('.input-row').hide();
    anno.cancelSelected();
});

anno.on('cancelSelected', function (annotation) {
    // Removed the code that hides the input box when an annotation is deselected
});

async function updateAnnotations() {
    const selected = anno.getSelected();
    if (selected !== undefined) {
        await anno.updateSelected(selected, true);
    }
}

$('#exportButton').click(function () {
    updateAnnotations().then(() => {
        setTimeout(() => {
            const zones = [];

            document.querySelector('#zones').querySelectorAll('.input-row').forEach(row => {
                const input = {
                    enabled: true,
                    cords: [],
                    name: row.getAttribute('zone-name') || ""
                };

                const annotation = anno.getAnnotationById(row.getAttribute('zone-id'));
                const vectorPoints = annotation.target.selector.value;
                const pointsMatch = vectorPoints.match(/points=['"]([^'"]+)['"]/);

                if (pointsMatch && pointsMatch.length > 1) {
                    const pointsString = pointsMatch[1];
                    const pointsArray = pointsString.split(/\s+/);

                    pointsArray.forEach(point => {
                        const coords = point.split(',');
                        const mappedX = ((parseFloat(coords[0]) / 8192) * 2000 - 1000) * 463 + 157664;
                        const mappedY = ((parseFloat(coords[1]) / 8192) * -2000 + 1000) * 463 - 123467;
                        input.cords.push({ x: mappedX, y: mappedY });
                    });
                }

                zones.push(input);
            });

            let luaString = `return {\n    SafeWorld = false, -- Toggle to prevent players from damaging objects across the whole map\n\n    restrictedZones = {\n`;

            zones.forEach(zone => {
                luaString += `        -- ${zone.name}\n`;
                luaString += `        {\n            enabled = ${zone.enabled}, -- Toggle for this zone\n            cords = {\n`;
                zone.cords.forEach(cord => {
                    luaString += `                { x = ${cord.x}, y = ${cord.y} },\n`;
                });
                luaString += `            }\n        },\n`;
            });

            luaString += `    }\n}`;

            const blob = new Blob([luaString], { type: "application/lua" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'restrictedzones.lua';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 1000);
    }).catch(error => {
        console.error(error);
    });
});

function CreateInput(zoneName, annotationId) {
    const inputRow = $(`
    <div class="input-row row no-gutters" style="display: none;" zone-id="${annotationId}" zone-name="${zoneName}">
        <div class="col-10 d-flex align-items-end"></div>
        <div class="col-2 text-right">
            <button type="button" class="close-button" style="font-size: 25px; background-color: transparent; border: none;">
                <span style="color: white;" aria-hidden="true">&times;</span>
            </button>
        </div>
    </div>
    `);

    return inputRow;
}
