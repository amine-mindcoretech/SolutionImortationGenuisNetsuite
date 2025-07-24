/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/render', 'N/file', 'N/log'], function(record, render, file, log) {
    function onRequest(context) {
        log.debug({
            title: 'Suitelet Request Received',
            details: 'Record ID: ' + context.request.parameters.recordId
        });

        var recordId = context.request.parameters.recordId;

        try {
            // Charger la facture
            var invoiceRecord = record.load({
                type: record.Type.INVOICE,
                id: recordId,
                isDynamic: false
            });

            // Obtenir la langue (champ personnalisé ou fallback client)
            var language = invoiceRecord.getText({ fieldId: 'custbody_gs_lan_print' });

            if (!language) {
                var customerId = invoiceRecord.getValue({ fieldId: 'entity' });
                var customerRecord = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId,
                    isDynamic: false
                });
                language = customerRecord.getText({ fieldId: 'custentity_gs_ven_language' }) || 'English (US)';
            }

            log.debug({ title: 'Langue impression Facture', details: language });

            // Définir langue et locale à passer au template
            var displayLanguage, locale;
            switch (language) {
                case 'French (Canada)':
                    displayLanguage = 'French';
                    locale = 'fr_CA';
                    break;
                case 'English (US)':
                case 'English (Canada)':
                default:
                    displayLanguage = 'English';
                    locale = 'en_US';
                    break;
            }

            // Définir le nom de fichier à afficher lors du téléchargement
            var invoiceNumber = invoiceRecord.getValue('tranid');
            var fileName = (displayLanguage === 'French' ? 'Facture_' : 'Invoice_') + invoiceNumber + '.pdf';

            // Création du PDF
            var renderer = render.create();
            renderer.setTemplateByScriptId('custtmpl_325_9803855_sb1_414'); // Utilisez le template existant
            renderer.addRecord('record', invoiceRecord);
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: 'customData',
                data: {
                    displayLanguage: displayLanguage,
                    locale: locale
                }
            });

            var pdfFile = renderer.renderAsPdf();
            pdfFile.name = fileName;

            // Sauvegarder le fichier dans le File Cabinet
            pdfFile.folder = -15; // Dossier Documents
            var fileId = pdfFile.save();
            log.debug({ title: 'File Saved', details: 'File ID: ' + fileId + ', Path: Documents/' + fileName });

            // Attacher le fichier à la facture
            record.submitFields({
                type: record.Type.INVOICE,
                id: recordId,
                values: {
                    'file': fileId
                }
            });
            log.debug({ title: 'File Attached', details: 'File ID ' + fileId + ' attached to Invoice ID ' + recordId });

            // Envoyer le fichier PDF au navigateur pour affichage
            context.response.writeFile({
                file: pdfFile,
                isInline: true // Visualisation dans le navigateur
            });

        } catch (e) {
            log.error({
                title: 'Erreur de génération du PDF',
                details: e
            });
            context.response.write({
                output: 'Erreur : ' + e.message
            });
        }
    }

    return {
        onRequest: onRequest
    };
});