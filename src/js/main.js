import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import "../stylesheets/style.scss";
import exceljs from "exceljs/dist/exceljs.js";

const EXTERNAL_URL = typeof EXTERNAL_URL !== "undefined" ? EXTERNAL_URL : "";
console.log("EXTERNAL_URL:", EXTERNAL_URL);

const devMode = false;

class SeadExcelTranslator {
    constructor() {
        this.data = {};
        this.translatedMatrix = {};
        this.initDropzone();

        $(".worksheet-selector").on("change", (evt) => {
            const parent = $(evt.target).closest(".upload-container");
            const worksheetName = evt.target.value;

            let containerName =parent.attr("id").replace("-container", "");
            let workbook = this.data[containerName].workbook;
            
            this.renderTable(worksheetName, workbook);
        });

        if(devMode) {
            this.autoLoadExampleData();
        }

        // Add the event listener for closing the overlay once
        const overlayBackground = document.querySelector("#overlay-background");
        overlayBackground.addEventListener("click", (event) => {
            if (event.target === overlayBackground) {
                overlayBackground.style.display = "none";
                const overlay = document.querySelector("#overlay");
                overlay.style.display = "none";
            }
        });

        // Add event listener for the export button
        document.querySelector(".export-btn").addEventListener("click", () => {
            this.exportToXLSX();
        });

        $("#overlay-close-btn").on("click", (evt) => {
            this.hideOverlay();
        });
    }

    async exportToXLSX() {
        const workbook = this.data["source-data-upload"].workbook;

        if (!workbook) {
            alert("No workbook loaded to export!");
            return;
        }

        try {
            // Generate the Excel file
            const buffer = await workbook.xlsx.writeBuffer();

            // Create a Blob and trigger download
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "translated_workbook.xlsx";
            a.click();

            // Clean up the URL object
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export workbook:", err);
            alert("Failed to export workbook.");
        }
    }

