import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import 'ag-grid-enterprise';
export declare class Visual implements IVisual {
    private host;
    private visualSettings;
    private element;
    private gridOptions;
    private button;
    private downloadservice;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
}
