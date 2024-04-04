/**
	 * @NApiVersion 2.x
	 * @NScriptType ClientScript
	 * @NModuleScope SameAccount
	 */
	define(['N/url', 'N/https'], function(url, https) {
		    return{
		    	fieldChanged: function(context){
		    		var currentRecord = context.currentRecord;
		    		var fieldName = context.fieldId;
		    		const fakeFile = '/fakeFolder/fakeFile.ext'
						const fakeFile2 = '/fakeFolder2/fakeFile.ext'
		    		if(fieldName == 'salesrep'){
		    			var salesRep = currentRecord.getValue({
		    				fieldId: 'salesrep'
		    			});
		    			
		    			log.debug('FieldName', fieldName);
		    			var postData = {"salesRep": salesRep};
		    			
		    			// Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
		    			postData = JSON.stringify(postData);
		    			
		    			// Generate RESTlet URL using the URL module.
		    			var restUrl = url.resolveScript({
	    			              scriptId: 'customscript260', // RESTlet scriptId
		    			    deploymentId: 'customdeploy1' // RESTlet deploymentId
		    			});
		    			log.debug('restUrl', restUrl);
		    			
		    			// Generate request headers
		    			var headers = new Array();
		    			headers['Content-type'] = 'application/json';
		    			
		    			// Perform HTTP POST call
		    			var salesRepRec = https.post({
		    				url: restUrl,
		    				headers: headers,
		    				body: postData
		    			});
		    			
		    			alert(salesRepRec.body);
		    			log.debug('salesRepRec', salesRepRec.body);
		    		}
		    	}
		    }
	});

