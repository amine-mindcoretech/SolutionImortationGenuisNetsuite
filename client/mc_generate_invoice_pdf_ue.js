/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/log'], function(serverWidget, log) {
    function beforeLoad(context) {
        log.debug({
            title: 'User Event Script Triggered',
            details: 'Type: ' + context.type + ', Record Type: ' + context.newRecord.type
        });

        var form = context.form;
        var record = context.newRecord;
        var type = context.type;

        // Ajouter le bouton uniquement pour les factures (type "invoice")
        if (context.newRecord.type === 'invoice' && (type === context.UserEventType.VIEW || type === context.UserEventType.EDIT)) {
            // Ajouter un champ caché pour l'ID de la facture
            var recordIdField = form.addField({
                id: 'custpage_record_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Record ID'
            });
            recordIdField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            recordIdField.defaultValue = record.id;
            log.debug({
                title: 'Hidden Field Added',
                details: 'Field ID: custpage_record_id, Value: ' + record.id
            });

            // Attacher le Client Script
            form.clientScriptModulePath = './custom_client_invoice_pdf';
            log.debug({
                title: 'Client Script Attached',
                details: 'Client Script Path: ./custom_client_invoice_pdf'
            });

            // Ajouter le bouton
            form.addButton({
                id: 'custpage_generate_pdf_button',
                label: 'Générer PDF',
                functionName: 'generateInvoicePDF'
            });
            log.debug({
                title: 'Button Added',
                details: 'Button ID: custpage_generate_pdf_button, Function: generateInvoicePDF'
            });
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});