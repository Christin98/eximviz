"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import {ColDef, GridOptions, createGrid, GridApi } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';

const DEFAULT_DEBOUNCE_MS = 500;
const sideBar = {
    toolPanels: [
        {
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
        },
        {
            id: 'filters',
            labelDefault: 'Filters',
            labelKey: 'filters',
            iconKey: 'filter',
            toolPanel: 'agFiltersToolPanel',
        }
    ],
};

const defaultGridConfig = {
    sideBar,
    autoSizePadding: 0,
    enableRangeSelection: true,
    rowGroupPanelShow: 'onlyWhenGrouping',
    pivotMode: false,
    enableValue: true,
    floatingFiltersHeight: 20,
    enableAdvancedFilter: false,
    maxBlocksInCache: 2,
    pagination: true,
    paginationPageSize: 100,
    paginateChildRows: true,
    rowBuffer: 0,
    animateRows: true,
    suppressRowDeselection: false,
    rowSelection: 'multiple',
    enableCellTextSelection: false,
    suppressHorizontalScroll: false,
    enableCharts: true,
    suppressRowClickSelection: true,
    suppressAggFuncInHeader: true,
    suppressExcelExport: true,
    blockLoadDebounceMillis: DEFAULT_DEBOUNCE_MS,
    statusBar: {
        statusPanels: [
          { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
          { statusPanel: "agTotalRowCountComponent", align: "center" },
          { statusPanel: "agFilteredRowCountComponent", align: "right" }
        ]
      },
      overlayLoadingTemplate: '<div aria-live="polite" aria-atomic="true" style="position:absolute;top:0;left:0;right:0; bottom:0; background: url(https://raw.githubusercontent.com/Christin98/eximviz/feature/groupbyexcel/src/imageloader/loading-spinner.svg) center no-repeat" aria-label="loading"></div>',
      overlayNoRowsTemplate: '<span aria-live="polite" aria-atomic="true" style="padding: 10px; border: 2px solid #666; background: #55AA77;">No rows to show.</span>',
    defaultColDef: {
        editable:false,
        enableRowGroup: true,
        enablePivot: false,
        enableValue: true,
        resizable: true,
        sortable: true,
        floatingFilter: true,
        suppressFiltersToolPanel: false,
        menuTabs: ['filterMenuTab','columnsMenuTab','generalMenuTab'],
        minWidth: 80,
        filter: true,
        suppressFilter: false,
        debounceMs: DEFAULT_DEBOUNCE_MS,
        filterParams: {
            suppressAndOrCondition: true,
        },
    } as ColDef,
    processCellForClipboard: value => {
        const valueFormatter = value.column['colDef'].valueFormatter;
        return valueFormatter ? valueFormatter(value) : value.value;
    },
    onFirstDataRendered: ({api}) => api.expandAll(),
    onGridReady: ({api}) => api.sizeColumnsToFit(),
} as GridOptions;

export class Visual implements IVisual {
    private host: IVisualHost;
    private visualSettings: VisualSettings;
    private element: HTMLElement;
    private gridOptions: GridOptions;
    private api: GridApi
    private button: HTMLButtonElement;
    private dateColumnField:  string;

    constructor(options: VisualConstructorOptions) {
        this.element = options.element;
        this.element.style.display = "flex"
        this.element.style.flexDirection = "column"
        this.element.classList.add('ag-theme-balham');
        this.button = document.createElement('button')
        this.button.innerHTML = 'Download Excel'
        this.element.appendChild(this.button);
        this.host = options.host;
    }

    public update(options: VisualUpdateOptions) {
        
        let dataView = options.dataViews[0];
        const settings = this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

        const currencyFormatter = (params) => { return '$' + formatNumber(params.value); }
        const numberFormatter = (params) => { return '' + formatNumber(params.value); }
        const stringFormatter = (params) => { return formatString(params.value); }
        const percentageFormatter = (params) => { return formatPercentage(params.value) + "%" }

        // Date formatter for Month-Year
        const monthYearFormatter = (params) => {
            if (params.value instanceof Date) {
                return params.value.toLocaleString("en-US", { month: "short", year: "numeric" });
            } else if (typeof params.value === "string") {
                const date = new Date(params.value);
                return date.toLocaleString("en-US", { month: "short", year: "numeric" });
            }
            return "Invalid Date";
        };

        const formatString = (string) => {
            return string === undefined || string === null || string === "" ? "NULL" : string;
        }

        const formatNumber = (number) => {
            return number === undefined || number === null ? 0 : Number(number).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }

        const formatPercentage = (number) => {
            return number === undefined || number === null ? 0 : Number(number).toFixed(4);
        }

        // Find the date column index and store its field name
        const dateColumnIndex = dataView.table.columns.findIndex(col => col.displayName.toLowerCase().includes("date"));

        const columnDefs = dataView.table.columns.map((c, index) => {
            const columnDef = {
                headerName: c.displayName,
                field: c.displayName.replace(/\s/g, '').toLowerCase(),
                // Hide the date column
                hide: dateColumnIndex === index
            } as ColDef;

            // Store the date column field for later use
            if (dateColumnIndex === index) {
                this.dateColumnField = columnDef.field;
            }

            if (c.isMeasure) {
                if (c.displayName.includes("usd") || c.displayName.includes("USD") || c.displayName.includes("duty") || c.displayName.includes("DUTY"))
                    columnDef.valueFormatter = currencyFormatter;
                else if (c.displayName.includes("percentage") || c.displayName.includes("PERCENTAGE"))
                    columnDef.valueFormatter = percentageFormatter;
                else
                    columnDef.valueFormatter = numberFormatter;

                columnDef.cellDataType = 'number';
                columnDef.aggFunc = 'sum';
            } else {
                columnDef.valueFormatter = stringFormatter;
                columnDef.cellDataType = 'text';
                columnDef.enablePivot = false;
                columnDef.enableRowGroup = true;
                columnDef.enableValue = false;
            }

            if (index === 0) {
                columnDef.headerCheckboxSelection = true;
                columnDef.checkboxSelection = true;
            }

            return columnDef;
        });

        // Add Month-Year column if a date column exists and pivoting is enabled
        if (dateColumnIndex !== -1) {
            columnDefs.push({
                headerName: "Month-Year",
                field: "monthYear",
                enableRowGroup: true,
                enablePivot: true,
                cellDataType: 'text',
                valueFormatter: monthYearFormatter,
                aggFunc: 'first',  // Ensure no aggregation function is applied
            });
        }

        // Generate rowData with Month-Year column
        const rowData = dataView.table.rows.map((row, rowIndex) => {
            const rowData = {
                checkboxColumn: rowIndex,
            };
            row.forEach((item, i) => {
                // Only add non-date columns to rowData
                if (i !== dateColumnIndex) {
                    rowData[columnDefs[i].field] = item;
                }
            });

            // Add Month-Year data for pivoting
            if (dateColumnIndex !== -1) {
                const dateValue = row[dateColumnIndex];
                rowData["monthYear"] = monthYearFormatter({ value: dateValue });
            }

            return rowData;
        });

        // Set up the grid with the new column definitions and row data
        if (!this.gridOptions) {
            this.gridOptions = {
                ...defaultGridConfig,
                floatingFilter: true,
                columnDefs: columnDefs,
                rowData: rowData,
            } as GridOptions;

            this.api = createGrid(this.element, this.gridOptions);


            this.button.onclick = () => {
                // Logic for download button
                let jsonString;
                let requestBody = {};

                this.api.showLoadingOverlay();

                // Get column Properties
                const paginationPageSize = this.gridOptions.paginationPageSize; 
                const currentPage = this.api.paginationGetCurrentPage();
                const startRow = currentPage * paginationPageSize;
                const startrowgroup = startRow +1;
                const endRow = Math.min(startRow + paginationPageSize, this.api.getDisplayedRowCount());


                // Find out which rowgroup is true
                let columnProperties = []
                var rowGropuFlag = false;
                var columnState = this.api.getColumnState();
                for (let i = 0 ; i < columnState.length; i++ ){
                    // Exclude the date column from column properties
                    if(columnState[i]['rowGroup'] === true && columnState[i]['colId'] !== this.dateColumnField){
                        rowGropuFlag = true;
                        columnProperties.push({
                            "columnName":  columnState[i]['colId'].toUpperCase(),
                            "rowIndex": columnState[i]['rowGroupIndex']
                        });
                    }
                }
               
                if(rowGropuFlag === false){
                const displayedData = []
                    for (let i = startRow; i < endRow; i++) {
                        const rowNode = this.api.getDisplayedRowAtIndex(i);
                        const filteredRowData = {...rowNode.data};
                        delete filteredRowData[this.dateColumnField];
                        displayedData.push(filteredRowData);
                    }                     
                
                // Map the data directly
                const jsonData1: string = JSON.stringify(displayedData);
                const jsonData2: any[] = JSON.parse(jsonData1);
                interface ImportData {
                    [key: string]: string | number;
                }
                const extractedValues = jsonData2.map(item => {
                    const entry: ImportData = {};
                    for (const key of Object.keys(item)) {
                        if(key!= "checkboxColumn"){
                            entry[key.toUpperCase()] = item[key];
                        }       
                    }
                    return entry;
                });            
                const jsonData: ImportData[] = extractedValues;
                
                jsonString = JSON.stringify(jsonData);  
                requestBody = {
                    name: jsonString,
                    columnProperties:columnProperties
                  };      
                
                  console.log(requestBody);
            }

            else if (rowGropuFlag === true) {
                let previousImporterName = '';
                let indexCounter = 0;
                let columnNameIndex;
                let currentColumnNameIndex;
                let currentImporterName;
                for (let i = 0; i < columnProperties.length; i++) {
                    if (columnProperties[i]["rowIndex"] == 0) {
                        columnNameIndex = columnProperties[i]["columnName"].toLowerCase();
                    }
                }

                // Store reference to dateColumnField outside the callback
                const dateColumnField = this.dateColumnField;
                var allRowData = [];
                let aggValues = [];


                this.api.forEachNode(function (node) {
                    if (node && node.data) {
                        currentColumnNameIndex = columnNameIndex;
                        currentImporterName = node.data[currentColumnNameIndex]
                
                        if (currentImporterName !== undefined && currentImporterName !== previousImporterName) {
                            indexCounter++;
                        }              
                        node.data["index"] = indexCounter;
                        // Remove the date column from the node data
                        const filteredNodeData = {...node.data};
                        delete filteredNodeData[dateColumnField];
                        allRowData.push(filteredNodeData)
                
                        const node_data_agg = node.parent ? node.parent.aggData : null;
                
                        if (node_data_agg) {
                            Object.keys(node.data).forEach(function (key) {
                                Object.keys(node_data_agg).forEach(function (key_agg) {
                                    if (key === key_agg) {
                                        node.data[key + "_agg"] = parseFloat(node_data_agg[key_agg]).toFixed(4);
                                        aggValues.push(key + "_agg");
                                    }
                                });
                            });
                        }
                        node.data[""] = "";
                    }
                    if(node.data != undefined){
                        console.log(currentColumnNameIndex)
                        previousImporterName = node.data[currentColumnNameIndex];
                    }
                    // console.log("previous:",previousImporterName)
                });

                console.log(allRowData);

                let aggValuesSet = new Set(aggValues);
                const aggValueArray = Array.from(aggValuesSet);
                const colLen = columnProperties.length;

                for (var i = 0; i < aggValueArray.length; i++) {
                    if (aggValueArray[i]) {
                        columnProperties.push({
                            "columnName": aggValueArray[i].toUpperCase(),
                            "rowIndex": i + colLen
                        });
                    }
                }
                columnProperties.push({
                    "columnName": "index",
                    "rowIndex": columnProperties.length
                })
                const collenp = columnProperties.length
                columnProperties.push({
                    "columnName": "",
                    "rowIndex": collenp
                });

            console.log(columnProperties);
            const jsonData1: string = JSON.stringify(allRowData);
            const jsonData2 :any[] = JSON.parse(jsonData1);
            interface ImportData {
                    [key: string]: string | number;
                }
            const extractedValues = jsonData2.map(item => {
                    const entry: ImportData = {};
                    for (const key of Object.keys(item)) {
                        if(key!= "checkboxColumn"){
                            if( key == "index"){
                                entry[key] = item[key];
                            }
                            else{
                              entry[key.toUpperCase()] = item[key];
                            }
                        }       
                    }
                    return entry;
                });   
              const jsonData: ImportData[] = [];
              extractedValues.forEach(entry => {
                if (Object.keys(entry).length > 0) {
                  jsonData.push(entry);
                }
              });         
              jsonString = JSON.stringify(jsonData);   
              requestBody = {
                name: jsonString,
                columnProperties:JSON.stringify(columnProperties),
                pagination: JSON.stringify({"startpage":startrowgroup,"endrow":endRow})
              };   
              console.log(requestBody) 
            }
            else{
                console.log("Error")
            }
                const downloadlink = `https://func-exim-powerbi-ci-prod.azurewebsites.net/api/downloadlink`;
                fetch(downloadlink, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }).then(response => response.text())
                .then(result => {
                    this.api.hideOverlay();
                    const url = `https://func-exim-powerbi-ci-prod.azurewebsites.net${result}`
                    this.host.launchUrl(url);
                }).catch(error => console.log('error', error));
            }
        } else {
            this.api.setGridOption("columnDefs", columnDefs);
            this.api.setGridOption("rowData", rowData);
            this.api.sizeColumnsToFit();
        }
    }
}
