
// e2e-branch-2

/**
@NApiVersion 2.0
@NScriptType ClientScript
@NModuleScope Public
*/
define([], function () {
    function showMessage(context) {
      //BIZAPP-81- second comment
      //Another
      //5-26-21 additional details
        var message = "Please add email address. Added messages.";
        var email = context.currentRecord.getValue({
            "fieldId": "email"
        });

        if (!email) {
            alert(message);
        }
      //partial fetch
      // NACL Change
    }

    return {
        pageInit: showMessage
    };
});