    autoLoadExampleData() {
        let sourceFileName = "lund_dendro_dataset_20200630_AH_corrections.xlsx";
        fetch("/data/"+sourceFileName)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], sourceFileName);
                this.loadExcel("source-data-upload", file);
            });
    }

    initDropzone() {
        this.sourceDropzone = new Dropzone("div#source-data-upload", {
            url: "/dummy-url",  // No upload URL needed
            maxFilesize: 100,  // MB
            autoProcessQueue: false,  // Prevent automatic upload
            acceptedFiles: ".xlsx,.xls",  // Only accept Excel files
            init: () => {
            }
        });
        this.sourceDropzone.on("addedfile", (file) => {
            this.loadExcel("source-data-upload", file);
        });
    }

    loadExcel(uploadSource, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = new exceljs.Workbook();
    
            workbook.xlsx.load(data).then((workbook) => {
                let selectorEl = $("#" + uploadSource + "-container .worksheet-selector");
                selectorEl.empty();
    
                this.data[uploadSource] = {
                    workbook: workbook
                };
    
                // Initialize the translatedMatrix for each worksheet
                workbook.eachSheet((worksheet) => {
                    this.translatedMatrix[worksheet.name] = {}; // Initialize an empty object for each worksheet
                    selectorEl.append(
                        $("<option>").text(worksheet.name)
                    );
    
                    $("#" + uploadSource + "-container .worksheet-selector-container").css("visibility", "visible");
                });
    
                if (uploadSource === "source-data-upload") {
                    this.autoSelectDefaultWorksheet(selectorEl);
                }
    
                let selectedWorksheetName = this.getSelectedWorksheetName(uploadSource);
                this.renderTable(selectedWorksheetName, this.data[uploadSource].workbook);
            }).catch((err) => {
                console.error("Failed to load Excel file:", err);
                alert("The uploaded file is not a valid Excel file or is corrupted.");
            });
        };
    
        reader.readAsArrayBuffer(file);
    }

    getSelectedWorksheetName(uploadSource) {
        let selectorEl = $("#"+uploadSource+"-container .worksheet-selector");
        let selectedWorksheetName = selectorEl.val();
        return selectedWorksheetName;
    }

    processExcelWorksheet(containerName, worksheet) {
        // Extract header row from the worksheet
        let headers = [];
        let rows = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                // Extract header cells
                headers = row.values.filter(Boolean); // Remove undefined values
            } else {
                // Convert each row to a key-value pair object
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber - 1]] = cell.value;
                });
                rows.push(rowData);
            }
        });

        this.data[containerName].headers = headers;
        this.data[containerName].rows = rows;
        this.data[containerName].dataLoaded = true;
    }

    autoSelectDefaultWorksheet(selectorEl) {
        //try to find an option that is NOT "References" or "SEAD metadata"
        let defaultOption = selectorEl.find("option").filter((i, el) => {
            return el.text != "References" && el.text != "SEAD metadata";
        });

        //now select it
        defaultOption.prop("selected", true);
    }

    renderTable(selectedWorksheetName, workbook) {
        const worksheet = workbook.getWorksheet(selectedWorksheetName);
        const table = document.querySelector('#excel-data-table');
    
        // Clear existing table content
        table.innerHTML = '';
    
        if (!worksheet) {
            console.warn('Worksheet not found:', selectedWorksheetName);
            return;
        }
    
        // Create header row
        const headerRow = worksheet.getRow(1);
        const thead = document.createElement('thead');
        const headerTr = document.createElement('tr');
    
        headerRow.eachCell((cell, colNumber) => {
            const th = document.createElement('th');
    
            // Create a container for the header text and the button
            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.alignItems = 'center';
            headerContainer.style.justifyContent = 'space-between';
    
            // Add header text
            const headerSpan = document.createElement('span');
            headerSpan.textContent = cell.text || `Column ${colNumber}`; // Fallback for empty headers
            headerContainer.appendChild(headerSpan);
    
            // Add translate button for the column
            const translateButton = document.createElement('button');
            translateButton.textContent = 'T';
            translateButton.classList.add('translate-button');
            translateButton.title = 'Translate Column';
    
            // Bind callback function to the button
            translateButton.addEventListener('click', () => {
                this.handleTranslateColumnButtonClick(worksheet, cell, colNumber);
            });
    
            headerContainer.insertBefore(translateButton, headerContainer.firstChild);
            th.appendChild(headerContainer);
            headerTr.appendChild(th);
        });
        thead.appendChild(headerTr);
        table.appendChild(thead);
    
        // Add rows
        const tbody = document.createElement('tbody');
    
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
    
            const tr = document.createElement('tr');
    
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const td = document.createElement('td');
                const cellContent = cell.text || ''; // Handle empty cells
    
                // Add cell content
                const contentSpan = document.createElement('span');
                contentSpan.textContent = cellContent;
                td.appendChild(contentSpan);
    
                // Check if the cell is marked as "touched" in the translatedMatrix
                if (this.translatedMatrix[selectedWorksheetName]?.[rowNumber]?.[colNumber]) {
                    td.classList.add("touched");
                }
    
                tr.appendChild(td);
            });
    
            tbody.appendChild(tr);
        });
    
        table.appendChild(tbody);
    }

    handleTranslateColumnButtonClick(worksheet, wscell, colNumber) {
        this.showOverlay("translate-column-dialog", wscell);

        // Populate .translation-dialog-container > table with the unique phrases in this column and their counts
        const phraseCounts = new Map();
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            const cell = row.getCell(colNumber);
            console.log(cell.text)
            const cellContent = cell.text || '';
            phraseCounts.set(cellContent, (phraseCounts.get(cellContent) || 0) + 1);
        });

        const table = document.querySelector('.translation-dialog-container > table');

        // Keep the existing thead tag and clear only the tbody content
        let tbody = table.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            table.appendChild(tbody);
        }
        tbody.innerHTML = ''; // Clear existing tbody content

        phraseCounts.forEach((count, phrase) => {
            const tr = document.createElement('tr');
            
            const phraseTd = document.createElement('td');
            phraseTd.textContent = phrase;
            tr.appendChild(phraseTd);

            const countTd = document.createElement('td');
            countTd.textContent = count;
            tr.appendChild(countTd);

            const translationInput = document.createElement('input');
            translationInput.type = 'text';
            translationInput.value = ""; // Default value
            tr.appendChild(translationInput);

            tbody.appendChild(tr);
        });
    }

    showOverlay(templateId = "translation-dialog", wscell, cellId, content = "") {
        $("#overlay-background").css("display", "block");

        const fragment = document.importNode(document.querySelector("#"+templateId).content, true);
        const overlay = document.querySelector("#overlay");
        const overlayContent = document.querySelector("#overlay-content");
        overlayContent.innerHTML = ""; // Clear previous content
        overlayContent.appendChild(fragment);
        overlay.style.display = "block";
        overlay.style.position = "fixed";
        overlay.style.top = "50%";
        overlay.style.left = "50%";

        $(".original-text-content", overlayContent).text(content);

        $(".suggest-btn", overlayContent).on("click", (evt) => {
            //get suggestions from chatgpt api
            this.handleSuggestClick(evt, cellId, overlay);
        });

        $(".save-btn", overlayContent).on("click", (evt) => {
            this.handleSaveClick(evt, wscell, cellId, overlay);
        });
    }

    hideOverlay() {
        const overlayBackground = document.querySelector("#overlay-background");
        overlayBackground.style.display = "none";
        const overlay = document.querySelector("#overlay");
        overlay.style.display = "none";
    }

    async handleSaveClick(event, wscell, cellId, overlay) {
        event.preventDefault();
        let columnNumber = wscell.col;
    
        const table = $(".translation-dialog-container > table", overlay);
        const rows = table.find("tbody tr");
    
        const selectedWorksheetName = this.getSelectedWorksheetName("source-data-upload");
        const workbook = this.data["source-data-upload"].workbook;
        const worksheet = this.getWorksheet(selectedWorksheetName, workbook);
    
        rows.each((_, row) => {
            const phraseCell = $(row).find("td:first-child");
            const translationInput = $(row).find("input");
    
            const originalText = phraseCell.text().trim();
            const translatedText = translationInput.val().trim();
    
            if (originalText && translatedText && originalText !== translatedText && translatedText !== "") {
                // Iterate through the worksheet and replace all occurrences of the original text in this column
                worksheet.eachRow((row, rowNumber) => {
                    const cell = row.getCell(columnNumber);
                    if (cell.text === originalText) {
                        cell.value = translatedText;
    
                        // Mark the cell as "touched" in the translatedMatrix
                        if (!this.translatedMatrix[selectedWorksheetName][rowNumber]) {
                            this.translatedMatrix[selectedWorksheetName][rowNumber] = {};
                        }
                        this.translatedMatrix[selectedWorksheetName][rowNumber][columnNumber] = true;
                    }
                });
            }
        });
    
        // Close the overlay
        this.hideOverlay();
    
        // Re-render the table to reflect the updates
        this.renderTable(selectedWorksheetName, workbook);
    }

    async handleSuggestClick(event, cellId, overlay) {
        event.preventDefault();
        //loadinig indicator
        $(".suggest-btn", overlay).text("Loading...");
        $(".suggest-btn", overlay).prop("disabled", true);

        const table = $(".translation-dialog-container table", overlay);
        const rows = table.find("tbody tr");

        for (const row of rows) {
            const phraseCell = $(row).find("td:first-child");
            const translationInput = $(row).find("input");

            const originalText = phraseCell.text().trim();
            const targetLang = "English";

            if (!originalText) continue;
            
            console.log(`Translating "${originalText}"...`);
            try {
                const response = await this.fetchTranslation(originalText, targetLang);
                const translatedText = response.translation;
                translationInput.val(translatedText);
            } catch (err) {
                console.error("Translation request failed:", err);
                alert("Failed to get translation.");
            }
        }

        table.css("display", "block");

        // Reset button text and state
        $(".suggest-btn", overlay).text("Suggest");
        $(".suggest-btn", overlay).prop("disabled", false);
    }

    async fetchTranslation(originalText, targetLang, testMode = false) {
        if (testMode) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ translation: `Translated (${originalText})` });
                }, 1000);
            });
        }

        try {
            const response = await fetch(EXTERNAL_URL+"/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: originalText,
                    targetLanguage: targetLang,
                }),
            });

            if (!response.ok) throw new Error("Server error");

            const data = await response.json();
            return data;
        } catch (err) {
            console.error("Translation request failed:", err);
            throw err;
        }
    }
    

    getWorksheet(worksheetName, workbook) {
        return workbook.getWorksheet(worksheetName);
    }
}

new SeadExcelTranslator();