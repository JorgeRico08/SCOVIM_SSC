export class ErrorDTO {
    sAtributo: string;
    sError: string;

    constructor(sAtributo: string, sError: string) {
        this.sAtributo = sAtributo;
        this.sError = sError;
    }
}