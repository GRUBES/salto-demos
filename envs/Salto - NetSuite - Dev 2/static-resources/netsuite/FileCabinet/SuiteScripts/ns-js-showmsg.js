/**
@NApiVersion 2.0
@NScriptType ClientScript
@NModuleScope Public
*/
define([], function () {
    function showMessage(context) {
        var email = context.currentRecord.getValue({
            "fieldId": "email"
        });

        if (!email) {
            alert(message);
            alert("Missing email address");
        }
    }

    return {
        pageInit: showMessage
    };
});
