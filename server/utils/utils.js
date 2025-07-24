const iconv = require('iconv-lite');

// Fonction de conversion en UTF-8
const convertToUTF8 = (value) => {
    if (typeof value === 'string') {
        let convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'windows-1252');
        if (convertedValue.includes('�')) {
            convertedValue = iconv.decode(Buffer.from(value, 'binary'), 'ISO-8859-1');
        }
        return convertedValue;
    }
    return value;
};

// Fonction de nettoyage manuel des caractères
const cleanInvalidChars = (value) => {
    if (typeof value === 'string') {
        return value
            .replace(/ý/g, 'É')
            .replace(/ÿ/g, 'é')
            .replace(/þ/g, 'è')
            .replace(/Ý/g, 'À')
            .replace(/�/g, '');
    }
    return value;
};

module.exports = { convertToUTF8, cleanInvalidChars };

